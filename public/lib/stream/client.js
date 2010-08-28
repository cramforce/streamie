/*
 * The actual web socket connection code using Socket.IO http://socket.io/
 */

require.def("stream/client",
  ["stream/tweetstream", "stream/tweet", "ext/cookie.js"], // socket.io is loaded from the page
  function(tweetstream, tweetModule) {
    
    return {
      connect: function (cb) {
        io.setPath('/ext/socket.io/');
        var socket = new io.Socket(location.hostname, { 
          port: location.port || 80,
          transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
        });
        socket.connect();
        var token = cookie.get("token") || "EMPTY"; // init auth token from cookie. Backend like to receive a value so we use "EMPTY"
        // immediately after connect, send the auth token
        socket.send(JSON.stringify({
          token: token
        }));
        socket.on('message', cb); // send all messages to our callback
        // TODO: auto reconnect when the connection is lost
        
        return {
          disconnect: function () { throw "unimplemented" } // probably unneeded anyway. Browsers does it for us
        }
      }
    }
  }
);