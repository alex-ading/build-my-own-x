import { CLIENT_PUBLIC_PATH, HMR_PORT } from "../utils";
import { Plugin } from "./types";
import fs from "fs-extra";
import path from "path";
import { ServerContext } from "../server";

export function clientInjectPlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "mini-vite:client-inject",
    configureServer(s) {
      serverContext = s;
    },
    resolveId(id) {
      if (id === CLIENT_PUBLIC_PATH) {
        return { id };
      }
      return null;
    },
    async load(id) {
      // 加载 HMR 客户端脚本
      if (id === CLIENT_PUBLIC_PATH) {
        const realPath = path.join(
          serverContext.root,
          "dist",
          "client.mjs"
        );
        const code = await fs.readFile(realPath, "utf-8");
        return {
          // 替换占位符
          code: code.replace("__HMR_PORT__", JSON.stringify(HMR_PORT)),
        };
      }
    },
    transformIndexHtml(raw) {
      // 在 head 标签后面加上 <script type="module" src="/@vite/client"></script>
      // 在 render html 中间件里面会自动执行 transformIndexHtml 钩子
      return raw.replace(
        /(<head[^>]*>)/i,
        `$1<script type="module" src="${CLIENT_PUBLIC_PATH}"></script>`
      );
    },
  };
}
