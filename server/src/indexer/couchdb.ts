import nano, { DocumentScope } from 'nano';
import { IMemory, IMemoryAttachment } from '../models';
import { IPersistable } from '../index';
import { DatabaseGetOptions, IDatabase } from './index';
import { ISettings } from '../configuration';

function convertAttachments(attachments: { [key: string]: IMemoryAttachment }) {
    return Object.entries(attachments)
        .map(([id, attachment]: [string, IMemoryAttachment]) => {
            console.debug(`Making attachment of length ${attachment.data?.length} for ${attachment.content_type} ${id}`);
            if (attachment.data == undefined)
                console.warn('BAD ATTACHMENt', attachment);
            return {
                name: id,
                data: attachment.data,
                content_type: attachment.content_type
            };
        });
}

function assertHasRev(o: any) {
    if (o._rev == undefined)
        throw new Error('No _rev found');
}

export class CouchDbDatabase implements IDatabase, IPersistable {

    mindName: string;
    url: string;
    connection?: nano.ServerScope;
    db?: DocumentScope<IMemory>;

    // CouchDB db names much begin with a lowercase letter
    constructor(name: string, settings: ISettings) {
        this.url = settings.couchDbUrl;
        this.mindName = name;
    }

    async get(id: string, options?: DatabaseGetOptions): Promise<IMemory> {

        console.debug(`CouchDbDatabase.get() : Getting from db: ${id}`);

        const memory: IMemory | undefined = await this.db?.get(id, options);

        console.debug(`CouchDbDatabase.get() : Got memory from db: ${memory}`);

        if (memory == undefined)
            throw new Error(`Memory ${id} not found`);

        if (memory._attachments && options?.binary) {
            console.debug(`CouchDbDatabase.get() : Transforming attachments to binary: ${memory._attachments}`);
            for (const [key, attachment] of Object.entries(memory._attachments)) {
                if (memory._attachments[key].data) {
                    console.debug(`CouchDbDatabase.get() : Transforming attachment ${key} to binary. Length is ${memory._attachments[key].data.length}`);
                    // Base64 decode attachments like PouchDB client does
                    memory._attachments[key].data = // memory._attachments[key].data
                        Buffer.from(atob(attachment.data.toString('binary')), 'binary');
                } else {
                    console.debug(`CouchDbDatabase.get() : No data found for ${key}. Did you set attachments=true?`);
                }
            }

        }

        console.debug(`CouchDbDatabase.get() : Returning: ${memory} `);

        return memory;
    }

    async all(options: {}): Promise<IMemory[]> {
        const memories = await this.db?.list(options);
        console.debug(`Retrieved ${ memories?.total_rows } memories`);
        if (!memories)
            throw new Error(`Memory list could not be retrieved`);
        // @ts-ignore becaus we are filtering out undefined
        return memories.rows
            // Throw out undefined docs
            .filter((row) => row.doc != undefined)
            // Throw out internal configuration documents
            .filter((row) => !row.id.startsWith('memori/'))
            .map((row) => row.doc);
    }

    async remove(id: string): Promise<void> {
        const doc = await this.db?.get(id);
        if (doc)
            await this.db?.destroy(id, doc?._rev);
    }

    // TODO don't duplicate attachments
    // TODO diff old rev with new rev docs to see if we should actually insert()
    async upsert(id: string, handler: (existing: {}) => IMemory): Promise<void> {
        console.debug(`Upserting memory with id ${ id } `);
        try {
            const existing = await this.db?.get(id);
            if (existing) {
                console.debug(`Doc ${ id } exists in database with _rev ${ existing._rev } `);
                // Document with id already exists in the database,
                // so we need to upsert it
                const memory: IMemory = handler(existing);
                if (memory._attachments) {
                    console.debug(`Doc ${ id } exists in db.Local has _attachments`);
                    const attachments = convertAttachments(memory._attachments);
                    delete memory._attachments;
                    assertHasRev(memory);
                    await this.db?.multipart.insert(memory, attachments, memory['@id'])
                        // // Try again if we get an error
                        // .catch(async (error) => {
                        //     console.warn(`Failed on second upsert try: ${ error } `);
                        //     await this.upsert(id, handler);
                        // });
                } else {
                    console.debug(`Doc ${ id } exists in db.Local has NO _attachments`);
                    // Memory has no attachments, so do normal insert
                    delete memory._attachments;
                    assertHasRev(memory);
                    await this.db?.insert(memory, memory['@id'])
                        // // Try again if we get an error
                        // .catch(async (error) => {
                        //     console.warn(`Failed on second upsert try: ${ error } `);
                        //     await this.upsert(id, handler);
                        // });
                }
            } else {
                console.debug(`Do doc found for ${ id }.No error thrown.We shouldn't have been able to get here`);
            }
        } catch (e) {
    console.debug(`Doc ${id} does NOT exist in db: ${e}`);
    const memory = handler({});
    if (memory._attachments) {
        console.debug(`Doc ${id} does NOT exist in db. Local has _attachments`);
        const attachments = convertAttachments(memory._attachments);
        delete memory._attachments;
        await this.db?.multipart.insert(memory, attachments, memory['@id'])
        // // Try again if we get an error
        // .catch(async (error) => {
        //     console.warn(`Failed on second upsert try: ${error}`);
        //     await this.upsert(id, handler);
        // });
    } else {
        console.debug(`Doc ${id} does NOT exist in db. Local has NO _attachments`);
        await this.db?.insert(memory, memory['@id'])
        // // Try again if we get an error
        // .catch(async (error) => {
        //     console.warn(`Failed on second upsert try: ${error}`);
        //     await this.upsert(id, handler);
        // });
    }
}
    }

    async save() {
    console.debug('CouchDbDatabase.save() : Method not implemented.');
}

    async load() {
    console.debug(`Connecting to CouchDB at ${this.url}`);
    this.connection = nano(this.url);
    console.debug(`Connected to CouchDB ${await this.connection.info()}`);

    // HACK check if database exists. get() hangs if doesn't exist
    console.debug(`Listing databases`);
    const dblist = await this.connection.db.list();
    console.debug(`Listed databases ${dblist}`);
    if (!dblist.includes(this.mindName)) {
        console.debug(`Creating database ${this.mindName}`);
        const r = await this.connection.db.create(this.mindName);
        console.debug(`Database creation result ${r}`);
    }
    // const info = await this.connection.db.get(this.name);
    // console.debug(`Found CouchDB database ${info}`);
    // if (! info)
    // console.debug(`Using CouchDB database ${info}`);
    console.debug(`Trying to use database ${this.mindName}`);
    this.db = await <DocumentScope<IMemory>>this.connection.db.use(this.mindName);
    console.debug(`Database ready ${await this.db.info()}`);
}

    async clear() {
    await this.connection?.db.destroy(this.mindName);
    await this.load();
}

}
