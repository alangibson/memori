import { SpeachToText } from "../stt";
import { cidUrl } from "../index";
import { IRememberable, IMemory } from "../models";
import { abstractFromString, IParser, nameFromString } from "./index";

// https://github.com/alphacep/vosk-api/blob/master/nodejs/demo/test_simple_async.js
export class AudioParser implements IParser {

    private stt: SpeachToText;

    constructor(modelPath: string) {
        this.stt = new SpeachToText(modelPath);
    }

    async parse(response: IRememberable): Promise<IMemory[]> {
        const text: string = await this.stt.recognize(response.blob);
        const atId = response.url?.toString() || cidUrl(response.blob).toString();
        return [
            {
                "@context": 'https://schema.org',
                "@type": 'AudioObject',
                "@id": atId,
                name: response.name || nameFromString(text),
                url: response.url || cidUrl(response.blob),
                text: text,
                "m:created": new Date().toISOString(),
                encodingFormat: response.encodingFormat,
                abstract: abstractFromString(text),
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