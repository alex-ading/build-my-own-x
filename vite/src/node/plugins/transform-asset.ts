import { Plugin } from "./types";
import { ServerContext } from "../server";
import { cleanUrl, getShortName, removeImportQuery } from "../utils";

export function assetPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: "mini-vite:transform-asset",
    configureServer(s) {
      serverContext = s;
    },
    async load(id) {
      const cleanedId = removeImportQuery(cleanUrl(id));
      // 这里仅处理 jpg
      if (cleanedId.endsWith(".jpg")) {
        const resolvedId = `${getShortName(id, serverContext.root)}`; // 得到文件被引用时的相对路径
        return {
          code: `export default "${resolvedId}"`, // 文件被引用时，src 处是路径
        };
      }
    },
  };
}
