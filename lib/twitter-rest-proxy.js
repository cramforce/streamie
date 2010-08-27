var sys = require('sys'),
    http = require('http');

var base = "https://api.twitter.com";

exports.proxy = function (requester, serverRequest, serverResponse, data) {
  var url = serverRequest.url + (data ? '?'+data : ''); // for now send post data via Query String. (bug in node-oauth with post not going into signature)
  
  console.log("Onto twitter "+serverRequest.method);
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
        response.setEncoding('utf8');
        console.log("Got Twitter response "+response.statusCode + " "+JSON.stringify(response.headers));
        serverResponse.writeHead(response.statusCode, response.headers);
        response.on("data", function (chunk) {
          serverResponse.write(chunk);
        });
        response.on("end", function () {
          serverResponse.end()
        });
      })
      request.end()
    }
  });
  
}

exports.client = function (requester, path, method, cb, data) { // cb(error, request)
  requester(base+path, method, cb, data)
}