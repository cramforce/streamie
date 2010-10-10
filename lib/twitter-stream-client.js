var sys = require('sys'),
    http = require('http');
    
var connections = [];
var conIndex = 0;

function listen(url, requester, cb) {
  var delim = /\n*\r\n*/;
  var buffer = "";
  
  var index = conIndex++;
  
  console.log("[Stream] connect to "+url);
  requester(url, "GET", function (error, request) {
    if(error) {
      console.log("[Stream] Connection Error "+error);
      cb({
        connection: "close"
      });
    }
    request.end();
    request.on('response', function (response) {
      console.log('STATUS: ' + response.statusCode);
      connections[index] = response;
      if(response.statusCode != 200) {
        cb({
          statusCode: response.statusCode
        });
      }
      console.log('[Stream] HEADERS: ' + JSON.stringify(response.headers));
      response.setEncoding('utf8');
    
      response.on('end', function () {
        connections[index] = null;
        cb({
          connection: "close"
        })
      })
    
      response.on('data', function (chunk) {
        //console.log(chunk);
        buffer += chunk;
        var parts = buffer.split(delim);
        var len   = parts.length;
        //console.log(len);
        //console.log(parts.join("XXXX"));
        if(len > 1) {
          buffer = parts[len-1];
          for(var i = 0, end = len - 1; i < end; ++i) {
            var entry = parts[i];
            if(entry !== "") {
              //console.log("Entry: '"+entry+"'");
              cb(null, entry);
            }
          }
        }
      });
    })
  });
  return {
    end: function () {
      var response = connections[index];
      if(response) {
        try {
          response.connection.destroy();
          console.log("[Stream] Closed connection "+index);
        } catch(e) {
          console.log("[Stream] Error ending connection "+e)
        }
      }
    }
  }
}

function managedListen(url, requester, cb) {
  
  var con = listen(url, requester, function (err, data) {
    if(err) {
      console.log("ERROR: "+JSON.stringify(err));
      if(err.statusCode) {
        if(err.statusCode == "401") {
          cb("Authorization failed")
        } else {
          cb(err)
          /*setTimeout(function () {
            console.log("Reconnect after error: "+err.statusCode)
            managedListen(cb)
          }, 5000)*/
        }
      } else if(err.connection == "close") {
        /*setTimeout(function () {
          console.log("Reconnect")
          managedListen(cb)
        }, 10000)*/
        cb(err)
      }
    } else {
      cb(null, data)
    }
  });
  
  return con;
}

exports.connect = managedListen;