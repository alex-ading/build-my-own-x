import path from "path";
import { pathExists, readFile } from "fs-extra";
import { Context } from "koa";

export const renderHtml = async (ctx: Context, next: () => Promise<void>) => {
  if (ctx.req.url === "/") {
    // 默认使用项目根目录下的 index.html
    const indexHtmlPath = path.join(process.cwd(), "example/index.html");
    if (await pathExists(indexHtmlPath)) {
      const rawHtml = await readFile(indexHtmlPath, "utf8");
      ctx.res.setHeader("Content-Type", "text/html");
      ctx.res.end(rawHtml);
    }
  }
  await next();
};
