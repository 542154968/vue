/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  // 创建一个纯净对象
  vm._events = Object.create(null)
  // 暂不知道这个标识干嘛用的
  vm._hasHookEvent = false
  // init parent attached events
  // 初始化父级附加事件
  // $listeners 
  const listeners = vm.$options._parentListeners
  // 如果有$listeners 更新listeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    // 作用域清空
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  // add    $on
  // remove $off
  // createOnceHandler 一次触发 once？ 
  // vdom/helpers/update-listeners
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

// on off once 的实现
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  // $on 的实现 event可以是个数组 字符串 
  // 监听当前实例上的自定义事件。事件可以由vm.$emit触发。回调函数会接收所有传入事件触发函数的额外参数。
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    // 如果event是数组  循环绑定
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // this._events[event] 是数组 直接push进去 不是数组就默认生成个数组再push进去
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 优化钩子：事件开销，使用注册时标记的布尔标志，而不是哈希查找  干嘛用的？
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  // 监听一个自定义事件，但是只触发一次，在第一次触发之后移除监听器。
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    // 设置一个函数 on  并让该函数的fn属性为传进来的function 这个fn应该是用来在off的时候
    on.fn = fn
    // 使用$on绑定事件
    vm.$on(event, on)
    // 当触发on的时候 先解绑这个on的事件 然后让fn作用在vue实例中 之后就没有on监听的事件了 一次就执行成功了

    return vm
  }

  // 总结来说就是  传进来一个事件名 和 事件函数 然后从_events里面找 这个事件 如果没有 返回本身
  // 如果event是数组 循环调用$off 解绑全部
  // 如果有事件且不是数组并且没有绑定的函数 返回本身
  // 如果有事件而且 事件对应的方法是个数组 那么久判断是否和fn一样  一样的删除掉
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all 
    // 参数不存在 返回本身  如果没有提供参数，则移除所有的事件监听器；
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    // 如果是数组 循环解绑全部  
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    
    // specific event
    // 当前event的对应事件
    const cbs = vm._events[event]
    // 如果事件不存在 返回自己
    if (!cbs) {
      return vm
    }

    // 如果只提供了事件，则移除该事件所有的监听器；
    // 如果fn不存在 设置这个事件名的事件 为null  
    if (!fn) {
      vm._events[event] = null
      return vm
    }

    // 如果同时提供了事件与回调，则只移除这个回调的监听器。
    // specific handler
    // 如果cbs是个数组列表 
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      // 如果函数一样  就移除这个事件
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  // emit源码 emit的event 要小写或者a-b不能用驼峰
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      // 如果不是 报异常
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 容错式执行 有错误抛出来 没错误就执行这个  订阅发布？
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
