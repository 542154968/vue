/* @flow */

const validDivisionCharRE = /[\w).+\-_$\]]/

/**
// exp是传入的 比如 :name="'lqk'/变量"
// 将属性的值从前往后开始一个一个匹配，关键符号 : "|" 并排除 ""、 ''、 ``、 //、 || (字符串、正则)中的管道符号 '|' 。
// https://www.jianshu.com/p/41049af3e4ec

 * 所以上面直到遇到 第一个正确的 | ，那么前面的表达式 并存储在 expression 中，
 * 后面继续匹配再次遇到 | ,那么此时 expression有值，
 *  说明这不是第一个过滤器 pushFilter() 去处理上一个过滤器
 */
// 表达式中的过滤器解析 方法
export function parseFilters (exp: string): string {
   // 是否在 ''中
  let inSingle = false
  // 是否在 "" 中
  let inDouble = false
  // 是否在 ``
  let inTemplateString = false
   //  是否在 正则 \\ 中
  let inRegex = false
  // 是否在 {{ 中发现一个 culy加1 然后发现一个 } culy减1 直到culy为0 说明 { .. }闭合
  let curly = 0
  // 跟{{ 一样 有一个 [ 加1 有一个 ] 减1
  let square = 0
  // 跟{{ 一样 有一个 ( 加1 有一个 ) 减1
  let paren = 0
  // 最后一个过滤的下标
  let lastFilterIndex = 0
  let c, prev, i, expression, filters

  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
       //  '  \
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      // " \
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      //  `
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
      // 当前在正则表达式中  /开始
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      // 如果在 之前不在 ' " ` / 即字符串 或者正则中
            // 那么就判断 当前字符是否是 |
            //  如果当前 字符为 | 
            // 且下一个（上一个）字符不是 | 
            // 且 不在 { } 对象中
            // 且 不在 [] 数组中
            // 且不在  () 中
            // 那么说明此时是过滤器的一个 分界点
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      /*
                如果前面没有表达式那么说明这是第一个 管道符号 "|"
                再次遇到 | 因为前面 expression = 'message '
                执行  pushFilter()
             */
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break         // "
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }
 // 获取当前过滤器的 并将其存储在filters 数组中
    //  filters = [ 'filterA' , 'filterB']
  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
