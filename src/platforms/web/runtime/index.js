/* @flow */

// 其实这个文件才是项目起点 。。。。
// vueconfig util set del next-tick observable _base keepalive use mixin extend directives components filters的注册 ssr相关 版本号
import Vue from 'core/index'
// 引入全局配置功能
import config from 'core/config'
// 浅拷贝 和...rest
import { extend, noop } from 'shared/util'
// $mount的方法 创建真实dom 会触发 beforeMount  mounted 并监听
import { mountComponent } from 'core/instance/lifecycle'
// inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ，  typeof window !== 'undefined'
import { devtools, inBrowser } from 'core/util/index'

import {
  // 查询是否有节点的 string的就querySelect一下 没有就返回空div 报错
  query,
  // 必须含有一些属性的标签校验
  mustUseProp,
  // 是否是保留html标签
  isReservedTag,
  // 是否是保留attr style  class
  isReservedAttr,
  // 返回是否匹配 svg和mathML
  getTagNamespace,
  // 不认识的html标签
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
// v-model  v-show
import platformDirectives from './directives/index'
// transition transition-group
import platformComponents from './components/index'

// install platform specific utils
// 给vueconfig添加一些方法
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// v-model  v-show
// 给vue options 的全局指令加上 v-model v-show
extend(Vue.options.directives, platformDirectives)
// 给vue的全局组件加上transition和非抽象组件transition-group
extend(Vue.options.components, platformComponents)

// install platform patch function
// path 虚拟DOM转真实dom
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
// 判断el是否存在 是不是浏览器环境 执行mounted和beforemount周期
Vue.prototype.$mount = function (
  el?: string | Element,
  // 保湿 干嘛的？？ 和服务端渲染有关
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
// devtools的提示
if (inBrowser) {
  // 等到别的任务结束后  宏任务
  setTimeout(() => {
    // 如果devtools在
    if (config.devtools) {
      // 触发init
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
