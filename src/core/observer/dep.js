/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * DEP是一个可观测的，可以有多个
 * directives subscribing to it.
 * 订阅它的指令
 */
export default class Dep {
  // 全局唯一的watcher
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    // uid可以看到一共有多少个dep
    this.id = uid++
    this.subs = []
  }
  
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    // dep.taget 是啥呦 
    // 字面意思是 dep的触发者添加一个dep
    // 其实就是一个全局的Watcher 触发watcher的addDep方法
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    // 首先浅拷贝一下 避免数据更改出现问题
    const subs = this.subs.slice()
    // 开发模式如果没有async  让subs排序 按顺序执行 猜想 打包后的会自动排序
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // 如果不运行async，则不会在计划程序中对sub进行排序
      // we need to sort them now to make sure they fire in correct
      // 我们现在需要对它们进行排序，以确保它们正确触发
      // order
      // 命令
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 创建一个唯一的观察模型  这是一个调用栈 因为每个render函数都有一个watcher 那么这个顺序就需要管理
// https://segmentfault.com/q/1010000010095427/a-1020000010103282 可以看这个回答
// Vue Dep.target为什么需要targetStack来管理？
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
