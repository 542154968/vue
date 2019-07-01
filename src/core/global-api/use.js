/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果已经改装了该插件 返回 
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 类数组对象转为真实数组 
    const args = toArray(arguments, 1)
    args.unshift(this)
    // 如果plugin.install存在 执行 是个对象的形式 plugin
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
      // 如果plugin是个函数
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    // 加入到这个数组中 这个数组就是所有已安装的
    installedPlugins.push(plugin)
    return this
  }
}
