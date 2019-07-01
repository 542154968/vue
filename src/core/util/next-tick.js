/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

/**
 * 让pending为false
 * 拷贝所有的callbacks并执行所有的callbacks
 */
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// 这里我们有使用微任务的异步延迟包装器。
// In 2.5 we used (macro) tasks (in combination with microtasks).
// 在2.5中，我们使用（宏）任务（与微任务结合使用）。
// However, it has subtle problems when state is changed right before repaint
// 但是，在重新绘制之前状态发生变化时会出现一些细微的问题
// (e.g. #6813, out-in transitions).
// （例如6813，在转换中输出）。
// Also, using (macro) tasks in event handler would cause some weird behaviors
// 另外，在事件处理程序中使用（宏）任务会导致一些奇怪的行为
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// 不能规避（如7109、7153、7546、7834、8109）。
// So we now use microtasks everywhere, again.
// 所以我们现在到处都使用微任务。
// A major drawback of this tradeoff is that there are some scenarios
// 这种权衡的一个主要缺点是存在一些情况
// where microtasks have too high a priority and fire in between supposedly
// 如果微任务的优先级太高，则会在假定的优先级和优先级之间触发
// sequential events (e.g. #4521, #6690, which have workarounds)
// 顺序事件（例如4521、6690，具有解决方法）
// or even between bubbling of the same event (#6566).
//甚至在同一事件的冒泡之间（6566）。

/**
 * 
 * 宏任务微任务看这个 https://juejin.im/post/59e85eebf265da430d571f89
 * 
 * 
 * 宏任务一般是：包括整体代码script，setTimeout，setInterval。

  
  微任务：Promise，process.nextTick。

  同步和异步任务分别进入不同的执行"场所"，同步的进入主线程，异步的进入Event Table并注册函数。
  当指定的事情完成时，Event Table会将这个函数移入Event Queue。
  主线程内的任务执行完毕为空，会去Event Queue读取对应的函数，进入主线程执行。
  上述过程会不断重复，也就是常说的Event Loop(事件循环)。

  是js异步有一个机制，就是遇到宏任务，先执行宏任务，将宏任务放入eventqueue，然后在执行微任务，
  将微任务放入eventqueue最骚的是，这两个queue不是一个queue。
  当你往外拿的时候先从微任务里拿这个回掉函数，然后再从宏任务的queue上拿宏任务的回掉函数。 

   
  
  let data = [];
$.ajax({
    url:www.javascript.com,
    data:data,
    success:() => {
        console.log('发送成功!');
    }
})
console.log('代码执行结束');

ajax进入Event Table，注册回调函数success。
执行console.log('代码执行结束')。
ajax事件完成，回调函数success进入Event Queue。
主线程从Event Queue读取回调函数success并执行
 * 
 */

let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 一个resolve 状态的promise 创建一个微任务
  const p = Promise.resolve()
  timerFunc = () => {
    // 微任务  
    // 执行所有callbacks 执行
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // 在有问题的uiwebview中，promise.then不会完全中断，但是
    // it can get stuck in a weird state where callbacks are pushed into the
    // 它可能会陷入一种奇怪的状态，在这种状态下，回调被推到
    // microtask queue but the queue isn't being flushed, until the browser
    // 微任务队列，但只有在浏览器
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // 需要做一些其他工作，例如处理计时器。因此我们可以
    // "force" the microtask queue to be flushed by adding an empty timer.
    // 强制”通过添加空计时器来刷新微任务队列
    // 宏任务 noop 放入 eventTabel
    if (isIOS) setTimeout(noop)
  }
  // 使用的微任务 所以是true
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)

  // 提供监视对DOM树所做更改的功能。它被设计为替代旧的突变事件特征，这是dom3事件规范的一部分。
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  // 使用的是微任务
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Techinically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    // 是一种宏任务
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    // 用宏任务
    setTimeout(flushCallbacks, 0)
  }
}

// $nextTick 的实现
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // callbacks数组 字面意思理解为 回调的数组
  callbacks.push(() => {
    // 如果回调函数存在 执行回调
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
      // 如果有resolve  
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 核心来了 timerFunc
  // 如果支持promise  优先使用 微任务   实在不行 使用 宏任务 setImmediate 再不行  使用宏任务 setTimeout  
  // 通过了解宏任务 微任务 我们知道 微任务的等待是最少的  
  // 他是等当前宏任务执行完毕之后就执行的 但是宏任务就要等到添加它之前的所有宏任务和微任务执行完毕（event loop 到他的环节）才开始执行

  // pending是false的话  说明没有事件执行 执行它
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  // 如果没有回调函数 就是用promise
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
