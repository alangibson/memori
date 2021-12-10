const path = require('path');

const npm = `${__dirname}/pm2-npm.js`;
// Set up out of the ./app directory
const packagesPath = path.resolve(`${__dirname}/..`);

module.exports = {
    apps: [
        {
            name: 'proxy',
            cwd: `${packagesPath}/proxy`,
            script: npm,
            args: 'start -- -n memori',
            watch: [`${packagesPath}/proxy`],
            watch: true,
            env: {
                // Hack around pm2 ending up in the grandparent directory
                PACKAGE_DIR: `${packagesPath}/proxy`
            },
            source_map_support: true
        },
        {
            name: 'server',
            cwd: `${packagesPath}/server`,
            script: npm,
            args: 'start',
            watch: false,
            env: {
                // shut Tensorflow up
                TF_CPP_MIN_LOG_LEVEL: '2',
                // Hack around pm2 ending up in the grandparent directory
                PACKAGE_DIR: `${packagesPath}/server`
            },
            source_map_support: true
        },
        {
            name: 'pwa',
            cwd: `${packagesPath}/pwa`,
            script: npm,
            args: 'start',
            // Rollup watches the directory for us in dev mode
            watch: false,
            env: {
                // Hack around pm2 ending up in the grandparent directory
                PACKAGE_DIR: `${packagesPath}/pwa`
            },
            source_map_support: true
        },
        {
            name: 'extension',
            cwd: `${packagesPath}/extension`,
            script: npm,
            args: 'start',
            env: {
                // Hack around pm2 ending up in the grandparent directory
                PACKAGE_DIR: `${packagesPath}/extension`
            }
        }
    ]
};
