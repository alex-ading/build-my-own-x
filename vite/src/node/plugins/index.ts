import { esbuildTransformPlugin } from "./esbuild-transform";
import { importAnalysisPlugin } from "./importAnalysis";
import { resolvePlugin } from "./resolve";
import { Plugin } from "./types";

export function getPlugins(): Plugin[] {
  return [resolvePlugin(), esbuildTransformPlugin(), importAnalysisPlugin()];
}
