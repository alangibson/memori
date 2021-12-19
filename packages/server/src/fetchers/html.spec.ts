import { URL } from 'url';
import assert from 'assert';
import { HtmlResource } from './http';

describe('HtmlResource', () => {
    it('should parse links', async () => {
        // Given
        const resource = new HtmlResource(
            new URL('https://example.com'),
            Buffer.from(`
            <html><body>
                <title>wrong place</title>
                <a href="junk.html">this is junk</a>
                <b>between two junks</b>
                <a href="junk2.html">this is also junk</a>
            </body></html>
            `),
            'text/html'
        );
        // When
        const links: URL[] = await resource.links();
        // Then
        assert(links.length == 2);
    });
});
