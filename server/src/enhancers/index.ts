import { IMemory } from "../models";
import { ISettings } from "../configuration";
import { VideoEnhancer } from "./video";
import { ImageEnhancer } from "./image";
import { AudioEnhancer } from "./audio";
import { WebPageEnhancer } from "./webpage";

// export type ProcessingResultType = [IMemory, IRememberable]

// Does additional processing of Schema.org schemas.
// An enhacement is any processing that is likely to take longer than a user
// would like to wait for a single web request to finish (OCR, STT, transcoding, etc.).
export interface IEnhancer {

    // Do things like OCR, speech recognition, download video
    // Also can produce video, audio, or image blobs.
    // Either url, contentUrl or embedUrl must be set.
    enhance(memory: IMemory): Promise<IMemory>;

}

export class Enhancer implements IEnhancer {

    private settings: ISettings;

    constructor(settings: ISettings) {
        this.settings = settings;
    }

    async enhance(media: IMemory): Promise<IMemory> {
        if (media["@type"] == 'WebPage')
            return new WebPageEnhancer()
                .enhance(media);
        else if (media["@type"] == 'VideoObject')
            return new VideoEnhancer(`${process.cwd()}/etc/${this.settings.voskModel}`)
                .enhance(media);
        else if (media["@type"] == 'ImageObject')
            return new ImageEnhancer(this.settings.ocrLanguage)
                .enhance(media);
        else if (media["@type"] == 'AudioObject')
            return new AudioEnhancer(`${process.cwd()}/etc/${this.settings.voskModel}`)
                .enhance(media);
        else
            return media;
    }

}
