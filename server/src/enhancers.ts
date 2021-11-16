import { promises as fs } from "fs";
import mime from 'mime-types';
import youtubedl, { YtResponse } from 'youtube-dl-exec';
import { MediaObject } from "schema-dts";
import { IIndexable, IMemory } from "./models";

// export type ProcessingResultType = [IMemory, IRememberable]

// Does additional processing of Schema.org schemas
interface ISchemaEnhancer {
    // Do things like OCR, speech recognition, download video
    // Also can produce video, audio, or image blobs.
    // Either url, contentUrl or embedUrl must be set.
    enhance(media: IIndexable | MediaObject): Promise<IMemory>;
}

// export class WebPageSchemaEnhancer implements ISchemaEnhancer {
//     async enhance(media: IIndexable): Promise<Memory> {
//         return {
//             "@context": 'https://schema.org',
//             "@type": "WebPage",
//             "@id": id,
//             url: response.location.toString(),
//             name: microdata?.general?.title?.trim() || doc?.title?.trim(),
//             abstract: abstractFromString(text),
//             description: microdata?.general?.description?.trim() || abstractFromString(text),
//             dateCreated: doc.lastModified,
//             dateModified: doc.lastModified,
//             datePublished: doc.lastModified,
//             encodingFormat: response.mimeType,
//             // This is what we index for full text search
//             text: text,
//         };
//     }
// }

export class Enhancer implements ISchemaEnhancer {

    async enhance(media: IIndexable): Promise<IMemory> {
        if (media["@type"] == 'VideoObject')
            return new VideoSchemaEnhancer().enhance(media);
        else
            // TODO is this cast safe?
            return <IMemory>media;
    }

}

export class VideoSchemaEnhancer implements ISchemaEnhancer {

    async enhance(media: IIndexable): Promise<IMemory> {

        const [ basename, format ] = [ Buffer.from(media.url+media['@type']).toString('base64url'), 'mp4' ];
        const filename = `${basename}.${format}`;

        console.log(`Getting video ${media.url}`);

        // Get video info with youtube-dl
        const response: YtResponse = await youtubedl(media.url.toString(), {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
            format: format
        });

        // Actually download the file
        // await youtubedl(media.url, {
        //     noCallHome: true,
        //     noCheckCertificate: true,
        //     youtubeSkipDashManifest: true,
        //     format: format,
        //     output: filename
        // });
        console.warn(`VideoSchemaEnhancer.enhance() : Youtube-dl download is disabled!`);

        // Read downloaded file in from local drive
        // const mimeType: string|false = mime.lookup(filename);
        // if (! mimeType)
        //     throw new Error(`Could not determine mime type for : ${filename}`);
        // const buffer: Buffer = await fs.readFile(filename);

        // TODO run vosk on blob

        // then delete it
        // await fs.unlink(filename);

        const buffer = Buffer.from('TODO');
        const mimeType = `video/${format}`;

        // TODO site name is response.extractor
        // duration (seconds?)
        // categories and tags (list of keywords)
        // thumbnailUrl = response.thumbnail
        // source url = response.webpage_ur

        // We need to try to make @id different from the url of the parent WebPage
        // because most tube sites have id conflicts
        const id: string = response.url || media['@id'];

        const memory: IMemory = {
            ...media,
            '@id': id,
            '@context': 'https://schema.org',
            url: new URL(response.url),
            name: response.title,
            encodingFormat: mimeType,
            description: response.description,
            abstract: response.description,
            author: response.uploader,
            dateCreated: response.upload_date,
            dateModified: response.upload_date,
            _attachments: {
                [id]: {
                    content_type: mimeType,
                    data: buffer
                }
            }
        };

        return memory;
    }

}
