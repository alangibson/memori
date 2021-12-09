import { cidUrl } from '..';
import { ICommittable, IMemory } from '../models';
import { IParser } from './index';

export class BinaryParser implements IParser {
    async parse(response: ICommittable): Promise<IMemory[]> {
        const atId = cidUrl(response.blob).toString();
        return [
            {
                '@context': 'https://schema.org',
                '@type': 'DigitalDocument',
                '@id': atId,
                name: response.name || atId,
                url: response.url,
                'm:created': new Date().toISOString(),
                encodingFormat: response.encodingFormat,
                abstract: '(No abstract available for binary files)',
                text: '', // nothing else we can do here
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
