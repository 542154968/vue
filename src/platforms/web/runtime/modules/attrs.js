/* @flow */

import { isIE, isIE9, isEdge } from 'core/util/env'

import {
  extend,
  isDef,
  isUndef
} from 'shared/util'

import {
  isXlink,
  xlinkNS,
  getXlinkProp,
  isBooleanAttr,
  isEnumeratedAttr,
  // val ===null || val === false
  isFalsyAttrValue,
  convertEnumeratedValue
} from 'web/util/index'

function updateAttrs (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const opts = vnode.componentOptions
  // 没有内联attrs或者没有attrs return
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return
  }
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return
  }
  let key, cur, old
  const elm = vnode.elm
  const oldAttrs = oldVnode.data.attrs || {}
  let attrs: any = vnode.data.attrs || {}
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(attrs.__ob__)) {
    attrs = vnode.data.attrs = extend({}, attrs)
  }

  for (key in attrs) {
    cur = attrs[key]
    old = oldAttrs[key]
    if (old !== cur) {
      setAttr(elm, key, cur)
    }
  }
  // #4391: in IE9, setting type can reset value for input[type=radio]
  // IE9 设置input[type=radio]的type会重设value
  // #6666: IE/Edge forces progress value down to 1 before setting a max
  // IE/Edge 迫使 progress 的value 下降到1 在设置max之前  在设置最大值之前将进度值强制降至1
  /* istanbul ignore if */
  if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value)
  }
  for (key in oldAttrs) {
    // 如果value不存在
    if (isUndef(attrs[key])) {
      // 如果是xlink
      if (isXlink(key)) {
        // 移除 namespace的xlnk
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key))
        // 如果key存在  移除key
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key)
      }
    }
  }
}

function setAttr (el: Element, key: string, value: any) {
  // 如果含有-
  if (el.tagName.indexOf('-') > -1) {
    baseSetAttr(el, key, value)
    // 如果值是布尔类型的key
  } else if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    // 如果是false 或null 移除key
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key)
    } else {
      // 兼容 iframe 和 flash
      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag
      value = key === 'allowfullscreen' && el.tagName === 'EMBED'
        ? 'true'
        : key
      el.setAttribute(key, value)
    }
    // contenteditable,draggable,spellcheck
    // 这些需要设置成字符串
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, convertEnumeratedValue(key, value))
    // 如果是xlink
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
    // 其余的就是通用的了
  } else {
    baseSetAttr(el, key, value)
  }
}

function baseSetAttr (el, key, value) {
  // 如果value是false或nulll 移除key
  if (isFalsyAttrValue(value)) {
    el.removeAttribute(key)
  } else {
    // #7138: IE10 & 11 fires input event when setting placeholder on
    // IE10 11 或触发input事件在textarea设置placeholder的时候
    // <textarea>... block the first input event and remove the blocker
    // 阻塞第一个input事件然后移除立即移除阻塞来解决
    // immediately.
    /* istanbul ignore if */
    if (
      isIE && !isIE9 &&
      el.tagName === 'TEXTAREA' &&
      key === 'placeholder' && value !== '' && !el.__ieph
    ) {
      const blocker = e => {
        // 阻止事件冒泡并且阻止相同事件的其他侦听器被调用。
        e.stopImmediatePropagation()
        el.removeEventListener('input', blocker)
      }
      el.addEventListener('input', blocker)
      // $flow-disable-line
      el.__ieph = true /* IE placeholder patched */
    }
    el.setAttribute(key, value)
  }
}

export default {
  create: updateAttrs,
  update: updateAttrs
}
