const npm = `${process.cwd()}/pm2-npm.js`;

module.exports = {
    apps: [
        {
            name: 'proxy',
            cwd: '../proxy',
            script: npm,
            args: 'start -- -n memori',
            watch: ['../proxy'],
            watch: true,
            source_map_support: true
        },
        {
            name: 'server',
            cwd: '../server',
            script: npm,
            args: 'start',
            watch: false,
            env: {
                // shut Tensorflow up
                TF_CPP_MIN_LOG_LEVEL: '2'
            },
            source_map_support: true
        },
        {
            name: 'pwa',
            cwd: '../pwa',
            script: npm,
            args: 'start',
            // Rollup watches the directory for us in dev mode
            watch: false,
            source_map_support: true
        },
        {
            name: 'extension',
            cwd: '../extension',
            script: npm,
            args: 'start'
        }
    ]
};
