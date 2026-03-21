const { merge } = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify('https://kontextly.net'),
            'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('https://kontextly.net/api'),
        }),
    ],
});