const { SyncHook } = require('tapable');
const path = require('path');
const fs = require('fs');

class Compiler {
  constructor(options) {
    this.options = options;
    this.rootPath = this.options.context || process.cwd().path.replace(/\\/g, '/');
    this.hooks = { // 后续可从 options 里注册各个钩子的回调事件，并在特定时机执行
      // 开始编译时的钩子
      run: new SyncHook(),
      // 写入文件之前的钩子
      emit: new SyncHook(),
      // compilation 完成时的钩子
      done: new SyncHook(),
    };
    // 所有入口文件的代码
    this.entries = new Set();
    // 所有依赖
    this.modules = new Set();
    // 所有代码块
    this.chunks = new Set();
    // 所有文件对象
    this.assets = new Set();
    // 所有文件名
    this.files = new Set();
  }

  /**
   * 启动编译
   * @param {*} callback
   */
  run(callback) {
    this.hooks.run.call();
    const entries = this.getEntries();
    this.buildEntryModule(entries);
    // console.log('entries: ', entries);
  }

  /**
   * 获取入口文件，返回 { 入口文件名字: 入口文件绝对路径 } 的数据结构
   * @returns
   */
  getEntries() {
    let entries;
    const entryOptions = this.options.entry;
    if (typeof entryOptions === 'string') {
      entries.main = entryOptions;
    } else {
      entries = entryOptions;
    }
    Object.keys(entries).forEach((key) => {
      const val = entries[key];
      if (!path.isAbsolute(val)) {
        entries[key] = path.join(this.options.context, val).replace(/\\/g, '/'); // 统一转换成绝对路径
      }
    });
    return entries;
  }

  /**
   * 遍历所有入口文件，从入口文件开始编译
   * @param {*} entries
   */
  buildEntryModule(entries) {
    Object.keys(entries).forEach((entryName) => {
      const entryPath = entries[entryName];
      const entryModule = this.buildModule(entryName, entryPath);
      this.entries.add(entryModule);
    });
  }

  /**
   * 编译单个模块
   * @param {*} moduleName
   * @param {*} modulePath
   */
  buildModule(moduleName, modulePath) {
    const originSourceCode = fs.readFileSync(modulePath, 'utf-8');
    this.originSourceCode = originSourceCode; // 原始代码
    this.moduleCode = originSourceCode; // 编译后的代码
    this.useLoader(modulePath);
    this.useWebpackCompiler(moduleName, modulePath);
  }

  /**
   * 对模块使用 loader
   * @param {*} modulePath
   */
  useLoader(modulePath) {
    // 获取所有匹配当前文件的 loader
    const matchLoaders = [];
    const { rules } = this.options.module;
    rules.forEach((rule) => {
      if (rule.test.test(modulePath)) {
        // loader 有不同注册方式
        if (rule.loader) {
          matchLoaders.push(rule.loader);
        } else {
          matchLoaders.push(...rule.use);
        }
      }
    });
    // 从右往左执行 loader
    for (let i = matchLoaders.length - 1; i >= 0; i -= 1) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const loaderFn = require(matchLoaders[i]);
      this.originSourceCode = loaderFn(this.originSourceCode);
      console.log('this.originSourceCode: ', this.originSourceCode);
    }
  }

  /**
   * 执行 babel 等一系列编译
   * @param {*} moduleName
   * @param {*} modulePath
   */
  useWebpackCompiler(moduleName, modulePath) {
    console.log('modulePath: ', modulePath);
    console.log('moduleName: ', moduleName);
  }
}

module.exports = Compiler;
