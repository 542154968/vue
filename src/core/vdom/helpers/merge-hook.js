/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

// 将函数或函数数组作为属性挂到函数上 可以调用执行
// 将vnode的hook合并到一起 ？
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
  // 如果def是vnode  取出hook
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {})
  }
  let invoker
  // 缓存老的hook
  const oldHook = def[hookKey]

  function wrappedHook () {
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  // 如果老的hook是undefined或null
  if (isUndef(oldHook)) {
    // no existing hook
    // 将[wrappedHook]挂到函数上
    // 将函数或函数数组作为属性挂到函数上 可以调用执行
    invoker = createFnInvoker([wrappedHook])
  } else {
    /* istanbul ignore if */
    // 若果fns存在 并且 合并过了
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // already a merged invoker
      // invoker就是老的hook
      invoker = oldHook
      invoker.fns.push(wrappedHook)
    } else {
      // existing plain hook
      // 将函数或函数数组作为属性挂到函数上 可以调用执行
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  invoker.merged = true
  def[hookKey] = invoker
}
