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
    this.hooks = { // 后续可从 options 里注册各个钩子的回调事件，并在特定时机执行，即 plugins

      // 开始编译时的钩子
      run: new SyncHook(),
      // 写入文件之前的钩子，在开始执行写入动作时执行
      emit: new SyncHook(),
      // compilation 完成时的钩子，写入完成后执行
      done: new SyncHook(),
    };
    // 所有入口模块
    this.entryModules = new Set();
    // 所有依赖的模块
    this.modules = new Set();
    // 所有代码块
    this.chunks = new Set();
    // 所有文件对象（存在内存中）
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
    this.buildEntryModule(entries); // 从入口文件递归地编译文件，并形成 chunk 对象
    this.exportFile(callback); // 从 chunk 对象写入文件系统
    // console.log('this.entryModules: ', this.entryModules);
    // console.log('this.modules: ', this.modules);
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
      this.entryModules.add(entryModule);
      this.buildChunk(entryName, entryModule);
    });
    // console.log('chunks', this.chunks);
  }

  /**
   * 编译单个模块
   * @param {*} moduleName 入口模块名称
   * @param {*} modulePath 模块的路径
   */
  buildModule(moduleName, modulePath) {
    const originSourceCode = fs.readFileSync(modulePath, 'utf-8');
    this.originSourceCode = originSourceCode; // 原始代码
    this.moduleCode = originSourceCode; // 编译后的代码
    this.useLoader(modulePath);
    const module = this.useWebpackCompiler(moduleName, modulePath);
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
   * 执行 babel 等一系列编译，包括递归编译依赖文件
   * @param {*} moduleName 入口模块名称
   * @param {*} absolutePath 模块的绝对路径
   */
  useWebpackCompiler(moduleName, absolutePath) {
    // 初始化当前模块的信息
    const moduleId = `./${path.relative(this.rootPath, absolutePath)}`; // 获取文件相对于根路径的相对路径
    const module = {
      id: moduleId,
      dependencies: new Set(), // 该模块所依赖的模块的相对于根路径的相对路径，也就是 moduleId
      name: [moduleName], // 该模块所属的入口文件的名字，来自 entries
      _source: '', // 经过 loader、babel 处理过的代码
    };

    // 使用 babel 生成 ast，并替换一些代码 https://astexplorer.net/
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
          // 替换源代码 require 中的路径
          node.arguments = [types.stringLiteral(subModuleId)];
          // 添加到当前模块的依赖中
          module.dependencies.add(subModuleId);
        }
      },
    });

    // 递归 build 当前文件的依赖文件
    const existModuleIds = Array.from(this.modules).map((item) => (item.id));
    module.dependencies.forEach((dependencyModuleId) => {
      if (existModuleIds.includes(dependencyModuleId)) {
        const existModule = Array.from(this.modules).find((item) => (item.id === dependencyModuleId));
        existModule.name.push(moduleName);
      } else {
        const depModule = this.buildModule(moduleName, dependencyModuleId);
        this.modules.add(depModule);
      }
    });

    const { code } = generator(ast);
    module._source = code;

    return module;
  }

  /**
   * 根据入口文件，集成 chunk
   * @param {*} entryName
   * @param {*} entryModule
   */
  buildChunk(entryName, entryModule) {
    const chunk = {
      name: entryName, // 每一个入口文件作为一个 chunk
      entryModule, // 入口文件编译后的模块
      modules: Array.from(this.modules).filter((module) => module.name.includes(entryName)), // 入口文件层层递归下去所依赖的所有模块
    };
    this.chunks.add(chunk);
  }

  /**
   * 写入文件系统
   */
  exportFile(callback) {
    const { output } = this.options;
    this.chunks.forEach((chunk) => {
      const fileName = output.filename.replace('[name]', chunk.name);
      this.assets[fileName] = this.getTargetCode(chunk); // 根据 chunk 对象生成目标代码
    });
    // 调用 emit 钩子
    this.hooks.emit.call();

    if (!fs.existsSync(output.path)) {
      fs.mkdirSync(output.path);
    }
    // 将 assets 中的内容写入文件系统
    Object.keys(this.assets).forEach((fileName) => {
      const filePath = path.join(output.path, fileName);
      fs.writeFileSync(filePath, this.assets[fileName]);
    });

    // 调用 done 钩子
    this.hooks.done.call();

    callback(null, {}); // TODO
  }

  /**
   * 根据 chunk 内容生成最终的 bundle
   * @param {*} chunk
   */
  getTargetCode(chunk) {
    const { entryModule, modules } = chunk;
    return `
  (() => {
    var __webpack_modules__ = {
      ${modules
    .map((module) => `
          '${module.id}': (module) => {
            ${module._source}
      }
        `)
    .join(',')}
    };
    // cache
    var __webpack_module_cache__ = {};

    // __webpack_require__
    function __webpack_require__(moduleId) {
      var cachedModule = __webpack_module_cache__[moduleId];
      if (cachedModule !== undefined) {
        return cachedModule.exports;
      }
      // Create a new module (and put it into the cache)
      var module = (__webpack_module_cache__[moduleId] = {
        // no module.id needed
        // no module.loaded needed
        exports: {},
      });

      // Execute the module function
      __webpack_modules__[moduleId](module, module.exports, __webpack_require__);

      // Return the exports of the module
      return module.exports;
    }

    var __webpack_exports__ = {};
    // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
    (() => {
      ${entryModule._source}
    })();
  })();
  `;
  }
}

module.exports = Compiler;
