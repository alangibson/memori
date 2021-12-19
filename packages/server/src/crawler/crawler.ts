import path from 'path';
import { URL } from 'url';
import { from } from 'ix/iterable';
import { IFetcher, IResource } from 'src/fetchers';

export type CrawlType =
    | undefined
    | 'single'
    | 'children'
    | 'depth'
    | 'descendants'
    | 'domain'
    | 'subdomain';

interface CrawlOptions {
    type: CrawlType;
    depth?: number;
}

// Return false if URL should NOT be processed
type FilterFunction = (
    url: URL,
    seed: URL,
    currentDepth: number,
    depthLimit: number
) => boolean;

export const SingleLimit: FilterFunction = (url: URL, seed: URL) => {
    return url == seed;
};

export const ChildLimit: FilterFunction = (url: URL, seed: URL) => {
    if (path.extname(url.pathname) == '')
        var urlBase = url.origin + url.pathname;
    else var urlBase = url.origin + path.dirname(url.pathname);
    if (path.extname(seed.pathname) == '')
        var seedBase = seed.origin + seed.pathname;
    else var seedBase = seed.origin + path.dirname(seed.pathname);
    return urlBase == seedBase;
};

export const DescendantLimit: FilterFunction = (url: URL, seed: URL) => {
    const urlBase = url.origin + path.dirname(url.pathname);
    const seedBase = seed.origin + path.dirname(seed.pathname);
    return urlBase.startsWith(seedBase);
};

export const DomainLimit: FilterFunction = (url: URL, seed: URL) => {
    const urlTld = url.hostname.split('.').slice(-2).join('.');
    const seedTld = seed.hostname.split('.').slice(-2).join('.');
    return urlTld == seedTld;
};

// Limit to same subdomain
export const SubdomainLimit: FilterFunction = (url: URL, seed: URL) => {
    return url.hostname == seed.hostname;
};

export const DepthLimit: FilterFunction = (
    url: URL,
    seed: URL,
    currentDepth: number,
    depthLimit: number
) => {
    return currentDepth <= depthLimit;
};

const crawlTypesToFilters: { [key: string]: FilterFunction } = {
    single: SingleLimit,
    children: ChildLimit,
    depth: DepthLimit,
    descendents: DescendantLimit,
    domain: DomainLimit,
    subdomain: SubdomainLimit
};

function mapCrawlTypesToFilters(types: CrawlType[]): FilterFunction[] {
    return types.map((type: CrawlType) => {
        if (!type) return SingleLimit;
        return crawlTypesToFilters[type] || SingleLimit;
    });
}

interface Crawlable {
    resource: URL | IResource;
    depth: number;
}

export class Crawler {
    fetcher: IFetcher;
    options: CrawlOptions;
    filters: FilterFunction[];

    constructor(fetcher: IFetcher, options: CrawlOptions = { type: 'single' }) {
        this.fetcher = fetcher;
        this.options = options;
        this.filters = mapCrawlTypesToFilters([options.type]);
    }

    async *crawl(seed: URL | IResource): AsyncGenerator<IResource> {
        // Keep track of visited links
        const visited = new Set<URL>();

        const channel: Crawlable[] = [];
        channel.push({ resource: seed, depth: 0 });

        // TODO clean up
        // @ts-ignore
        const seedUrl = seed.url || seed;

        for await (const crawlable of from(channel)) {
            // TODO clean up
            // @ts-ignore
            const url = crawlable.resource.url || crawlable.resource;
            const currentDepth = crawlable.depth;

            console.debug(`At depth=${currentDepth} url=${crawlable.resource}`);

            // Apply filters
            // Don't visit links again
            if (visited.has(url)) {
                console.info(`Skipping already visited url ${url}`);
                continue;
            }

            // Apply filters
            const keep: boolean = this.filters
                .map((filter: FilterFunction) =>
                    filter(url, seedUrl, currentDepth, this.options.depth || 0)
                )
                .reduce((prev, curr) => (prev == false ? prev : curr), true);
            // and just go to next loop if we shouldn't keep this url
            if (!keep) continue;

            // Fetch resource
            // TODO clean up
            // @ts-ignore
            if (crawlable.resource.url)
                var resource: IResource = crawlable.resource as IResource;
            else
                var resource: IResource = await this.fetcher.fetch(
                    crawlable.resource as URL
                );

            // and then keep a record of having visited it
            visited.add(url);

            // Yield resource so caller can immediately react to it
            yield resource;

            // Extract all links from resource
            const links: URL[] = await resource.links();
            console.debug(`Extracted ${links.length} links`);
            // then queue all links we just found
            for (const link of links)
                channel.push({
                    resource: link,
                    depth: currentDepth + 1
                });
        }
    }
}
