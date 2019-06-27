/* @flow */

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * 用于分析HTML标记、组件名称和属性路径的Unicode字母。
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * 使用https://www.w3.org/tr/html53/semantics scripting.html
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 * 跳过\u10000-\ueffff，因为它冻结了phantomjs
 */
// ·À-ÖØ-öø-ͽͿ-῿‌-‍‿-⁀⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/

/**
 * Check if a string starts with $ or _
 * 检查是否还是_或者$开头
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 * 定义属性。
 * 定义这个对象的值可被改变 可被重写 是否可被枚举
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 * 解析简单路径。  ??? 看不懂啊
 * 用.分割
 * unicodeRegExp.source => "a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD"
 * 传入 类似于'a.b.c'的字符串然后再传入含有这个路径的对象，可以取出这个值
 * let obj = {
    a:{
      b: {c: {age: 3}}
    }
  }
  parsePath('a.b.c')(obj) // {age: 3}
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)
export function parsePath (path: string): any {
  // 过滤非点操作符的路径 然后返回一个函数
  // /[^a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD.$_\d]/
  // 匹配任意不包含在如上的字符串
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
