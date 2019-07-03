/* @flow */

import { emptyObject } from 'shared/util'
import { parseFilters } from './parser/filter-parser'

type Range = { start?: number, end?: number };

/* eslint-disable no-unused-vars */
export function baseWarn (msg: string, range?: Range) {
  console.error(`[Vue compiler]: ${msg}`)
}
/* eslint-enable no-unused-vars */

export function pluckModuleFunction<F: Function> (
  modules: ?Array<Object>,
  key: string
): Array<F> {
  return modules
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

export function addProp (el: ASTElement, name: string, value: string, range?: Range, dynamic?: boolean) {
  (el.props || (el.props = [])).push(rangeSetItem({ name, value, dynamic }, range))
  el.plain = false
}

export function addAttr (el: ASTElement, name: string, value: any, range?: Range, dynamic?: boolean) {
  const attrs = dynamic
    ? (el.dynamicAttrs || (el.dynamicAttrs = []))
    : (el.attrs || (el.attrs = []))
  attrs.push(rangeSetItem({ name, value, dynamic }, range))
  el.plain = false
}

// add a raw attr (use this in preTransforms)
export function addRawAttr (el: ASTElement, name: string, value: any, range?: Range) {
  el.attrsMap[name] = value
  el.attrsList.push(rangeSetItem({ name, value }, range))
}

export function addDirective (
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  isDynamicArg: boolean,
  modifiers: ?ASTModifiers,
  range?: Range
) {
  (el.directives || (el.directives = [])).push(rangeSetItem({
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers
  }, range))
  el.plain = false
}

function prependModifierMarker (symbol: string, name: string, dynamic?: boolean): string {
  return dynamic
    ? `_p(${name},"${symbol}")`
    : symbol + name // mark the event as captured
}

export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: ?Function,
  range?: Range,
  dynamic?: boolean
) {
  // 修饰符 {native: true}
  modifiers = modifiers || emptyObject
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    // passive 会告诉浏览器你不想阻止事件的默认行为  所以和prevent不能一起用
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.',
      range
    )
  }

  // normalize click.right and click.middle since they don't actually fire
  // 规范化click.right和click.middle，因为它们实际上不触发
  // this is technically browser-specific, but at least for now browsers are
  // /这在技术上是特定于浏览器的，但至少现在浏览器是
  // the only target envs that have right/middle clicks.
  // 只有右键/中键单击的目标env。

  // 如果right
  if (modifiers.right) {
    // 如果是动态的
    if (dynamic) {
      // 如果name是click 那改为右键菜单名字 不然就是name
      name = `(${name})==='click'?'contextmenu':(${name})`
      // 如果不是动态的 如果name是click
    } else if (name === 'click') {
      // name改为contextMenu
      name = 'contextmenu'
      // 从修饰符对象中删除右键指令
      delete modifiers.right
    }
    // 如果是中间
  } else if (modifiers.middle) {
    // 如果是动态的
    if (dynamic) {
      // 是click  监听mouseup 不是就是自定义name
      name = `(${name})==='click'?'mouseup':(${name})`
      // 不是动态的 就是mouseup
    } else if (name === 'click') {
      name = 'mouseup'
    }
  }

  // check capture modifier
  // 是否使用捕获模式
  /**
   * dynamic
    ? `_p(${name},"${symbol}")`
    : symbol + name // mark t
   */
  if (modifiers.capture) {
    delete modifiers.capture
    // symbol  name dynamic
    // 如果是抽象的 返回 `_p(${name},"!")` 非抽象的返回 '!'+name
    name = prependModifierMarker('!', name, dynamic)
  }
  // 如果是once操作符
  // 如果是抽象的 返回 `_p(${name},"~")` 非抽象的返回 '~'+name
  if (modifiers.once) {
    delete modifiers.once
    name = prependModifierMarker('~', name, dynamic)
  }
  /* istanbul ignore if */
  // 如果是passive操作符
  // 如果是抽象的 返回 `_p(${name},"&")` 非抽象的返回 '&'+name
  if (modifiers.passive) {
    delete modifiers.passive
    name = prependModifierMarker('&', name, dynamic)
  }

  let events
  if (modifiers.native) {
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    events = el.events || (el.events = {})
  }

  const newHandler: any = rangeSetItem({ value: value.trim(), dynamic }, range)
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers
  }

  const handlers = events[name]
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    events[name] = newHandler
  }

  el.plain = false
}

export function getRawBindingAttr (
  el: ASTElement,
  name: string
) {
  return el.rawAttrsMap[':' + name] ||
    el.rawAttrsMap['v-bind:' + name] ||
    el.rawAttrsMap[name]
}

// 获取bind 或: 的数据 包含filter的
export function getBindingAttr (
  el: ASTElement,
  name: string,
  getStatic?: boolean
): ?string {
  // 获得 :name / v-bind:name的值
  const dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name)
  if (dynamicValue != null) {
    // parseFilters没看懂干嘛的
    // 表达式中的过滤器解析 方法
    // 将属性的值从前往后开始一个一个匹配，关键符号 : "|" 并排除 ""、 ''、 ``、 //、 || (字符串、正则)中的管道符号 '|' 
    // 如果含有过滤器 转化成parseFilters("name | filter | filters" ) "_f("filters")(_f("filter")(name))" _f函数
    return parseFilters(dynamicValue)
  } else if (getStatic !== false) {
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      return JSON.stringify(staticValue)
    }
  }
}

// note: this only removes the attr from the Array (attrsList) so that it
// 注意：这只会从数组（attrslist）中删除attr，以便
// doesn't get processed by processAttrs.
// 没有被processAttrs处理。
// By default it does NOT remove it from the map (attrsMap) because the map is
// 默认情况下，它不会将其从映射（attrsmap）中移除，因为映射是
// needed during codegen.
// 在codegen期间需要。
export function getAndRemoveAttr (
  el: ASTElement,
  name: string,
  removeFromMap?: boolean
): ?string {
  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name]
  }
  return val
}

export function getAndRemoveAttrByRegex (
  el: ASTElement,
  name: RegExp
) {
  const list = el.attrsList
  for (let i = 0, l = list.length; i < l; i++) {
    const attr = list[i]
    if (name.test(attr.name)) {
      list.splice(i, 1)
      return attr
    }
  }
}

function rangeSetItem (
  item: any,
  range?: { start?: number, end?: number }
) {
  if (range) {
    if (range.start != null) {
      item.start = range.start
    }
    if (range.end != null) {
      item.end = range.end
    }
  }
  return item
}
