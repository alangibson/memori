import { URL } from 'url';
import 'jsdom-global';
import jsdom from 'jsdom';
import cheerio from 'cheerio';
// @ts-ignore because there are no types for this module
import scrape from 'html-metadata';
import { cidUrl } from "../index";
import { ICommittable, IdRef, IMemory } from "../models";
import { IParser, abstractFromString } from "./index";
import { memory } from '@tensorflow/tfjs-core';

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
    mainEntityOfPage?: {
        '@type'?: string;
        '@id'?: string;
    };
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

function extractMainEntityOfPageUrlFromSchema(schema: IRawSchemaOrg): URL|undefined {
    if (schema.mainEntityOfPage?.['@id'])
        try {
            return new URL(schema.mainEntityOfPage?.['@id']);
        } catch (e) {
            console.debug(`extractMainEntityOfPageUrlFromSchema() : Couldn't turn ${schema.mainEntityOfPage?.['@id']} into a URL`)
        }
    // else undefined
}

// Come up with some sort of @id URL
function makeIdUrl(schema: IRawSchemaOrg, microdata: IMicrodata): URL {
    if ('@id' in schema)
        try {
            // @ts-ignore because we catch errors
            return new URL(schema['@id']);
        } catch (e) {
            return cidUrl(Buffer.from(JSON.stringify(schema)));
            // try {
                // See if it is just a relative url
                // const c = new URL(microdata.general.canonical || 'throw an error');
                // return new URL(`${c.origin}/${schema['@id']}`);
            // } catch (e) {
            //     return cidUrl(Buffer.from(JSON.stringify(schema)));
            // }
        }
    else
        return cidUrl(Buffer.from(JSON.stringify(schema)));
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

        // TODO pass origin into this function because we may not have microdata.general.canonical
        // If possible, find a base for the URLs we will create
        try {
            var urlBase: string = new URL(microdata.general.canonical || '').origin;
        } catch (e) {
            var urlBase = '';
        }

        try {
            schemas = schemas.concat(
                microdata.schemaOrg.map((schema: IRawSchemaOrg): IMemory => {

                    // Try to find a good url
                    let url: URL | undefined;
                    const urlString: string | undefined = schema.url || schema.embedUrl || schema['@id'];
                    console.debug(`URL string is ${urlString}`);
                    if (urlString) {

                        // FIXME catch invalid url error

                        url = new URL(urlString, urlBase);

                    } else {
                        // We couldn't find an obvious url, so look in the alternate encodings
                        if (schema.encoding && schema.encoding?.length > 0) {
                            if (!url) {

                                // FIXME catch invalid url error. URLs can be relative!

                                console.debug(`Content URL string is ${schema.encoding[0].contentUrl}`);
                                url = new URL(schema.encoding[0].contentUrl, urlBase);
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
                        '@id': makeIdUrl(schema, microdata).toString(),
                        url: url || extractMainEntityOfPageUrlFromSchema(schema) || makeIdUrl(schema, microdata),
                        name: schema.name || schema.title || schema.headline || makeIdUrl(schema, microdata).toString(),
                        abstract: schema.abstract || abstractFromSchema(schema),
                        text: schema.text || textFromSchema(schema),
                        encodingFormat: encodingFormat || 'application/ld+json',
                        'm:created': new Date().toISOString()
                    }
                })
            );
        } catch (e) {
            console.debug('No schemas extracted', e);
        }

        return schemas;
    }

    async parse(response: ICommittable): Promise<IMemory[]> {

        // Marshal blob to string of HTML
        // TODO determine encoding from Content-Type header
        const html: string = response.blob.toString('utf8');

        // All embedded schemas worth keeping
        const microdata: IMicrodata = await extractMicrodataFromHtml(html);

        console.log('microdata', microdata);

        let extractedSchemas: IMemory[] = await this.extract(microdata);

        console.log('extractedSchemas', extractedSchemas);

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
            extractedSchemas = extractedSchemas.splice(webPageIndex, 1);
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

        console.log('extractedSchemas again', extractedSchemas);

        // Add attachments to Memory
        webPage._attachments = {
            [webPage['@id']]: {
                content_type: response.encodingFormat,
                data: response.blob
            }
        };

        // TODO check html for rss/atom links. If found, add a MediaObject to schemas
        // TODO rss/atom feed MediaObject should be linked

        // Dehydrate embedded things.
        // Turn these into @id refs, not actual objects
        webPage['m:embeddedIds'] = extractedSchemas.map((memory: IMemory): IdRef => (
            { '@id': memory['@id'] }));

        // Add to all schemas an m:embeddedIn @id ref pointing to WebPage 
        for (const i in extractedSchemas) {
            extractedSchemas[i]['m:embeddedInId'] = { '@id': webPage['@id'] };
        }

        console.log('return', [webPage, ...extractedSchemas]);

        // For now just throw in all remaning schemas
        return [webPage, ...extractedSchemas];
    }

}


