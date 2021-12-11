import 'jest';
import { promises as fs } from 'fs';
import { AudioParser } from './audio';

describe('AudioParser', () => {
    it('parse()', async () => {
        // Given
        const parser = new AudioParser();
        const blob = await fs.readFile('./test/data/Welcome.mp3');
        // When
        const out = await parser.parse({
            blob: blob,
            encodingFormat: 'audio/mp3'
        });
        // TODO Then
        // console.log(out);
    });
});
