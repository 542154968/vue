/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

// 缓存下来前一个 然后执行的时候回到前一个
export function setActiveInstance(vm: Component) {
  // 前一个等于当前激活的
  const prevActiveInstance = activeInstance
  // 当前激活的等于传进来的
  activeInstance = vm
  // 执行之后 当前激活的等于上一个
  return () => {
    activeInstance = prevActiveInstance
  }
}

export function initLifecycle(vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  // 定位第一个非抽象父级
  let parent = options.parent
  // abstract  抽象的组件 全局搜索之后 transition组件 keep-alive属性都包含这个
  // 如果parent存在 并且parent不是抽象组件就遍历 知道找到是抽象组件的parent
  // 然后让该生命周期下的vue实例的parent为抽象组件
  // 抽象组件的children列表包含当前vue实例

  // 抽象组件就找非抽象的作为父 并把当前的加入到父的children列表中
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  // 让vue实例的parent为抽象组件
  vm.$parent = parent
  // vue实例的根组件为如果parent存在 就是parent的根组件 不然就是当前vue实例
  vm.$root = parent ? parent.$root : vm

  // 一些列初始化
  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

export function lifecycleMixin(Vue: Class<Component>) {
  Vue.prototype._update = function(vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    // 缓存下来前一个vue实例
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    // core/vdom/patch createPatchFunction
    // 如果前一个node不存在
    if (!prevVnode) {
      // initial render
      // Vue.prototype.__path__根据执行环境不同  
      // 浏览器环境里的调用的是path方法 platforms/web/runtime/index.js中  调用path方法
      // path方法在platforms/web/runtime/path.js中， 这个方法又会调用createPatchFunction方法
      // createPatchFunction方法在core/vdom/path.js中 大概就是通过vnode生成真实html 其中掺杂着 keepalive和scoped的处理
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    // activeInstance 切换到前一个
    restoreActiveInstance()
    // update __vue__ reference
    // 这个__vue__暂时不知道干啥的
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    // 如果parent是HOC（热更新）？ 也要更新它
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // 调度程序调用更新的钩子，以确保在父级的更新钩子中更新子级。
    // updated in a parent's updated hook.
  }

  // $forceUpdate 的实现 调用组件的watcher对象 的update
  Vue.prototype.$forceUpdate = function() {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // $destroy的实现
  Vue.prototype.$destroy = function() {
    const vm: Component = this
    // 如果已经在摧毁边缘 return
    if (vm._isBeingDestroyed) {
      return
    }
    // 触发beforeDestory的生命周期
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    // 如果watcher存在 拆卸掉
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    // 如果watcher是个数组 拆解掉所有的
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // /从数据ob中移除引用
    // frozen object may not have observer.
    // 冻结对象可能没有观察者。 
    // 总组件数量减一
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    // 最后一个周期
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    // 在当前呈现的树上调用销毁钩子
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    // 触发 destroy周期
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    // 解除所有绑定的事件
    vm.$off()
    // remove __vue__ reference
    // 暂不知为啥这样 猜测和下面的功能一样 
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    // 释放循环引用 避免内存泄露
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// $mount调用的方法
export function mountComponent(
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 如果没有render 报错 返回空的
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if (
        (vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el ||
        el
      ) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
            'compiler is not available. Either pre-compile the templates into ' +
            'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 来到了beforeMount周期~
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  // 开发环境展示这个周期的性能
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // beforUpdate周期
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      before() {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate')
        }
      }
    },
    true /* isRenderWatcher */
  )
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // vm.$vnode 表示 Vue 实例的父虚拟 Node，所以它为 Null 则表示当前是根 Vue 的实例。
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent(
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) {
    // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

export function callHook(vm: Component, hook: string) {
  // 全局的Dep 
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  // 在当前组件中查找hook周期是否存在
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  // 如果存在就执行
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  // 如果是 event 字符串中有 hook:，修改 vm._hasHookEvent 的状态。如果 _hasHookEvent 为 true，那么在触发各类生命周期钩子的时候会触发如 hook:created 事件
  // Child(@hook:mounted="handleMounted")
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
