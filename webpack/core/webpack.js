const Compiler = require('./complier');

/**
 * 合并配置文件和 shell 命令中的参数
 * @param {*} options
 * @returns
 */
const getMergeOptions = (options) => {
  const shellOptions = process.argv.slice(2).reduce((obj, item) => {
    const arr = item.slice(2).split('=');
    const [key, value] = arr;
    obj[key] = value;
    return options;
  }, {});

  return {
    ...options,
    ...shellOptions,
  };
};

/**
 * 注册插件
 * @param {*} compiler
 * @param {*} plugins
 */
const loadPlugins = (compiler, plugins) => {
  if (plugins) {
    plugins.forEach((plugin) => {
      plugin.apply(compiler); // 每个 webpack 插件都必须有 apply 方法
    });
  }
};

const webpack = (options) => {
  // 1. 初始化参数
  const mergeOptions = getMergeOptions(options);
  // 2. 创建 complier 对象
  const compiler = new Compiler(mergeOptions);
  // 3. 注册 plugin
  loadPlugins(compiler, options.plugins);
  return compiler;
};

module.exports = webpack;
