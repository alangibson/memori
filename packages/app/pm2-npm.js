// https://github.com/Unitech/pm2/issues/3657

const { execSync } = require('child_process');

// first two args can be ignored rest will be passed directly to the npm command
const [ingore, ignore2, ...args] = process.argv;

// We have to cd to get around an apparent bug in pm2 where it ends up with a cwd
// of the grandparent directory.
// Noop if we don't have a PACKAGE_DIR
const pwd = process.env.PACKAGE_DIR || '.';

// windowsHide option will hide the cmd window
execSync(`cd ${pwd} && npm ${args.join(' ')}`, {
    windowsHide: true,
    stdio: 'inherit'
});
