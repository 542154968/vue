/* @flow */

export default class VNode {
  // 标签
  tag: string | void;
  data: VNodeData | void;
  // 子
  children: ?Array<VNode>;
  text: string | void;
  // 真实dom
  elm: Node | void;
  // 创建一个具有指定的命名空间URI和限定名称的元素。
  ns: string | void;
  // 作用域
  context: Component | void; // rendered in this component's scope
  // key
  key: string | number | void;
  // 组件选项
  componentOptions: VNodeComponentOptions | void;
  // 组件实例
  componentInstance: Component | void; // component instance
  // 父组件
  parent: VNode | void; // component placeholder node

  // strictly internal
  // 包含原始HTML  服务端渲染用的
  raw: boolean; // contains raw HTML? (server only)
  // 提升静态节点
  isStatic: boolean; // hoisted static node
  // 进入transition所必需的检查
  isRootInsert: boolean; // necessary for enter transition check
  // 空的注释占位符
  isComment: boolean; // empty comment placeholder?
  // 是否是克隆node
  isCloned: boolean; // is a cloned node?
  // 是否是v-once node
  isOnce: boolean; // is a v-once node?
  // 异步函数组件
  asyncFactory: Function | void; // async component factory function
  // 
  asyncMeta: Object | void;
  // 是否是异步占位符
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;
  // 函数节点的真正上下文环境
  fnContext: Component | void; // real context vm for functional nodes
  // SSR缓存
  fnOptions: ?ComponentOptions; // for SSR caching
  // 功能render
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  // 可用来css scoped
  fnScopeId: ?string; // functional scope id support

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    // 设置vnode的默认值
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  // 已弃用：用于向后兼容的componentInstance的别名。
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}

// 创建一个空node
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

// 创建一个text node
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// 优化的浅克隆
// used for static nodes and slot nodes because they may be reused across
// 用于静态节点和槽节点，因为它们可以被重用
// multiple renders, cloning them avoids errors when DOM manipulations rely
// 多个渲染，克隆它们可以避免在DOM操作依赖于
// on their elm reference.
// 在它们的ELM引用上。
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // 克隆子数组以避免在克隆时改变原始数组
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
