var Promise = require("./promise");
console.log(Promise.defer);

module.exports.resolve = Promise.resolve;
module.exports.reject = Promise.reject;
module.exports.deferred = Promise.defer;