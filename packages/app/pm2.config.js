const path = require('path');

// const npm = 'npm';
const npm = `${__dirname}/bin/pm2-npm.js`;

module.exports = {
    apps: [
        {
            name: 'proxy',
            script: npm,
            args: 'exec -- @memori/proxy start'
        },
        {
            name: 'server',
            script: npm,
            args: 'exec --  @memori/server start',
            env: {
                // shut Tensorflow up
                TF_CPP_MIN_LOG_LEVEL: '2'
            }
        },
        {
            name: 'pwa',
            script: npm,
            args: 'exec --  @memori/pwa start'
        },
        {
            name: 'extension',
            script: npm,
            args: 'exec --  @memori/extension start'
        }
    ]
};
