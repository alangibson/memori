import { SpeachToText } from "../stt";
import { IMemory } from "../models";
import { IEnhancer } from ".";
import { abstractFromString, nameFromString } from "../parsers";

export class AudioEnhancer implements IEnhancer {


    private stt: SpeachToText;

    constructor(modelPath: string) {
        this.stt = new SpeachToText(modelPath);
    }

    async enhance(memory: IMemory): Promise<IMemory> {
        
        // Try to get attachment blob. Return Memory unchanged if we can't
        const blob: Buffer|undefined = memory._attachments?.[memory['@id']]?.data;
        if (blob == undefined)
            return memory;
        
        // Transform speach to text
        const text: string = await this.stt.recognize(blob);

        return {
            ...memory,
            name: memory.name || nameFromString(text),
            text: text,
            abstract: abstractFromString(text),
        }
    }

}