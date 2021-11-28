import { promises as fs } from 'fs';
import os from 'os';
import cluster from 'cluster';
import localtunnel from 'localtunnel';
import https from 'https';
import { Command, Option } from 'commander';
import { Express } from 'express';
import app from './app';

// Parse command line args
const program = new Command()
    .addOption(new Option('-p, --port <port>', 'TCP port to listen on').default(4321))
    .option('-b, --bind <ip4>', 'IP address to bind to', '0.0.0.0')
    .option('-d, --data <dir>', 'Directory to store data in', process.cwd())
    .option('-s, --security <file>', 'Security config file', `${process.cwd()}/security.json`)
    .parse(process.argv);
const argv = program.opts();

const totalCPUs = os.cpus().length;

export async function startCluster(app: Express, workers: number = totalCPUs) {
    
    if (cluster.isMaster) {

        console.log(`Master ${process.pid} is running. Starting ${workers} workers`);

        console.info('Opening tunnel to this server');
        const tunnel = await localtunnel({ 
            port: argv.port,
            subdomain: 'memori',
            host: 'https://my.memori.link'
        });
        console.info(`Connect via secure tunnel at ${tunnel.url}`);
    
        tunnel.on('close', () => {
            console.info(`Shutting down tunnel ${tunnel.url}`);
        });

        // Fork workers.
        for (let i = 0; i < workers; i++) {
            cluster.fork();
        }
    
        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died. Forking new worker`);
            cluster.fork();
        });
    
    } else {

        if (process.env.NODE_ENV == 'dev') {

            // Run a local https server
            https.createServer({
                key: await fs.readFile(`${process.cwd()}/dev.key`),
                cert: await fs.readFile(`${process.cwd()}/dev.cert`)
            }, app)
                .listen(argv.port, argv.bind, () => {
                    console.info(`Worker started with TLS at https://${argv.bind}:${argv.port}`);
                });

        } else {
            // Start the express server
            app.listen(argv.port, argv.bind, () => {
                console.info(`Worker started at http://${argv.bind}:${argv.port}`);
            });
        }
        
        
    }    
} 

await startCluster(app, 1);