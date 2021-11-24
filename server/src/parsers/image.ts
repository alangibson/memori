import os from 'os';
import { Tensor3D } from '@tensorflow/tfjs';
import tfModel, { DetectedObject } from '@tensorflow-models/coco-ssd';
import Tensorflow from '@tensorflow/tfjs-node';
// import Tesseract, { RecognizeResult } from 'tesseract.js';
import  Tesseract from "node-tesseract-ocr";
import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString } from './index';

export class ImageParser implements IParser {

    private language: string;

    constructor(language: string) {
        this.language = language;
    }

    private async ocr(response: ICommittable): Promise<string> {
        return await Tesseract.recognize(response.blob,
            {
                lang: this.language
            });
    }

    private async detect(response: ICommittable): Promise<string> {
        // Casting to Tensor3D because that is alway returned when expandAnimations=false
        const image: Tensor3D = <Tensor3D>Tensorflow.node.decodeImage(response.blob, 3, undefined, false)
            // make sure we only have 3 channels or model.detect() will explode
            .slice([0], [-1, -1, 3]);
        const model = await tfModel.load();
        const detections: DetectedObject[] = await model.detect(image);
        const keywords: string = detections
            .map((detection) => detection.class)
            .reduce((prev: string, curr: string) => prev + ' ' + curr, '');
        return keywords;
    }

    async parse(response: ICommittable): Promise<IMemory[]> {
        console.debug(`ImageParser.parse() : Parsing ${response.encodingFormat} ${response.url}`);


        // TODO turn back on
        // Perform OCR
        console.debug(`ImageParser.parse() : Performing OCR ${response.encodingFormat} ${response.url}`);
        const ocrText = await this.ocr(response);
        // const ocrText = '';

        // TODO turn back on
        // Perform image recognition
        console.debug(`ImageParser.parse() : Performing object recognition ${response.encodingFormat} ${response.url}`);
        // const detectedKeywords = await this.detect(response);
        const detectedKeywords = '';
        // console.debug(`ImageParser.parse() : DONE Performing object recognition ${response.encodingFormat} ${response.url}`);
        
        // Final text to index
        const text = ocrText + ' ' + detectedKeywords;
        return [
            {
                "@context": "https://schema.org",
                "@type": "ImageObject",
                "@id": response.url.toString(),
                url: response.url,
                text: text,
                abstract: abstractFromString(text),
                name: response.name || text.slice(0, 50),
                description: abstractFromString(text),
                encodingFormat: response.encodingFormat,
                // TODO get these somehow
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                datePublished: new Date().toISOString(),
                'm:created': new Date().toISOString(),
                _attachments: {
                    [response.url.toString()]: {
                        data: response.blob,
                        content_type: response.encodingFormat,
                        length: response.blob.length
                    }
                }
            }
        ];
    }
}