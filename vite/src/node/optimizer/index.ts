import path from "path";
import { build } from "esbuild";
import { blue } from "picocolors";
import { scanPlugin } from "./scanPlugin";
import { preBundlePlugin } from "./preBundlePlugin";
import { PRE_BUNDLE_DIR } from '../utils'

/**
 * 使用 esbuild 预构建三方依赖，并存储到 dist
 * @param root 命令执行的路径
 */
export async function optimize(root: string) {
  // 1. 确定入口
  const entry = path.resolve(root, "example/src/main.tsx");

  // 2. 从入口处扫描依赖
  const deps = new Set<string>();
  await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    plugins: [scanPlugin(deps)],
  });
  console.log(
    `${"需要预构建的依赖："}\n${[...deps]
      .map(blue)
      .map((item) => `  ${item}`)
      .join("\n")}`
  );
  
  // 3. 预构建依赖
  await build({
    entryPoints: [...deps],
    write: true,
    bundle: true,
    format: "esm",
    splitting: true,
    outdir: path.resolve(root, PRE_BUNDLE_DIR),
    plugins: [preBundlePlugin(deps)],
  });
}
