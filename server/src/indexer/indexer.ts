import { IPersistable, IRecalledMemory } from "../index";
import { IdRef, IMemory } from "../models";
import { CouchDbDatabase } from "../indexer/couchdb";
import { FlexsearchSearch } from "../indexer/flexsearch";
import { IDatabase } from "../indexer/index";
import { ISettings } from "../configuration";

export class Index implements IPersistable {

    private mindName: string;
    private idx: FlexsearchSearch;
    private db: IDatabase;

    constructor(name: string, settings: ISettings) {
        this.mindName = name;
        this.db = new CouchDbDatabase(name, settings);
        this.idx = new FlexsearchSearch(this.db);
    }

    // Remove from minisearch and PouchDB
    async remove(id: URL) {
        console.debug(`Index.remove() : Removing id ${id} from database`);
        await this.db.remove(id.toString());
    }

    async index(things: IMemory[]) {
        console.debug(`Index.index() : Indexing ${things.length} things`);
        
        // Note: "doc must be a 'pure JSON object', i.e. a collection of 
        // name/value pairs. If you try to store non-JSON data (for instance 
        // Date objects) you may see inconsistent results."

        // TODO
        // // Sneakily insert a created date if document does not already exist
        // 'm:created': new Date().toISOString(),
        // // @id is last because me must save with same _id we just get()d with
        // _id: id,
        // // for minisearch
        // id: id

        // Iterate over IStorables and save each one
        await Promise.all(
            things.map(async (storable: IMemory) => {

                console.debug(`Index.store() : Upserting ${storable["@type"]} ${storable['@id']}`);

                try {
                    await this.db.upsert(storable['@id'], (existing: {}): IMemory => {

                        // @ts-ignore
                        console.log(`Previous ${existing._rev}, new : ${storable._rev}`,
                            Object.keys(storable).includes('_rev'));
                        console.log(`Attachments in ${storable['@id']}`, storable._attachments);

                        return { ...existing, ...storable };
                    });

                    // Update in search index
                    await this.idx.update(new URL(storable["@id"]), storable.text);

                } catch (e: any) {
                    console.error('Index.store() : Error storing memory: ', e);
                }
            })
        );

    }

    // Get full stored resource by @id
    //   embedded: replace IdRefs in m:embedded with real objects from db
    async getById(id: URL, attachments: boolean = false, embedded: boolean = true): Promise<IMemory> {

        // Get from db
        console.debug(`Index.getById() : Getting document by id: ${id}`);
        const memory: IMemory | undefined = await this.db.get(id.toString(), {
            attachments: attachments,
            // We will always want attachments in binary form, not base64 encoded
            binary: true
        });

        console.debug(`Index.getById() : Got document from db: ${memory}`);

        // We will get url back as a string, so turn it into a URL object
        memory.url = new URL(memory.url.toString());

        // Hydrate embedded things        
        if (embedded && memory['m:embeddedIds']) {
            console.debug(`Index.getById() : Hydrating ${memory['m:embeddedIds'].length} embedded documents in id: ${id}`);

            // getById() for each IdRef in memory['m:embeddedIds']
            // TODO use this.hydrateIdRefs()
            const x = await Promise.all(
                memory['m:embeddedIds']?.map(async (idRef: IdRef): Promise<IMemory | undefined> => {
                    try {
                        return await this.getById(new URL(idRef["@id"]));
                    } catch (e) {
                        return undefined;
                    }
                })
            );

            // @ts-ignore because we can't have undefined here
            memory['m:embedded'] = x.filter((memory) => memory != undefined);
        }

        return memory;
    }

    async search(q: string): Promise<IRecalledMemory[]> {

        console.debug(`Index.search() : Searching for: ${q}`);

        // Search for q, get a list of @id as URL
        const searchResults: URL[] = await this.idx.search(q);

        // then load object for each returned result
        let recalled: (IRecalledMemory | undefined)[] = await Promise.all(
            // Search Index
            searchResults
                // then Retrieve objects from Store
                .map(async (id: URL): Promise<IRecalledMemory | undefined> => {

                    // It's possible we won't be able to get doc (ie it's not in the db)
                    // Build IRecalledMemory
                    try {
                        return {
                            thing: await this.getById(id)
                        };
                    } catch (e) {
                        // We fill filter these out in the next step
                        console.warn(`Index.search() : Found ${id} in search index, but not in db`);
                        return undefined;
                    }

                })
        );

        // Filter out those where we couldn't get() a memory
        // Casting becase we are filtering undefined here
        const filteredRecalled: IRecalledMemory[] = <IRecalledMemory[]>recalled
            // Only keep top-level memories
            .filter((recalled: IRecalledMemory | undefined): boolean =>
                recalled != undefined
                && recalled?.thing != undefined
                && recalled?.thing["m:embeddedInId"] == undefined)

        return filteredRecalled;
    }

    private async hydrateIdRefs(idRefs: IdRef[] | undefined): Promise<IMemory[]> {
        console.debug(`hydrateIdRefs() : Hydrating ${idRefs?.length} id refs`);
        if (idRefs == undefined || idRefs.length <= 0)
            return [];
        return await Promise.all(idRefs
            .map((idRef: IdRef) =>
                this.getById(new URL(idRef['@id']))));
    }

    // Dumps a bunch of docuemnts
    // Parameters
    //   sort: key to sort on
    async all(limit: number = 10000, skip: number = 0,
        sort: string = 'm:created'): Promise<IRecalledMemory[]> {

        // Get only document ids
        const found = await this.db.all({
            include_docs: true,
            attachments: false,
            limit: limit,
            skip: skip
        });

        // Return array of IRecalledMemory
        const memories: IRecalledMemory[] = await Promise.all(
            found
                // // Throw out undefined docs
                // .filter((row) => row.doc != undefined)
                // // Throw out internal configuration documents
                // .filter((row) => !row.id.startsWith('memori/'))
                // Get full document and hydrate embedded things
                // .map(async (memory: IMemory): Promise<IMemory> => await this.getById(new URL(memory['@id'])))
                // Hydrate embedded id refs
                .map(async (memory: IMemory): Promise<IMemory> => {
                    memory['m:embedded'] = await this.hydrateIdRefs(memory['m:embeddedIds']);
                    return memory;
                })
                // .map(async (memory: IMemory): Promise<IMemory> => { return memory })
                // Transform returned row into IMemory
                .map(async (memory: Promise<IMemory>): Promise<IRecalledMemory> => {
                    return {
                        thing: await memory,
                        recall: undefined,
                    };
                })
        );

        return memories
            // Only keep top-level memories
            .filter((doc: IRecalledMemory) => doc.thing["m:embeddedInId"] == undefined)
            // Sort by lexical order of m:created
            // @ts-ignore because name is a string variable
            .sort((a: IRecalledMemory, b: IRecalledMemory) => a.thing[sort] > b.thing[sort] ? -1 : 1);

    }

    async load() {
        await this.db.load();
        await this.idx.load();
    }

    async save() {
        await this.db.save();
        await this.idx.save();
    }

    // Immediately clear all data from Index
    // Leaves databases in a state ready for immediate se
    async clear() {
        await this.db.clear();
    }

}
