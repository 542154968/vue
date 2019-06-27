/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * 观察程序解析表达式，收集依赖项
 * and fires callback when the expression value changes.
 * 并在表达式值更改时触发回调
 * This is used for both the $watch() api and directives.
 * 用于$watch 和 dirctives指令
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    /**
     * 需要监听的 方法/表达式。
     * 举个例子：VueComponent 的 render function，
     * 或者是 computed 的 getter 方法，
     * 再或者是abc.bbc.aac这种类型的字符串
     * （由于 vue 的 parsePath 方法是用 split('.') 来做的属性分割，所以不支持abc['bbc']）。
     * expOrFn 如果是方法，
     * 则直接赋值给 watcher 的 getter 属性，
     * 如果是表达式，则会转换成方法再给 getter。
     */
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 获得实例对象
    this.vm = vm
    // 如果是render观察者 下一段 这个this应该是个数组
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 观察者列表加入this
    vm._watchers.push(this)
    // options
    if (options) {
      // 强转布尔
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    // 用于批量的UID
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    // 避免重复
    this.depIds = new Set()
    // 避免重复
    this.newDepIds = new Set()
    // 信息 开发环境显示
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter coputed？
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 解析简单路径。 可以匹配点操作符 比如传入'a.b.c' 调用thsi.getter(obj) obj是{a: {b:{c:1}}}这种，就可以取出c的值
      this.getter = parsePath(expOrFn)
      // 如果路径不匹配 报错 不是简单的。操作符
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          // 无法观察
          'Watcher only accepts simple dot-delimited paths. ' +
          // 观察者只能观察简单的.分割程序
          'For full control, use a function instead.',
          // 杜宇完全控制，请使用函数代替
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 评估getter，并重新收集依赖项。
   */
  get () {
    // 推入事件栈
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 通过执行getter获取value
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // 触摸”每个属性，以便它们都被跟踪为
      // dependencies for deep watching
      // 深度监视的依赖项

      // 如果deep为true deep的实现
      // 遍历value的所有项，触发已经被监听的getter 以便对象中的每个嵌套属性被收集为“深度”依赖关系。
      // 为啥会触发 要登看完 dep  才知道嘎嘎 
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清除依赖项集合
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 大概意思就是 如果组件正在销毁 那么就删除所有的watchers
      
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
