/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// - 产生编译器，允许使用的替代
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// - SSR的优化编译器
// Here we just export a default compiler using the default parts.
// 在这里，我们只是使用默认的compiler
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // parse ast 
  // template字符串 
  // ./parser/index  
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    // 大概就是将语法树变成常量缓存下来 猜测的
    optimize(ast, options)
  }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
