var streamClient = require('./twitter-stream-client'),
    queue        = require('./message-queue'),
    config       = require('./config').config,
    oauth  = require('./oauth');

var SiteURL = "https://sitestream.twitter.com/2b/site.json";
var UserURL = "https://userstream.twitter.com/2/user.json?include_entities=true";

var StandardTimeBetweenConnectTries = 500;

/* 
  Implements a SiteStream based backend connection.
*/
function SiteStreamConnection(requester) {
  var self = this;
  this.requester   = requester;
  this.users       = [];
  this.connections = [];
  this.lastGroup   = 0;
  this.newUsers    = 0;
  this.shouldConnect = false;
  this.busy          = false;
  this.connectCount  = 0;
  
  this.timeBetweenTries = StandardTimeBetweenConnectTries;
  
  // we try connecting every n milli seconds. On errors n is always doubled.
  function interval() {
    setTimeout(function () {
      self._connect();
      interval();
    }, self.timeBetweenTries); // we cannot use setInterval because we need to change the time all the time.
  }
  interval();
}

// Connect to the stream. Call this if there might be a need to reconnect.
SiteStreamConnection.prototype.connect = function () {
  this.shouldConnect = true; // sets a flag so that on the next interval we actually do something
}

// The actual internal connect code
SiteStreamConnection.prototype._connect = function () {
  // nothing to do
  if(!this.shouldConnect) {
    return
  }
  // we are busy. With SiteStreams we only do one connection at a time.
  if(this.busy) {
    return;
  }
  this.shouldConnect = false;
  console.log("[SiteStream] connect");
  var self  = this;
  var count = 0;
  
  // devide users into groups of 1000 (see limitations of SiteStream API)
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
  
  // Connect each part
  console.log("[SiteStream] users: "+this.users+" parts: "+parts.length);
  count = 0;
  parts.forEach(function (users) {
    var group = count++;
    var lastConnection = self.connections[group];
    
    var follow = users.join();
    var url    = SiteURL + "?include_entities=true&with=followings&follow="+encodeURIComponent(follow);
    var initial = true;
    console.log("[SiteStream] connecting to url "+url);
    self.busy = true;
    var connection = streamClient.connect(url, self.requester, function (err, data) {
      self.busy = false;
      if(err) {
        open = false;
        console.log("[SiteStream] connection error: "+err);
        connection.reconnect   = true;
        self.timeBetweenTries *= 2;
        self.connect(); // reconnect after every error
      } else {
        if(initial) {
          self.timeBetweenTries = StandardTimeBetweenConnectTries;
          if(lastConnection) {
            console.log("[SiteStream] closing old connection "+lastConnection.id);
            lastConnection.end(); // close old connection
            lastConnection = null;
          }
          inital = false;
        }
       
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
            console.log("[SiteStream] processed data for "+userID +" connection "+connection.id);
            queue.publish("stream-"+userID, payload);
          }
        }
      }
    });
    connection.id = self.connectCount++;
    self.connections[group] = connection;
  });
}

SiteStreamConnection.prototype.addUser = function (id, requester) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
    this.newUsers++;
    console.log("Added user "+this.users);
    this.connect();
  }
}

/* 
  User Stream shim for SiteStream API.
  This is used when the site streams are not available.
  DO NOT use this in production. It helps in testing when you do not have access to 
  the site stream API which is only available for priviledged users.
*/
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
  if(siteStreamConnection) {
    cb(siteStreamConnection);
  }
  // Fallback to user streams
  if(!config.siteStreamOAuthToken) {
    cb(userStreamConnection);
  }
}

// If site streams are configured, set them up
if(config.siteStreamOAuthToken) {
  oauth.reuse(config.oauthKey, config.oauthSecret, config.siteStreamOAuthToken, function (err, requester, info) {
    console.log("Connecting as "+JSON.stringify(info));
    var connection = new SiteStreamConnection(requester);
    siteStreamConnection = connection;
    console.log("Initial site stream setup instance");
  })
}

// Subscribe to events for a userID. subscriptionCB is called for each event.
// To support the userStream fallback pass in the requester function
exports.subscribe = function (userID, subscriptionCB, requester) {
  getConnection(function (connection) {
    connection.addUser(userID, requester);
  });
  return queue.subscribe(["stream-"+userID], subscriptionCB);
}