import mime from 'mime-types';
import fetch, { Response } from 'node-fetch';
import { promises as fs } from "fs";
import { URL } from 'url';
import { IRememberable, ICommittable } from './models';

interface IFetcher {

    fetch(uri: URL): Promise<IRememberable>;

}

export class FileFetcher implements IFetcher {

    async fetch(uri: URL): Promise<ICommittable> {

        // Determine mime type for local file
        // @ts-ignore because we do a null check immediately after
        const mimeType: RememberableType = mime.lookup(uri.toString()) || 'application/octet-stream';

        console.log(mimeType);

        // Slurp file contents
        const blob: Buffer = await fs.readFile(uri);

        return {
            encodingFormat: mimeType,
            blob: blob,
            url: uri
        }
    }

}

export class HttpFetcher implements IFetcher {

    async fetch(uri: URL): Promise<ICommittable> {

        console.debug('Fetching', uri.href);

        // Fetch file via HTTP
        const response: Response = await fetch(uri.toString(), {
            redirect: "follow"
        });

        // Make sure we have a mime type without encoding info
        // @ts-ignore because we do a null check immediately after
        let mimeType: RememberableType = response.headers.get('Content-Type');
        if (mimeType == null)
            throw new Error(`Could not determine mime type for : ${uri}`);
        else
            // @ts-ignore because it doesn't matter if it's not a RememberableType
            mimeType = mimeType.split(';')[0];

        return {
            encodingFormat: mimeType,
            blob: await response.buffer(),
            url: uri
        }

    }

}
