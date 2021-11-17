import { Writable, Readable } from 'stream';
import { cidUrl } from "..";
import { IRememberable, IMemory } from "../models";
import { abstractFromString, IParser, nameFromString } from "./index";
import { Converter } from "ffmpeg-stream";
// @ts-ignore
import vosk from 'vosk';

// https://github.com/alphacep/vosk-api/blob/master/nodejs/demo/test_simple_async.js
export class AudioParser implements IParser {

    private modelPath: string;

    constructor(modelPath: string) {
        this.modelPath = modelPath;
    }

    async parse(response: IRememberable): Promise<IMemory[]> {

        class VoskWritableStream extends Writable {

            recognizer: vosk.Recognizer;
            public text: string;

            constructor(recognizer: vosk.Recognizer) {
                super();
                this.recognizer = recognizer;
                this.text = '';
            }

            _write(chunk: any, encoding: BufferEncoding, next: (error?: Error | null) => void) {
                if (this.recognizer.acceptWaveform(chunk)) {
                    this.text += recognizer.result().text;
                }
                next();
            }

            _final(next: (error?: Error | null) => void) {
                this.text += recognizer.finalResult(recognizer).text;
                next();
            }

        }

        // Convert to wav format required by Vosk
        const model = new vosk.Model(this.modelPath);
        const recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
        const voskStream = new VoskWritableStream(recognizer);

        // With ffmpeg-stream
        const converter = new Converter();
        const converterInput = converter.createInputStream({});
        const converterOutput = converter.createOutputStream({
            loglevel: '0',
            ar: '16000',
            ac: '1',
            f: 's16le',
            bufsize: '4000'
        });
        Readable.from(response.blob, {'highWaterMark': 4096})
            .pipe(converterInput);
        converterOutput
            .pipe(voskStream);
        await converter.run();

        // Free resources
        recognizer.free();
        model.free();

        return [
            {
                "@context": 'https://schema.org',
                "@type": 'AudioObject',
                "@id": response.url?.toString() || cidUrl(response.blob).toString(),
                name: response.name || nameFromString(voskStream.text),
                url: response.url || cidUrl(response.blob),
                text: voskStream.text,
                "m:created": new Date().toISOString(),
                encodingFormat: response.encodingFormat,
                abstract: abstractFromString(voskStream.text)
            }
        ]

    }

}