import path from "path";
import resolve from "resolve";
import fs from "fs-extra";
import { Loader, Plugin } from "esbuild";
import { BARE_IMPORT_RE } from "../utils/constant";
import { init, parse } from "es-module-lexer";

export function preBundlePlugin(deps: Set<string>): Plugin {
  return {
    name: "esbuild:pre-bundle",
    setup(build) {
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (args) => {
          const { path, importer } = args;
          const isEntry = !importer; // TODO whats importer
          if (deps.has(path)) {
            return isEntry
              ? {
                  path,
                  namespace: "dep", // 若为入口（如 react），则标记 dep 的 namespace
                }
              : {
                  // 解析 node 路径
                  // react -> /Users/ading/Desktop/personal/build-my-own-x/vite/node_modules/react/index.js
                  path: resolve.sync(path, { basedir: process.cwd() }), // TODO why react.js appears
                };
          }
        }
      );

      // 打包三方依赖，相当于重新为开发环境的引用生成一个入口文件
      // 入口文件导出了三方依赖的导出
      build.onLoad(
        {
          filter: /.*/,
          namespace: "dep",
        },
        async (args) => {
          await init;
          const { path: filePath } = args; // 这里获取到的是 2 个 react 包
          const root = process.cwd();
          // react -> /Users/ading/Desktop/personal/build-my-own-x/vite/node_modules/react/index.js
          const entryPath = resolve.sync(filePath, { basedir: root });
          const code = await fs.readFile(entryPath, "utf-8");
          const [imports, exports] = parse(code);
          let proxyModule = [];
          if (!imports.length && !exports.length) {
            // cjs：构造代理模块
            const res = require(entryPath);
            const specifiers = Object.keys(res); // 导出的所有变量 list
            proxyModule.push(
              `export { ${specifiers.join(",")} } from "${entryPath}"`,
              `export default require("${entryPath}")`
            );
          } else {
            // esm：export * 导出所有命名导出，export default 导出默认导出
            if ((exports as any).includes("default")) {
              proxyModule.push(`import d from "${entryPath}";export default d`);
            }
            proxyModule.push(`export * from "${entryPath}"`);
          }

          const loader = path.extname(entryPath).slice(1); // path.extname 获取扩展名 index.html -> .html

          return {
            loader: loader as Loader,
            contents: proxyModule.join("\n"),
            resolveDir: root,
          };
        }
      );
    },
  };
}
