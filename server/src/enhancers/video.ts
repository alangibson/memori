import { promises as fs } from "fs";
import mime from 'mime-types';
import youtubedl, { YtResponse } from 'youtube-dl-exec';
import { IIndexable, IMemory } from "../models";
import { SpeachToText } from "../stt";
import { abstractFromString } from "../parsers";
import { IEnhancer } from "./index";

interface IDownloadResult {
    blob: Buffer;
    mimeType: string;
    text: string;
}

export class VideoEnhancer implements IEnhancer {

    private stt: SpeachToText;

    constructor(modelPath: string) {
        this.stt = new SpeachToText(modelPath);
    }

    private async download(media: IIndexable, format: string = 'mp4'): Promise<IDownloadResult> {

        // Figure out filename
        const basename = [Buffer.from(media.url + media['@type']).toString('base64url')];
        const filename = `${basename}.${format}`;

        // Actually download the file
        await youtubedl(media.url.toString(), {
            callHome: false,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
            format: format,
            output: filename,
            verbose: true
        });

        // Read downloaded file in from local drive
        const mimeType: string | false = mime.lookup(filename);
        if (!mimeType)
            throw new Error(`Could not determine mime type for : ${filename}`);
        const buffer: Buffer = await fs.readFile(filename);

        // Run speach to text on video
        console.log(`VideoSchemaEnhancer.enhance() : Performing speach-to-text on ${media.url}`);
        const text: string = await this.stt.recognize(buffer);

        // then delete it
        await fs.unlink(filename);

        return {
            blob: buffer,
            mimeType: mimeType,
            text: text
        };
    }

    async enhance(media: IMemory): Promise<IMemory> {

        // TODO make this configurable
        const format = 'mp4';

        console.log(`VideoSchemaEnhancer.enhance() : Getting video ${media.url}`);

        // Get video info with youtube-dl
        const response: YtResponse = await youtubedl(media.url.toString(), {
            dumpSingleJson: true,
            noWarnings: true,
            callHome: false,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
            format: format
        });

        // Download and OCR video
        // TODO turn on
        const dl = await this.download(media, format);
        media.text = media.text + ' ' + dl.text
        const mimeType = dl.mimeType;

        // TODO site name is response.extractor
        // duration (seconds?)
        // categories and tags (list of keywords)
        // thumbnailUrl = response.thumbnail
        // source url = response.webpage_ur

        // We need to try to make @id different from the url of the parent WebPage
        // because most tube sites have id conflicts
        // const id: string = response.url || media['@id'];
        const id: string = media['@id'];

        const memory: IMemory = {
            ...media,
            '@id': id,
            '@context': 'https://schema.org',
            url: new URL(response.url),
            name: response.title,
            encodingFormat: mimeType,
            // description: response.description,
            abstract: response.description || abstractFromString(media.text),
            author: response.uploader,
            dateCreated: response.upload_date,
            dateModified: response.upload_date, 
            _attachments: {
                [id]: {
                    content_type: dl.mimeType,
                    data: dl.blob
                }
            }
        };

        return memory;
    }

}
