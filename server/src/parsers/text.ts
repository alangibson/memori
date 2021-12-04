import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString, nameFromString } from './index';

export class TextParser implements IParser {

    async parse(response: ICommittable): Promise<IMemory[]> {
        const atId = response.url.toString();
        const text = response.blob.toString('utf8');
        return [
            {
                "@context": 'https://schema.org',
                "@id": atId,
                "@type": 'TextDigitalDocument',
                name: response.name || nameFromString(text) || response.url.pathname,
                url: response.url,
                text: text,
                encodingFormat: response.encodingFormat,
                abstract: abstractFromString(text),
                'm:created': new Date().toISOString(),
                _attachments: {
                    [atId]: {
                        data: response.blob,
                        content_type: response.encodingFormat,
                        length: response.blob.length
                    }
                }
            }
        ]
    }
}