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

  // 设置属性
  Object.keys(fiber.props)
    .filter((key) => key !== 'children')
    .forEach((key) => {
      ele[key] = fiber.props[key];
    })

  return dom
}

let nextUnitOfWork = null // 下一个工作单元
let wipRoot = null // 根工作单元
let currentRoot = null // 上一个 fibre 树

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
  nextUnitOfWork = wipRoot
}

function commitRoot() {
  commitWork(wipRoot.child)
  currentRoot = wipRoot; // commit 完成后，保存 fiber 树
}

function performUnitOfWork(fiber) {
  // 1. 根据 fiber 创建 dom
  if (!fiber.dom) fiber.dom = createDom(fiber);

  // 2. 处理 children 之间的关系
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements)

  // 3. return 下一个工作单元
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

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let prevSibling = null;
  while (index < elements.length) {
    const element = elements[index];
    // 转换原数据为 fiber 数据结构
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    }
    if (index === 0) {
      fiber.child = newFiber; // 父元素只关联第一个 fiber
    } else {
      prevSibling.sibling = newFiber; // 其他 fiber 指向下一个兄弟 fiber
    }
    prevSibling = newFiber;
    index++
  }
}

function workLoop(deadline) {
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
    commitRoot()
  }

  // 4. 没有剩余工作单元或者剩余时间不足时
  requestIdleCallback(workLoop)
}

// 1. 浏览器空闲时启动
render({}, document.getElementById('app'))
requestIdleCallback(workLoop)

