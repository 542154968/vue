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
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
