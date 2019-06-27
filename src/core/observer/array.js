/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

 // def在../util/lang.js中
import { def } from '../util/index'

const arrayProto = Array.prototype
// 继承array的原生方法
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 截获变异方法并发出事件
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原始方法
  const original = arrayProto[method]
  // 将arrayMethods这个对象的'push'、'pop'等在methodsToPatch的方法设置成值可被改变 可被重写
  def(arrayMethods, method, function mutator (...args) {
    // 执行的时候先让数组执行下这个方法
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
