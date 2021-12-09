import mime from 'mime-types';
import fetch, { Response } from 'node-fetch';
import { promises as fs } from 'fs';
import { URL } from 'url';
import { IRememberable, ICommittable } from './models';

interface IFetcher {
    fetch(uri: URL): Promise<IRememberable>;
}

export class FileFetcher implements IFetcher {
    async fetch(uri: URL): Promise<ICommittable> {
        // Determine mime type for local file
        // @ts-ignore because we do a null check immediately after
        const mimeType: RememberableType =
            mime.lookup(uri.toString()) || 'application/octet-stream';

        console.log(mimeType);

        // Slurp file contents
        const blob: Buffer = await fs.readFile(uri);

        return {
            encodingFormat: mimeType,
            blob,
            url: uri
        };
    }
}

export class HttpFetcher implements IFetcher {
    async fetch(uri: URL): Promise<ICommittable> {
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

        return {
            encodingFormat: mimeType,
            blob: await response.buffer(),
            url: uri
        };
    }
}

export class Fetcher implements IFetcher {
    public async fetch(uri: URL): Promise<ICommittable> {
        // Dispatch to the appropriate fetcher
        let response: ICommittable;
        if (uri.protocol.startsWith('http'))
            response = await new HttpFetcher().fetch(uri);
        else if (uri.protocol.startsWith('file'))
            response = await new FileFetcher().fetch(uri);
        // TODO just assume its a local file path
        else throw new Error(`Protocol not supported : ${uri.protocol}`);
        return response;
    }
}
