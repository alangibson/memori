// const npm = 'npm';
const npm = './pm2-npm.js';

module.exports = {
    apps: [
        {
            name: 'proxy',
            cwd: './packages/proxy',
            script: npm,
            args: 'start -- -n test',
            watch: ['packages/proxy'],
            watch: true,
            source_map_support: true
        },
        {
            name: 'server',
            cwd: './packages/server',
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
            cwd: './packages/pwa',
            script: npm,
            args: 'run dev',
            // Rollup watches the directory for us in dev mode
            watch: false,
            source_map_support: true
        },
        {
            name: 'extension',
            cwd: './packages/extension',
            script: npm,
            args: 'start'
        }
    ]
};
