import { getDataDirectory } from './configuration';

export default {
    ocrLanguage: 'eng',
    voskModel: 'vosk-model-en-us-0.22',
    defaultMindName: 'main',
    couchDbUrl: 'http://admin:admin@localhost:5984',
    dataDir: getDataDirectory()
};
