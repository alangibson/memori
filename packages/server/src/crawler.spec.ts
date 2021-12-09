import assert from 'assert';
import { URL } from 'url';
import { Crawler, FilesystemCrawler } from './crawler';

describe('FilesystemCrawler', () => {
    it('should crawl', async () => {
        // Given
        const crawler: Crawler = new FilesystemCrawler();
        const root: URL = new URL('file:/tmp');

        // When
        await crawler.crawl(root, async (url: string) => {
            // Then
            assert(url);
        });
    });
});
