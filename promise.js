;(function(){
	var attachContext = window;
	
	/* 兼容处理 */
	;(function(){
		var rIE = /\bMSIE\s+((\d+)(\.\d+)*)\b/i;
		var ieMajorVersion = rIE.exec(navigator.userAgent);
		if(null != ieMajorVersion){
			ieMajorVersion = parseInt(ieMajorVersion[2]);
			if(ieMajorVersion <= 8){
				/**
				 * 简化的defineProperty方法定义，用于兼容IE8
				 */
				Object.defineProperty = function(obj, name, opt){
					obj[name] = opt.value;
				};
				
				/**
				 * 为数组添加forEach方法
				 */
				Array.prototype.forEach = function(f){
					for(var i = 0; i < this.length; i++)
						f(this[i], i);
				};
			}
		}
	})();

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

	/**
	 * Executes promise chain adopting the previous promise's return value.
	 */
	var resolvePromise = function(result, resolve, reject){
		if(result instanceof Promise){
			// debug("adopting promise", result);
			
			/* Adopt result's state */
			result.then(function(resolvedData){
				resolvePromise(resolvedData, resolve, reject);
				// resolve(resolvedData);
			}, function(rejectedData){
				reject(rejectedData);
			});
			return;
		}
		
		if(null == result || undefined == result || typeof result !== "object" && typeof result !== "function"){
			resolve(result);
			return;
		}

		var then;
		try{
			then = result.then;
		}catch(e){
			reject(e);
			return;
		}
		
		if(typeof then !== "function"){
			resolve(result);
			return;
		}
		
		var finished = false;
		try{
			then.call(result, function(data){/* resolvePromise */
				if(finished)
					return;
				
				resolvePromise(data, resolve, reject);
				finished = true;
			}, function(data){/* rejectPromise */
				if(finished)
					return;
				
				reject(data);
				finished = true;
			});
		}catch(e){
			if(finished)
				return;
			
			reject(e);
		}
	};

	/**
	 * @constructor
	 * Promise prototype.
	 */
	var PromisePrototype = function(executor){
		var state = STATE.pending;
		var resolvedData, rejectedData;
		var resolveListeners = [], rejectListeners = [];
		
		/**
		 * Resolve this promise with certain data.
		 * @param data resolved data
		 */
		Object.defineProperty(this, "resolve", {value: function(data){
			if(state !== STATE.pending)
				return;
			
			/* refresh state */
			state = STATE.fulfilled;
			resolvedData = data;
			
			/* execute callback */
			resolveListeners.forEach(function(listener){
				setTimeout(function(){listener(data);}, 0);
			});
		}, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Reject this promise with certain data.
		 * @param data rejected data
		 */
		Object.defineProperty(this, "reject", {value: function(data){
			if(state !== STATE.pending)
				return;

			/* refresh state */
			state = STATE.rejected;
			rejectedData = data;
			
			/* execute callback */
			rejectListeners.forEach(function(listener){
				setTimeout(function(){listener(data);}, 0);
			});
		}, enumerable: false, writable: false, configurable: false});

		/**
		 * Appends fulfillment and rejection handlers to the promise, and returns a new promise resolving to the return value of the called handler.
		 * @param onFulfilled Callback to be executed when this promise is resolved
		 * @param onRejected Callback to be executed when this promise is rejected
		 */
		Object.defineProperty(this, "then", {value: function(onFulfilled, onRejected){
			var promise = new Promise(function(resolve, reject){
				if(typeof onFulfilled === "function"){
					/**
					 * Wraps callback so that the chained promise can be evaluated depending on the callback's return value. 
					 */
					var newOnFulfilled = function(resolvedData){
						try{
							var rst = onFulfilled(resolvedData);
							if(rst === promise)
								throw new TypeError("Resolved data can not be the same with returned Promise instance of 'then' method");
							
							resolvePromise(rst, resolve, reject);
						}catch(e){
							reject(e);
						}
					};
					resolveListeners.push(newOnFulfilled);
					
					if(state === STATE.fulfilled)
						newOnFulfilled(resolvedData);
				}else if(state === STATE.fulfilled){
					resolve(resolvedData);/* Fulfill with the same data */
				}else{
					resolveListeners.push(function(data){
						resolve(data);
					});
				}

				if(typeof onRejected === "function"){
					/**
					 * Wraps callback so that the chained promise can be evaluated depending on the callback's return value. 
					 */
					var newOnRejected = function(rejectedData){
						try{
							var rst = onRejected(rejectedData);
							if(rst === promise)
								throw new TypeError("Rejected data can not be the same with returned Promise instance of 'then' method");
							
							resolvePromise(rst, resolve, reject);
						}catch(e){
							reject(e);
						}
					};
					rejectListeners.push(newOnRejected);
					
					if(state === STATE.rejected)
						newOnRejected(rejectedData);
				}else if(state === STATE.rejected){
					reject(rejectedData);/* Fulfill with the same data */
				}else{
					rejectListeners.push(function(data){
						reject(data);
					});
				}
			});
			
			return promise;
		}, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Appends a rejection handler callback to the promise, and returns a new promise resolving to the return value of the callback if it is called, or to its original fulfillment value if the promise is instead fulfilled.
		 */
		Object.defineProperty(this, "catch", {value: function(onRejected){
			return this.then(undefined, onRejected);
		}, enumerable: false, writable: false, configurable: false});
	};

	/**
	 * @constructor
	 * @param executor {Function} Promise executor which will resolve or reject the promise.
	 * @param executor#resolve {Function} Used for the executor to resolve the promise
	 * @param executor#reject {Function} Used for the executor to reject the promise
	 * @param promisePrototype {PromisePrototype} Promise prototype to delegate methods to
	 */
	var Promise = function(executor, promisePrototype){
		if(typeof executor !== "function")
			throw new TypeError("Promise executor: " + String(executor) + " is not a function");
		
		promisePrototype = promisePrototype instanceof PromisePrototype? promisePrototype: new PromisePrototype();
		
		/**
		 * Delegate method: 'then'.
		 */
		Object.defineProperty(this, "then", {value: function(){
			return promisePrototype.then.apply(promisePrototype, arguments);
		}, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Delegate method: 'catch'.
		 */
		Object.defineProperty(this, "catch", {value: function(){
			return promisePrototype["catch"].apply(promisePrototype, arguments);
		}, enumerable: false, writable: false, configurable: false});
		
		/* Executes the executor */
		setTimeout(function(){
			executor(promisePrototype.resolve, promisePrototype.reject);
		}, 0);
	};

	/**
	 * Returns a defer object used to resove or reject the promise manually.
	 */
	Object.defineProperty(Promise, "defer", {value: function(){
		var promisePrototype = new PromisePrototype();
		var promise = new Promise(emptyFunction, promisePrototype);
		
		var obj = {};
		
		/**
		 * Get the associated Promise instance.
		 */
		Object.defineProperty(obj, "promise", {value: promise, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Resolves the associated promise manually.
		 */
		Object.defineProperty(obj, "resolve", {value: promisePrototype.resolve, enumerable: false, writable: false, configurable: false});
		
		/**
		 * Rejects the associated promise manually.
		 */
		Object.defineProperty(obj, "reject", {value: promisePrototype.reject, enumerable: false, writable: false, configurable: false});
		
		return obj;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a Promise object that is resolved with the given value. 
	 * If the value is a thenable (i.e. has a then method), the returned promise will "follow" that thenable, adopting its eventual state;
	 * otherwise the returned promise will be fulfilled with the value.
	 * Generally, if you want to know if a value is a promise or not - Promise.resolve(value) it instead and work with the return value as a promise.
	 */
	Object.defineProperty(Promise, "resolve", {value: function(data){
		var promise = new Promise(function(resolve, reject){
			resolvePromise(data, resolve, reject);
		});
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});

	/**
	 * Returns a Promise object that is rejected with the given reason.
	 */
	Object.defineProperty(Promise, "reject", {value: function(data){
		var promise = new Promise(function(resolve, reject){
			reject(data);
		});
		
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
				var tarItm = Promise.resolve(itm);
				tarItm.then((function(itm){
					return function(data){
						finishedPromises[i] = itm;
						resolvedDatas[i] = data;
						
						if(isAllFinished())
							resolve(resolvedDatas);
					};
				})(itm), function(data){
					reject(data);
				});
			});
		});
		
		return promise;
	}, enumerable: false, writable: false, configurable: false});
	
	/* Attaches Promise to the specified context. */
	attachContext.Promise = Promise;
})();