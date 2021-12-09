import { URL } from 'url';
import rrdir from 'rrdir';

export interface Crawler {
    crawl(root: URL, callback: (path: string) => Promise<void>): Promise<void>;
}

export class FilesystemCrawler implements Crawler {
    async crawl(root: URL, callback: (path: string) => Promise<void>) {
        for await (const entry of rrdir(root.pathname)) {
            if ('err' in entry) {
                // Ignore errors
                continue;
            } else if (entry.directory == true) {
                // Ignore directories
                continue;
            }

            await callback(`file:${entry.path}`);
        }
    }
}
