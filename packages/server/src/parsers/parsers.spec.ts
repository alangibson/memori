import chai from 'chai';
import 'jsdom-global';
import jsdom from 'jsdom';
import { URL } from 'url';
import { promises as fs } from 'fs';
import { ICommittable, IMemory } from '../models';
import { IParser } from './index';
import {
    extractMicrodataFromHtml,
    extractRssFeeds,
    IMicrodata,
    WebPageParser
} from './webpage';

function dump(o: any) {
    console.log(JSON.stringify(o, null, 2));
}

describe('WebPageParser', () => {
    it('parse()', async () => {
        // Given
        const parser: IParser = new WebPageParser();
        const rememberable: ICommittable = {
            blob: await fs.readFile(
                './test/data/www.made.com/Ilaria Extra Large Cluster Pendant, Multicolour & Brass _ MADE.com.html'
            ),
            encodingFormat: 'text/html',
            url: new URL(
                'https://www.made.com/ilaria-extra-large-cluster-pendant-multicolour-brass'
            )
        };
        // When
        const things: IMemory[] = await parser.parse(rememberable);
        // Then
        // TODO assert
        // dump(things);
    });

    it('extractMicrodataFromHtml()', async () => {
        // Given
        const buffer = await fs.readFile(
            './test/data/www.made.com/Ilaria Extra Large Cluster Pendant, Multicolour & Brass _ MADE.com.html'
        );
        const html = buffer.toString('utf8');
        // When
        const microdata: IMicrodata = await extractMicrodataFromHtml(html);
        // Then
        // TODO assert
        // microdata.schemaOrg.forEach(schema => dump(schema));
    });

    it('WebPageParser.extract()', async () => {
        // Given
        const buffer = await fs.readFile(
            './test/data/www.made.com/Ilaria Extra Large Cluster Pendant, Multicolour & Brass _ MADE.com.html'
        );
        const html = buffer.toString('utf8');
        // When
        const microdata: IMicrodata = await extractMicrodataFromHtml(html);
        const things: IMemory[] = await new WebPageParser().extract(microdata);
        // Then
        // TODO assert
        // things.forEach(thing => dump(thing));
    });

    it('WebPageParser.extract()', async () => {
        // Given
        const buffer = await fs.readFile(
            './test/data/antigonejournal.com/Gender in Latin and Beyond_ A Philologist’s Take - Antigone.html'
        );
        const html = buffer.toString('utf8');
        // When
        const microdata: IMicrodata = await extractMicrodataFromHtml(html);
        const things: IMemory[] = await new WebPageParser().extract(microdata);
        // Then
        // TODO assert
        // things.forEach(thing => dump(thing));
    });

    it('should detect absolute RSS links', async () => {
        // Given
        const buffer = await fs.readFile(
            './test/data/audioboom.com/Blank Check with Griffin & David.html'
        );
        const html = buffer.toString('utf8');
        const dom = new jsdom.JSDOM();
        global.DOMParser = dom.window.DOMParser;
        const doc: Document = new DOMParser().parseFromString(
            html,
            'text/html'
        );
        // When
        const links: URL[] = extractRssFeeds(
            doc,
            new URL('https://audioboom.com/channel/Blank-Check')
        );
        // Then
        chai.assert.isTrue(links.length > 0);
    });
});
