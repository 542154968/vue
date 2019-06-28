/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function };
  silent: boolean;
  productionTip: boolean;
  performance: boolean;
  devtools: boolean;
  errorHandler: ?(err: Error, vm: Component, info: string) => void;
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;
  ignoredElements: Array<string | RegExp>;
  keyCodes: { [key: string]: number | Array<number> };

  // platform
  isReservedTag: (x?: string) => boolean;
  isReservedAttr: (x?: string) => boolean;
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void;
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;

  // private
  async: boolean;

  // legacy
  _lifecycleHooks: Array<string>;
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  // optionMergeStrategies 主要用于 mixin 以及 Vue.extend() 方法时对于子组件和父组件如果有相同的属性(option)时的合并策略。
  // 可以让用户设置合并策略
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   * 是否显示日志和警告
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   * 启动时显示生产模式提示消息
   * 设置为 false 以阻止 vue 在启动时生成生产提示
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   * 配置是否允许 vue-devtools 检查代码
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   * 是否记录性能
   * 设置为 true 以在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪。只适用于开发模式和支持 performance.mark API 的浏览器上。
   */
  performance: false,

  /**
   * Error handler for watcher errors
   * 指定组件的渲染和观察期间未捕获错误的处理函数。这个处理函数被调用时，可获取错误信息和 Vue 实例
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   * 为 Vue 的运行时警告赋予一个自定义处理函数。注意这只会在开发者环境下生效，在生产环境下它会被忽略。
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   * 忽略某些自定义元素
   * 须使 Vue 忽略在 Vue 之外的自定义元素 (e.g. 使用了 Web Components APIs)。否则，它会假设你忘记注册全局组件或者拼错了组件名称，从而抛出一个关于 Unknown custom element 的警告。
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   * 给 v-on 自定义键位别名。
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   * 检查是否保留了标记，以便它不能注册为

   * 组件。这取决于平台，可能会被覆盖
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * 检查属性是否被保留，以便不能用作组件 
   * prop. This is platform-dependent and may be overwritten.
   * 支柱。这取决于平台，可能会被覆盖。
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   * 
   * 检查标记是否为未知元素。
   * 取决于平台。 
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   * 获取元素的命名空间
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   * 分析特定平台的真正标记名
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * 检查是否必须使用属性（例如值）绑定属性
   * Platform-dependent.
   * 取决于平台
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * 异步执行更新。用于Vue测试实用程序
   * This will significantly reduce performance if set to false.
   * 如果设置为false，这将显著降低性能。
   */
  async: true,

  /**
   * Exposed for legacy reasons
   * 因为遗留原因暴露的 
   * 全是生命周期的名称
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
