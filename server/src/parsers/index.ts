import { ISettings } from "src/configuration";
import { ICommittable, IMemory } from "../models";
import { AudioParser } from "./audio";
import { BinaryParser } from './binary';
import { DocumentParser } from "./document";
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

export function nameFromString(s: string): string {
    // Remove multiple spaces and all newlines
    return s.slice(0, 50);
}

export class Parser implements IParser {

    private settings: ISettings;

    constructor(settings: ISettings) {
        this.settings = settings;
    }

    async parse(response: ICommittable): Promise<IMemory[]> {
        if (response.encodingFormat.startsWith('text/html')) {
            return new WebPageParser().parse(response);
        } else if (response.encodingFormat.startsWith('image/')) {
            return new ImageParser(this.settings.ocrLanguage).parse(response);
        } else if (response.encodingFormat.startsWith('application/pdf')) {
            return new PdfParser().parse(response);
        } else if (response.encodingFormat.startsWith('application/')) {
            // Send all other application types through the generic text extractor
            return new DocumentParser().parse(response);
        } else if (response.encodingFormat.startsWith('audio/')) {
            return new AudioParser(`${process.cwd()}/etc/${this.settings.voskModel}`)
                .parse(response);
        } else if (response.encodingFormat.startsWith('video/')) {
            // TODO create a VideoParser
            // FIXME temporary hack because audio/webm file is uploade as video/webm
            return new AudioParser(`${process.cwd()}/etc/${this.settings.voskModel}`)
                    .parse(response);
        } else if (response.encodingFormat.startsWith('text/plain') || 
                   response.encodingFormat.startsWith('text/markdown')) {
            return new TextParser().parse(response);
        } else {
            // Last ditch effort
            return new BinaryParser().parse(response);
        }
    }

}