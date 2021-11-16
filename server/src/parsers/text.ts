import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString } from './index';

export class TextParser implements IParser {

    async parse(response: ICommittable): Promise<IMemory[]> {

        return [
            {
                "@context": 'https://schema.org',
                "@id": response.url.toString(),
                "@type": 'TextDigitalDocument',
                name: response.name || response.url.pathname,
                url: response.url,
                text: response.blob.toString('utf8'),
                encodingFormat: response.encodingFormat,
                abstract: abstractFromString(response.blob.toString('utf8')),
                'm:created': new Date().toISOString()
            }
        ]

    }

}