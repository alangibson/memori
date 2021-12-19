import assert from 'assert';
import { URL } from 'url';
import { IResource } from '.';
import { HttpFetcher } from './http';

describe('HtmlFetcher', () => {
    it('should fetch', async () => {
        // Given
        const url = new URL('https://example.com/');
        const fetcher = new HttpFetcher();
        // When
        const resource: IResource = await fetcher.fetch(url);
        // Then
        assert((await resource.links()).length >= 1);
    });
});
