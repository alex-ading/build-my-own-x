import Koa from "koa";
import { blue, green } from "picocolors"; // 命令行颜色

export async function startDevServer() {
  const app = new Koa();
  const root = process.cwd();
  const startTime = Date.now();

  app.use((ctx) => {
    ctx.body = '22'
  })

  app.listen(3000, async () => {
    console.log(
      green("🚀 No-Bundle 服务已经成功启动!"),
      `耗时: ${Date.now() - startTime} ms`
    );
    console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
