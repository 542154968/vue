/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

// 闭包无法释放应用达到缓存的cached函数 
const normalizeEvent = cached((name: string): {
  
  name: string,
  // 一些列事件修饰符
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

// 将函数或函数数组作为属性挂到函数上 可以调用执行 
// 这样做的原因可能是方便执行事件，有时候一个DOM会有多个相同事件，此时事件会是一个数组，通过这样处理后，无论是单一函数还是函数数组都可以通过直接调用invoker来执行。
export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}

export function updateListeners (
  // listeners 
  on: Object,
  // oldListeners || {}
  oldOn: Object,
  // $on
  add: Function,
  // $off
  remove: Function,
  // once?
  createOnceHandler: Function,
  // vue实例
  vm: Component
) {
  let name, def, cur, old, event
  // 先循环下现在的$listeners
  for (name in on) {
    // 获取这个name的 value 一般来讲都是function把
    def = cur = on[name]
    old = oldOn[name]
    /**
     * 获得的是一个对象
     *  
     * {
        name,
        once,
        capture,
        passive
      }
     * */ 

    event = normalizeEvent(name)
    /* istanbul ignore if */
    // 如果是 __WEEX__ 并且def是个Obejct
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    // 如果cur不存在 undefined/null
    if (isUndef(cur)) {
      // 如果是测试环境 报错 没找到这个event
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    // 如果cur存在 老的function不存在
    } else if (isUndef(old)) {
      // 如果cur的fns不存在  报错
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      // 如果once是true
      if (isTrue(event.once)) {
        // events.js中  apply之后off掉
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
      // 如果新的和老的不一样 让老的等于新的
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  // 删除所有的老的事件
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
