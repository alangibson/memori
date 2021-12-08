const path = require('path');
const path_NODEJS = process.env.Path.split(';').filter( f => f.includes('nodejs') )[0];
// console.log(path_NODEJS);
// const path_NPM = path.join( path_NODEJS, 'node_modules', 'npm', 'bin', 'npm-cli.js');
const path_NPM = './pm2-node.js'

module.exports = {
    apps: [
        {
            name: 'proxy',
            cwd: './proxy',
            script: path_NPM,
            args: 'start -- -n test',
            // watch: ['proxy'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
            // interpreter: 'none'
        },
        {
            name: 'server',
            cwd: './server',
            script: path_NPM,
            args: 'start',
            // watch: ['server'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
            // interpreter: 'none'
        },
        {
            name: 'pwa',
            cwd: './pwa',
            // script: 'npm run start',
            script: path_NPM,
            args: 'run dev',
            // watch: ['server'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
            // interpreter: 'none'
        },
        {
            name: 'extension',
            cwd: './extension',
            script: path_NPM,
            args: 'start',
            // interpreter: 'none'
        }
    ]
};