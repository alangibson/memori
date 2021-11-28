import { promises as fs } from "fs";
import { URL } from 'url';
import { SearchResult } from 'minisearch';
import crypto from 'crypto';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from "multiformats/bases/base32";
import { ICommittable, IMemory, IRememberable } from './models'
import { Enhancer } from "./enhancers";
import { Index } from "./indexer/indexer";
import { Commands } from "./commands";
import { FileFetcher, HttpFetcher } from "./fetcher";
import { Parser } from './parsers';
import { ISettings } from "./configuration";

export interface IPersistable {
    save(): void;
    load(): void;
    clear(): void;
}

export interface IQuery {
    // Free text query
    q: string;
}

export function cidUrl(b : Buffer): URL {
    const encoded = crypto.createHash('sha256')
        .update(b)
        .digest('hex');
    return new URL(`cid:${encoded}`);
}

export async function contentHashUrl(b : Buffer) : Promise<URL> {
    const cid = CID.create(1, 0x00,
        await sha256.digest(new Uint8Array(b)));
    return new URL('cid:' + cid.toV1().toString(base32.encoder));
}

export async function mkdir(path: string) {
    await fs.mkdir(path, { recursive: true });
}

export interface IRecalledMemory {
    thing: IMemory;
    recall?: SearchResult;
}

export class Mind implements IPersistable {

    private path: string;
    public commands: Commands;
    private index: Index;
    private settings: ISettings;

    constructor(settings: ISettings, jailPath: string, space: string, name: string) {
        this.settings = settings;
        this.path = `${jailPath}/${space}/${name}`;
        this.commands = new Commands(`${this.path}/commands`);
        // CouchDB db names much begin with a lowercase letter
        this.index = new Index(`space/${space}/db/${name}`, settings);
    }

    static async create(settings: ISettings, jailPath: string, space: string, name: string): Promise<Mind> {
        return new Mind(settings, jailPath, space, name);
    }

    public async get(id: URL, attachments: boolean, embedded: boolean): Promise<IMemory> {
        return await this.index.getById(id, attachments, embedded);
    }

    public async fetch(uri: URL): Promise<ICommittable> {
        // Dispatch to the appropriate fetcher
        let response: ICommittable;
        if (uri.protocol.startsWith('http'))
            response = await new HttpFetcher().fetch(uri);
        else if (uri.protocol.startsWith('file'))
            response = await new FileFetcher().fetch(uri);
        else
            // TODO just assume its a local file path
            throw new Error(`Protocol not supported : ${uri.protocol}`);
        return response;
    }

    public async parse(response: ICommittable): Promise<IMemory[]> {
        return await new Parser(this.settings)
            .parse(response);
    }

    // Commit something to Memory
    async commit(rememberable: ICommittable): Promise<IMemory> {

        console.debug(`Mind.commit() : Committing to memory ${rememberable.encodingFormat} ${rememberable.url}`);

        // If we get a url, we need to fetch it
        if (rememberable.encodingFormat == 'text/uri-list') {
            // FIXME iterate over urls, separated by \r\n per spec
            // Fetch resource
            rememberable = await this.fetch(
                new URL(rememberable.blob.toString('utf8')));
        }
        // otherwise we assume we already have a usable resource (ie. blob and mimeType is set)

        // Dispatch Response to parser
        let memories: IMemory[] = await this.parse(rememberable);

        // TODO Don't await enhancements. Instead, return IRemembered with done=false if 
        // enancement will take place.
        // Enhance all schemas
        const enhancements: Promise<IMemory>[] = memories
            .map(async (thing) => new Enhancer(this.settings)
                .enhance(thing))
        // Just do await
        memories = await Promise.all(enhancements);
        // Promises
        // enhancements.forEach((promise: Promise<IMemory>) => {
        //     promise.then((memory: IMemory) => {
        //         this.index.index([memory]);
        //     })
        // });

        console.debug(`Mind.commit() : Queueing ${memories.length} memories for enhancement`);
        // this.worker.enhance(memories);
            
        // Write into Index
        await this.index.index(memories);

        // Return Memory we stored. The first item in the list is always the
        // primary Memory.
        return memories[0];
    }

    // Remember something.
    // This method mainly exists to add missing info before commit().
    async remember(rememberable: IRememberable): Promise<IMemory> {

        // Upgrade type since since we will always have a location
        rememberable.url = rememberable.url || await contentHashUrl(rememberable.blob);
        const commitable: ICommittable = <ICommittable> rememberable;

        // Archive the user input
        await this.commands.log({ action: 'remember', ...commitable });

        // then commit to memory
        return this.commit(commitable);
    }

    async forget(id: URL) {
        await this.commands.remove(id);
        return await this.index.remove(id);
    }

    // Do a free text search
    async search(q: string): Promise<IRecalledMemory[]> {
        return this.index.search(q);
    }

    // Get all the Memories
    async all(): Promise<IRecalledMemory[]> {
        return this.index.all();
    }

    // Recall a single memory by @id
    async recall(atId: URL, attachments: boolean = false): Promise<IRecalledMemory> {
        return {
            thing: await this.index.getById(atId, attachments)
        };
    }

    // Write to disk
    async save() {
        // await this.worker?.save();
        return await this.index.save();
    }

    // Load from disk
    async load() {
        // this.worker = new EnhancementWorker(this.index, 
        //     new Enhancer(await this.config.settings()));
        // await this.worker.load();
        return await this.index.load();
    }

    async clear() {
        return await this.index.clear();
    }

}
