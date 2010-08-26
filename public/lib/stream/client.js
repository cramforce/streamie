require.def("stream/client",
  ["stream/tweetstream", "stream/tweet"],
  function(tweetstream, tweetModule) {
    
    return {
      connect: function (cb) {
        io.setPath('/ext/socket.io/');
        var socket = new io.Socket(location.hostname, { 
          port: location.port || 80,
          transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
        });
        socket.connect();
        var token = location.hash ? location.hash.substr(1) : "EMPTY";
        socket.send(JSON.stringify({
          token: token
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