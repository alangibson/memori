
import { Worker } from 'worker_threads';
// import { Queue, Worker, QueueEvents, Job, RedisConnection } from 'bullmq';
import { RedisMemoryServer } from 'redis-memory-server';
import { Enhancer } from '../enhancers';
import { IMemory } from '../models';
import { Index } from '../indexer';
import { IPersistable } from 'src';

export class EnhancementWorker {

    index: Index;

    constructor(index: Index) {
        this.index = index;
    }

    async enhance(memory: IMemory[]) {

        return memory.map((memory: IMemory) => {
            return new Promise((resolve, reject) => {
    
                const worker = new Worker('./src/enhancers/do.ts', {
                    workerData: memory
                });
    
                worker.on('message', (memory: IMemory) => {
                    console.debug(`message : `, memory);
                    this.index.index([memory])
                        .then(() => {
                            resolve(memory);
                        });
                });
                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0)
                        reject(new Error(`stopped with  ${code} exit code`));
                })
            })
    
        });


    }

}

// export class EnhancementWorker2 implements IPersistable {

//     queue: Queue<IMemory>;
//     redis: RedisMemoryServer;
//     worker: Worker;

//     constructor(index: Index, enhancer: Enhancer) {
//         this.redis = new RedisMemoryServer({
//             instance: { 
//                 ip: '127.0.0.1',
//                 port: 61263
//             }
//         });
        
//         const redisParams = {
//             connection: {
//                 host: '127.0.0.1',
//                 port: 61263
//             }
//         };
//         this.queue = new Queue<IMemory>('enhancement', redisParams);
//         this.worker = new Worker('enhancement', async (job) => {
//             console.debug(`Worker.process() : Processing job ${job}`);
//             await index.index([await enhancer.enhance(job.data)]);
//         }, redisParams);
//         const queueEvents = new QueueEvents('enhancement', redisParams);
//         queueEvents.on('completed', ({ jobId }) => {
//             console.log('done painting');
//         });
//         queueEvents.on('failed', ({ jobId, failedReason }) => {
//             console.error(`error painting ${jobId}`, failedReason);
//         });
//     }

//     add(memory: IMemory[]): Promise<Job<IMemory>>[] {
//         return memory.map((memory) => this.queue.add(memory['@id'], memory));
//     }

//     async load() {
//         await this.redis.start();
//         console.debug(`EnhancementWorker.load() : Started Redis at ${await this.redis.getIp()}:${await this.redis.getPort()}`);
//     }

//     async save() {
//         await this.redis.stop();
//     }

//     async clear() {
//         await this.redis.stop();
//         this.redis = new RedisMemoryServer();
//         await this.redis.start();
//     }

// }