var promise = require("./promise.js");

var p1 = new Promise(function(resolve){
	resolve("[D1]")
});
var p2 = Promise.resolve("[D2]");

var pA = new Promise(function(resolve, reject){
	reject("!E1!");
});
var pB = Promise.reject("!E2!");

var p11 = p1.then(function(){
	return 2;
});
p11.then(function(d){
	console.log(">>", d);
});

var pB1 = pB.then(null, function(){
	return 3;
});
pB1.then(function(d){
	console.log(">>", d);
});

//------------------------
var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to
var sentinelArray = [sentinel]; // a sentinel fulfillment value to test when we need an array

var outerThenableFactory = function (value) {
	return Promise.resolve(value);
};
var innerThenableFactory = function (value) {
	return {
		then: function (onFulfilled) {
			onFulfilled(value);
		}
	};
};

function yFactory() {
	return outerThenableFactory(innerThenableFactory(sentinel));
}

function xFactory() {
	return {
		then: function (resolvePromise) {
			resolvePromise(yFactory());
		}
	};
}

var promise = Promise.resolve({ sentinel: "sentinel" }).then(function onBasePromiseFulfilled() {
	return xFactory();
});

fulfillmentValue = sentinel;
promise.then(function onPromiseFulfilled(value) {
	if(value !== fulfillmentValue)
		console.error("!!!", value, fulfillmentValue);
	else
		console.info("@@@");
});
//========================
var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to
var sentinelArray = [sentinel]; // a sentinel fulfillment value to test when we need an array

var promise = Promise.resolve({ sentinel: "sentinel" }).then(function() {
	return {
		then: function abc (resolvePromise) {
			resolvePromise(
				Promise.resolve(
					{
						then: function def (onFulfilled) {
							onFulfilled(sentinel);
						}
					}
				)
			);
		}
	};
});

fulfillmentValue = sentinel;
promise.then(function onPromiseFulfilled(value) {
	if(value !== fulfillmentValue)
		console.error("!!!", value, fulfillmentValue);
	else
		console.info("@@@");
});