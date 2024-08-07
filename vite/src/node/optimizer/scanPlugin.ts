import { Plugin } from "esbuild";
import { BARE_IMPORT_RE, EXTERNAL_TYPES } from "../utils";

/**
 * 扫描第三方依赖
 * @param deps 
 * @returns 
 */
export const scanPlugin = (deps: Set<string>): Plugin => {
  return {
    name: "esbuild:scan", // 插件名字
    setup(build) {
      // 插件逻辑，在构建的时候执行
      // 过滤掉 css 等文件
      build.onResolve(
        { filter: new RegExp(`\\.(${EXTERNAL_TYPES.join("|")})$`) },
        (args) => {
          return {
            path: args.path,
            external: true,
          };
        }
      );

      // 记录第三方依赖，并标记为 external
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (args) => {
          const { path } = args;
          deps.add(path);
          return {
            path,
            external: true,
          };
        }
      );
    },
  };
}