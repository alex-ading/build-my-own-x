import path from "path";
import { pathExists, readFile } from "fs-extra";
import { Context } from "koa";
import { blue } from "picocolors"; // 命令行颜色
import { ServerContext } from "../index";

export const renderHtml = (serverContext: ServerContext) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    console.log('请求路径：', blue(ctx.req.url));
    if (ctx.req.url === "/") {
      // 默认使用项目根目录下的 index.html
      const indexHtmlPath = path.join(serverContext.root, "/example/index.html");
      if (await pathExists(indexHtmlPath)) {
        let rawHtml = await readFile(indexHtmlPath, "utf8");
        // 插入 client 脚本 <script type="module" src="/@vite/client"></script>
        for (const plugin of serverContext.plugins) {
          if (plugin.transformIndexHtml) {
            rawHtml = await plugin.transformIndexHtml(rawHtml);
          }
        }
        ctx.res.setHeader("Content-Type", "text/html");
        ctx.res.end(rawHtml);
      }
    }
    await next();
  };
}


