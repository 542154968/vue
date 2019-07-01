/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  // config是vue的一些初始化配置
  // Vue.config 是一个对象，包含 Vue 的全局配置。可以在启动应用之前修改下列属性
  // 获取configDef的时候返回的是vue全局配置文件
  configDef.get = () => config
  // 如果尝试替换全局对象会报错 set就是替换  单一赋值即可
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 给vue config赋值 这就是vueconfig的由来
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // 公开了Util方法。
  // NOTE: these are not considered part of the public API - avoid relying on
  // 注意：这些不是公共API的一部分-避免依赖
  // them unless you are aware of the risk.
  // 除非你意识到风险。
  Vue.util = {
    // vue警告的封装
    warn,
    // 浅拷贝
    extend,
    // extends 和 mixins
    mergeOptions,
    // /observer/index 创建 get set dep watcher
    defineReactive
  }

  // $set 实现
  Vue.set = set
  // $delete 实现
  Vue.delete = del
  // $nextTick
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 让一个对象可响应。Vue 内部会用它来处理 data 函数返回的对象。
  // 返回的对象可以直接用于渲染函数和计算属性内，并且会在发生改变时触发相应的更新。也可以作为最小化的跨组件状态存储器，用于简单的场景：
  /**
   * const state = Vue.observable({ count: 0 })

    const Demo = {
      render(h) {
        return h('button', {
          on: { click: () => { state.count++ }}
        }, `count is: ${state.count}`)
      }
    }
   */
  Vue.observable = <T>(obj: T): T => {
    // 将obj加入到一个观察者中
    observe(obj)
    return obj
  }

  // 初始化options
  Vue.options = Object.create(null)
  // 一些周期 加入到options
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // 用于标识“base”构造函数以扩展所有纯对象
  // components with in Weex's multi-instance scenarios.
  // 包含在Weex的多实例方案中的组件。
  Vue.options._base = Vue

  // 注册keepalive组件
  extend(Vue.options.components, builtInComponents)

  // vue.use的实现逻辑
  initUse(Vue)
  // vue.mixin的实现  就是mergeOptions
  initMixin(Vue)
  // vue.extend 的实现
  initExtend(Vue)
  // 全局filters components directives
  initAssetRegisters(Vue)
}
