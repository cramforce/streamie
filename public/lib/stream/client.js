require.def("stream/client",
  ["stream/tweetstream", "stream/tweet"],
  function(tweetstream, tweetModule) {
    
    return {
      connect: function (cb) {
        io.setPath('/ext/socket.io/');
        var socket = new io.Socket('localhost', { 
          port: 8888,
          transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
        });
        socket.connect();
        socket.send(JSON.stringify({
          token: location.hash.substr(1)
        }));
        socket.on('message', cb);
        // todo: auto reconnect
        
        return {
          disconnect: function () { throw "unimplemented" }
        }
      }
    }
  }
);