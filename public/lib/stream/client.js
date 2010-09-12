/*
 * The actual web socket connection code using Socket.IO http://socket.io/
 */

require.def("stream/client",
  ["stream/tweetstream", "stream/tweet", "ext/cookie.js"], // socket.io is loaded from the page
  function(tweetstream, tweetModule) {
    
    var transports             = ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling'];
    var convervativeTransports = ['xhr-polling']; // xhr-polling should work even through the most evil proxies
    
    var connectFail  = 0;  // actual failed connects since last successfull connect
    var connectCount = 0;
    var streamFailCount = 0;
    var pingTimeout;
    var interval;
    
    // Pick the right transport. Socket.IO does this for us, but if there are problems
    // we fall back not to use websockets
    function pickTransport() {
      if(connectCount++ == 1 && connectFail == 1) { // first try failed, falling back
        console.log("[Connect] Conservative transport after initial connect fail");
        return convervativeTransports;
      }
      if(connectFail > 1) { // more than one failed connect without a successful ping
        console.log("[Connect] Conservative transport after fail "+connectFail);
        return convervativeTransports;
      }
      return transports;
    }
    
    function connect (cb) {
      io.setPath('/ext/socket.io/');
      window.WEB_SOCKET_SWF_LOCATION = "/foobar"; // we do not use flash, but socket.io still complaints
      var socket = new io.Socket(location.hostname, { 
        port: location.port || 80,
        transports: pickTransport()
      });
      socket.connect();
      var token = cookie.get("token") || "EMPTY"; // init auth token from cookie. Backend like to receive a value so we use "EMPTY"
      // immediately after connect, send the auth token
      socket.send(JSON.stringify({
        token: token
      }));
      socket.on('message', cb); // send all messages to our callback
      
      var failed    = false;
      var connected = true;
      socket.on('message', function (msg) {
        if(failed) {
          console.log("[Backend] Ignoring messages after fail "+msg)
          return;
        }
        var data = JSON.parse(msg);
        if(data == "pong") {
          connectFail = -1; // we have a successful connection
          connected = true;
        }
        else if(data.streamError) {
          failed = true;
          console.log("[Backend] Stream error "+data.streamError)
          // We have an error on the backend connection to twitter.
          // Wait a short time and then reconnect.
          setTimeout(function () {
            if(pingTimeout) {
              clearTimeout(pingTimeout);
            }
            clearInterval(interval);
            socket.disconnect(); // just making sure
            console.log("[Connect] Reconnecting after stream error "+streamFailCount);
            connect(cb);
          }, 1000 * (++streamFailCount))
        }
      });
      
      function ping() { // send a ping every N seconds
        connected = false;
        socket.send(JSON.stringify('ping'));
        if(pingTimeout) {
          clearTimeout(pingTimeout);
        }
        pingTimeout = setTimeout(function () { // if within 3 seconds there was no pong we assume the socket is gone and reconnect
          if(!connected) {
            clearInterval(interval);
            connectFail++;
            socket.disconnect(); // just making sure
            console.log("[Connect] Reconnecting after connection failure");
            connect(cb);
          }
        }, 3000)
      }
      
      if(interval) {
        clearInterval(interval);
      }
      interval = setInterval(ping, 5000);
      ping();
      
      return socket;
    }
    
    return {
      connect: connect
    }
  }
);