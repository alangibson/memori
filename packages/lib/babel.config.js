export default {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 16
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
