import { IPersistable } from '..';
import { IMemory } from '../models';

export interface IDatabase extends IPersistable {

    get(id: string, options: {}): Promise<IMemory>;

    all(options: {}): Promise<IMemory[]>;

    remove(id: string): Promise<void>;

    upsert(id: string, handler: (existing: {}) => IMemory): Promise<void>;

}
