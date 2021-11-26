import { Config } from "../configuration";
import { workerData, parentPort } from 'worker_threads';
import { Enhancer } from "../enhancers";
import { IMemory } from "../models";

// const settings = await Config.getInstance().settings();
// console.log('settings', settings);
const enhancer = new Enhancer({
    ocrLanguage: 'eng',
    voskModel: 'vosk-model-en-us-0.22',
    defaultMindName: 'mind'
});
console.log('enhancer', enhancer);
// const memory: IMemory = await enhancer.enhance(workerData);
// console.log('memory', memory);

const memory = workerData;
// console.log('memory', memory);

parentPort?.postMessage({ memory });