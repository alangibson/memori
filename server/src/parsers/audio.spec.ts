import 'jest';
import { promises as fs } from "fs";
import { AudioParser } from "./audio";

describe('AudioParser' , () => {


    it('parse()', async () => {
        // Given
        const parser = new AudioParser(`${process.cwd()}/vosk-model-en-us-0.22`)
        const blob = await fs.readFile('./test/data/Welcome.mp3');
        // When
        const out = await parser.parse({
            blob: blob,
            encodingFormat: 'audio/mp3'
        });
        // Then
        console.log(out);
    });

});