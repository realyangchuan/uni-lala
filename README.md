# uni-lala

一个uniapp请求工具，promisify，类axios，带拦截器

只新增了**1个可选属性**：`baseURL`，作用跟axios的一样

## 快速使用

```js
import request, { create } from 'uni-lala'

// 基础用法：options跟uni.request完全一致
await request({ ...options })

// 请求实例：除了uni.request正常参数外，defaultOptions还可以设置`baseURL`，作用跟axios的一样
const requestInstance = create({ ...defaultOptions })

// 各种类axios简化请求
request.get(url, data, options)
request.post(url, data, options)
request.put(url, data, options)
...

requestInstance.get(url, data, options)
requestInstance.post(url, data, options)
requestInstance.put(url, data, options)
...
```

## 拦截器

```js
// 请求拦截器
requestInstance.interceptors.request.use(function(options) {
  // 内部可以异步处理逻辑

  // 锁定
  // requestInstance.lock()
  // 解锁
  // requestInstance.unlock()
  // 取消锁定
  // requestInstance.cancel()

  // 返不返回都行，不返回时工具使用options继续发起真正请求
  return options
})

// 响应拦截器
requestInstance.interceptors.response.use(
  function(response, options) {
    // 内部可以异步处理逻辑

    // requestInstance.lock()
    // requestInstance.unlock()
    // requestInstance.cancel()

    // 返不返回都行
    return response
  },
  function(err, options) {
    // 异常流程处理，处理后会走reject流程
  }
)
```
