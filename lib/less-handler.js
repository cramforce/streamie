var less = require('less'),
    path = require('path'),
      fs = require('fs'),
     sys = require('sys');

exports.handle = function (input, request, response, options) {
  
  options = options || {};
  input   = input.replace(/\.css$/, "");
  
  fs.stat(input, function (e, stats) {
    function respondError(msg) {
      console.log("LESS.js Error: "+msg);
      response.writeHead(501, {
        'Content-Type': "text/plain"
      });
      response.end(""+msg);
    }
    
    if (e) {
      response.writeHead(404, {
        'Content-Type': "text/plain"
      });
      response.end("File Not Found "+e);
    }
    fs.open(input, process.O_RDONLY, stats.mode, function (e, fd) {
      fs.read(fd, stats.size, 0, "utf8", function (e, data) {
        new(less.Parser)({
          paths: [path.dirname(input)],
          filename: input
        }).parse(data, function (err, tree) {
          if (err) {
            respondError(err)
          } else {
            try {
              var css = tree.toCSS({ compress: options.compress });
              response.writeHead("200", {
                "Content-Type": "text/css"
              });
              response.end(css);
            } catch (e) {
              respondError(e)
            }
          }
        });
      });
    });
  });
}