/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * 递归遍历一个对象以调用所有已转换的
 * getters, so that every nested property inside the object
 * getter，以便对象中的每个嵌套属性
 * is collected as a "deep" dependency.
 * 被收集为“深度”依赖关系。
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // 如果不是数组  不是对象  冻结对象 Vnode对象 走把你
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 如果是已经被监听过得  重设deepId
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    // seen 是个set  避免重复
    if (seen.has(depId)) {
      return
    }
    // 如果没监听  加入这个id
    seen.add(depId)
  }
  // 如果是个数组 或者是对象  循环添加
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
