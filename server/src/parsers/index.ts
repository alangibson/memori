import { ICommittable, IMemory } from "../models";
import { AudioParser } from "./audio";
import { BinaryParser } from './binary';
import { ImageParser } from "./image";
import { PdfParser } from "./pdf";
import { TextParser } from "./text";
import { WebPageParser } from "./webpage";

export interface IParser {

    parse(response: ICommittable): Promise<IMemory[]>;

}

export function abstractFromString(s: string): string {
    // Remove multiple spaces and all newlines
    return s.slice(0, 255);
}

export class Parser implements IParser {

    async parse(response: ICommittable): Promise<IMemory[]> {
        if (response.encodingFormat.startsWith('text/html')) {
            return new WebPageParser().parse(response);
        } else if (response.encodingFormat.startsWith('image/')) {
            // TODO languages should be user configurable
            return new ImageParser('eng').parse(response);
        } else if (response.encodingFormat.startsWith('application/pdf')) {
            return new PdfParser().parse(response);
        } else if (response.encodingFormat.startsWith('audio/')) {
            // TODO make model configurable
            return new AudioParser(`${process.cwd()}/vosk-model-en-us-0.22`)
                .parse(response);
        } else if (response.encodingFormat.startsWith('video/')) {
            // FIXME temporary hack because audio/webm file is uploade as video/webm
            // TODO make model configurable
            return new AudioParser(`${process.cwd()}/vosk-model-en-us-0.22`)
                    .parse(response);
        } else if (response.encodingFormat.startsWith('text/plain') || 
                   response.encodingFormat.startsWith('text/markdown')) {
            return new TextParser().parse(response);
        } else {
            return new BinaryParser().parse(response);
        }
    }

}