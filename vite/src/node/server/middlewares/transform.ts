import path from "path";
import { Context } from "koa";

export const transform = async (ctx: Context, next: () => Promise<void>) => {
  await next();
};
