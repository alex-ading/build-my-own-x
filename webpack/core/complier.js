const { SyncHook } = require('tapable');
const path = require('path');
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const types = require('@babel/types');

class Compiler {
  /**
   * @param {*} options webpack 配置
   */
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
   * @param {*} entries { 入口文件名字: 入口文件绝对路径 }[]
   */
  buildEntryModule(entries) {
    Object.keys(entries).forEach((entryName) => {
      const entryAbsolutePath = entries[entryName];
      const entryModule = this.buildModule(entryName, entryAbsolutePath);
      this.entries.add(entryModule);
    });
  }

  /**
   * 编译单个模块
   * @param {*} moduleName 入口模块名称
   * @param {*} absolutePath 模块的绝对路径
   */
  buildModule(moduleName, absolutePath) {
    const originSourceCode = fs.readFileSync(absolutePath, 'utf-8');
    this.originSourceCode = originSourceCode; // 原始代码
    this.moduleCode = originSourceCode; // 编译后的代码
    this.useLoader(absolutePath);
    const module = this.useWebpackCompiler(moduleName, absolutePath);
    console.log('module: ', module);
    return module;
  }

  /**
   * 对模块使用 loader
   * @param {*} absolutePath
   */
  useLoader(absolutePath) {
    // 获取所有匹配当前文件的 loader
    const matchLoaders = [];
    const { rules } = this.options.module;
    rules.forEach((rule) => {
      if (rule.test.test(absolutePath)) {
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
      this.moduleCode = loaderFn(this.moduleCode);
    }
  }

  /**
   * 执行 babel 等一系列编译
   * @param {*} moduleName 入口模块名称
   * @param {*} absolutePath 模块的绝对路径
   */
  useWebpackCompiler(moduleName, absolutePath) {
    // 初始化当前模块的信息
    const moduleId = `./${path.relative(this.rootPath, absolutePath)}`; // 获取文件相对于根路径的相对路径
    const module = {
      id: moduleId,
      dependencies: new Set(), // 该模块所依赖的模块的相对于根路径的相对路径
      name: [moduleName], // 该模块所属的入口文件的名字，来自 entries
      _source: '', // 经过 loader、babel 处理过的代码
    };

    // 使用 babel 生成 ast，并替换一些代码
    const ast = parser.parse(this.moduleCode, { sourceType: 'module' });
    traverse(ast, {
      CallExpression: (nodePath) => {
        const { node } = nodePath;
        if (node.callee.name === 'require') {
          const moduleRequirePath = node.arguments[0].value; // 代码中写的依赖文件的路径
          const moduleDirName = path.dirname(absolutePath); // 当前文件所在文件夹
          let moduleAbsolutePath = '';
          const { extensions } = this.options.resolve;
          extensions.unshift('');
          // eslint-disable-next-line no-restricted-syntax
          for (const extension of extensions) {
            const wholePath = path.join(moduleDirName, moduleRequirePath);
            if (fs.existsSync(wholePath + extension)) {
              moduleAbsolutePath = wholePath + extension;
              break;
            }
          }
          // 此处与处理当前文件的逻辑一样，获取依赖文件相对于根路径的相对路径
          const subModuleId = `./${path.relative(this.rootPath, moduleAbsolutePath)}`;
          // 将源代码中的 require 替换为 __webpack_require__
          node.callee = types.identifier('__webpack_require__');
          //  替换源代码 require 中的路径
          node.arguments = [types.stringLiteral(subModuleId)];
          // 添加到当前模块的依赖中
          module.dependencies.add(subModuleId);
        }
      },
    });

    const { code } = generator(ast);
    module._source = code;

    return module;
  }
}

module.exports = Compiler;
