import path from 'path';
import { promises as fs } from 'fs';
import mime from 'mime-types';
import { URL } from 'url';
import { IFetcher, IResource } from '.';

export class FileFetcher implements IFetcher {
    async fetch(uri: URL): Promise<IResource> {
        // Determine mime type for local file
        // @ts-ignore because we do a null check immediately after
        const mimeType: RememberableType =
            mime.lookup(uri.toString()) || 'application/octet-stream';

        console.log(mimeType);

        // Slurp file contents
        const blob: Buffer = await fs.readFile(uri);

        return new FileResource(uri, blob, mimeType);
    }
}

export class FileResource implements IResource {
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
        let results: URL[] = [];

        // If url is dir, then return child urls
        const stat = await fs.lstat(this.url);
        if (stat.isDirectory())
            results = results.concat(
                (await fs.readdir(this.url)).map((name: string) => {
                    return new URL(name, this.url);
                })
            );

        return results;
    }
}
