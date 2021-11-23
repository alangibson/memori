import { Writable, Readable } from 'stream';
import { Converter } from "ffmpeg-stream";
// @ts-ignore
import vosk from 'vosk';

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
            this.text += this.recognizer.result().text;
        }
        next();
    }

    _final(next: (error?: Error | null) => void) {
        this.text += this.recognizer.finalResult(this.recognizer).text;
        next();
    }

}

export class SpeachToText {

    private modelPath: string;

    constructor(modelPath: string) {
        this.modelPath = modelPath;
    }

    async recognize(blob: Buffer): Promise<string> {

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
        Readable.from(blob, { 'highWaterMark': 4096 })
            .pipe(converterInput);
        converterOutput
            .pipe(voskStream);
        await converter.run();

        // Free resources
        recognizer.free();
        model.free();

        return voskStream.text;
    }

}