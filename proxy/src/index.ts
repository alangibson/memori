import debug from 'debug';
import http from 'http';
import { Command, Option } from 'commander';
import localtunnel from 'localtunnel';
import httpProxy from 'http-proxy';

debug.enable('proxy');
const log = debug('proxy');

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
        'my.memori.link')
    .option('-n, --tunnel-name <name>', 'Submomain name of tunnel', 'memori')
    .parse(process.argv);
const argv = program.opts();

const proxy = httpProxy.createProxyServer({});

proxy.on('error', (error) => {
    log('Unexpected error while proxying', error);
});

// For livereload server
const wsProxy = httpProxy.createProxyServer({
    ws: true,
    target: {
        host: 'localhost',
        port: 35729
    }
});

const proxyServer = http.createServer((req, res) => {
    try {
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
    } catch (e) {
        log('Caught unexpected error while proxying request', e);
    }
})

// Listen to the `upgrade` event and proxy the
// WebSocket requests as well.
proxyServer.on('upgrade', function (req, socket, head) {
    log(`Upgrading to WebSocket : ${req.url}`);
    wsProxy.ws(req, socket, head);
});

proxyServer.on('error', (error) => log('Unexpected error', error));

proxyServer.on('listening', () => log(`Proxy listening on ${argv.bind}:${argv.port}`));

log(`Starting proxy on local ${argv.bind}:${argv.port}`);
proxyServer.listen(argv.port, argv.bind);

// Open tunnel

log(`Opening tunnel ${argv.tunnelName}.${argv.tunnelHost} to local port ${argv.port}`);
const tunnel = await localtunnel({
    port: argv.port,
    subdomain: argv.tunnelName,
    host: `https://${argv.tunnelHost}`
});

tunnel.on('url', (url) => log(`Opened tunnel at ${url}`));

tunnel.on('error', (error) => log('Unexpected error in tunnel', error));

tunnel.on('close', () => log(`Shutting down tunnel ${tunnel.url}`));

tunnel.on('request', (request) => log(`Tunnel request : ${request.method} ${request.path}`));
