import { promises as fs } from "fs";
import { URL } from 'url';
import { SearchResult } from 'minisearch';
import crypto from 'crypto';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from "multiformats/bases/base32";
import { ICommittable, IMemory, IRememberable } from './models'
import { Enhancer } from "./enhancers";
import { Index } from "./indexer";
import { Commands } from "./commands";
import { FileFetcher, HttpFetcher } from "./fetcher";
import { Parser } from './parsers';
import { Config } from "./configuration";

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
    private config: Config;

    constructor(jailPath: string, space: string, name: string) {
        this.path = `${jailPath}/${space}/${name}`;
        this.commands = new Commands(`${this.path}/commands`);
        this.index = new Index(`${this.path}/index`);
        this.config = Config.getInstance();
    }

    static async create(jailPath: string, space: string, name: string): Promise<Mind> {
        // TODO remove this duplicate path building
        // const path: string = `${jailPath}/${space}/${name}`;
        // const configPath: string = `${path}/config`;
        // await mkdir(configPath);
        return new Mind(jailPath, space, name);
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
        return await new Parser(await this.config.settings())
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
        let things: IMemory[] = await this.parse(rememberable);

        // Special case. WebPage is always position 0
        const memory = things[0];

        // TODO what about attachments to all the other things in array?

        // Add attachments to primary memory
        memory._attachments = {
            [memory['@id']]: {
                content_type: rememberable.encodingFormat,
                data: rememberable.blob
            }
        };

        // Enhance all schemas
        // WARNING: @id of subthings can be changed by enhancers!
        things = await Promise.all(
            things.map(async (thing) => new Enhancer(await this.config.settings())
                .enhance(thing)));

        // TODO enhance all thing['m:embedded']
            
        // Write into Index
        await this.index.index(things);

        // TODO flatten things in to a WebPage memory and return

        // Return memory we stored
        return memory;
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
        return await this.index.save();
    }

    // Load from disk
    async load() {
        return await this.index.load();
    }

    async clear() {
        return await this.index.clear();
    }

}
