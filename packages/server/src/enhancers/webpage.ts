import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { IMemory } from '../models';
import { IEnhancer } from './index';

export class WebPageEnhancer implements IEnhancer {
    private async thumbnail(image: Buffer) {
        return await sharp(image)
            .resize(250, 250, { fit: 'cover', position: 'top' })
            .webp()
            .toBuffer();
    }

    // Take a full page screenshot
    private async screenshot(
        html: string,
        type: 'png' | 'jpeg' | 'webp' = 'webp'
    ): Promise<Buffer> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html);
        const fullPage: Buffer = (await page.screenshot({
            type: type,
            fullPage: true
        })) as Buffer;
        await page.close();
        await browser.close();
        return fullPage;
    }

    async enhance(memory: IMemory): Promise<IMemory> {
        if (!memory._attachments || !memory._attachments[memory['@id']]) {
            console.warn(
                `Cannot enhance memory due to lack of attachment: ${memory['@id']}`
            );
            return memory;
        }

        // Load html page
        let html: string =
            memory._attachments[memory['@id']].data.toString('utf8');

        // Insert <base> tab in head if it doesnt exist
        if (!html.match(/<base /)) {
            // No base tag, so insert one after head
            console.debug(`Base does not exist in ${memory.url}`);
            html = html.replace(
                /<head.*?>/,
                `$&<base href="${memory.url.origin}" />`
            );
        } else {
            console.debug(`Base tag already exists in ${memory.url}`);
        }

        // Take full screenshot
        const fullScreenshot: Buffer = await this.screenshot(html, 'webp');

        // Save as attachment named screenshot
        memory._attachments['screenshot'] = {
            content_type: 'image/webp',
            data: fullScreenshot,
            length: fullScreenshot.length
        };

        // Take 250x250 screenshot
        const thumbnail: Buffer = await this.thumbnail(fullScreenshot);

        // Save as attachment named thumbnail
        memory._attachments['thumbnail'] = {
            content_type: 'image/webp',
            data: thumbnail,
            length: thumbnail.length
        };

        return memory;
    }
}
