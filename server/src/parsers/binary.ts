import { cidUrl } from "..";
import { ICommittable, IMemory } from "../models";
import { IParser } from "./index";

export class BinaryParser implements IParser {

    async parse(response: ICommittable): Promise<IMemory[]> {
        
        return [{
            "@context": 'https://schema.org',
            "@type": 'DigitalDocument', 
            "@id": cidUrl(response.blob).toString(),
            name: response.name || cidUrl(response.blob).toString(),
            url: response.url,
            "m:created": new Date().toISOString(),
            encodingFormat: response.encodingFormat,
            abstract: '(No abstract available for binary files)',
            text: '', // nothing else we can do here
        }];

    }

}