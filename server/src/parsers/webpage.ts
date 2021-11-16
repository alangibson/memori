import { URL } from 'url';
import 'jsdom-global';
import jsdom from 'jsdom';
import cheerio from 'cheerio';
// @ts-ignore because there are no types for this module
import scrape from 'html-metadata';
import { cidUrl } from "../index";
import { ICommittable, IMemory } from "../models";
import { IParser, abstractFromString } from "./index";

// Raw json-ld / schema.org object found in the wild
interface IRawSchemaOrg {
    '@context'?: string;
    '@type'?: string;
    '@id'?: string;
    url?: string;
    name?: string;
    abstract?: string;
    text?: string;
    encodingFormat?: string;
    headline?: string;
    embedUrl?: string;
    title?: string;
    encoding?: {
        "@type": string;
        contentUrl: string;
        encodingFormat: string;
    }[];
}

export interface IMicrodata {
    schemaOrg: IRawSchemaOrg[];
    general: {
        title: string;
        description: string;
        canonical?: string;
        lang?: string;
        publisher?: string;
    };
    related: {
        // breadcrumb: BreadcrumbList;
        video: {}; // VideoObject
        // product: Product;
        // softwareApplication: SoftwareApplication;
    };
}

function stripWhitespace(s: string): string {
    return s.replace(/[\s]+/gm, ' ');
}


function abstractFromSchema(schema: object) {
    // @ts-ignore
    return schema.abstract || abstractFromString(textFromSchema(schema));
}

function documentFromHtml(html: string, mimeType: string): Document {
    // Create document from html
    const dom = new jsdom.JSDOM();
    global.DOMParser = dom.window.DOMParser;
    const doc: Document = new DOMParser()
        .parseFromString(
            // Strip out script and style tags
            html.replace(/<style.*?<\/style>/smig, '')
                .replace(/<script.*?<\/script>/smig, ''),
            // @ts-ignore because this is a supported DOMParser type
            mimeType);
    return doc;
}

// Find RSS/Atom feed links in an HTML document
export function extractRssFeeds(doc: Document, base: URL) {
    const list = doc.getElementsByTagName('link');
    const inputList: HTMLLinkElement[] = Array.prototype.slice.call(list);
    return [...inputList]
        .filter((element: HTMLLinkElement) =>
            element.rel == 'alternate' && (
                element.type == 'application/rss+xml' ||
                element.type == 'application/atom+xml'
            ))
        .map((element) => new URL(element.href, base));
}

// Come up with some sort of @id URL
function makeIdUrl(schema: IRawSchemaOrg, microdata: IMicrodata): URL {
    let id: URL | null = null;
    // @ts-ignore
    let idUrl: string = schema['@id'] || schema.url || schema.embedUrl || cidUrl(Buffer.from(JSON.stringify(schema)));
    try {
        id = new URL(idUrl);
    } catch (e) {
        // See if it is just a relative url
        const c = new URL(microdata.general.canonical || 'throw an error');
        id = new URL(`${c.origin}/${idUrl}`);
    }
    return id;
}

function extractTextFromDocument(doc: Document): string {
    // Extract text from document
    // We have to do this to be able to construct a DOMParser
    // Extract text from body
    // TODO remove empty newlines
    const text: string | null = doc.body.textContent;
    if (text == null)
        throw new Error(`Could not extract text`);
    return text;
}

// Extract all indexable text from schema, but not from it's children
function textFromSchema(schema: object) {
    // @ts-ignore 
    return `${schema.text || ''} ${schema.name || ''} ${schema.description || ''} ${schema.headline || ''} ${schema.abstract || ''}`
}

export async function extractMicrodataFromHtml(html: string): Promise<IMicrodata> {

    interface ISchemaish {
        type: string; // fully qualified url
        properties: {
            [key: string]: any
        }
    }

    function descend(schema: ISchemaish): IRawSchemaOrg {
        const typeUrl = new URL(schema.type);
        const atType = typeUrl.pathname.slice(1, typeUrl.pathname.length);
        // Transform arrays into strings where possible
        return Object.entries(schema.properties)
            .map(([key, value]) => {
                if (value[0] instanceof Object)
                    return { [key]: descend(value[0]) };
                else
                    return { [key]: value[0] };
            })
            .reduce((prev, curr) => Object.assign(prev, curr),
                {
                    // Hackishly figure out @context and @type
                    // HACK fragile way of making @context
                    "@context": typeUrl.origin + typeUrl.hostname,
                    "@type": atType,
                });
    }

    // Extract all embedded microdata from web page
    const data = await scrape.parseAll(cheerio.load(html));

    // Build an array of Things from embedded Schema.org data
    data.schemaOrg = data?.schemaOrg?.items.map((schema: ISchemaish): IRawSchemaOrg => {
        return descend(schema);
    }) || []; // Make sure there is a schemaOrg array

    // Transform jsonLd into schemaOrg
    if (data.jsonLd == undefined) {
        // do nothing
    } else if (data.jsonLd['@graph'])
        // A @graph is apparently just an array
        data.jsonLd['@graph']?.forEach((schema: {}) => {
            return data.schemaOrg.push(schema);
        });
    else if (data.jsonLd instanceof Array)
        data.schemaOrg = data.schemaOrg.concat(data.jsonLd);
    else
        data.schemaOrg.push(data.jsonLd);

    return data;
}

export class WebPageParser implements IParser {

    // Try to extract microdata and then build schemas
    async extract(microdata: IMicrodata): Promise<IMemory[]> {
        let schemas: IMemory[] = [];
        try {
            schemas = schemas.concat(
                microdata.schemaOrg.map((schema: IRawSchemaOrg): IMemory => {

                    // Try to find a good url
                    let url: URL | undefined;
                    const urlString: string | undefined = schema.url || schema.embedUrl || schema['@id'];
                    if (urlString) {
                        url = new URL(urlString);
                    } else {
                        // We couldn't find an obvious url, so look in the alternate encodings
                        if (schema.encoding && schema.encoding?.length > 0) {
                            if (!url) {
                                url = new URL(schema.encoding[0].contentUrl);
                                schema.url = url.toString();
                            }
                        }
                    }
                    // Try to find a good encoding format
                    let encodingFormat: string | undefined = schema.encodingFormat;
                    if (!encodingFormat && schema.encoding && schema.encoding?.length > 0) {
                        encodingFormat = schema.encoding[0].encodingFormat;
                        schema.encodingFormat = encodingFormat
                    }

                    return {
                        ...schema,
                        // Make sure we have basic parameters.
                        // You never know what input you will get, so we need to be extra-flexible here.
                        '@context': schema['@context'] || 'https://schema.org',
                        '@type': schema['@type'] || 'Thing',
                        // it would be better to add a content-based id later
                        '@id': makeIdUrl(schema, microdata).toString(),
                        url: url || makeIdUrl(schema, microdata),
                        name: schema.name || schema.title || schema.headline || makeIdUrl(schema, microdata).toString(),
                        abstract: abstractFromSchema(schema),
                        text: textFromSchema(schema),
                        encodingFormat: encodingFormat || 'application/ld+json',
                        'm:created': new Date().toISOString()
                    }
                })
            );
        } catch (e) { } // Error: No microdata found in page

        return schemas;
    }

    async parse(response: ICommittable): Promise<IMemory[]> {

        // Marshal blob to string of HTML
        // TODO determine encoding from Content-Type header
        const html: string = response.blob.toString('utf8');

        // All embedded schemas worth keeping
        const microdata: IMicrodata = await extractMicrodataFromHtml(html);
        const extractedSchemas: IMemory[] = await this.extract(microdata);

        // Parse interesting info from the web page we are parsing
        const doc: Document = documentFromHtml(html, response.encodingFormat);
        const text: string = stripWhitespace(extractTextFromDocument(doc));

        // See if there is a schema in extractedSchemas that has @id == response.location
        // If so, make that schema our primary schema and don't create a WebPage
        // but still append text to extractedSchemas[0].text
        let webPageIndex: number =
            extractedSchemas.findIndex((schema) => schema['@id'] == response.url.toString());
        if (webPageIndex >= 0) {
            // Keep whatever schema this is, but make sure it has all text in web page
            var webPage: IMemory = extractedSchemas[webPageIndex];
            webPage.text += text;
            // then delete index from schemas so we don't process it again later
            extractedSchemas.splice(webPageIndex, 1);
        } else {
            // We must always return at least 1 schema.
            // For web pages, we default to a WebPage schema.
            var webPage: IMemory = {
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                '@id': response.url.toString(),
                url: response.url,
                name: microdata?.general?.title?.trim() || doc?.title?.trim(),
                abstract: microdata?.general?.description?.trim() || abstractFromString(text),
                encodingFormat: response.encodingFormat,
                dateCreated: doc.lastModified,
                dateModified: doc.lastModified,
                datePublished: doc.lastModified,
                text: text,
                'm:created': new Date().toISOString()
            };
        }

        // TODO check html for rss/atom links. If found, add a MediaObject to schemas
        // TODO rss/atom feed MediaObject should be linked

        // Add to all schemas an m:embeddedIn @id ref pointing to WebPage 
        webPage['m:embedded'] = extractedSchemas;
        for (const i in extractedSchemas) {
            extractedSchemas[i]['m:embeddedIn'] = webPage['@id'];
        }

        // TODO Process all other schemas as children of WebPage
        // Add to m:videos
        //      const videos: IMemory[] = schemas.filter((schema) => schema['@type'] == 'VideoObject');
        // Add to m:images
        //      const images: IMemory[] = schemas.filter((schema) => schema['@type'] == 'ImageObject');
        // const audios: IMemory[] = schemas.filter((schema) => schema['@type'] == 'AudioObject');
        // const persons: IMemory[] = schemas.filter((schema) => schema['@type'] == 'Person');
        // const organizations: IMemory[] = schemas.filter((schema) => schema['@type'] == 'Organization');
        // const apps: IMemory[] = schemas.filter((schema) => schema['@type'] == 'SoftwareApplication');
        // const feeds: IMemory[] = schemas.filter((schema) => schema['@type'] == 'MediaObject');
        //      Add MediaObject to webPage.ecodings

        // For now just throw in all remaning schemas
        return [webPage, ...extractedSchemas];
    }

    // Extract microdata/Schema.org schemas from web page
    // Also create a synthetic WebPage schema if one is not embedded already
    // There is always at least one item in the return array
    // First item in return array is always a WebPage
    // async parse(response: ICommittable): Promise<IMemory[]> {

    //     // Marshal blob to string of HTML
    //     // TODO determine encoding from Content-Type header
    //     const html: string = response.blob.toString('utf8');

    //     // All embedded schemas worth keeping
    //     const schemas: IMemory[] = await this.extract(html);

    //     const id: string = response.location.toString();
    //     const doc: Document = documentFromHtml(html, response.mimeType);
    //     const text: string = stripWhitespace(extractTextFromDocument(doc));

    //     // TODO make sure there is a WebPage in postion 1
    //     const i: number = schemas.findIndex((schema) => schema['@type'] == 'WebPage')
    //     if (i == 0) {

    //         // Enhance existing WebPage
    //         schemas[i]['@id'] = schemas[i]['@id'] || id;
    //         // It should always be safe to overwrite text as we want the most possible
    //         schemas[i].text = text;
    //         schemas[i].abstract = schemas[i].abstract || abstractFromString(text);

    //     } else if (i >= 1) {

    //         // Enhance existing WebPage
    //         schemas[i]['@id'] = schemas[i]['@id'] || id;
    //         // It should always be safe to overwrite text as we want the most possible
    //         schemas[i].text = text;
    //         schemas[i].abstract = schemas[i].abstract || abstractFromString(text);

    //         // Just move it to position 0
    //         const wp = schemas[i];
    //         schemas = schemas.filter((schema) => schema['@type'] !== "WebPage");
    //         schemas.unshift(wp);

    //     } else {
    //         // Make a new web page
    //         const id: string = response.location.toString();
    //         schemas.unshift({
    //             "@context": 'https://schema.org',
    //             "@type": "WebPage",
    //             "@id": id,
    //             url: response.location.toString(),
    //             name: microdata?.general?.title?.trim() || doc?.title?.trim(),
    //             abstract: abstractFromString(text),
    //             description: microdata?.general?.description?.trim() || abstractFromString(text),
    //             dateCreated: doc.lastModified,
    //             dateModified: doc.lastModified,
    //             datePublished: doc.lastModified,
    //             encodingFormat: response.mimeType,
    //             // This is what we index for full text search
    //             text: text,
    //         });
    //     }

    //     return schemas;
    // }

    // async parse(response: ICommittable): Promise<IMemory> {

    //     const extracted: IMemory[] = await this.extract(response);
    //     console.log(JSON.stringify(extracted, null, 2));

    // Marshal blob to string of HTML
    // TODO determine encoding from Content-Type header
    // const html: string = response.blob.toString('utf8');

    // If there is no microdata in page, then microdata is null
    // let microdata: IMicrodata | null = null;
    // try {
    //     microdata = await extractMicrodataFromHtml(html);
    // } catch (e) { } // Error: No microdata found in page

    // Process microdata
    // TODO only keep @type Product, VideoObject, SoftwareApplication
    // TODO special handling for BreadcrumbList. Use breadcrumb property
    // TODO special handling for VideoObject. Use video property
    // TODO special handling for AudioObject,Clip,MusicRecording. Use audio property

    // const doc: Document = documentFromHtml(html, response.mimeType);

    // Parse to Schema.org/WebPage
    // const id: string = response.location.toString();
    // const text: string = stripWhitespace(extractTextFromDocument(doc));

    // Insert a link relation for each embedded schema type we know how to handle
    // microdata.related = microdata.schemaOrg
    //     ?.map((thing: IMemory) => {
    //         // Make sure the thing has a text field
    //         if (!thing.text?.length)
    //             // @ts-ignore
    //             thing.text = `${thing.name} ${thing.abstract} ${thing.description} ${thing.author?.name}`;
    //         if (thing['@type'] == 'VideoObject')
    //             return { video: thing };
    //         // TODO all other supported subschemas
    //     })
    //     .reduce((prev: {}, curr: {}) => Object.assign(prev, curr), {});

    // let video: VideoObject | null = null;
    // if (microdata?.related?.video) {
    //     const videoId: string = microdata?.related?.video?.["@id"] || id;
    //     video = {
    //         "@context": 'https://schema.org',
    //         "@type": microdata?.related?.video?.["@type"] || 'VideoObject',
    //         "@id": videoId,
    //         // Must be @id of parent page so we can look it up later
    //         mainEntityOfPage: id,
    //         // TODO better default name
    //         name: microdata?.related?.video?.name || '',
    //         url: microdata?.related?.video?.url?.toString() || id,
    //         text: microdata?.related?.video?.text?.toString() ||
    //             `${microdata?.related?.video?.name} ${microdata?.related?.video?.abstract} 
    //             ${microdata?.related?.video?.description} ${microdata?.related?.video?.author}`
    //     };
    // }

    // TODO SoftwareSourceCode
    // TODO Movie
    // TODO NewsArticle
    // TODO Article
    // TODO Person
    // TODO WebSite
    // TODO Organizatoin

    // TODO web pages may contain a WebPage. If so just use that instead

    // const webpage: WebPage = {
    //     "@context": 'https://schema.org',
    //     "@type": "WebPage",
    //     "@id": id,
    //     url: response.location.toString(),
    //     name: microdata?.general?.title?.trim() || doc?.title?.trim(),
    //     abstract: abstractFromString(text),
    //     description: microdata?.general?.description?.trim() || abstractFromString(text),
    //     dateCreated: doc.lastModified,
    //     dateModified: doc.lastModified,
    //     datePublished: doc.lastModified,
    //     encodingFormat: response.mimeType,
    //     // This is what we index for full text search
    //     text: text,

    //     // TODO only do this if we actually have a VideoObject in microdata
    //     // @ts-ignore because no idea why this causes an error
    //     video: video,

    //     // FIXME
    //     // 'breadcrumb': microdata?.related?.breadcrumb,
    //     // 'softwareApplication': microdata?.related?.softwareApplication,
    //     // 'product': microdata?.related?.product,

    //     // TODO locale from microdata.metatags['og:locale'][0]
    //     // TODO get "thumbnailUrl" from browser plugin
    //     // TODO extract "keywords" for search index?
    //     // TODO set "headline" to first H* tag?
    // };

    //     return webpage;
    // }

}
