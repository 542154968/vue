/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  // 先让观察者清空
  vm._watchers = []
  // 获取当前vue实例的初始化选项
  const opts = vm.$options
  // 如果props存在 初始化props 完成数据绑定双向监听
  if (opts.props) initProps(vm, opts.props)
  // 初始化方法
  if (opts.methods) initMethods(vm, opts.methods)
  // 作为根data
  if (opts.data) {
    initData(vm)
    // 若果没传data  设置一个默认值
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  // computed计算属性
  if (opts.computed) initComputed(vm, opts.computed)
  // 初始化watch  如果watch存在 并且watch 不是火狐浏览器的watch ({}).watch 初始化watch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // 缓存属性键，以便将来的属性更新可以使用数组迭代
  // instead of dynamic object key enumeration.
  // 而不是动态对象键枚举
  const keys = vm.$options._propKeys = []
  // 判断是否是根节点
  const isRoot = !vm.$parent
  // root instance props should be converted
  // 如果不是根节点 禁用订阅发布模式
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    // keys就是你所写的props的key
    keys.push(key)
    // 经过校验之后的value 没值的话取默认值 取默认值要算 最好一直赋值
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 大写转驼峰之后的key
      const hyphenatedKey = hyphenate(key)
      // 检查是否为保留属性 如果所写的propkey为保留属性 报错
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      // 添加一个发布订阅模式 用来监听数据
      defineReactive(props, key, value, () => {
        // 如果不是根节点 并且在修改props中的值 那么报错 props应该是单向的 
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 如果是vueExtend继承来的porps  需要监听
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
  // 让data的作用域在vm中
    ? getData(data, vm)
    : data || {}
    // 如果data不是个对象 报错
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    // 先判断Methods的key和data的key可会重复 重复报错
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // 再判断 props的key和data的key是否会重复
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
      // 如果key 不是_或者$开头的 设置个监听兰姐  this[scope][key] = value
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data 为data设置观察者 
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    // 这里就是为啥data一定要用函数返回  让它在私有的空间不受别的影响
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

// 对于计算属性的Watcher来说，它的lazy属性为true，因此new watcher()结尾时不会执行get()方法，而是直接返回undefined(在3127行)(求值会等到该计算属性被调用时才求值的)
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 先创建一个纯净对象
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  // 判断是不是webpack的node环境 如果是 说明是ssr用的
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    // 如果没有设置getter 报错
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }
    // 如果不是ssr服务端渲染
    if (!isSSR) {
      // create internal watcher for the computed property.
      // 创建一系列观察者的
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // 组件定义的计算属性已在组建的原型上定义
    // component prototype. We only need to define computed properties defined
    //                      我们只需要定义计算属性在这里实例化
    // at instantiation here.
    // 如果key在vm中没有定义 注:组件的计算属性在模块加载的时候已经被定义在了原型上面了
    if (!(key in vm)) {
      // 再给他补上
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // computed和datasprops冲突的报错
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // 是否需要缓存 SSR不缓存
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    // 如果需要缓存 
    sharedPropertyDefinition.get = shouldCache
    // 创建一个观察者
      ? createComputedGetter(key)
      // 不需要缓存的话 undefined /window
      : createGetterInvoker(userDef)
      // set是null
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // 没有set的报错
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // defineProperty劫持
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    // 如果methods的key对应的类型不是function 报错
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 如果methods的key和props的key重复 报错
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      //  如果当前methods的key含有 $ or _ 并且和vue 实例中的方法重名  报错 检测methods和vue实例方法是否重名的
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 不是function  不绑定  是function 绑定在当前实例的作用域中
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    // 数组 循环watch
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

// 监听 $data $props 
// $set实现 
// $delete实现
// $watch实现
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // ../observer/index
  Vue.prototype.$set = set
  // ../observer/index
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
