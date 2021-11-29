import { PDFExtract, PDFExtractResult } from 'pdf.js-extract';
import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString } from '../parsers';

export class PdfParser implements IParser {

    async parse(response: ICommittable): Promise<IMemory[]> {

        // Extract text from pdf
        const pdf: PDFExtractResult = await new PDFExtract()
            .extractBuffer(response.blob);

        // Concat all content strings together
        let text: string = '';
        pdf.pages.forEach(page =>
            page.content.forEach(content =>
                text += content.str + ' '))

        // TODO extract images and OCR them?

        // TODO process any subelements
        // - embedded images    (Image#remember)

        const atId = response.url.toString();
        return [
            {
                "@context": "https://schema.org",
                "@type": "DigitalDocument",
                "@id": atId,
                name: pdf.meta?.info?.Title || response.name || text.slice(0, 50),
                url: response.url,
                text: text,
                abstract: abstractFromString(text),
                author: pdf.meta?.info?.Author,
                dateCreated: pdf.meta?.info?.CreationDate,
                datePublished: pdf.meta?.info?.CreationDate,
                dateModified: pdf.meta?.info?.ModDate || '',
                encodingFormat: response.encodingFormat,
                'm:created': new Date().toISOString(),
                _attachments: {
                    [atId]: {
                        data: response.blob,
                        content_type: response.encodingFormat,
                        length: response.blob.length
                    }
                }    
            }
        ];
    }

}
