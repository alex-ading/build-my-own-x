import Koa from "koa";
import { blue } from "picocolors"; // 命令行颜色
import { optimize } from "../optimizer";
import { renderHtml, transform } from "./middlewares";
import { getPlugins } from "../plugins";
import { createPluginContainer, PluginContainer } from "../plugins/pluginContainer";
import { Plugin } from "../plugins/types";

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
  const plugins = getPlugins();
  const pluginContainer = createPluginContainer(plugins);
  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
  };
  
  for (const plugin of plugins) {
    // 保存服务端上下文
    plugin.configureServer && await plugin.configureServer(serverContext);
  }

  app.use(renderHtml);
  
  app.use(transform(serverContext));

  app.listen(3000, async () => {
    await optimize(root); // esbuild
    console.log(
      "No-Bundle 服务已经成功启动，",
      blue(`耗时: ${Date.now() - startTime} ms`)
    );
    console.log(`本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
