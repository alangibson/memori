import { URL } from 'url';
import { ICommittable } from 'src/models';
import { IFetcher, IResource } from '.';
import fetch, { Response } from 'node-fetch';
import { JSDOM } from 'jsdom';

export class HttpFetcher implements IFetcher {
    async fetch(uri: URL): Promise<IResource> {
        console.debug('HttpFetcher.fetch() : Fetching', uri.href);

        // Fetch file via HTTP
        const response: Response = await fetch(uri.toString(), {
            redirect: 'follow'
        });

        // Make sure we have a mime type without encoding info
        let mimeType: string | null = response.headers.get('Content-Type');
        if (!mimeType)
            throw new Error(`Could not determine mime type for : ${uri}`);
        else mimeType = mimeType.split(';')[0];

        // return {
        //     encodingFormat: mimeType,
        //     blob: await response.buffer(),
        //     url: uri
        // };

        return new HtmlResource(uri, await response.buffer(), mimeType);
    }
}

export class HtmlResource implements IResource {
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
        const results: URL[] = [];
        const dom = new JSDOM(this.blob.toString('utf8'));
        dom.window.document
            .querySelectorAll('a[href]')
            // @ts-ignore
            .forEach((link: HTMLAnchorElement) => {
                console.log('FOUND', link);
                if (link.href) results.push(new URL(link.href, this.url));
            });

        return results;
    }
}
