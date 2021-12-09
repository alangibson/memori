import { cidUrl } from '../index';
import textract from 'textract';
// @ts-ignore
import getDocumentProperties from 'office-document-properties';
// import extractText from 'office-text-extractor';
import { ICommittable, IMemory } from '../models';
import { abstractFromString, IParser, nameFromString } from './index';

export class DocumentParser implements IParser {
    async parse(response: ICommittable): Promise<IMemory[]> {
        console.debug(
            `DocumentParser.parse() : Parsing blob of size ${response.blob.length}`
        );

        // Extract all text from document
        const allText: string = await new Promise((resolve, reject) => {
            textract.fromBufferWithMime(
                response.encodingFormat,
                response.blob,
                (error: Error, text: string) => {
                    if (error) reject(error);
                    else resolve(text);
                }
            );
        });

        // Extract metadata from document
        let partialMemory: Partial<IMemory> = await new Promise(
            (resolve, reject) => {
                getDocumentProperties.fromBuffer(
                    response.blob,
                    (error: Error, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            const m: Partial<IMemory> = {};
                            if (data.created) m.dateCreated = data.created;
                            if (data.modified) m.dateModified = data.modified;
                            if (data.title) m.name = data.title;
                            resolve(m);
                        }
                    }
                );
            }
        );

        const atId = cidUrl(response.blob).toString();
        return [
            {
                ...partialMemory,
                '@context': 'https://schema.org',
                '@type': 'TextDigitalDocument',
                '@id': atId,
                encodingFormat: response.encodingFormat,
                abstract: abstractFromString(allText),
                name: nameFromString(allText),
                text: allText,
                url: response.url,
                'm:created': new Date().toISOString(),
                _attachments: {
                    [atId]: {
                        data: response.blob,
                        content_type: response.encodingFormat,
                        length: response.blob.length
                    }
                }
            }
        ];
    }
}
