#!/usr/bin/env node

// https://github.com/Unitech/pm2/issues/3657

import path from 'path';
import { fileURLToPath } from "url"; // the node package 'url'
import { execSync } from 'child_process';

// first two args can be ignored rest will be passed directly to the npm command
const [ingore, ignore2, ...args] = process.argv;

execSync(`npm ${args.join(' ')}`, {
    windowsHide: true,
    stdio: 'inherit',
    cwd: path.dirname(fileURLToPath(import.meta.url))
});
