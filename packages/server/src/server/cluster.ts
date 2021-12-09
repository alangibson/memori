import os from 'os';
import cluster from 'cluster';
import { Command, Option } from 'commander';
import { Express } from 'express';
import app from './app';

export async function startCluster(app: Express, workers: number = 1) {
    if (cluster.isMaster) {
        console.log(
            `Master ${process.pid} is running. Starting ${workers} workers`
        );

        // Fork workers.
        for (let i = 0; i < workers; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(
                `worker ${worker.process.pid} died. Forking new worker`
            );
            cluster.fork();
        });
    } else {
        // Start the express server
        app.listen(argv.port, argv.bind, () => {
            console.info(`Worker started at http://${argv.bind}:${argv.port}`);
        });
    }
}

// Parse command line args
const program = new Command()
    .addOption(
        new Option('-p, --port <port>', 'TCP port to listen on').default(4322)
    )
    .addOption(
        new Option('-w, --workers <num>', 'Worker processes to run').default(
            os.cpus().length
        )
    )
    .option('-b, --bind <ip4>', 'IP address to bind to', '0.0.0.0')
    .option('-d, --data <dir>', 'Directory to store data in', process.cwd())
    .option(
        '-s, --security <file>',
        'Security config file',
        `${process.cwd()}/security.json`
    )
    .parse(process.argv);
const argv = program.opts();

await startCluster(app, argv.workers);
