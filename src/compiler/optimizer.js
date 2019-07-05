/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * 优化器的目标：遍历生成的模板ast树
 * and detect sub-trees that are purely static, i.e. parts of
 * 检测纯静态的子树，即
 * the DOM that never needs to change.
 * 不需要更改的DOM。
 *
 * Once we detect these sub-trees, we can:
 * 一旦我们检测到这些子树，我们就可以：
 *
 * 1. Hoist them into constants, so that we no longer need to
 * 把它们放到常量中，这样我们就不再需要
 *    create fresh nodes for them on each re-render;
 * 在每次重新渲染时为它们创建新节点；
 * 2. Completely skip them in the patching process.
 * .第二步。在修补过程中完全跳过它们。
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  // 如果根不存在
  if (!root) return
  // 缓存并获取statickeys
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // isHTMLTag(tag) || isSVG(tag)
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  markStatic(root)
  // second pass: mark static roots.
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  // 判断是否是静态的
  node.static = isStatic(node)
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 不要使组件槽静态内容。这避免了
    // 1. components not able to mutate slot nodes
    // 一个。无法更改插槽节点的组件 
    // 2. static slot content fails for hot-reloading
    // 2。静态插槽内容无法进行热重新加载 
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false
      }
    }
    // 条件 
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

function markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // 对于要限定为静态根的节点，它应该具有
    // are not just static text. Otherwise the cost of hoisting out will
    // 不仅仅是静态文本。否则，吊装费用将
    // outweigh the benefits and it's better off to just always render it fresh.
    // 超过好处，最好总是保持新鲜。
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
