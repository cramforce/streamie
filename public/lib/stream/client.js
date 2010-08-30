/*
 * The actual web socket connection code using Socket.IO http://socket.io/
 */

require.def("stream/client",
  ["stream/tweetstream", "stream/tweet", "ext/cookie.js"], // socket.io is loaded from the page
  function(tweetstream, tweetModule) {
    
    function connect (cb) {
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
      
      var connected = true;
      socket.on('message', function (msg) {
        if(JSON.parse(msg) == "pong") {
          connected = true;
        }
      })
      
      var interval = setInterval(function () { // send a ping every N seconds
        connected = false;
        socket.send(JSON.stringify('ping'));
        setTimeout(function () { // if within 3 seconds there was no pong we assume the socket is gone and reconnect
          if(!connected) {
            clearInterval(interval);
            socket.disconnect(); // just making sure
            console.log("Reconnecting");
            connect(cb);
          }
        }, 3000)
      }, 5000);
      
      return socket;
    }
    
    return {
      connect: connect
    }
  }
);