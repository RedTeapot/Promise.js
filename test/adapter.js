var Promise = require("./promise");

module.exports.deferred = Promise.defer;
module.exports.resolved = Promise.resolve;
module.exports.rejected = Promise.reject;