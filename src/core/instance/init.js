/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

// Component 组件的构造函数 可以在Component.js中看到 应该就是在vue实例中打印的this的内容 vue组件的实例
export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function(options?: Object) {
    const vm: Component = this

    // a uid 当前组件的uid 可以打印vue实例的this看到
    vm._uid = uid++

    /**
     * 性能测量？ 具体测量的啥？
     */
    let startTag, endTag
    /* istanbul ignore if */
    // 如果不是生产模式 并且记录性能
    // mark在perf.js中 代表一个标记
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // 作为性能测量的标记
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 避免被观察者观察到的标志
    vm._isVue = true

    // merge options 如果传进来的是组件
    if (options && options._isComponent) {
      // optimize internal component instantiation
      //优化内部组件实例化

      // since dynamic options merging is pretty slow, and none of the
      //因为动态选项合并非常慢，而且

      // internal component options needs special treatment.
      //内部组件选项需要特殊处理。

      initInternalComponent(vm, options)
      // 如果options 不存在 或者 options存在但是不是组件 就是使用 new 的方式初始化vue
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    // 如果是开发环境 并且支持proxy的话 用proxy拦截一下 最后设置vm._renderPorxy 如果浏览器支持proxy 就是用proxy拦截 不支持就是用自己本身
    // 是否使用proxy包装对象的 只是为了方便报错之类的？？？卧槽 在这里只是用来在开发环境报错...
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      // 生产模式_renderProxy使用自己本身
      vm._renderProxy = vm
    }

    // expose real self
    // 指向自己(vm)的变量
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 合并配置初始化
export function initInternalComponent(
  vm: Component,
  /**
   * InternalComponentOptions所包含的
   *  _isComponent: true;
      parent: Component;
      _parentVnode: VNode;
      render?: Function;
      staticRenderFns?: Array<Function>
   */
  options: InternalComponentOptions
) {
  // vm就是Component的构造函数的引用 Component.contstructor.options 就是 Vue.prototype._init中被传进来的options
  // Object.create()方法创建一个新对象，使用现有的对象来提供新创建的对象的__proto__
  // 就相当于继承这个options 理解为浅拷贝？ 不行的  浅拷贝不继承原型 浅拷贝的__proto__是Object 而Object.create的proto指向它继承来的那个对象 从而让整个原型链串起来
  // 继承就是继承 拷贝就是拷贝
  const opts = (vm.$options = Object.create(vm.constructor.options))
  // doing this because it's faster than dynamic enumeration.
  //  这样做是因为它比动态枚举更快  ？？？ 不懂哦 避免了设置默认值 开辟内存空间 ？？
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  /**
   * 获取从父组件传来的一些信息
   * 可以看 options.js中 看到所有的信息
   */
  const vnodeComponentOptions = parentVnode.componentOptions
  // 父组件传来的props的数据
  opts.propsData = vnodeComponentOptions.propsData
  // 父组件传来的listeners  可以多层组件on监听
  opts._parentListeners = vnodeComponentOptions.listeners
  // 父组件中的需要渲染的子列表  ？ 当前不是子么 ？
  opts._renderChildren = vnodeComponentOptions.children
  // 要渲染成的tag标签
  opts._componentTag = vnodeComponentOptions.tag

  // 如果渲染函数存在
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        // shared/utils 浅拷贝 新对象的keyvalue = 老对象的keyvalue方式
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // utils/options中
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
