/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
// 在这里重命名了这些modules  我以为是一样名字 我找半天。。。 这个引入的是 ref 和directives 两个功能
import baseModules from 'core/vdom/modules/index'
// 在这里重命名了这些modules  我以为是一样名字 我找半天。。。 这个引入的是 event style dom-props class attrs transition
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// nodeOps就是增删改dom的一些方法
// 这里就用到了一个·函数柯理化·的技巧，通过 createPatchFunction 把差异化参数提前固化，这样不用每次调用 patch 的时候都传递 nodeOps 和 modules 了。
export const patch: Function = createPatchFunction({ nodeOps, modules })
