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
                /** A description of the item. */
                description: pdf.meta?.info?.Title || text.slice(0, 50),
                /** An image of the item. This can be a {@link https://schema.org/URL URL} or a fully described {@link https://schema.org/ImageObject ImageObject}. */
                // TODO "image"?: SchemaValue<ImageObject | URL | IdReference, "image">;
                /** The name of the item. */
                name: pdf.meta?.info?.Title || response.name || text.slice(0, 50),
                /** URL of a reference Web page that unambiguously indicates the item's identity. E.g. the URL of the item's Wikipedia page, Wikidata entry, or official website. */
                // TODO "sameAs"?: SchemaValue<URL, "sameAs">;
                // Canonical URL of the item
                url: response.url,
                text: text,
                abstract: abstractFromString(text),
                // TODO "author"?: SchemaValue<Organization | Person | IdReference, "author">;
                author: pdf.meta?.info?.Author,
                dateCreated: pdf.meta?.info?.CreationDate,
                datePublished: pdf.meta?.info?.CreationDate,
                /** The date on which the CreativeWork was most recently modified or when the item's entry was modified within a DataFeed. */
                dateModified: pdf.meta?.info?.ModDate || '',
                /** Date of first broadcast/publication. */
                // TODO "datePublished"?: SchemaValue<Date | DateTime, "datePublished">;
                // Media type typically expressed using a MIME format (see {@link http://www.iana.org/assignments/media-types/media-types.xhtml IANA site} and {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types MDN reference}) e.g. application/zip for a SoftwareApplication binary, audio/mpeg for .mp3 etc.).
                encodingFormat: response.encodingFormat,
                /** Keywords or tags used to describe this content. Multiple entries in a keywords list are typically delimited by commas. */
                // TODO "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
                /** A thumbnail image relevant to the Thing. */
                // TODO "thumbnailUrl"?: SchemaValue<URL, "thumbnailUrl">;
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
