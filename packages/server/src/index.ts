import { promises as fs } from 'fs';
import { URL } from 'url';
import { SearchResult } from 'minisearch';
import crypto from 'crypto';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';
import {
    ICommittable,
    IMemory,
    IRememberable,
    RememberOptions
} from './models';
import { Enhancer } from './enhancers';
import { Index } from './indexer/indexer';
import { Commands } from './commands';
import { Fetcher, IResource, Resource } from './fetchers';
import { Parser } from './parsers';
import { ISettings } from './configuration';
import { Crawler } from './crawler/crawler';

export interface IPersistable {
    save(): void;
    load(): void;
    clear(): void;
}

export interface IQuery {
    // Free text query
    q: string;
}

export function cidUrl(b: Buffer): URL {
    const encoded = crypto.createHash('sha256').update(b).digest('hex');
    return new URL(`cid:${encoded}`);
}

export async function contentHashUrl(b: Buffer): Promise<URL> {
    const cid = CID.create(1, 0x00, await sha256.digest(new Uint8Array(b)));
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
    public readonly name: string;
    public readonly space: string;
    private path: string;
    public commands: Commands;
    private index: Index;
    private settings: ISettings;

    constructor(
        settings: ISettings,
        jailPath: string,
        space: string,
        name: string
    ) {
        this.name = name;
        this.space = space;
        this.settings = settings;
        this.path = `${jailPath}/${space}/${name}`;
        this.commands = new Commands(`${this.path}/commands`);
        // CouchDB db names much begin with a lowercase letter
        this.index = new Index(`space/${space}/db/${name}`, settings);
    }

    static async create(
        settings: ISettings,
        jailPath: string,
        space: string,
        name: string
    ): Promise<Mind> {
        return new Mind(settings, jailPath, space, name);
    }

    public async get(
        id: URL,
        attachments: boolean,
        embedded: boolean
    ): Promise<IMemory> {
        return await this.index.getById(id, attachments, embedded);
    }

    public async fetch(uri: URL): Promise<ICommittable> {
        console.debug(`Mind.fetch() : Fetching uri: ${uri}`);
        return await new Fetcher().fetch(uri);
    }

    public async parse(response: ICommittable): Promise<IMemory[]> {
        return await new Parser(this.settings).parse(response);
    }

    // TODO URL should be crawlable too? That way we can replace fetch()
    async *crawl(crawlable: ICommittable, options: RememberOptions) {
        // Construct crawler
        const crawler = new Crawler(Fetcher.from(crawlable), {
            type: options.crawl,
            depth: options.crawlDepth
        });

        if (crawlable.encodingFormat == 'text/uri-list') {
            // Loop over each uri
            for (const urlString of crawlable.blob.toString().split('\n')) {
                // Yield IResource as they are created
                for await (let r of crawler.crawl(new URL(urlString))) {
                    yield r;
                }
            }
        } else {
            // Upgrade ICommittable to IResource
            const resource: IResource = Resource.from(crawlable);
            // then yield IResource as they are created
            for await (let r of crawler.crawl(resource)) {
                yield r;
            }
        }
    }

    // Commit something to Memory
    async commit(
        committable: ICommittable,
        options: RememberOptions = { crawl: 'single' }
    ): Promise<IMemory[]> {
        console.debug(
            `Mind.commit() : Committing to memory ${committable.encodingFormat} ${committable.url}`
        );

        let allMemories: IMemory[] = [];
        for await (const resource of this.crawl(committable, options)) {
            // Dispatch Response to parser
            let memories: IMemory[] = await this.parse(resource);
            // and save memories to return later
            allMemories = allMemories.concat(memories);

            // Write into Index immediately
            await this.index.index(memories);

            // Enhance all schemas
            const enhancements: Promise<IMemory>[] = memories.map(
                (memory: IMemory) => new Enhancer(this.settings).enhance(memory)
            );

            // Wait for all enhancers to finish then index all in a single batch
            Promise.all(enhancements).then((memories: IMemory[]) => {
                this.index
                    .index(memories)
                    // Make sure search index gets written out
                    .then(() => this.index.save());
            });
        }

        // Return Memory we stored. The first item in the list is always the
        // primary Memory.
        return allMemories;
    }

    // Remember something.
    // This method mainly exists to add missing info before commit().
    async remember(
        rememberable: IRememberable,
        options?: RememberOptions
    ): Promise<IMemory[]> {
        // Upgrade type since since we will always have a location
        rememberable.url =
            rememberable.url || (await contentHashUrl(rememberable.blob));
        const committable: ICommittable = <ICommittable>rememberable;

        // Archive the user input
        await this.commands.log({
            action: 'remember',
            rememberOptions: options,
            ...committable
        });
        // then commit to memory
        return this.commit(committable, options);
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
        return await this.index.all();
    }

    // Recall a single memory by @id
    async recall(
        atId: URL,
        attachments: boolean = false
    ): Promise<IRecalledMemory> {
        return {
            thing: await this.index.getById(atId, attachments)
        };
    }

    // Write to disk
    async save() {
        console.debug('Mind.save()');
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
