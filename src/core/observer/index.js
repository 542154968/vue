/* @flow */
// 观察者模块开始啦

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 将array方法二次封装 变异  就是数组的一些方法可以驱动视图更新
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * 在某些情况下，我们可能希望禁用组件内部的观察
 * update computation.
 * 更新计算
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * 每个观察到的观察者类
 * object. Once attached, the observer converts the target
 * 对象 一旦连接，观察者将转换目标
 * object's property keys into getter/setters that
 * 对象的属性键到getter/setter中，
 * collect dependencies and dispatch updates.
 * 收集依赖项和调度更新
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // 创建一个dep 用于收集getter 对watcher管理
    this.dep = new Dep()
    this.vmCount = 0
    // 向value添加'__ob__' 值为Observer属性
    def(value, '__ob__', this)
    // 如果是数组
    if (Array.isArray(value)) {
      // '__proto__' in {}  检测浏览器是否允许使用__proto__ 因为这个不规范 
      if (hasProto) {
        // target.__proto__ = src
        // 将target的__proto__ 指向 变异后的数组prototype 相当于连起两个原型链 
        protoAugment(value, arrayMethods)
      } else {
        // 如果不支持  就拷贝所有方法  
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 为每个创建一个观察者
      this.observeArray(value)
      // 如果是对象形式
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * 遍历所有属性并将它们转换为
   * getter/setters. This method should only be called when
   * getter/setter 这个方法只有在值类型为对象的时候才应调用
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * 尝试为值创建一个观察者实例，
 * returns the new observer if successfully observed,
 * 如果观察成功，则返回新的观察者，
 * or the existing observer if the value already has one.
 * 或者（使用）现有的观察者（如果该值已经有一个）。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 已经监听过得 就使用现有的
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // value.__ob__ 就是 Observer对象
    ob = value.__ob__
    // 没监听到的就new一个
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  // 如果是根data 并且观察成功 ++
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 定义对象上的反应性属性
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 创建一个dep 用来管理watcher
  const dep = new Dep()

  // 如果这个属性不能修改 return
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 获取当前的getter  setter
  const getter = property && property.get
  const setter = property && property.set
  // 如果getter不存在 或者 setter存在 并且当前函数只穿了obj 和 key   设置val为obj[key]
  // 判断传的是个没有人工defineProperty的对象
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // shallow 是个啥  然后给它创建个观察者
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // get就是收集的 加入wacher中
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 如果全局的wather存在
      if (Dep.target) {
        // 加入wather的俩set数组中
        dep.depend()
        // 
        if (childOb) {
          childOb.dep.depend()
          // 如果value是个数组 就遍历每一项 加入到watcher的set中
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 通过getter获取老的值
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 如果相等 就不执行了
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 如果setter存在 执行setter
      if (setter) {
        setter.call(obj, newVal)
        // 不存在直接赋值
      } else {
        val = newVal
      }
      // 重新给新值添加观察者
      childOb = !shallow && observe(newVal)
      // 通知去执行update方法
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
// $set
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果set的target是空的 报错
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 如果target是Array 并且index值是合法的
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 数组的长度重设 就是当添加一个或者多个的时候数组长度不够了
    target.length = Math.max(target.length, key)
    // 然后让这个数组的[key]为val
    target.splice(key, 1, val)
    return val
  }
  // 如果key是target自身的key不是继承来的
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  // 不允许向vue实例进行set
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }

  // 如果不是vue实例
  if (!ob) {
    target[key] = val
    return val
  }

  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */

 // $delete
export function del (target: Array<any> | Object, key: any) {
  // 值不存在不删除
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组的话 直接删除
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  // vue的根值不能删除
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 不属于当前的target 不是继承来的 才能删除
  if (!hasOwn(target, key)) {
    return
  }
  //  直接删除
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
