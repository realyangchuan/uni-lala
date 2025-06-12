function createInterceptors() {
  let _resolve = null
  let _reject = null

  const ret = {
    p: null
  }

  function _reset() {
    ret.p = _resolve = _reject = null
  }

  function lock() {
    ret.p = new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })
  }

  function unlock() {
    if (_resolve) {
      _resolve()
      _reset()
    }
  }

  function cancel() {
    if (_reject) {
      _reject('canceled')
      _reset()
    }
  }

  ret.interceptors = {
    lock,
    unlock,
    cancel,
    request: {
      use(handler) {
        this.handler = handler
      }
    },
    response: {
      use(handler, errHandler) {
        this.handler = handler
        this.errHandler = errHandler
      }
    }
  }

  return ret
}

function enqueueIfLocked(p, cb) {
  if (p) {
    p.then(async () => await cb?.())
  } else {
    cb?.()
  }
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1) === 'Object'
}

function mergeOptions(target, source, root = true) {
  const res = { ...target }
  for (const k in source) {
    const baseURL = source['baseURL']
    if (root && k === 'baseURL' && baseURL) {
      const reqUrl = res['url']
      if (typeof reqUrl === 'undefined' || /^https?:\/\//.test(reqUrl)) {
        continue
      }

      // 去掉前面的斜线`/`
      const i = reqUrl.search(/\w/)
      const path = i === -1 ? '' : reqUrl.slice(i)
      if (baseURL.endsWith('/')) {
        res['url'] = baseURL + path
      } else {
        res['url'] = [baseURL, path].filter(Boolean).join('/')
      }

      continue
    }

    if (res.hasOwnProperty(k)) {
      if (isPlainObject(res[k]) && isPlainObject(source[k])) {
        res[k] = mergeOptions(res[k], source[k], false)
      }
    } else {
      res[k] = source[k]
    }
  }

  return res
}

function createInstance(defaultOptions, makeRequest) {
  const interceptorsContainer = createInterceptors()
  const { interceptors } = interceptorsContainer

  function _request(options) {
    return new Promise((resolve, reject) => {
      enqueueIfLocked(interceptorsContainer.p, async () => {
        const originConfig = mergeOptions(options, defaultOptions)
        const config = (await Promise.resolve(interceptors.request.handler?.(originConfig))) ?? originConfig
        makeRequest(config)
          .then(
            response => {
              enqueueIfLocked(interceptorsContainer.p, async () => {
                const res = (await Promise.resolve(interceptors.response.handler?.(response, config)))
                resolve(res ?? response)
              })
            },
            async error => {
              enqueueIfLocked(interceptorsContainer.p, async () => {
                const err = (await Promise.resolve(interceptors.response.errHandler?.(error, config)))
                reject(err ?? error)
              })
            }
          )
      })
    })
  }

  _request.interceptors = interceptors
  _request.lock = interceptors.lock
  _request.unlock = interceptors.unlock
  _request.cancel = interceptors.cancel

  const methods = ['get', 'post', 'put', 'delete', 'connect', 'head', 'options', 'trace']

  methods.forEach(method => {
    _request[method] = (url, data, options) => _request({
      url,
      data,
      ...options,
      method: method.toUpperCase()
    })
  })

  return _request
}

function uniRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      async success(res) {
        resolve((await options.success?.(res)) ?? res)
      },
      async fail(err) {
        reject((await options.fail?.(err)) ?? err)
      },
      async complete(res) {
        await options.complete?.(res)
      }
    })
  })
}

export default createInstance({}, uniRequest)

export function create(defaultOptions = {}) {
  return createInstance(defaultOptions, uniRequest)
}
