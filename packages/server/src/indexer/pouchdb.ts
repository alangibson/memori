import MiniSearch, { Options, SearchResult } from 'minisearch';
import * as PouchDB from 'pouchdb';
import pouchdbFind from 'pouchdb-find';
import pouchdbUpsert from 'pouchdb-upsert';
import flexSearch, { IndexSearchResult } from 'flexsearch';
import { IDatabase } from './index';
import { IPersistable } from '..';
import { IMemory } from '../models';
import { ISettings } from '../configuration';
// import pouchdbAdapterMemory from 'pouchdb-adapter-memory';

PouchDB.default.plugin(pouchdbFind);
PouchDB.default.plugin(pouchdbUpsert);
// PouchDB.default.plugin(pouchdbAdapterMemory);
// PouchDB.default.plugin(pouchdbQuickSearch);

export class PouchDbDatabase implements IDatabase {
    mindName: string;
    db: PouchDB.Database;

    constructor(name: string, settings: ISettings) {
        this.mindName = name;
        this.db = new PouchDB.default(name);
    }

    get(id: string, options: {}): Promise<IMemory> {
        throw new Error('Method not implemented.');
    }

    all(options: {}): Promise<IMemory[]> {
        throw new Error('Method not implemented.');
    }

    remove(id: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    upsert(id: string, handler: (existing: {}) => IMemory): Promise<void> {
        throw new Error('Method not implemented.');
    }

    save(): void {
        throw new Error('Method not implemented.');
    }

    load(): void {
        throw new Error('Method not implemented.');
    }

    clear(): void {
        throw new Error('Method not implemented.');
    }
}
