/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
// 这个方法在哪呢 托马的 在哪呢？？
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// nodeOps就是增删改dom的一些方法
export const patch: Function = createPatchFunction({ nodeOps, modules })
