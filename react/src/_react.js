// https://pomb.us/build-your-own-react/
/**
 * 创建 vnode
 * @param {*} type element 类型，如 div
 * @param {*} props 属性
 * @param  {...any} children 
 * @returns 
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child) // 文本
      ),
    }
  }
}

/**
 * 创建文本 vnode
 * @param {*} text 
 * @returns 
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  }
}

/**
 * 将 vnode 转换为 dom
 * @param {*} fiber 
 * @returns 
 */
function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

let nextUnitOfWork = null // 下一个工作单元
let wipRoot = null // 根工作单元， work in progress root
let currentRoot = null // 上一个 fiber 树
let deletions = null

let wipFiber = null // 函数组件 hook 使用，记录上一个 fiber
let hookIndex = null

// 判断是否为事件属性
const isEvent = key => key.startsWith("on")
// 判断是否为 事件和 children 以外的属性
const isProperty = key => key !== "children" && !isEvent(key)
// 是否为新增属性
const isNew = (prev, next) => key => prev[key] !== next[key]
// 是否要移除属性
const isGone = (prev, next) => key => !(key in next)

/**
 * 更新绑定的事件和属性
 * @param {*} dom 
 * @param {*} prevProps 
 * @param {*} nextProps 
 */
function updateDom(dom, prevProps, nextProps) {
  // 移除旧事件
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // 移除旧属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => dom[name] = "")

  // 更新新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // 添加监听事件
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}


/**
 * 从根元素启动
 * @param {*} element 
 * @param {*} container 
 */
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot, // 保存上一次的 fiber 树，进行对比
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

/**
 * 删除 dom 元素
 * @param {*} fiber 
 * @param {*} domParent 
 */
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    // function App(props) {
    //   return <h1 onClick={() => handleClickTitle(props.name)}>Hi {props.name}</h1>
    // }
    commitDeletion(fiber.child, domParent) // 函数层没有 dom（App），children 有 dom（h1）
  }
}

/**
 * 启动渲染
 */
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child)
  currentRoot = wipRoot; // commit 完成后，保存 fiber 树
  wipRoot = null
}

/**
 * 根据新增/删除/更新渲染
 * @param {*} fiber 
 * @returns 
 */
function commitWork(fiber) {
  if (!fiber) return

  let domParentFiber = fiber.parent
  // 兼容函数组件，向上递归找到 dom 元素作为父元素，即把函数层过滤掉
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // 新增
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) { // 更新
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
  }

  // 递归渲染子节点与兄弟节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

/**
 * 启动单个工作单元的处理工作，返回下一个工作单元
 * @param {*} fiber 
 * @returns 
 */
function performUnitOfWork(fiber) {
  // 区分组件类型
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) { // 函数组件
    updateFunctionComponent(fiber)
  } else { // 非函数组件
    updateHostComponent(fiber)
  }

  // 3. return 下一个工作单元（对 fiber children 进行递归处理）
  // 优先级：子 fiber > 兄弟 fiber > 父 fiber的兄弟 fiber
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    // 兄弟fiber
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    // 父 fiber 的兄弟fiber
    nextFiber = nextFiber.parent
  }
}

/**
 * 处理函数组件
 * @param {*} fiber 
 */
function updateFunctionComponent(fiber) {
  // 函数组件与普通组件的区别：
  // 函数组件没有 dom 节点
  // 函数自建的 props 来自于运行时的返回值，而不是依靠 babel 解析的

  wipFiber = fiber  // 保存旧的 fiber
  hookIndex = 0
  wipFiber.hooks = [] // 清空旧 fiber hook

  // function App(props) {
  //   return <h1 onClick={() => handleClickTitle(props.name)}>Hi {props.name}</h1>
  // }
  // type 为 App 函数本身，执行后得到返回结果，即 children
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]

  const hook = {
    state: oldHook ? oldHook.state : initial, // 复用旧 hook 的值
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    // 设置下一个工作单元
    nextUnitOfWork = wipRoot // TODO: immediately, how about unfinished renders?
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++

  return [hook.state, setState]
}

/**
 * 处理普通组件
 * @param {*} fiber 
 */
function updateHostComponent(fiber) {
  // 1. 为 fiber 创建 dom
  if (!fiber.dom) fiber.dom = createDom(fiber)
  // 2. 创建 new fiber，处理 fiber 和 fiber children 之间的关系
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements)
}

/**
 *  * 计算单个工作单元及其 children 的新增、删除、更新改动，生成新 fiber
 * @param {*} wipFiber 
 * @param {*} elements 
 */
function reconcileChildren(wipFiber, elements) {
  // wipFiber 初始化时为 
  // wipRoot = {
  //   dom: container,
  //   props: {
  //     children: [element], // elements 在这里
  //   },
  //   alternate: currentRoot, 
  // }

  let index = 0;
  let prevSibling = null;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child // (oldFiber = wipFiber.alternate.child)，父元素只关联第一个 fiber

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    // 判断新旧 fiber 是否是相同类型元素
    const sameType = oldFiber && element && element.type == oldFiber.type
    if (sameType) {
      newFiber = {
        parent: wipFiber,
        type: oldFiber.type,
        dom: oldFiber.dom,
        alternate: oldFiber,
        props: element.props,
        effectTag: "UPDATE",
      }
    }
    // 类型不同，新 fiber 存在，新增新的 fiber
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props || {},
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }

    // 类型不同，旧 fiber 存在，先收集再在 commit 阶段移除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    // 进入下个循环前的数据处理 
    // 重置旧 fiber 的兄弟 fiber
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    // 更新新 fiber 的关系
    if (index === 0) {
      wipFiber.child = newFiber; // 父元素使用 child 属性关联第一个 fiber
    } else {
      prevSibling.sibling = newFiber; // 其他 fiber 依靠 sibling 属性指向下一个兄弟 fiber
    }
    prevSibling = newFiber;
    index++
  }
}

function workLoop(deadline) {
  // 分成了 render 和 commit 两个阶段
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    // 2. 一个工作单元接一个工作单元执行
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    // 3. deadline 是 requestIdleCallback 回调的参数，判断是否还有剩余时间
    shouldYield = deadline.timeRemaining() < 1
  }

  // 5. 没有下一个工作节点 && wipRoot存在时才渲染 dom
  if (!nextUnitOfWork && wipRoot) {
    commitRoot() // reconcile 协调阶段完成，进入 commit
  }

  // 4. 等待浏览器空闲时，处理剩余工作单元
  requestIdleCallback(workLoop)
}

// 1. 浏览器空闲时启动
// render({}, document.getElementById('app'))
requestIdleCallback(workLoop)


const _React = {
  createElement,
  render,
  useState
}

export default _React