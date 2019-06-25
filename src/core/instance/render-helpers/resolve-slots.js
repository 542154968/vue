/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 * 总的来讲 如果children存在 如果child的作用域和当前作用域相同 说明是有多个 将child推入对应名称的数组中 
 * 如果child不在统一作用域 就推入默认的slot中 还有如果child中含有template  就使用template中的children
 * 忽略空白插槽
 * 
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 没有子节点返回空对象 就是没有slots
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    // 如果节点解析为Vue插槽节点，则移除插槽属性
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    // 仅当Vnode在同一上下文中呈现时，才应考虑命名槽。 就是 有多个slot插槽的时候 
    // 当有名称  将对应的child推到对应名称的数组中 没有就推入defaults中
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      // 插槽名称
      const name = data.slot
      // 插槽如果存在 取这个数组 没有就默认空数组
      const slot = (slots[name] || (slots[name] = []))
      // 如果是tempalte元素 则把template的children添加进数组中，这也就是为什么你写的template标签并不会渲染成另一个标签到页面
      if (child.tag === 'template') {
        // arr.push.apply(数组a, 数组b) 相当于合并两个数组 和concat相比  最大区别是apply的方式有长度限制 不同浏览器不同
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  // 忽略只包含空白的插槽
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
