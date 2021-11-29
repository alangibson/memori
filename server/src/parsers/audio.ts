import { cidUrl } from "../index";
import { IRememberable, IMemory } from "../models";
import { IParser } from "./index";

// https://github.com/alphacep/vosk-api/blob/master/nodejs/demo/test_simple_async.js
export class AudioParser implements IParser {

    async parse(response: IRememberable): Promise<IMemory[]> {
        const atId = response.url?.toString() || cidUrl(response.blob).toString();
        return [
            {
                "@context": 'https://schema.org',
                "@type": 'AudioObject',
                "@id": atId,
                name: response.name || '',
                url: response.url || cidUrl(response.blob),
                text: '',
                "m:created": new Date().toISOString(),
                encodingFormat: response.encodingFormat,
                abstract: '',
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