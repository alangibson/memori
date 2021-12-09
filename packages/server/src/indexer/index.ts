import { IPersistable } from '..';
import { IMemory } from '../models';

export interface DatabaseGetOptions {
    attachments?: boolean;
    att_encoding_info?: boolean;
    atts_since?: any[];
    binary?: boolean;
    conflicts?: boolean;
    deleted_conflicts?: boolean;
    latest?: boolean;
    local_seq?: boolean;
    meta?: boolean;
    open_revs?: any[];
    rev?: string;
    revs?: boolean;
    revs_info?: boolean;
}

export interface IDatabase extends IPersistable {
    get(id: string, options?: DatabaseGetOptions): Promise<IMemory>;

    all(options: {}): Promise<IMemory[]>;

    remove(id: string): Promise<void>;

    upsert(id: string, handler: (existing: {}) => IMemory): Promise<void>;
}
