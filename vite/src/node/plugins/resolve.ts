import resolve from "resolve";
import { Plugin } from "../plugin";
import { ServerContext } from "../server/index";
import path from "path";
import { pathExists } from "fs-extra";
import { DEFAULT_EXTENSIONS } from "../constant";

/**
 * 对开发时前端页面请求的路径进行处理，转换为文件系统中的路径
 * @returns 
 */
export function resolvePlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: "mini-vite:resolve",
    configureServer(s) {
      serverContext = s;
    },
    async resolveId(id: string, importer?: string) {
      // 1. 绝对路径，id 即为 path
      if (path.isAbsolute(id)) {
        if (await pathExists(id)) {
          return { id };
        }
        // 加上 root 路径前缀，处理 /src/main.tsx 的情况
        id = path.join(serverContext.root, id);
        if (await pathExists(id)) {
          return { id };
        }
      } else if (id.startsWith(".")) {
        // 2. 相对路径
        if (!importer) {
          throw new Error("`importer` should not be undefined");
        }
        const hasExtension = path.extname(id).length > 1;
        let resolvedId: string;
        // 2.1 包含文件名后缀
        // 如 ./App.tsx
        if (hasExtension) {
          resolvedId = resolve.sync(id, { basedir: path.dirname(importer) });
          if (await pathExists(resolvedId)) {
            return { id: resolvedId };
          }
        } else {
          // 2.2 不包含文件名后缀
          // 如 ./App
          for (const extname of DEFAULT_EXTENSIONS) {
            try {
              const withExtension = `${id}${extname}`;
              // ./App -> ./App.tsx
              resolvedId = resolve.sync(withExtension, {
                basedir: path.dirname(importer),
              });
              if (await pathExists(resolvedId)) {
                return { id: resolvedId };
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      return null;
    },
  };
}
