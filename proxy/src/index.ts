import proc from 'child_process';
import { NginxBinary } from 'nginx-binaries'
import http from 'http';
import { Command, Option } from 'commander';
import localtunnel from 'localtunnel';
// import proxy from 'express-http-proxy';
import express from 'express';
import httpProxy from 'http-proxy';

// Parse command line args
const program = new Command()
    .addOption(new Option('-p, --port <port>', 'TCP port to listen on')
        .default(4321))
    .option('--server <hostname:port>', 'Location of server',
        'http://localhost:4322')
    .option('--pwa <hostname:port>', 'Location of PWA',
        'http://localhost:4323')
    .option('--livereload <hostname:port>', 'Location of Livereload',
        'http://localhost:35729')
    .option('-b, --bind <ip4>', 'IP address to bind to', '0.0.0.0')
    .option('-t, --tunnel-host <hostname>', 'Hostname of tunnel server',
        'https://my.memori.link')
    .option('-n, --tunnel-hame <name>', 'Submomain name of tunnel', 'memori')
    .parse(process.argv);
const argv = program.opts();


// Start nginx server
// const dl = await NginxBinary.download({ version: '1.21.4' });
// const nginx = proc.spawn(dl, ['-c', 'nginx.conf'], {
//     stdio: ['ignore', 'inherit', 'inherit'],
//     shell: true
// });
// function toExit() {
//     if (nginx) nginx.kill(0);
// }
// process.on('SIGTERM', toExit);
// process.on('exit', toExit);



const proxy = httpProxy.createProxyServer({});
const wsProxy = httpProxy.createProxyServer({
    ws: true,
    target: {
        host: 'localhost',
        port: 35729
    }
});
const proxyServer = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    if (req.url == '/livereload')
        proxy.web(req, res, { target: argv.livereload });
    else if (req.url?.startsWith('/livereload.js') || req.url?.startsWith('/connect'))
        proxy.web(req, res, { target: argv.livereload });
    else if (req.url?.startsWith('/memory') 
          || req.url?.startsWith('/authorization')
          || req.url?.startsWith('/mind')
          || req.url?.startsWith('/ping'))
        proxy.web(req, res, { target: argv.server });
    else
        // Send everything else to PWA
        proxy.web(req, res, { target: argv.pwa });
})
// Listen to the `upgrade` event and proxy the
// WebSocket requests as well.
proxyServer.on('upgrade', function (req, socket, head) {
    console.log(`UPGRADE ${req.url}`);
    wsProxy.ws(req, socket, head);
});
proxyServer.listen(argv.port);

// Open tunnel

console.info('Opening tunnel to this server');
const tunnel = await localtunnel({
    port: argv.port,
    subdomain: argv.tunnelName,
    host: argv.tunnelHost
});
console.info(`Connect via secure tunnel at ${tunnel.url}`);

tunnel.on('close', () => {
    console.info(`Shutting down tunnel ${tunnel.url}`);
});

// app.listen(argv.port, () => {
//     console.info(`Proxy server started on port ${argv.port}`);
// });
