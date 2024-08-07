import { Context } from "koa";
import {
  isJSRequest,
  cleanUrl,
  isCSSRequest,
  isImportRequest,
} from "../../utils";
import { ServerContext } from "../index";

export async function transformRequest(
  url: string,
  serverContext: ServerContext
) {
  url = cleanUrl(url);

  // 获取缓存的编译结果，直接返回
  const { moduleGraph } = serverContext;
  let mod = await moduleGraph.getModuleByUrl(url);
  if (mod && mod.transformResult) {
    return mod.transformResult;
  }

  // 依次调用插件容器的 resolveId、load、transform 方法
  const { pluginContainer } = serverContext;
  const resolvedResult = await pluginContainer.resolveId(url);
  let transformResult;
  if (resolvedResult?.id) {
    let res = await pluginContainer.load(resolvedResult.id);
    if (typeof res === "object" && res !== null) {
      res = res.code;
    }

    // 注册模块
    const mod = await moduleGraph.ensureEntryFromUrl(url);
    // 获取编译结果
    if (res) {
      transformResult = await pluginContainer.transform(
        res as string,
        resolvedResult?.id
      );
    }
    // 缓存编译结果
    if (mod) mod.transformResult = transformResult;
  }
  return transformResult;
}

export const transform = (serverContext: ServerContext) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const url = ctx.req.url as string;
    if (isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
      let result = await transformRequest(url, serverContext);
      if (!result) {
        return next();
      }
      if (result && typeof result !== "string") {
        result = result.code;
      }
      // 编译完成，返回响应给浏览器
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/javascript");
      ctx.res.end(result);
    }
    await next();
  };
};
