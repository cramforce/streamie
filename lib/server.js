var http = require('http'),
      io = require('socket.io'),
      static = require('node-static'),
      twitterClient = require('./twitter-stream-client');

var file = new(static.Server)('../public');

var server = http.createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
});
server.listen(8080);

var socket = io.listen(server);

var clients = {};

socket.on('connection', function(client){
  
  var tweety = twitterClient.connect(function (err, data) {
    if(err) {
      client.send(JSON.stringify(err))
    } else {
      client.send(data);
    }
  })
  
  client.on('message', function(msg){
    console.log(msg);
  })
  client.on('disconnect', function(){
    tweety.end();
  })
});