var sys = require('sys'),
    http = require('http');

var base = "http://api.twitter.com";

exports.proxy = function (requester, serverRequest, serverResponse) {
  var url = serverRequest.url;
  var data = [];
  serverRequest.on("data", function (chunk) {
    data.push(chunk+""); // no support for streaming request bodies!
  });
  
  var makeRequest = function () {
    console.log("Onto twitter");
    exports.client(requester, url, serverRequest.method, function (error, request) {
      if(error) {
        response.writeHead(501, {
          'Content-Type': "text/plain"
        });
        response.end(error+"");
        console.log("Twitter OAuth Error "+error);
      } else {
        console.log("Got request");
        request.on("response", function (response) {
          console.log("Got Twitter response "+response.statusCode + " "+JSON.stringify(response.headers));
          serverResponse.writeHead(response.statusCode, response.headers);
          response.on("data", function (chunk) {
            serverResponse.write(chunk);
          });
          response.on("end", function () {
            serverResponse.end()
          });
        })
        request.end(data.join());
      }
    })
  };
  if(serverRequest.method == "GET") {
    makeRequest()
  } else {
    serverRequest.on("end", makeRequest);
  }
}

exports.client = function (requester, path, method, cb) { // cb(error, request)
  requester(base+path, method, cb)
}