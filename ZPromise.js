class ZPromise {

    // 定义三种状态
    static PENDING = 'PENDING';
    static RESOLVED = 'RESOLVED';
    static REJECTED = 'REJECTED';

    constructor( handler ) {

        // 类型判断，参数不是函数抛出错误
        if ( typeof handler !== 'function' ) throw new TypeError('Promise resolver undefined is not a function');

        // 三种任务队列 
        this.resolvedQueues = [];
        this.rejectedQueues = [];
        this.finayllyQueues = [];

        // 类状态
        this.status = ZPromise.PENDING;
        // 类的值，用于传递返回值
        this.value;

        // new ZPromise的时候 传入的函数就会被调用一次
        handler( this._resolve.bind(this), this._reject.bind(this) );

    }

    _resolve(val) {
        // setTimeout(_=>{
            
        // }, 0);

        // 用message模拟原生promise的resolve的微任务
        window.addEventListener('message', _=>{
            // promise状态一旦改变就不能再变了
            if (this.status !== ZPromise.PENDING) return; 
            // console.log('_resolve');
            // 修改状态和值
            this.status = ZPromise.RESOLVED;
            this.value = val;

            let handler;
            while( handler = this.resolvedQueues.shift() ) {
                // 状态改成resolved后，调用then的回调函数
                handler(this.value);
            }
            // 调用_finally
            this._finally(this.value);
        });
        window.postMessage('');
    }

    _reject(val) {
        // setTimeout(_=>{
            
        // }, 0);

        window.addEventListener('message', _=>{
            if (this.status !== ZPromise.PENDING) return;
            this.status = ZPromise.REJECTED;
            this.value = val;

            let handler;
            while( handler = this.rejectedQueues.shift() ) {
                handler(this.value);
            }
            this._finally(this.value);
        });
        window.postMessage('');
    }

    // 状态改变都会调的结束函数
    _finally() {
        window.addEventListener('message', _=>{
            this.status = ZPromise.REJECTED;

            let handler;
            while( handler = this.finayllyQueues.shift() ) {
                handler(this.value);
            }
        });
        window.postMessage('');
    }

    then( resolvedHandler, rejectedHandler ) {
        // resolvedHandler();

        // 事件 

        // this.resolvedQueues.push(resolvedHandler);
        // this.rejectedQueues.push(rejectedHandler);

        // 为了链式调用。then返回的是一个新的promise，并接受值val
        return new ZPromise( (resolve, reject) => {
            // resolve();

            function newResolvedHandler(val) {
                // 对then函数 参数类型的判断，是否是函数，是否是一个promise
                if (typeof resolvedHandler === 'function') {
                    let result = resolvedHandler(val);

                    if (result instanceof ZPromise) {
                        result.then(resolve, reject);
                    } else {
                        resolve(result);
                    }
                } else {
                    resolve(val);
                }
            }
            function newRejectedHandler(val) {
                if (typeof rejectedHandler === 'function') {
                    let result = rejectedHandler(val);
                    if (result instanceof ZPromise) {
                        result.then(resolve, reject);
                    } else {
                        reject(result);
                    }
                } else {
                    reject(val);
                }
            }

            // 本次回调函数加入队列中，promise状态改变后，会依次调用这个队列数组
            this.resolvedQueues.push(newResolvedHandler);
            this.rejectedQueues.push(newRejectedHandler);

        } );
    }

    catch(rejectedHandler) {
        return this.then(undefined, rejectedHandler);
    }

    finally(finallyHandler) {
        this.finayllyQueues.push(finallyHandler);
    }

    // 定义静态方法
    static resolve(val) {
        return new ZPromise(resolve => {
            resolve(val);
        });
    }

    static reject(val) {
        return new ZPromise((resolve, reject) => {
            reject(val);
        });
    }

    static all(iterator) {

        let len = iterator.length;
        let i = 0;
        let vals = [];

        return new ZPromise( (resolve, reject) => {
            iterator.forEach(it => {
                it.then(val => {
                    i++;
                    vals.push(val);
                    if (i === len) {
                        // 全部resolved 结束
                        resolve(vals);
                    }
                }).catch(e=> {
                    // 其中一个rejected ，就结束
                    reject(e);
                });
            });
        } );

    }

    static race(iterator) {
        return new ZPromise((resolve, reject) => {
            iterator.forEach(it => {
                it.then(val => {
                    resolve(val);
                }).catch(e=> {
                    reject(e);
                });
            });
        })
    }

    static allSettled(iterator) {
        let len = iterator.length;
        let i = 0;
        let vals = [];

        return new ZPromise( (resolve, reject) => {
            iterator.forEach(it => {
                it.finally(val => {
                    i++;
                    vals.push(val);
                    if (i === len) {
                        resolve(vals);
                    }
                }).catch(e=>{})
            });
        } );
    }

}