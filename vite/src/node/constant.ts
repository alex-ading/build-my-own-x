import path from 'path';

export const EXTERNAL_TYPES = [
  "css",
  "less",
  "png",
  "jpe?g",
];

// 检查一个字符串是否以一个单词字符或@开始，并且紧跟着的不是:字符。例如，它可以匹配"user"、"@global"等字符串，但不能匹配"user:"或"@scope:"等以:结尾的字符串。
export const BARE_IMPORT_RE = /^[\w@][^:]/; 

// 预构建产物默认存放在 node_modules 中的 .mini-vite 目录中
export const PRE_BUNDLE_DIR = path.join("node_modules", ".mini-vite");

export const DEFAULT_EXTENSIONS = [".tsx", ".ts", ".jsx", "js"];
