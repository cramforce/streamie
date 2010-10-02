var streamClient = require('./twitter-stream-client');

var URL = "https://betastream.twitter.com/2/site.json";


function Connection(requester) {
  this.requester = requester;
  this.users     = ["183992483", "15534471"];
}

Connection.prototype.connect = function () {
  
  var url = URL + "?with=followings&follow="+encodeURIComponent(this.users.join(","));
  
  var connection = streamClient.connect(url, this.requester, function (err, data) {
    console.log("Site Stream response "+err+data)
    if(err) {
      open = false;
      console.log(err);
      if(!err.connection == "close") {
        connection.end();
      }
    } else {
      console.log(data);
    }
  });
  
  this.connection = connection;
}

Connection.prototype.addUser = function (id) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
  }
  if(this.connection) {
    this.connection.end();
  }
  this.connect();
}


exports.Connection = Connection;