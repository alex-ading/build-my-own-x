import path from "path";
import { pathExists, readFile } from "fs-extra";
import { Context } from "koa";
import { blue } from "picocolors"; // 命令行颜色

export const renderHtml = async (ctx: Context, next: () => Promise<void>) => {
  console.log('请求路径：', blue(ctx.req.url));
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
