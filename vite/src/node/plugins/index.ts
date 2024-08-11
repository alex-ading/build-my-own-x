import { esbuildTransformPlugin } from "./transform-js";
import { importAnalysisPlugin } from "./import-analysis";
import { resolvePlugin } from "./resolve";
import { cssPlugin } from "./transform-css";
import { assetPlugin } from "./transform-asset";
import { clientInjectPlugin } from './client-inject';
import { Plugin } from "./types";

export function getPlugins(): Plugin[] {
  return [
    clientInjectPlugin(),
    resolvePlugin(),
    esbuildTransformPlugin(),
    importAnalysisPlugin(),
    cssPlugin(),
    assetPlugin(),
  ];
}
