import nano, { DocumentScope } from 'nano';
import { IMemory } from '../models';
import { IPersistable } from '../index';
import { IDatabase } from './index';
import { ISettings } from 'src/configuration';

// TODO get rid of use of 'any'
function convertAttachments(attachments: any) {
    return Object.entries(attachments)
    .map(([id, attachment]: [string, any]) => {
        console.debug(`Making attachment of length ${attachment.data.length} for ${attachment.content_type} ${id}`);
        return {
            name: id,
            data: attachment.data,
            content_type: attachment.content_type
        };
    });
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

    async get(id: string, options: {}): Promise<IMemory> {
        const memory = await this.db?.get(id, options);
        if (!memory)
            throw new Error(`Memory ${id} not found`);
        return memory;
    }

    async all(options: {}): Promise<IMemory[]> {
        const memories = await this.db?.list(options);
        console.debug(`Retrieved ${memories?.total_rows} memories`);
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

    async upsert(id: string, handler: (existing: {}) => IMemory): Promise<void> {
        console.debug(`Upserting memory with id ${id}`);
        try {
            const doc = await this.db?.get(id);
            if (doc) {
                console.debug(`Doc ${id} exists in database`);
                // Document with id already exists in the database,
                // so we need to upsert it
                const memory: IMemory = handler(doc);
                // Make sure there is a CouchDB _id
                memory._id = memory['@id'];
                if (memory._attachments) {
                    console.debug(`Doc ${id} exists in db. Local has _attachments`);
                    const attachments = convertAttachments(memory._attachments);
                    delete memory._attachments;
                    await this.db?.multipart.insert(memory, attachments, memory['@id']);
                } else {
                    console.debug(`Doc ${id} exists in db. Local has NO _attachments`);
                    // Memory has no attachments, so do normal insert
                    delete memory._attachments;
                    await this.db?.insert(memory);
                }
            } 
        } catch (e) {
            console.debug(`Doc ${id} does NOT exist in db`);
            const memory = handler({});
            // Make sure there is a CouchDB _id
            memory._id = memory['@id'];
            if (memory._attachments) {
                console.debug(`Doc ${id} does NOT exist in db. Local has _attachments`);
                const attachments = convertAttachments(memory._attachments);
                delete memory._attachments;
                await this.db?.multipart.insert(memory, attachments, memory['@id']);
            } else {
                console.debug(`Doc ${id} does NOT exist in db. Local has NO _attachments`);
                await this.db?.insert(memory);    
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
