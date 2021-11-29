import { Tensor3D } from '@tensorflow/tfjs';
import tfModel, { DetectedObject } from '@tensorflow-models/coco-ssd';
import Tensorflow from '@tensorflow/tfjs-node';
import  Tesseract from "node-tesseract-ocr";
import { abstractFromString } from '../parsers';
import { IMemory } from '../models';
import { IEnhancer } from '.';

export class ImageEnhancer implements IEnhancer {

    private language: string;

    constructor(language: string) {
        this.language = language;
    }

    private async ocr(blob: Buffer): Promise<string> {
        return await Tesseract.recognize(blob,
            {
                lang: this.language
            });
    }

    private async detect(blob: Buffer): Promise<string> {
        // Casting to Tensor3D because that is alway returned when expandAnimations=false
        const image: Tensor3D = <Tensor3D>Tensorflow.node.decodeImage(blob, 3, undefined, false)
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

        // Try to get attachment blob. Return Memory unchanged if we can't
        const blob: Buffer|undefined = memory._attachments?.[memory['@id']]?.data;
        if (blob == undefined)
            return memory;

        // Perform OCR
        console.debug(`ImageParser.parse() : Performing OCR ${memory.encodingFormat} ${memory.url}`);
        const ocrText = await this.ocr(blob);

        // Perform image recognition
        console.debug(`ImageParser.parse() : Performing object recognition ${memory.encodingFormat} ${memory.url}`);
        const detectedKeywords = await this.detect(blob);

        const text = ocrText + ' ' + detectedKeywords;
        return {
            ...memory,
            text: memory.text + ' ' + text,
            abstract: abstractFromString(text),
            name: memory.name || text.slice(0, 50),
            description: abstractFromString(text),
        }
    }

}