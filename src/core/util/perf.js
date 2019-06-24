import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  // 是否是浏览器环境 判断 window对象是否存在
  // window.performance 允许网页访问某些函数来测量网页和Web应用程序的性能
  // 所以就是如果是浏览器环境 并且可以测量性能 那么perf 就是window.performance
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag)
    measure = (name, startTag, endTag) => {
      // 记录两个标记的时间间隔
      perf.measure(name, startTag, endTag)
      // clearMarks 清除指定标记
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
