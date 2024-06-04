const PROMISE_STATUS = {
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING'
}

class MyPromise {
  constructor(executor) {
    this.status = PROMISE_STATUS.PENDING;
    this.result = undefined;
    this.onFulfilledCallbacks = []; // resolve 回调
    this.onRejectedCallbacks = []; // reject 回调

    this.reject = this.reject.bind(this);
    this.resolve = this.resolve.bind(this);

    try {
      executor(this.resolve, this.reject);
    } catch (e) {
      this.reject(e)
    }
  }

  resolve(value) {
    if (this.status === PROMISE_STATUS.PENDING) {
      // 2.2.6.1
      this.status = PROMISE_STATUS.RESOLVED;
      // 2.1.2.2
      this.result = value;
      this.onFulfilledCallbacks.forEach(cb => {
        cb(value)
      });
    }
  }

  reject(reason) {
    if (this.status === PROMISE_STATUS.PENDING) {
      this.status = PROMISE_STATUS.REJECTED;
      // 2.1.3.2
      this.result = reason;
      // 2.2.6.2
      this.onRejectedCallbacks.forEach(cb => {
        cb(reason)
      });
    }
  }

  then(onFulfilled, onRejected) {
    // 2.2.1 需要判断参数类型，不是函数的话，默认提供兜底 cb
    // 2.2.7.3、2.2.7.4 是相同的约束
    // onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    // onRejected = typeof onRejected === 'function' ? onRejected : reason => {
    //   throw reason;
    // };

    const promise2 = new MyPromise((resolve, reject) => {
      if (this.status === PROMISE_STATUS.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            // 2.2.7.2
            try {
              // 2.2.7.3 如果 onFulfilled 不是函数，promise2 必须成功并返回相同的值
              if (typeof onFulfilled !== 'function') {
                resolve(this.result)
              } else {
                const x = onFulfilled(this.result);
                this._resolvePromise(promise2, x, resolve, reject)
              }
            } catch (e) {
              reject(e)
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            // 2.2.7.2
            try {
              // 2.2.7.4 如果 onRejected 不是函数，promise2 必须拒绝并返回相同的错误
              if (typeof onRejected !== 'function') {
                reject(this.PromiseResult);
              } else {
                const x = onRejected(this.result);
                this._resolvePromise(promise2, x, resolve, reject)
              }
            } catch (e) {
              reject(e)
            }
          })
        });
      } else if (this.status === PROMISE_STATUS.RESOLVED) {  // 2.2.2
        // 2.2.4
        setTimeout(() => {
          // 2.2.7.2
          try {
            // 2.2.7.3
            if (typeof onFulfilled !== 'function') {
              resolve(this.result)
            } else {
              const x = onFulfilled(this.result);
              this._resolvePromise(promise2, x, resolve, reject)
            }
          } catch (e) {
            reject(e)
          }
        })
      } else if (this.status === PROMISE_STATUS.REJECTED) { // 2.2.3
        // 2.2.4
        setTimeout(() => {
          // 2.2.7.2
          try {
            // 2.2.7.4
            if (typeof onRejected !== 'function') {
              reject(this.PromiseResult);
            } else {
              const x = onRejected(this.result);
              this._resolvePromise(promise2, x, resolve, reject)
            }
          } catch (e) {
            reject(e)
          }
        })
      }
    })

    return promise2
  }

  /**
   * 对 promise1 的结果进行分类处理，在合适的时机 resolve() 或 reject()
   * @param {*} promise2 promise1.then 返回的新的 promise 对象
   * @param {*} x promise1 onFulfilled 或 onRejected 的返回值
   * @param {*} resolve promise2 的 resolve
   * @param {*} reject promise2 的 reject
   */
  _resolvePromise(promise2, x, resolve, reject) {
    // 2.3.1
    if (x === promise2) {
      throw new TypeError('Chaining cycle detected for promise');
    }
    // 2.3.2 If x is a promise, adopt its state
    // TODO
    if (x instanceof MyPromise) {
      x.then(
        (y) => { this._resolvePromise(promise2, y, resolve, reject) },
        reject);
    }
  }
}

