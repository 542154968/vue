/* @flow */

// Provides transition support for a single element/component.
// supports transition mode (out-in / in-out)

import { warn } from 'core/util/index'
import { camelize, extend, isPrimitive } from 'shared/util'
import {
  mergeVNodeHook,
  isAsyncPlaceholder,
  getFirstComponentChild
} from 'core/vdom/helpers/index'

export const transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object]
}

// in case the child is also an abstract component, e.g. <keep-alive>
// 如果子组件也是抽象组件，例如<keep alive>
// we want to recursively retrieve the real component to be rendered
// 我们要递归地检索要呈现的实际组件
// 获取非抽象组件
function getRealChild (vnode: ?VNode): ?VNode {
  const compOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
  if (compOptions && compOptions.Ctor.options.abstract) {
    return getRealChild(getFirstComponentChild(compOptions.children))
  } else {
    return vnode
  }
}

// 提取transition的data
export function extractTransitionData (comp: Component): Object {
  const data = {}
  const options: ComponentOptions = comp.$options
  // 复制props
  // props
  for (const key in options.propsData) {
    data[key] = comp[key]
  }
  // events.
  // extract listeners and pass them directly to the transition methods
  // 提取侦听器并将其直接传递给转换方法
  const listeners: ?Object = options._parentListeners
  for (const key in listeners) {
    // 格式化key
    data[camelize(key)] = listeners[key]
  }
  return data
}

// 占位 返回一个含有props的keepalive
function placeholder (h: Function, rawChild: VNode): ?VNode {
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    // render函数
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

// 判断父级是否含有transition  只要父级以上有一个就返回true
function hasParentTransition (vnode: VNode): ?boolean {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

// 判断子是否一样
function isSameChild (child: VNode, oldChild: VNode): boolean {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

//  node.isComment && node.asyncFactory 判断是不是字符串node
const isNotTextNode = (c: VNode) => c.tag || isAsyncPlaceholder(c)
// 干嘛用的 v-show自定义指令？
const isVShowDirective = d => d.name === 'show'

export default {
  name: 'transition',
  props: transitionProps,
  // 抽象组件
  abstract: true,
  // render函数
  render (h: Function) {
    let children: any = this.$slots.default
    if (!children) {
      return
    }

    // filter out text nodes (possible whitespaces)
    // 过滤文本节点
    children = children.filter(isNotTextNode)
    /* istanbul ignore if */
    // 过滤之后如果没有就return
    if (!children.length) {
      return
    }

    // warn multiple elements
    // 这就是报错transition有多个节点时候的信息
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      )
    }

    const mode: string = this.mode

    // warn invalid mode
    // mode类型报错
    if (process.env.NODE_ENV !== 'production' &&
      mode && mode !== 'in-out' && mode !== 'out-in'
    ) {
      warn(
        'invalid <transition> mode: ' + mode,
        this.$parent
      )
    }

    const rawChild: VNode = children[0]

    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    // 如果父节点已经有transition了 就跳过直接返回children
    if (hasParentTransition(this.$vnode)) {
      return rawChild
    }

    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    // 获取真实节点 非抽象的
    const child: ?VNode = getRealChild(rawChild)
    /* istanbul ignore if */
    // 如果没有 就返回
    if (!child) {
      return rawChild
    }

    // _leaving?离开 ？ 如果这个状态 返回占位keepalive
    if (this._leaving) {
      return placeholder(h, rawChild)
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    const id: string = `__transition-${this._uid}-`
    // 如果是组件 如果child.key是null 返回id 不是组件返回tag
    // child.key不是null 返回
    // key的设置
    child.key = child.key == null
      ? child.isComment
        ? id + 'comment'
        : id + child.tag
        // key是基本类型
      : isPrimitive(child.key)
      // 
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key

    const data: Object = (child.data || (child.data = {})).transition = extractTransitionData(this)
    const oldRawChild: VNode = this._vnode
    const oldChild: VNode = getRealChild(oldRawChild)

    // mark v-show
    // so that the transition module can hand over the control to the directive
    // 所以，transition模块可以在手的控制指令到 

    // 如果子的directives存在  并且指令中含有v-show
    /**transition和v-show配合 */
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      // 那么就展示出来
      child.data.show = true
    }
    // 如果老的子存在 而且含有data 而且和新的子不一样  node.isComment && node.asyncFactory ？ 并且老的子不是组件
    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // replace old child transition data with fresh one
      // 用新的子转换数据替换旧的子转换数据
      // important for dynamic transitions!
      // 对于动态转换很重要！
      const oldData: Object = oldChild.data.transition = extend({}, data)
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true
        // 将oldData和afterLeave hook合在一起
        mergeVNodeHook(oldData, 'afterLeave', () => {
          this._leaving = false
          this.$forceUpdate()
        })
        return placeholder(h, rawChild)
        // 如果是in-out
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        let delayedLeave
        const performLeave = () => { delayedLeave() }
        // 数据和hook 绑定
        mergeVNodeHook(data, 'afterEnter', performLeave)
        mergeVNodeHook(data, 'enterCancelled', performLeave)
        mergeVNodeHook(oldData, 'delayLeave', leave => { delayedLeave = leave })
      }
    }

    return rawChild
  }
}
