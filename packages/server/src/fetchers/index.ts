import { URL } from 'url';
import { ICommittable } from '../models';
import { FileFetcher } from './file';
import { HtmlResource, HttpFetcher } from './http';

export interface IFetcher {
    fetch(uri: URL): Promise<IResource>;
}

// Can be an HTML page, local directory, local file, etc.
export interface IResource extends ICommittable {
    links(): Promise<URL[]>;
}

class LinklessResource implements IResource {
    encodingFormat: string;
    blob: Buffer;
    url: URL;
    name?: string;
    encoding?: string;

    constructor(
        url: URL,
        blob: Buffer,
        encodingFormat: string,
        encoding?: string,
        name?: string
    ) {
        this.url = url;
        this.blob = blob;
        this.encodingFormat = encodingFormat;
        this.encoding = encoding;
        this.name = name;
    }

    async links(): Promise<URL[]> {
        return [];
    }
}

export class Resource {
    public static from(committable: ICommittable): IResource {
        if (committable.encodingFormat == 'text/html') {
            return new HtmlResource(
                committable.url,
                committable.blob,
                committable.encodingFormat,
                committable.encoding,
                committable.name
            );
        } else {
            return new LinklessResource(
                committable.url,
                committable.blob,
                committable.encodingFormat,
                committable.encoding,
                committable.name
            );
        }
    }
}

function selectFetcher(uri: URL): IFetcher | null {
    if (uri.protocol.startsWith('http')) return new HttpFetcher();
    else if (uri.protocol.startsWith('file')) return new FileFetcher();
    else return null;
}

export class Fetcher implements IFetcher {
    public static from(fetchable: ICommittable | URL): IFetcher {
        // @ts-ignore because this should be safe given the types used
        const url = fetchable.url || fetchable;
        // Build fetcher
        const fetcher: IFetcher | null = selectFetcher(url);
        if (!fetcher)
            throw new Error(`Protocol not supported : ${url.protocol}`);
        return fetcher;
    }

    public async fetch(uri: URL): Promise<IResource> {
        // Dispatch to the appropriate fetcher
        return Fetcher.from(uri).fetch(uri);
    }
}
