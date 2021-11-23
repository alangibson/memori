import { promises as fs } from "fs";
import MiniSearch, { Options, SearchResult } from 'minisearch';
import * as PouchDB from 'pouchdb';
import pouchdbFind from 'pouchdb-find';
import pouchdbUpsert from 'pouchdb-upsert';
import flexSearch, { IndexSearchResult } from 'flexsearch';
import { IPersistable, IRecalledMemory, contentHashUrl } from "./index";
import { IIndexable, IMemory, IRememberable } from "./models";
import pouchdbAdapterMemory from 'pouchdb-adapter-memory';
import { filter } from "cheerio/lib/api/traversing";

PouchDB.default.plugin(pouchdbFind);
PouchDB.default.plugin(pouchdbUpsert);
PouchDB.default.plugin(pouchdbAdapterMemory);

// PouchDB.default.plugin(pouchdbQuickSearch);

interface ISearchIndex {

    // Full text search for q, return array of @id as URL
    search(q: string): Promise<URL[]>;

    add(id: URL, text: string): Promise<void>;

    update(id: URL, text: string): Promise<void>;

    remove(id: URL): Promise<void>;
}

class FlexsearchSearch implements ISearchIndex, IPersistable {

    db: PouchDB.Database;
    index: flexSearch.Index;

    constructor(db: PouchDB.Database) {
        this.db = db;
        this.index = new flexSearch.Index({
            tokenize: "forward"
        });
    }

    async add(id: URL, text: string) {
        await this.index.addAsync(id.toString(), text);
    }

    async update(id: URL, text: string) {
        await this.index.updateAsync(id.toString(), text);
    }

    async search(q: string): Promise<URL[]> {
        const results: IndexSearchResult = await this.index.searchAsync(q);
        return results.map((id: flexSearch.Id) => new URL(id.toString()))
    }

    async remove(id: URL) {
        try {
            await this.index.removeAsync(id.toString());
        } catch (e) {
            console.warn(`FlexsearchSearch.remove() : Failed to remove @id ${id} because ${e}`);
        }
    }

    async save() {
        console.debug('FlexsearchSearch.save()');

        const d: { [key: string]: string } = {};
        this.index
            .export(async (key: string | number, data: string) => {
                const k = key.toString().split('.').pop() || '';
                d[k] = data;
            });

        // We have to sleep because of function async() in serialize.js
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Store to PouchDB
        for (const [key, data] of Object.entries(d)) {
            await this.db.upsert(`memori/flexsearch/${key}`, () => ({
                _id: `memori/flexsearch/${key}`,
                data: data
            }));
        }
    }

    async load() {
        try {
            const keys = ['reg', 'cfg', 'map', 'ctx'];
            for (const key of keys) {
                // @ts-ignore
                this.index.import(key, (await this.db.get(`memori/flexsearch/${key}`)).data);
            }
        } catch (e) {
            console.debug(`FlexsearchSearch.load() : No existing index`);
        }
    }

    async clear() {
        throw new Error("FlexsearchSearch.clear() : Method not implemented.");
    }

}

export class Index implements IPersistable {

    private path: string;
    private db: PouchDB.Database;
    private idx: FlexsearchSearch;

    constructor(path: string) {
        this.path = path;
        // Start with an in-memory PouchDB
        this.db = new PouchDB.default(`${this.path}/db`, { adapter: 'memory' });
        this.idx = new FlexsearchSearch(this.db);
    }

    async store(storables: IIndexable[]) {

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
            storables.map(async (storable: IIndexable) => {

                console.debug(`Index.store() : Upserting ${storable["@type"]} ${storable['@id']}`);

                try {

                    await this.db.upsert(storable["@id"], (existing) => {

                        // if (existing)
                        //     console.debug(`Index.store() : Found existing stored thing ${existing._id}`, existing);

                        // @ts-ignore becasue were just making sure that there is no _rev
                        // delete storable._rev;

                        const combined = { ...existing, ...storable };

                        // delete storable._attachments;
                        // console.log('storable', JSON.stringify(storable, null, 2));

                        return combined;
                    });

                    // Update in search index
                    await this.idx.update(new URL(storable["@id"]), storable.text);

                } catch (e) {
                    console.error('EXPLODED', e);
                }
            })
        );

    }

    // Remove from minisearch and PouchDB
    async remove(id: URL) {

        console.debug(`Index.remove() : Removing id ${id}`);

        // TODO We can get into an inconsistent state where search queries faile
        // due to missing id in db if we don't also remove from search index.

        const doc = await this.db.get(id.toString());

        console.debug(`Index.remove() : Removing id ${id} from full text search index`);
        await this.idx.remove(id);

        console.debug(`Index.remove() : Removing id ${id} from database`);
        await this.db.remove(doc);
    }

    async index(things: IIndexable[]) {

        console.debug(`Index.index() : Indexing ${things.length} things`);

        // Index directory should always exist
        await fs.mkdir(this.path, { recursive: true });

        // Store and index for full text search
        await this.store(things);
        // await this.fulltext(things);

    }

    // Get full stored resource by @id
    async getById(id: URL, attachments: boolean = false): Promise<IMemory> {

        // Get from PouchDB
        const memory: IMemory = await this.db.get(id.toString(), {
            attachments: attachments,
            // We will always want attachments in binary form, not base64 encoded
            binary: true
        });

        // We will get url back as a string, so turn it into a URL object
        memory.url = new URL(memory.url.toString());

        // TODO if children, resolve @id references in video, etc.
        // if (children) {
        //     if (memory.video)
        //         memory.video = await this.getById(memory.video['@id'], children, attachments);
        // }

        return memory;
    }

    async search(q: string): Promise<IRecalledMemory[]> {

        console.debug(`Index.search() : Searching for: ${q}`);

        // Search for q, get a list of @id as URL
        const searchResults: URL[] = await this.idx.search(q);

        // then load object for each returned result
        let recalled: (IRecalledMemory|undefined)[] = await Promise.all(
            // Search Index
            searchResults
                // then Retrieve objects from Store
                .map(async (id: URL): Promise<IRecalledMemory|undefined> => {
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
        const filteredRecalled: IRecalledMemory[] = <IRecalledMemory[]> recalled
            // Only keep top-level memories
            .filter((recalled: IRecalledMemory|undefined): boolean =>
                recalled != undefined 
                    && recalled?.thing != undefined
                    && recalled?.thing["m:embeddedIn"] == undefined)


        // then deduplicate search results based on @id
        // const seenIds: string[] = [];
        // const filteredSearchResults: IRecalledMemory[] = recalled
        //     .filter((result: IRecalledMemory): boolean => {
        //         const recalled: IRecalledMemory = result;
        //         if (seenIds.includes(recalled.thing['@id'])) {
        //             console.debug(`Ejecting already seen @id ${recalled.thing['@id']} from search results`);
        //             return false;
        //         } else {
        //             seenIds.push(recalled.thing['@id']);
        //             return true;
        //         }
        //     })

        // TODO sort results some way?

        return filteredRecalled;
    }

    // Dumps a bunch of docuemnts
    // Parameters
    //   sort: key to sort on
    async all(limit: number = 10000, skip: number = 0,
        sort: string = 'm:created'): Promise<IRecalledMemory[]> {

        // TODO do this with db.find(), not db.allDocs()

        const found = await this.db.allDocs<IMemory>({
            include_docs: true,
            attachments: false,
            limit: limit,
            skip: skip
        });

        // Return array of IRecalledMemory
        return found.rows
            // Throw out undefined docs
            .filter((doc) => doc.doc != undefined)
            // Throw out internal configuration documents
            .filter((doc) => !doc.id.startsWith('memori/'))
            // Only keep top-level memories
            .filter((doc) => doc.doc?.["m:embeddedIn"] == undefined)
            // Transform returned row into IMemory
            .map((doc): IRecalledMemory => {
                return {
                    // @ts-ignore because we already filtered out undefined docs
                    thing: doc.doc,
                    recall: undefined,
                };
            })
            // Sort by lexical order of m:created
            // @ts-ignore because name is a string variable
            .sort((a: IRecalledMemory, b: IRecalledMemory) => a.thing[sort] > b.thing[sort] ? -1 : 1);

    }

    async load() {
        // Directory needs to always be there
        await fs.mkdir(`${this.path}/db`, { recursive: true });
        // Load up PouchDB file system backed db        
        this.db = new PouchDB.default(`${this.path}/db`);
        // Reconstruct search index
        this.idx = new FlexsearchSearch(this.db);
        await this.idx.load();

    }

    async save() {
        // Directory needs to always be there
        await fs.mkdir(`${this.path}/db`, { recursive: true });
        await this.idx.save();
    }

    // Immediately clear all data from Index
    // Leaves databases in a state ready for immediate se
    async clear() {
        await this.db.destroy();
        this.db = new PouchDB.default(`${this.path}/db`);
        this.idx = new FlexsearchSearch(this.db);
    }

}
