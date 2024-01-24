const webpack = require('./webpack');
const config = require('../example/webpack.config');

const compiler = webpack(config);

compiler.run(() => {

});
