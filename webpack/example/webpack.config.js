const path = require('path');
const PluginA = require('../plugins/plugin-a');
const PluginB = require('../plugins/plugin-b');

module.exports = {
  mode: 'development',
  entry: {
    main: './example/src/entry1.js',
    second: path.resolve(__dirname, './src/entry2.js'),
  },
  context: process.cwd(), // 项目根路径，entry 的相对路径是相对于该根路径的
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  plugins: [new PluginA(), new PluginB()],
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          path.resolve(__dirname, '../loaders/loader-a.js'),
          path.resolve(__dirname, '../loaders/loader-b.js'),
        ],
      },
    ],
  },
};
