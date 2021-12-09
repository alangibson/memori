export default {
    presets: [
        [
            '@babel/preset-env',
            {
                // Force Babel to use @babel/preset-typescript and therefore tsconfig.json
                modules: false,
                targets: {
                    // node: 16,
                    node: true
                }
            }
        ],
        [
            '@babel/preset-typescript',
            {
                extensions: ['.js', '.ts']
            }
        ]
    ],
    plugins: ['@babel/plugin-transform-runtime']
};
