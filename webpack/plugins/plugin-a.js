class PluginA {
  apply(compiler) {
    // 注册钩子的回调函数
    compiler.hooks.run.tap('Plugin A', () => {
      console.log('PluginA run');
    });
  }
}

module.exports = PluginA;
