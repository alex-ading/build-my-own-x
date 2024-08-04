import { init, parse } from "es-module-lexer";
import {
  BARE_IMPORT_RE,
  PRE_BUNDLE_DIR,
} from "../utils/constant";
import { isJSRequest } from "../utils/utils";
import MagicString from "magic-string";
import path from "path";
import { Plugin } from "./types";
import { ServerContext } from "../server/index";

export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: "mini-vite:import-analysis",
    /**
     * 保存服务端上下文
     * @param s 
     */
    configureServer(s) {
      serverContext = s;
    },
    async transform(code: string, id: string) {
      console.log('执行顺序 2')
      // 只处理 JS 相关的请求
      if (!isJSRequest(id)) {
        return null;
      }
      await init;
      // 解析 import 语句
      const [imports] = parse(code);
      const magicString = new MagicString(code);
      // 对每一个 import 语句依次进行分析
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;
        // 第三方库: 路径重写到预构建产物的路径
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = path.join("/", PRE_BUNDLE_DIR, `${modSource}.js`);
          magicString.overwrite(modStart, modEnd, bundlePath);
        } else if (modSource.startsWith(".") || modSource.startsWith("/")) { 
          // 相对路径或绝对路径
          // 直接调用插件上下文的 resolveId 方法 // TODO
          const resolved = await serverContext.pluginContainer.resolveId!(modSource, id);
          if (resolved) {
            magicString.overwrite(modStart, modEnd, resolved.id);
          }
        }
      }

      return {
        code: magicString.toString(),
        map: magicString.generateMap(),
      };
    },
  };
}
