import { readFile } from "fs-extra";
import { Plugin } from "./types";
import { isJSRequest } from "../utils";
import esbuild from "esbuild";
import path from "path";

/**
 *  JS/TS/JSX/TSX -> js
 * @returns 
 */
export function esbuildTransformPlugin(): Plugin {
  return {
    name: "mini-vite:transform-js",
    async load(id: string) {
      if (isJSRequest(id)) {
        try {
          const code = await readFile(id, "utf-8");
          return code;
        } catch (e) {
          return null;
        }
      }
    },
    async transform(code: string, id: string) {
      if (isJSRequest(id)) {
        const extname = path.extname(id).slice(1); // 扩展名
        const { code: transformedCode, map } = await esbuild.transform(code, {
          target: "esnext",
          format: "esm",
          sourcemap: true,
          loader: extname as "js" | "ts" | "jsx" | "tsx",
          jsx: 'automatic'
        });

        return {
          code: transformedCode,
          map,
        };
      }
      return null;
    },
  };
}
