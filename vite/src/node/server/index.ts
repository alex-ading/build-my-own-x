import Koa from "koa";
import { blue } from "picocolors"; // 命令行颜色
import { optimize } from "../optimizer";
import { renderHtml, transform, renderStatic } from "./middlewares";
import { getPlugins } from "../plugins";
import {
  createPluginContainer,
  PluginContainer,
} from "../plugins/plugin-container";
import { Plugin } from "../plugins/types";
import { ModuleGraph } from "../module-graph";
import chokidar, { FSWatcher } from "chokidar";
import { createWebSocketServer } from "../ws";
import { bindingHMREvents } from "../hmr";

export interface ServerContext {
  root: string;
  app: Koa<Koa.DefaultState, Koa.DefaultContext>;
  pluginContainer: PluginContainer;
  plugins: Plugin[];
  moduleGraph: ModuleGraph;
  ws: { send: (data: any) => void; close: () => void };
  watcher: FSWatcher;
}

export async function startDevServer() {
  const app = new Koa();
  const root = process.cwd();
  const startTime = Date.now();

  // vite 插件
  const plugins = getPlugins();
  const pluginContainer = createPluginContainer(plugins);
  // 模块依赖图
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));
  // websocket
  const ws = createWebSocketServer(app);
  // 文件监听器，监听文件变动
  const watcher = chokidar.watch(root, {
    ignored: ["**/node_modules/**", "**/.git/**", `${root}/src`, /\.map$/],
    ignoreInitial: true,
  });

  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    watcher
  };

  bindingHMREvents(serverContext);

  for (const plugin of plugins) {
    // 保存服务端上下文
    plugin.configureServer && (await plugin.configureServer(serverContext));
  }

  app.use(renderHtml(serverContext));

  app.use(transform(serverContext));

  app.use(renderStatic(serverContext));

  app.listen(3000, async () => {
    await optimize(root); // esbuild
    console.log(
      "No-Bundle 服务已经成功启动，",
      blue(`耗时: ${Date.now() - startTime} ms`)
    );
    console.log(`本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
