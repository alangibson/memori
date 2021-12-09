import sharp from 'sharp';
import { Tensor3D } from '@tensorflow/tfjs';
import tfModel, { DetectedObject } from '@tensorflow-models/coco-ssd';
import Tensorflow from '@tensorflow/tfjs-node';
import Tesseract from 'node-tesseract-ocr';
import { abstractFromString, nameFromString } from '../parsers';
import { IMemory } from '../models';
import { IEnhancer } from '.';

export class ImageEnhancer implements IEnhancer {
    private language: string;

    constructor(language: string) {
        this.language = language;
    }

    private async thumbnail(image: Buffer) {
        return await sharp(image)
            .resize(250, 250, { fit: 'cover', position: 'top' })
            .webp()
            .toBuffer();
    }

    private async ocr(blob: Buffer): Promise<string> {
        return await Tesseract.recognize(blob, {
            lang: this.language
        });
    }

    private async detect(blob: Buffer): Promise<string> {
        // Casting to Tensor3D because that is alway returned when expandAnimations=false
        const image: Tensor3D = <Tensor3D>Tensorflow.node
            .decodeImage(blob, 3, undefined, false)
            // make sure we only have 3 channels or model.detect() will explode
            .slice([0], [-1, -1, 3]);
        const model = await tfModel.load();
        const detections: DetectedObject[] = await model.detect(image);
        const keywords: string = detections
            .map((detection) => detection.class)
            .reduce((prev: string, curr: string) => prev + ' ' + curr, '');
        return keywords;
    }

    async enhance(memory: IMemory): Promise<IMemory> {
        // Make sure attachments is initialized
        if (!memory._attachments) memory._attachments = {};

        // Try to get attachment blob. Return Memory unchanged if we can't
        const blob: Buffer | undefined =
            memory._attachments[memory['@id']]?.data;
        if (blob == undefined) return memory;

        // Perform OCR
        console.debug(
            `ImageParser.parse() : Performing OCR ${memory.encodingFormat} ${memory.url}`
        );
        const ocrText = await this.ocr(blob);

        // Perform image recognition
        console.debug(
            `ImageParser.parse() : Performing object recognition ${memory.encodingFormat} ${memory.url}`
        );
        const detectedKeywords = await this.detect(blob);

        // Make thumbnail
        const thumbnail: Buffer = await this.thumbnail(blob);
        // then add to attachments
        memory._attachments['thumbnail'] = {
            content_type: memory.encodingFormat,
            data: thumbnail,
            length: thumbnail.length
        };

        const text = ocrText + ' ' + detectedKeywords;
        return {
            ...memory,
            text: memory.text + ' ' + text,
            abstract: abstractFromString(text),
            name: memory.name || nameFromString(text),
            description: abstractFromString(text)
        };
    }
}
