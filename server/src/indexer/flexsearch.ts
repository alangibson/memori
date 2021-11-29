import flexSearch, { IndexSearchResult } from 'flexsearch';
import { IPersistable } from '../index';
import { IMemory } from '../models';
import { IDatabase } from './index';

export interface ISearchIndex {

    // Full text search for q, return array of @id as URL
    search(q: string): Promise<URL[]>;

    add(id: URL, text: string): Promise<void>;

    update(id: URL, text: string): Promise<void>;

    remove(id: URL): Promise<void>;
}

export class FlexsearchSearch implements ISearchIndex, IPersistable {

    db: IDatabase;
    index: flexSearch.Index;

    constructor(db: IDatabase) {
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

        // Export index from Flexsearch
        const d: { [key: string]: string } = {};
        this.index
            .export(async (key: string | number, data: string) => {
                const k = key.toString().split('.').pop() || '';
                d[k] = data;
            });
        // We have to sleep because of function async() in serialize.js
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Store to db as a Memory
        for (const [key, data] of Object.entries(d)) {
            await this.db.upsert(`memori/flexsearch/${key}`, (existing) => ({
                ...existing,
                "@id": `memori/flexsearch/${key}`,
                "@context": 'https://schema.org',
                "@type": 'Dataset',
                name: `memori/flexsearch/${key}`,
                "m:created": new Date().toISOString(),
                abstract: `memori/flexsearch/${key}`,
                encodingFormat: 'application/json',
                text: `memori/flexsearch/${key}`,
                url: new URL(`file:///memori/flexsearch/${key}`),
                _attachments: {
                    [`memori/flexsearch/${key}`]: {
                        content_type: 'application/json',
                        data: Buffer.from(data, 'utf8'),
                    }
                }
            }));
        }
    }

    async load() {
        try {
            const keys = ['reg', 'cfg', 'map', 'ctx'];
            for (const key of keys) {
                const id = `memori/flexsearch/${key}`;
                const index: IMemory = await this.db.get(id, {
                    attachments: true,
                    binary: true
                });
                const data: Buffer|undefined = index._attachments?.[index['@id']].data;
                if (data != undefined)
                    this.index.import(key, data.toString('utf8'));
                else
                    console.debug(`FlexsearchSearch.load() : Couldn't retrieve index part ${id}`);
            }
        } catch (e) {
            console.debug(`FlexsearchSearch.load() : No existing index: ${e}`);
        }
    }

    async clear() {
        throw new Error("FlexsearchSearch.clear() : Method not implemented.");
    }

}
