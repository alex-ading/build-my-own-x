import path from 'path';
import mime from 'mime-types';
import { Context } from "koa";
import { ServerContext } from "../index";
import { isImportRequest } from '../../utils'
import { pathExists, readFile } from "fs-extra";

export const renderStatic = (serverContext: ServerContext) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const url = ctx.req.url as string;
    // 不处理 import 请求
    if (!url || isImportRequest(ctx.req.url as string)) {
      await next();
      return;
    }
    
    if (url.endsWith('jpg')) {
      const imgPath = path.join(serverContext.root, `example/${url}`);
      if (await pathExists(imgPath)) { 
        const img = await readFile(imgPath);
        const type = mime.lookup(imgPath);
        ctx.res.setHeader("Content-Type", type as string);
        ctx.body = img;
      }
    }
    await next();
  };
}


