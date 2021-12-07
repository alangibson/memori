module.exports = {
    apps: [
        {
            name: 'proxy',
            cwd: './proxy',
            script: 'npm run start -- -n test',
            args: '',
            // watch: ['proxy'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
        },
        {
            name: 'server',
            cwd: './server',
            script: 'npm run start',
            // args: '',
            // watch: ['server'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
        },
        {
            name: 'pwa',
            cwd: './pwa',
            // script: 'npm run start',
            script: 'npm run dev',
            // args: '',
            // watch: ['server'],
            // watch: true,
            // env: {
            //     NODE_ENV: 'development',
            // },
            source_map_support: true,
        },
        {
            name: 'extension',
            cwd: './extension',
            script: 'npm start'
        }
    ]
};