const path = require('path');
const webpack = require('webpack');

const ENVIRONMENT = process.env.NODE_ENV || 'production';

const config = {
    stats: {
        colors: true,
        reasons: true,
    },
    entry: {
        main: ['./src/index.js'],
    },
    output: {
        libraryTarget: 'commonjs2',
        path: path.resolve(__dirname, 'dist'),
        filename: ENVIRONMENT === 'production' ? 'index.min.js' : 'index.js',
        library: 'IdleTaskQue',
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
    plugins: [],
};

if (ENVIRONMENT === 'production') {
    config.devtool = 'cheap-module-source-maps';
    config.output.libraryTarget = 'var';
    config.plugins.push(new webpack.optimize.UglifyJsPlugin({
        output: {
            comments: false,
        },
        compress: {
            warnings: false,
            conditionals: true,
            unused: true,
            comparisons: true,
            sequences: true,
            dead_code: true,
            evaluate: true,
            if_return: true,
            join_vars: true,
        },
        sourceMap: true,
    }));
}

module.exports = config;
