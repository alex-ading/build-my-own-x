import Koa from "koa";
import { blue } from "picocolors"; // 命令行颜色
import { optimize } from "../optimizer";
import { renderHtml } from "./middlewares/renderHtml";
import { resolvePlugins } from "../plugins";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { Plugin } from "../plugin";

export interface ServerContext {
  root: string;
  app: Koa<Koa.DefaultState, Koa.DefaultContext>;
  pluginContainer: PluginContainer;
  plugins: Plugin[];
}

export async function startDevServer() {
  const app = new Koa();
  const root = process.cwd();
  const startTime = Date.now();

  // vite 插件
  const plugins = resolvePlugins();
  const pluginContainer = createPluginContainer(plugins);
  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
  };
  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }

  app.use(renderHtml);

  app.listen(3000, async () => {
    await optimize(root); // esbuild
    console.log(
      "No-Bundle 服务已经成功启动，",
      blue(`耗时: ${Date.now() - startTime} ms`)
    );
    console.log(`本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
