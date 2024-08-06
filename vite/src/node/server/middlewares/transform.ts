import { Context } from "koa";
import { isJSRequest, cleanUrl, isCSSRequest, isImportRequest } from "../../utils/utils";
import { ServerContext } from "../index";

export async function transformRequest(
  url: string,
  serverContext: ServerContext
) {
  const { pluginContainer } = serverContext;
  url = cleanUrl(url);
  // 依次调用插件容器的 resolveId、load、transform 方法
  const resolvedResult = await pluginContainer.resolveId(url);
  let transformResult;
  if (resolvedResult?.id) {
    let res = await pluginContainer.load(resolvedResult.id);
    if (typeof res === "object" && res !== null) {
      res = res.code;
    }
    if (res) {
      transformResult = await pluginContainer.transform(
        res as string,
        resolvedResult?.id
      );
    }
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
  }
};
