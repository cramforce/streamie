var fs = require('fs');

/* Every once in a while write out some stats about the system */

var FILENAME = __dirname + "/data/stats.log";

var appender = fileAppender(FILENAME);

// writes out stats about the program

var stats = {};

// set a stats key
exports.set = function (key, value) {
  stats[key] = value;
}

// increment a stats key
exports.inc = function (key) {
  if(!stats[key]) {
    stats[key] = 0;
  }
  stats[key]++;
}

// decrement a stats key
exports.dec = function (key) {
  if(!stats[key]) {
    stats[key] = 0;
  }
  stats[key]--;
}

var last;
setInterval(function () {
  var str = JSON.stringify(stats);
  if(last != str) {
    appender((new Date)+";"+str);
    last = str;
  }
}, 5000);

// Taken from http://github.com/csausdev/log4js-node/blob/master/lib/log4js.js
function fileAppender(file) {
	file = file || "log4js.log";	
  //syncs are generally bad, but we need 
  //the file to be open before we start doing any writing.
  var logFile = fs.openSync(file, process.O_APPEND | process.O_WRONLY | process.O_CREAT, 0644);    
  //register ourselves as listeners for shutdown
  //so that we can close the file.
  //not entirely sure this is necessary, but still.
  process.addListener("exit", function() { fs.close(logFile); });
  
  return function(loggingEvent) {
    fs.write(logFile, loggingEvent+'\n', null, "utf-8");
  };
};