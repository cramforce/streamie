var streamClient = require('./twitter-stream-client'),
    queue        = require('./message-queue'),
    config       = require('./config').config,
    oauth  = require('./oauth');

var SiteURL = "https://betastream.twitter.com/2b/site.json";
var UserURL = "https://userstream.twitter.com/2/user.json";

function SiteStreamConnection(requester) {
  this.requester   = requester;
  this.users       = ["183992483", "15534471"];
  this.connections = [];
  this.lastGroup   = 0;
  this.newUsers    = 0;
}

SiteStreamConnection.prototype.connect = function () {
  console.log("[SiteStream] connect");
  var self  = this;
  var count = 0;
  var parts = [[]];
  var group = 0;
  this.users.forEach(function (id) {
    if(count > 0 && count++ % 1000 == 0) {
      console.log("Making part")
      self.lastGroup = group;
      group++
      parts[group] = [];
    }
    parts[group].push(id);
  });
  console.log("users"+this.users+" parts "+parts.length);
  count = 0;
  parts.forEach(function (users) {
    var group = count++;
    var lastConnection = self.connections[group];
    if(parts[group].length < 1000) { // group is not full, new user is here
      if(lastConnection) {
        lastConnection.reconnect = true;
      }
    }
    if(lastConnection && !lastConnection.reconnect) {
      return;
    }
    
    var follow = users.join();
    var url    = SiteURL + "?with=followings&follow="+encodeURIComponent(follow);
    var initial = true;
    console.log("[SiteStream] connecting to url "+url);
    var connection = streamClient.connect(url, self.requester, function (err, data) {
      console.log("[SiteStream] response "+err+data)
      if(err) {
        open = false;
        console.log(err);
        if(connection.dispose) {
          connection.end();
        } else {
          connection.reconnect = true;
          //self.connect(users);
        }
      } else {
        if(initial) {
          if(lastConnection) {
            lastConnection.end(); // close old connection
          }
          inital = false;
        }
        console.log(data);
        try {
          var obj = JSON.parse(data);
        } catch(e) {
          console.log("[SiteStream] Error parsing json from "+data)
        }
        if(obj) {
          var userID  = obj.for_user;
          var payload = obj.message; // TODO check keys
          if(!userID) {
            console.log("[SiteStream] non user specific info "+data)
          } else {
            queue.publish("stream-"+userID, payload);
          }
        }
      }
    });
    self.connections[group] = connection;
  });
}

SiteStreamConnection.prototype.addUser = function (id, requester) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
    this.newUsers++;
  }
  this.connect();
}

function UserStreamConnection() {
  this.users     = [];
  this.conID = 0;
}

UserStreamConnection.prototype.addUser = function (id, requester) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
    var conID = this.conID++;
    var connection = streamClient.connect(UserURL, requester, function (err, data) {
      console.log("User Stream response "+err+data)
      if(err) {
        console.log(err);
        if(!err.connection == "close") {
          connection.end();
        }
        this.users = user.filter(function (u) {
          return u != id;
        })
      } else {
        try {
          var obj = JSON.parse(data);
        } catch(e) {
          console.log(""+e);
        }
        if(obj) {
          queue.publish("stream-"+id, obj)
        }
      }
    });
  } else {
    console.log("User already connected "+id + " "+this.users);
  }
}

var userStreamConnection = new UserStreamConnection();
var siteStreamConnection = null;

function getConnection(cb) {
  if(!config.siteStreamOAuthToken) {
    cb(userStreamConnection);
  }
  oauth.reuse(config.oauthKey, config.oauthSecret, config.siteStreamOAuthToken, function (err, requester, info) {
    if(err) {
      console.log("Error during site stream oAuth retrieval. Falling back to user streams");
      cb(userStreamConnection)
    }
    console.log("Connecting as "+JSON.stringify(info));
    var connection = new SiteStreamConnection(requester);
    connection.connect();
    console.log("Attempted connection to site stream");
    cb(connection);
  })
}

exports.subscribe = function (userID, subscriptionCB, requester) {
  getConnection(function (connection) {
    connection.addUser(userID, requester);
  });
  return queue.subscribe(["stream-"+userID], subscriptionCB);
}

exports.subscribe("15534471", function (message) {
  console.log("Got a message");
});