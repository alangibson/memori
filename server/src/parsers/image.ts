import Tesseract, { RecognizeResult } from 'tesseract.js';
import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString } from './index';

export class ImageParser implements IParser {

    private language: string;

    constructor(language: string) {
        this.language = language;
    }

    async parse(response: ICommittable): Promise<IMemory[]> {

        console.debug(`ImageParser.parse() : Parsing ${response.encodingFormat} ${response.url}`);

        // Perform OCR
        console.debug(`ImageParser.parse() : Performing OCR on ${response.encodingFormat} ${response.url}`);
        const result: RecognizeResult = await Tesseract.recognize(
            response.blob,
            this.language,
            {
                logger: (m) => console.debug(`ImageParser.parse() : Tesseract.recognize() said ${JSON.stringify(m)}`),
                errorHandler: (error) => console.error(`ImageParser.parse() : Tesseract.recognize() error ${error}`)
            }
        );
        
        // console.warn(`ImageParser.parse() : Tesseract is disabled!`);
        // // @ts-ignore
        // const result: RecognizeResult = { data: { text: '' } };

        return [
            {
                "@context": "https://schema.org",
                "@type": "ImageObject",
                "@id": response.url.toString(),
                url: response.url,
                text: result.data.text,
                abstract: abstractFromString(result.data.text),
                name: response.name || result.data.text.slice(0, 50),
                description: abstractFromString(result.data.text),
                encodingFormat: response.encodingFormat,
                // TODO get these somehow
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                datePublished: new Date().toISOString(),
                'm:created': new Date().toISOString()
            }
        ];
    }
}