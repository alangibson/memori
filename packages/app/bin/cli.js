#!/usr/bin/env node

//
// A simple wrapper around pm2 that always uses our ecosystem config file.
//

const path = require('path');
const { execSync } = require('child_process');

// first two args can be ignored rest will be passed directly to the npm command
const [ingore, ignore2, ...args] = process.argv;
const command = args.shift();

const binPath = path.resolve(__dirname + '/../node_modules/.bin');
const configPath = path.resolve(__dirname + '/../');

// windowsHide option will hide the cmd window
execSync(
    `${binPath}/pm2 ${command} ${configPath}/pm2.config.js ${args.join(' ')}`,
    {
        windowsHide: true,
        stdio: 'inherit'
    }
);
