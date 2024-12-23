console.log("[mini-vite] connecting...");

interface Update {
  type: "js-update" | "css-update";
  path: string;
  acceptedPath: string;
  timestamp: number;
}

// 1. 创建客户端 WebSocket 实例
// 其中的 __HMR_PORT__ 之后会被 no-bundle 服务编译成具体的端口号
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, "vite-hmr");

// 3. 根据不同的更新类型进行更新
async function handleMessage(payload: any) {
  switch (payload.type) {
    case "connected":
      console.log(`[mini-vite] connected`);
      // 心跳检测
      setInterval(() => socket.send("ping"), 1000);
      break;
    case "update":
      // 进行具体的模块更新
      payload.updates.forEach((update: Update) => {
        console.log(`[mini-vite] ${update.path} update`);
        if (update.type === "js-update") {
          fetchUpdate(update);
        } else if (update.type === 'css-update') {

        }
      });
      break;
  }
}

// 2. 接收服务端的更新信息
socket.addEventListener("message", async ({ data }) => {
  handleMessage(JSON.parse(data))
    .catch(console.error);
});


interface HotModule {
  id: string;
  callbacks: HotCallback[];
}

interface HotCallback {
  deps: string[];
  fn: (modules: object[]) => void;
}

// HMR 模块表
const hotModulesMap = new Map<string, HotModule>();
// 不再生效的模块表
const pruneMap = new Map<string, (data: any) => void | Promise<void>>();

export const createHotContext = (ownerPath: string) => {
  // 记录一个模块所 accept 的模块，以及 accept 的模块更新之后回调逻辑。
  const mod = hotModulesMap.get(ownerPath);
  if (mod) mod.callbacks = [];

  function acceptDeps(deps: string[], callback: any) {
    const mod: HotModule = hotModulesMap.get(ownerPath) || {
      id: ownerPath,
      callbacks: [],
    };
    // callbacks 属性存放 accept 的依赖、依赖改动后对应的回调逻辑
    mod.callbacks.push({
      deps,
      fn: callback,
    });
    hotModulesMap.set(ownerPath, mod);
  }

  return {
    // if (import.meta.hot) {
    //   import.meta.hot.accept('./render.ts', (newModule) => {
    //     newModule.render();
    //   })
    // }
    accept(deps: any, callback?: any) {
      // 这里仅考虑接受自身模块更新的情况
      if (typeof deps === "function" || !deps) {
        acceptDeps([ownerPath], ([mod]: any) => deps && deps(mod));
      }
    },
    // 模块不再生效的回调
    // import.meta.hot.prune(() => {})
    prune(cb: (data: any) => void) {
      pruneMap.set(ownerPath, cb);
    },
  };
};

/**
 * 获取热更内容
 * @param param0 
 * @returns 
 */
async function fetchUpdate({ path, timestamp }: Update) {
  const mod = hotModulesMap.get(path);
  if (!mod) return;

  const moduleMap = new Map();
  const modulesToUpdate = new Set<string>();
  modulesToUpdate.add(path);

  await Promise.all(
    Array.from(modulesToUpdate).map(async (dep) => {      
      const [path, query] = dep.split(`?`);
      try {
        // 通过动态 import 拉取最新模块
        const newMod = await import(
          path + `?t=${timestamp}${query ? `&${query}` : ""}`
        );
        moduleMap.set(dep, newMod);
      } catch (e) {}
    })
  );

  return () => {
    // 拉取最新模块后执行更新回调
    for (const { deps, fn } of mod.callbacks) {
      fn(deps.map((dep: any) => moduleMap.get(dep)));
    }
    console.log(`[mini-vite] hot updated: ${path}`);
  };
}

