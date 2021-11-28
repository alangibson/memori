import flexSearch, { IndexSearchResult } from 'flexsearch';
import { IPersistable } from 'src';
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

        const d: { [key: string]: string } = {};
        this.index
            .export(async (key: string | number, data: string) => {
                const k = key.toString().split('.').pop() || '';
                d[k] = data;
            });

        // We have to sleep because of function async() in serialize.js
        await new Promise(resolve => setTimeout(resolve, 1000));

        // TODO turn on
        // Store to PouchDB
        // for (const [key, data] of Object.entries(d)) {
        //     await this.db.upsert(`memori/flexsearch/${key}`, () => ({
        //         _id: `memori/flexsearch/${key}`,
        //         data: data
        //     }));
        // }
    }

    async load() {
        try {
            const keys = ['reg', 'cfg', 'map', 'ctx'];
            for (const key of keys) {
                // @ts-ignore
                this.index.import(key, (await this.db.get(`memori/flexsearch/${key}`)).data);
            }
        } catch (e) {
            console.debug(`FlexsearchSearch.load() : No existing index: ${e}`);
        }
    }

    async clear() {
        throw new Error("FlexsearchSearch.clear() : Method not implemented.");
    }

}
