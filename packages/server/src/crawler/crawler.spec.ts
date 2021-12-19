import {
    ChildLimit,
    Crawler,
    DescendantLimit,
    DomainLimit,
    SubdomainLimit
} from './crawler';
import { URL } from 'url';
import { IResource } from '../fetchers';
import { HttpFetcher } from '../fetchers/http';

describe('Crawler', () => {
    it('should crawl', async () => {
        // Given
        const url = new URL('https://example.com/');
        const fetcher = new HttpFetcher();
        const crawler = new Crawler(fetcher, [SubdomainLimit]);
        // When
        let a: IResource[] = [];
        for await (let r of crawler.crawl(url)) {
            a.push(r);
        }
        // Then
        expect(a.length).toEqual(1);
    });
});

describe('ChildLimit', () => {
    it('it should keep same urls', () => {
        expect(
            ChildLimit(
                new URL('https://example.com/'),
                new URL('https://example.com/')
            )
        ).toEqual(true);
    });
    it('it should keep immediate children', () => {
        expect(
            ChildLimit(
                new URL('https://example.com/immediate/page.html'),
                new URL('https://example.com/immediate')
            )
        ).toEqual(true);
    });
    it('it should reject descendants', () => {
        expect(
            ChildLimit(
                new URL('https://example.com/dir1/dir2/page.html'),
                new URL('https://example.com/dir1')
            )
        ).toEqual(false);
    });
    it('it should ignore query params', () => {
        expect(
            ChildLimit(
                new URL('https://example.com/dir1/page.html?q=xxx'),
                new URL('https://example.com/dir1')
            )
        ).toEqual(true);
    });
});

describe('DescendantLimit', () => {
    it('it should keep same urls', () => {
        expect(
            DescendantLimit(
                new URL('https://example.com/'),
                new URL('https://example.com/')
            )
        ).toEqual(true);
    });
    it('it should keep immediate children', () => {
        expect(
            DescendantLimit(
                new URL('https://example.com/dir1/page.html'),
                new URL('https://example.com/dir1')
            )
        ).toEqual(true);
    });
    it('it should keep descendants', () => {
        expect(
            DescendantLimit(
                new URL('https://example.com/dir1/dir2/page.html'),
                new URL('https://example.com/dir1')
            )
        ).toEqual(true);
    });
    it('it should reject other origins', () => {
        expect(
            DescendantLimit(
                new URL('https://example.com/dir1/dir2/page.html'),
                new URL('https://subdomain.example.com/dir1')
            )
        ).toEqual(false);
    });
    it('it should ignore query params', () => {
        expect(
            DescendantLimit(
                new URL('https://example.com/dir1/page.html?q=xxx'),
                new URL('https://example.com/dir1')
            )
        ).toEqual(true);
    });
});

describe('DomainLimit', () => {
    it('it should keep in same TLD', () => {
        expect(
            DomainLimit(
                new URL('https://example.com/'),
                new URL('https://example.com/')
            )
        ).toEqual(true);
    });
    it('it should keep in same TLD with subdomains', () => {
        expect(
            DomainLimit(
                new URL('https://example.com/'),
                new URL('https://sub.example.com/')
            )
        ).toEqual(true);
    });
    it('it should reject different TLD', () => {
        expect(
            DomainLimit(
                new URL('https://example.com/'),
                new URL('https://yahoo.com/')
            )
        ).toEqual(false);
    });
});

describe('SubdomainLimit', () => {
    it('it should keep in same TLD', () => {
        expect(
            SubdomainLimit(
                new URL('https://example.com/'),
                new URL('https://example.com/')
            )
        ).toEqual(true);
    });
    it('it should keep in same TLD with same subdomains', () => {
        expect(
            SubdomainLimit(
                new URL('https://sub.example.com/page1'),
                new URL('https://sub.example.com/page2.html')
            )
        ).toEqual(true);
    });
    it('it should reject different TLD', () => {
        expect(
            SubdomainLimit(
                new URL('https://sub.example.com/'),
                new URL('https://sub.yahoo.com/')
            )
        ).toEqual(false);
    });
});
