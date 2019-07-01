/**
 * Not type checking this file because flow doesn't like attaching
 * properties to Elements.
 */

import { isTextInputType } from 'web/util/element'
import { looseEqual, looseIndexOf } from 'shared/util'
import { mergeVNodeHook } from 'core/vdom/helpers/index'
import { warn, isIE9, isIE, isEdge } from 'core/util/index'

/* istanbul ignore if */
// 如果是IE9
if (isIE9) {
  // http://www.matts411.com/post/internet-explorer-9-oninput/
  // 当网页上选定文本更改时
  /**
   * 原来IE9输入框input事件无法监听到键盘的backspace键和delete键对内容的改变，
   * 以及右键菜单的剪切、撤销、删除对内容的改变，
   * 用keyup事件我们可以解决键盘backspace键delete键的问题，
   * 但是对于右键对于文本的操作还是无能为力，
   * 还好有selectionchange事件，
   * 它可以在文档上的当前文本选择被改变时触发，
   * 例如文本选择、剪切、删除、粘贴等操作。
   */
  document.addEventListener('selectionchange', () => {
    // 获取当前focus/激活的元素
    const el = document.activeElement
    // 如果vmodel存在  触发一下input事件  干嘛用的？
    if (el && el.vmodel) {
      trigger(el, 'input')
    }
  })
}

const directive = {
  // 插入的时候
  inserted (el, binding, vnode, oldVnode) {
    // 如果是select
    if (vnode.tag === 'select') {
      // #6903
      // 如果老的node的dom存在 并且 vOptions不在
      if (oldVnode.elm && !oldVnode.elm._vOptions) {
        // 给vnode追加或添加postpatch hook
        mergeVNodeHook(vnode, 'postpatch', () => {
          directive.componentUpdated(el, binding, vnode)
        })
        // 设置选中
      } else {
        setSelected(el, binding, vnode.context)
      }
      // 拷贝复制
      el._vOptions = [].map.call(el.options, getValue)
      // 如是是textarea
    } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
      el._vModifiers = binding.modifiers
      // 懒模式？如果有.lazy 就是lazy修饰符 change触发end
      if (!binding.modifiers.lazy) {
        el.addEventListener('compositionstart', onCompositionStart)
        el.addEventListener('compositionend', onCompositionEnd)
        // Safari < 10.2 & UIWebView doesn't fire compositionend when
        // switching focus before confirming composition choice
        // this also fixes the issue where some browsers e.g. iOS Chrome
        // fires "change" instead of "input" on autocomplete.
        el.addEventListener('change', onCompositionEnd)
        /* istanbul ignore if */
        if (isIE9) {
          el.vmodel = true
        }
      }
    }
  },

  componentUpdated (el, binding, vnode) {
    if (vnode.tag === 'select') {
      setSelected(el, binding, vnode.context)
      // in case the options rendered by v-for have changed,
      // it's possible that the value is out-of-sync with the rendered options.
      // detect such cases and filter out values that no longer has a matching
      // option in the DOM.
      const prevOptions = el._vOptions
      const curOptions = el._vOptions = [].map.call(el.options, getValue)
      if (curOptions.some((o, i) => !looseEqual(o, prevOptions[i]))) {
        // trigger change event if
        // no matching option found for at least one value
        const needReset = el.multiple
          ? binding.value.some(v => hasNoMatchingOption(v, curOptions))
          : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions)
        if (needReset) {
          trigger(el, 'change')
        }
      }
    }
  }
}

// 设置选中
function setSelected (el, binding, vm) {
  // 
  actuallySetSelected(el, binding, vm)
  /* istanbul ignore if */
  // 如果是IE  加入到宏事件  等待从event queue中获取执行
  // 等待当前已经加入队列中的宏任务和微任务执行完之后再执行 
  if (isIE || isEdge) {
    setTimeout(() => {
      actuallySetSelected(el, binding, vm)
    }, 0)
  }
}

function actuallySetSelected (el, binding, vm) {
  const value = binding.value
  const isMultiple = el.multiple
  // 如果含有multiple属性 判断不是数组报错
  if (isMultiple && !Array.isArray(value)) {
    process.env.NODE_ENV !== 'production' && warn(
      `<select multiple v-model="${binding.expression}"> ` +
      `expects an Array value for its binding, but got ${
        Object.prototype.toString.call(value).slice(8, -1)
      }`,
      vm
    )
    return
  }
  let selected, option
  // 
  for (let i = 0, l = el.options.length; i < l; i++) {
    option = el.options[i]
    // 如果多选的
    if (isMultiple) {
      // 是否已经选中
      selected = looseIndexOf(value, getValue(option)) > -1
      // 设置选中项
      if (option.selected !== selected) {
        option.selected = selected
      }
    } else {
      // 松散对比 设置选中 单选的
      if (looseEqual(getValue(option), value)) {
        if (el.selectedIndex !== i) {
          el.selectedIndex = i
        }
        return
      }
    }
  }
  if (!isMultiple) {
    el.selectedIndex = -1
  }
}

function hasNoMatchingOption (value, options) {
  return options.every(o => !looseEqual(o, value))
}

function getValue (option) {
  return '_value' in option
    ? option._value
    : option.value
}

function onCompositionStart (e) {
  e.target.composing = true
}

function onCompositionEnd (e) {
  // prevent triggering an input event for no reason
  if (!e.target.composing) return
  e.target.composing = false
  trigger(e.target, 'input')
}

// vue中 trigger的实现
function trigger (el, type) {
  const e = document.createEvent('HTMLEvents')
  e.initEvent(type, true, true)
  el.dispatchEvent(e)
}

export default directive
