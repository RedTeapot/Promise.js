;(function(root, factory){
    if(typeof define === "function" && define.amd) {
        define(["Promise"], factory);
    }else if(typeof module === "object" && module.exports) {
        module.exports = factory();
    }else{
        root.Promise = factory();
    }
})(this, function(){
	"use strict";

	/**
	 * A Promise is in one of these STATE: pending, fulfilled or rejected.
	 */
	var STATE = {
		pending: "pending",/* initial state, not fulfilled or rejected. */
		fulfilled: "fulfilled",/* meaning that the operation completed successfully. */
		rejected: "rejected"/* meaning that the operation failed. */
	};

	var emptyFunction = function(){};

	/**
	 * Used to output debug logs to the console.
	 */
	var debug = function(){
		var s = "";
		for(var i = 0; i < arguments.length; i++)
			s += ", arguments[" + i + "]";
		
		eval("console.log('promise: '" + s + ")");
	};

	var resolvePromise = function(promise, x, promise_resolve, promise_reject){
		/* 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason. */
		if(promise === x){
			promise_reject(new TypeError("Resolved data can not be the same with the promise"));
			return;
		}
		
		/* 2.3.2 If x is a promise, adopt its state */
		if(x instanceof Promise){
			/**
			 * 2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected.
			 * 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.
			 * 2.3.2.3 If/when x is rejected, reject promise with the same reason.
			 */
			x.then.sync(function(data){
				resolvePromise(promise, data, promise_resolve, promise_reject);
			}, promise_reject);
			return;
		}

		/* 2.3.4 If x is not an object or function, fulfill promise with x. */
		if(null === x || undefined === x || typeof x !== "object" && typeof x !== "function"){
			promise_resolve(x);
			return;
		}

		/* 2.3.3 Otherwise, if x is an object or function, */

		/* 2.3.3.1 Let then be x.then. */
		var then;
		try{
			then = x.then;
		}catch(e){
			/* 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason. */
			promise_reject(e);
			return;
		}
		
		/* 2.3.3.4 If then is not a function, fulfill promise with x. */
		if(typeof then !== "function"){
			promise_resolve(x);
			return;
		}
		
		var isPromiseResolvedOrRejected = false;
		var _resolvePromise = function(y){
			/* 2.3.3.3.3 if both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored */
			if(isPromiseResolvedOrRejected)
				return;
			
			/* 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y) */
			resolvePromise(promise, y, promise_resolve, promise_reject);
			isPromiseResolvedOrRejected = true;
		};
		var _rejectPromise = function(reason){
			/* 2.3.3.3.3 if both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored */
			if(isPromiseResolvedOrRejected)
				return;
			
			/* 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r. */
			promise_reject(reason);
			isPromiseResolvedOrRejected = true;
		};
		try{
			/* 2.3.3.3 If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise */
			then.call(x, _resolvePromise, _rejectPromise);
		}catch(e){/* 2.3.3.3.4 If calling then throws an exception e */
			/* 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it */
			if(isPromiseResolvedOrRejected)
				;
			else/* 2.3.3.3.4.2 Otherwise, reject promise with e as the reason. */
				promise_reject(e);
		}
	};

	/**
	 * @constructor
	 * @param executor {Function} Promise executor which will resolve or reject the promise.
	 * @param executor#resolve {Function} Used for the executor to resolve the promise
	 * @param executor#reject {Function} Used for the executor to reject the promise
	 */
	var Promise = function(executor){
		var state = STATE.pending;
		var resolvedData, rejectedReason;
		var resolveListeners = [], rejectListeners = [];
	
		this.getState = function(){
			return state;
		};
	
		var then = function(sync, onFulfilled, onRejected){
			var promise2_resolve,
				promise2_reject;
			
			var promise2 = new Promise(function(resolve, reject){
				promise2_resolve = resolve;
				promise2_reject = reject;
			});
			
			var isFulfilledOrRejected = 0;
			
			if(typeof onFulfilled === "function"){
				var newOnFulfilled = function(data){
					/* 2.2.2.3 it must not be called more than once. */
					if(isFulfilledOrRejected !== 0)
						return;
					
					isFulfilledOrRejected = 1;

					try{
						/* 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument. */
						var x = onFulfilled(data);
					}catch(e){
						/* 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason. */
						promise2_reject(e);
						return;
					}

					/* 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x). */
					resolvePromise(promise2, x, promise2_resolve, promise2_reject);
				};
				
				if(state == STATE.fulfilled){
					if(sync)
						newOnFulfilled(resolvedData);
					else
						setTimeout(function(){newOnFulfilled(resolvedData);}, 0);
				}else
					resolveListeners.push(newOnFulfilled);
			}else{
				var resolvePromise2 = function(resolvedData){
					resolvePromise(promise2, resolvedData, promise2_resolve, promise2_reject);
				};

				/* 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1. */
				if(state == STATE.fulfilled){
					if(sync)
						resolvePromise2(resolvedData);
					else
						setTimeout(function(){resolvePromise2(resolvedData);}, 0);
				}else
					resolveListeners.push(resolvePromise2);
			}	
			
			if(typeof onRejected === "function"){
				var newOnRejected = function(reason){
					/* 2.2.3.3 it must not be called more than once. */
					if(isFulfilledOrRejected !== 0)
						return;
					
					isFulfilledOrRejected = 2;

					try{
						/* 2.2.3.1 it must be called after promise is rejected, with promise’s reason as its first argument. */
						var x = onRejected(reason);
					}catch(e){
						/* 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason. */
						promise2_reject(e);
						return;
					}

					/* 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x). */
					resolvePromise(promise2, x, promise2_resolve, promise2_reject);
				};

				if(state == STATE.rejected){
					if(sync)
						newOnRejected(rejectedReason);
					else
						setTimeout(function(){newOnRejected(rejectedReason);}, 0);
				}else
					rejectListeners.push(newOnRejected);
			}else{
				var rejectPromise2 = function(rejectedData){
					promise2_reject(rejectedData);
				};

				/* 2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1. */
				if(state == STATE.rejected){
					if(sync)
						rejectPromise2(rejectedReason);
					else
						setTimeout(function(){rejectPromise2(rejectedReason);}, 0);
				}else
					rejectListeners.push(rejectPromise2);
			}

			/* 2.2.7 then must return a promise */
			return promise2;
		}

		/**
		 * Appends fulfillment and rejection handlers to the promise, and returns a new promise resolving to the return value of the called handler.
		 * @param {Function} onFulfilled Callback to be executed when this promise is resolved
		 * @param {Function} onRejected Callback to be executed when this promise is rejected
		 */
		Object.defineProperty(this, "then", {value: (function(){
			var f = function(onFulfilled, onRejected){
				return then(false, onFulfilled, onRejected);
			};
			
			f.sync = function(onFulfilled, onRejected){
				return then(true, onFulfilled, onRejected);
			};
			
			return f;
		})(), enumerable: false, writable: false, configurable: false});
		
		/**
		 * Appends a rejection handler callback to the promise, and returns a new promise resolving to the return value of the callback if it is called, or to its original fulfillment value if the promise is instead fulfilled.
		 */
		Object.defineProperty(this, "catch", {value: function(onRejected){
			return this.then(undefined, onRejected);
		}, enumerable: false, writable: false, configurable: false});
		
		/* Executes the executor */
		executor(function(data){
			if(state !== STATE.pending)
				return;
			
			/* refresh state */
			state = STATE.fulfilled;
			resolvedData = data;
			
			/* execute callback */
			setTimeout(function(){
				for(var i = 0; i < resolveListeners.length; i++){
					var listener = resolveListeners[i];
					if(typeof listener !== "function")
						continue;
					
					try{
						listener(data);
					}catch(e){
						console.error(e);
					}
				}
			}, 0);
			
		}, function(reason){
			if(state !== STATE.pending)
				return;

			/* refresh state */
			state = STATE.rejected;
			rejectedReason = reason;
			
			/* execute callback */
			if(rejectListeners.length == 0){
				console.error("Uncaught (in promise)", reason);
				return;
			}
			
			setTimeout(function(){
				for(var i = 0; i < rejectListeners.length; i++){
					var listener = rejectListeners[i];
					if(typeof listener !== "function")
						continue;
					
					try{
						listener(reason);
					}catch(e){
						console.error(e);
					}
				}
			}, 0);
		});
	};

	/**
	 * Returns a defer object used to resove or reject the promise manually.
	 */
	Object.defineProperty(Promise, "defer", {value: function(){
		var resolvePromise, rejectPromise;
		var promise = new Promise(function(resolve, reject){
			resolvePromise = resolve;
			rejectPromise = reject;
		});
		
		var obj = {};
		
		/**
		 * Get the associated Promise instance.
		 */
		Object.defineProperty(obj, "promise", {value: promise, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Resolves the associated promise manually.
		 */
		Object.defineProperty(obj, "resolve", {value: resolvePromise, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Rejects the associated promise manually.
		 */
		Object.defineProperty(obj, "reject", {value: rejectPromise, enumerable: false, writable: false, configurable: false});
		
		return obj;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a Promise object that is resolved with the given value. 
	 * If the value is a thenable (i.e. has a then method), the returned promise will "follow" that thenable, adopting its eventual state;
	 * otherwise the returned promise will be fulfilled with the value.
	 * Generally, if you want to know if a value is a promise or not - Promise.resolve(value) it instead and work with the return value as a promise.
	 */
	Object.defineProperty(Promise, "resolve", {value: function(data){
		var resolvePromise;
		var promise = new Promise(function(resolve, reject){
			resolvePromise = resolve;
		});
		
		resolvePromise(data);
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a Promise object that is rejected with the given reason.
	 */
	Object.defineProperty(Promise, "reject", {value: function(reason){
		var rejectPromise;
		var promise = new Promise(function(resolve, reject){
			rejectPromise = reject;
		});
		
		rejectPromise(reason);
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a promise that resolves or rejects as soon as one of the promises in the iterable resolves or rejects, with the value or reason from that promise.
	 */
	Object.defineProperty(Promise, "race", {value: function(iterable){
		var promise = new Promise(function(resolve, reject){
			var isFinished = false;
			var _resolvePromise = function(data){
				if(isFinished)
					return;
				
				resolve(data);
				isFinished = true;
			}, _rejectPromise = function(data){
				if(isFinished)
					return;
				
				reject(data);
				isFinished = true;
			};
			
			iterable.forEach(function(itm){
				itm = Promise.resolve(itm);
				
				itm.then(_resolvePromise, _rejectPromise);
			});
		});
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a promise that resolves when all of the promises in the iterable argument have resolved.
	 */
	Object.defineProperty(Promise, "all", {value: function(iterable){
		var promise = new Promise(function(resolve, reject){
			var finishedPromises = new Array(iterable.length), resolvedDatas = new Array(iterable.length);
			var isAllFinished = function(){
				return iterable.every(function(itm){
					return finishedPromises.indexOf(itm) != -1;
				});
			};
			
			iterable.forEach(function(itm, i){
				itm.then(function(data){
					finishedPromises[i] = itm;
					resolvedDatas[i] = data;
					
					if(isAllFinished())
						resolve(resolvedDatas);
				}, function(reason){
					reject(reason);
				});
			});
		});
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});
	
	return Promise;
});