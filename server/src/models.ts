
// // https://developers.google.com/search/docs/advanced/structured-data/search-gallery
// export type SupportedSchemaorgTypes = WithContext<Thing> | Article | BreadcrumbList | DigitalDocument | 
//     ImageObject | NoteDigitalDocument | PodcastSeries | Product | SoftwareApplication | 
//     VideoObject | WebPage;

type CommandActionTypes = 'remember';

// https://www.iana.org/assignments/media-types/text/uri-list
type RememberableType = 'text/plain' | 'text/html' | 'text/uri-list' | 'audio/mp3';

export interface IMemoryAttachment {
    content_type: string,
    data: Buffer
    // Only read, never written
    // digest?: string;
    length?: number;
    // revpos?: number;
    // stub?: boolean;
}

// Very basics of what we need to be able to remember something
export interface IRememberable {
    encodingFormat: string,
    blob: Buffer
    // Original location of resource
    url?: URL;
    // TODO last updated/modified date
    // Available only when we do a multipart/form-data upload (ie file upload)
    name?: string;
    encoding?: string;
}

// Something that can in principle be commiteed to memory or 
// saved in command log
export interface ICommittable extends IRememberable {
    url: URL;
    // TODO encoding from mime type
    // TODO last updated/modified date
}

export interface ICommand extends ICommittable {
    action: CommandActionTypes;
    // unqualified command log filename
    // Only exists on read after write
    commandId?: string;
}

// A thing that can be stored in the index
export interface IIndexable {

    // Bare minimum we need to be able to index an item    
    "@type": string;
    // For full text search
    text: string;
    url: URL;
    "@id": string;
    // ISO8601 string indicating when this object was initialized.
    // Not when the underlying resource was created. Use dateCreated for that.
    'm:created': string;

    // PouchDB id. Always the same as @id.
    // TODO should be mandatory in a child interface
    _id?: string;
    // Minisearch id. Always the same as @id.
    id?: string;
    // PouchDB style binary attachments
    _attachments?: { 
        [key: string]: IMemoryAttachment
    };

    // ---- Related linked data  ----
    breadcrumb?: IIndexable;
    video?: IIndexable;
    product?: IIndexable;
    softwareApplication?: IIndexable;
    'm:embeddedIn'?: string; // just an @id string, not a reference object
}

// Bare minimum we need to dipslay something
interface IDisplayable {
    "@id": string;
    "@type": string;
    name: string; // Headline of search result
    url: URL; // link included in search result
    abstract: string; // displayed on search result page
    // TODO make madatory or remove
    author?: string;
    dateCreated?: string;
    datePublished?: string;
    dateModified?: string;
}

export interface IMemory extends IDisplayable, IIndexable {
    "@context": string;
    description?: string;
    encodingFormat: string,
    'm:embedded'?: IMemory[];
}
