var adapter = require("./adapter");
var promisesAplusTests = require("C:/Users/WMJ/AppData/Roaming/npm/node_modules/promises-aplus-tests");

promisesAplusTests(adapter, function(err){
    // All done; output is in the console. Or check `err` for number of failures.
});