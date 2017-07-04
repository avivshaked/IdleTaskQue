const path = require('path');

module.exports = {
    entry: {
        main: ['./src/index.js'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'scrollisten',
        libraryTarget: 'umd',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015'],
                },
            },
            {
                test: /\.js?$/,
                loader: 'eslint-loader',
                exclude: /node_modules/,
            },
        ],
    },
};
