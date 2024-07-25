import { JS_TYPES_RE, QUERY_RE, HASH_RE } from './constant'
import path from 'path'

/**
 * 去除 hash 和 query 后的 url
 * @param url 
 * @returns 
 */
export const cleanUrl = (url: string): string =>
  url.replace(HASH_RE, "").replace(QUERY_RE, ""); 

/**
 * 是否为对 js/ts/三方包 文件的请求
 * @param id 
 * @returns 
 */
export const isJSRequest = (id: string): boolean => {
  id = cleanUrl(id);
  if (JS_TYPES_RE.test(id)) {
    return true;
  }
  if (!path.extname(id) && !id.endsWith("/")) {
    return true;
  }
  return false;
};