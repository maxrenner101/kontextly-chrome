const { merge } = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    devtool: 'inline-source-map',
    mode: 'development',
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify('http://localhost:3000'),
            'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://localhost:3000/api'),
        }),
    ],
});