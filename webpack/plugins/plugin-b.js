class PluginB {
  apply(compiler) {
    // 注册钩子的回调函数
    compiler.hooks.emit.tap('Plugin B', () => {
      // console.log('PluginB emit');
    });
  }
}

module.exports = PluginB;
