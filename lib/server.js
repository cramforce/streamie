var http = require('http'),
      sys = require('sys'),
      io = require('socket.io'),
      static = require('node-static'),
      httpProxy = require('http-proxy'),
      oauth  = require('./oauth'),
      sha1   = require('./sha1'),
      twitterClient = require('./twitter-stream-client'),
      twitterProxy  = require('./twitter-rest-proxy'),
      stats = require('./stats');


// change this to a configuration file
var host = process.ARGV[2];
var key = process.ARGV[3];
var secret = process.ARGV[4];
var port = parseInt(process.ARGV[5], 10) || 8888;
var IMGUR_KEY = process.ARGV[6];
if(!host || !key || !secret) {
  sys.error("USAGE node process.js HOST(optional incl. portnumer for non-80) KEY SECRET PORT [imgur.com key]");
  process.exit();
}

// the static file server
var file = new(static.Server)('../public', { cache: 0 });

var Token = {}; // Temp store for Tokens. TODO: Make this not a memory leak and scale to multiple nodes
var TransferURL = {};

var server = http.createServer(function (request, response) {
  function respondError(error) {
    console.log(error);
    response.writeHead(501, {
      'Content-Type': "text/plain"
    });
    response.end(error);
  }
  
  function getTwitterApiClient(cb) {
    var match = (request.headers.cookie || "").match(/token=([^;]+)/)
    if(!match) {
      return respondError("Cant find access token cookie in "+request.headers.cookie)
    }
    console.log("Token "+match[1]);
    var token = match[1];
    
    oauth.reuse(key, secret, token, function (err, requester) {
      if(err) {
        respondError("no_auth")
      } else {
        cb(err, requester);
      }
    });
  }
  
  // Please somebody put in a middleware/router thing!
  var url = require('url').parse(request.url, true);
  console.log(JSON.stringify(request.headers))
  
  // /access
  // Prepare oauth negotiation and send user to Twitter
  if(url.pathname.match(/^\/access$/)) {
    var otherhost = request.headers.host;
    
    var re = new RegExp(host+"$"); // only allow hosts that are sub domains of the host name from the command line
    var targetHost = host;
    if(otherhost.match(re)) {
      targetHost = otherhost;
    }
    var oauth_callback_url = "http://"+host+"/oauth_callback?host="+targetHost;
    oauth.request(key, secret, oauth_callback_url, function (error, token, url, cont) {

      if(error) {
        respondError(error);
      } else {
        
        var temp = sha1.HMACSHA1(token,""+Math.random());
        TransferURL[temp] = {
          url: url,
          host: targetHost
        };

        var transferURL = "http://"+host+"/transfer?token="+encodeURIComponent(temp);
        console.log("Transfer via "+transferURL)
        
        console.log("oauth step 1 success");
        Token[token] = cont;
        response.writeHead(302, { // onto Twitter
          'Location': transferURL
        });
        response.end()
      }
    })
  }
  
  // /transfer
  // ...
  else if(url.pathname.match(/^\/transfer/)) {
    var otherhost = request.headers.host; // Cannot be overriden in Ajax. See http://www.w3.org/TR/2006/WD-XMLHttpRequest-20060405/#dfn-setrequestheader
    
    // only allow requests to the main host set via command line
    if(host != otherhost) {
      return respondError("Illegal host");
    }
    
    var transfer = url.query.token;
    
    if(!transfer) {
      return respondError("Cant find transfer token "+transfer);
    }
    
    var info = TransferURL[transfer];
    if(!info) {
      return respondError("Cant find transfer url "+transfer);
    }
    
    if(info.host == host) {
      response.writeHead(302, { // onto Twitter
        'Location': info.url
      });
      response.end()
      return
    }
    
    response.writeHead(200, { // onto Twitter
      'Content-Type': "text/html"
    });
    response.end('<html>The Streamie client <b>'+info.host+'</b> wants to access your Twitter account.</b><br>'+
    '<form><input type="button" value="Cancel" onclick="location=\'http://www.google.com\'"><input type="button" value="OK" onclick="location=\''+info.url+'\'"></form></html>')
  }
  
  // /oauth_callback
  // Handle response from Twitter after user allowed us
  // After success send user to /oauth_transfer to allow muliple sub domains
  else if(url.pathname.match(/^\/oauth_callback/)) {
    console.log(JSON.stringify(Token));
    var token = url.query.oauth_token;
    var oauth_token_verifier = url.query.oauth_verifier;
    var cont = Token[token];
    if(!cont) {
      respondError("Cannot find token "+token)
    } else {
      console.log("oauth step 2 success");
      cont(oauth_token_verifier, function (error, requester) {
        if(error) {
          respondError(error);
          console.log(error);
        } else {
          console.log("oauth step 3 success");
          var target = "http://"+url.query.host+"/oauth_transfer?oauth_token="+url.query.oauth_token;
          response.writeHead(302, {
            'Location': target
          });
          response.end()
        }
      })
    }
  }
  
  // /oauth_transfer
  // set oauth token cookie and send user to homepage
  else if(url.pathname.match(/^\/oauth_transfer/)) {
    response.writeHead(302, {
      'Location': "/",
      'Set-Cookie': "token="+url.query.oauth_token+"; expires=Fri, 31-Jul-2011 23:59:59 GMT;" // TODO make this dynamic
    });
    response.end()
  }
  
  // /twitter
  // Twitter REST API proxy
  else if(url.pathname.match(/^\/twitter/)) {
    request.url = request.url.replace(/^\/twitter/, ""); // now proxy make request to sub dir
    console.log("Twitter API call" + request.url);
    
    var generic = request.url.replace(/\d+/g, "").replace(/\?.*/, "").replace(/\.\w+$/, "");
    stats.inc(generic);
    
    var data = [];
    request.on("data", function (chunk) {
      data.push(chunk.toString('ascii')); // no support for streaming request bodies!
    });
    
    request.on("end", function () {
      getTwitterApiClient(function (err, requester) {
        console.log("Proxying API call "+request.url);
        twitterProxy.proxy(requester, request, response, data.join(""))
      });
    })
  } 
  
  // /imgur
  // imgur.com REST API -> simple proxy
  else if(url.pathname.match(/^\/imgur/)) {
    // we do this to autorize the user to be a valid twitter user
    var proxy = new httpProxy.HttpProxy(request, response);
    getTwitterApiClient(function (err, requester) {
      if(!err) {
        console.log("Onto imgur...");
        request.url = request.url.replace(/^\/imgur/, ""); // now proxy make request to sub dir
        stats.inc(request.url);
        request.url+="?key="+IMGUR_KEY; // pass the key via query string
        var domain = "api.imgur.com"; // change the host header
        request.headers.host = domain;
        delete request.headers.cookie; // we do not want to pass on session secrets
        proxy.proxyRequest(80, domain, request, response);
      }
    });
  }
  
  // All other requests
  else {
    var curhost = request.headers.host;
    var sub  = curhost.match(/(.*)\..*\..*/);
    if(sub) { // Requests to sub domains
      // Proxy static requests to the github page of the user of the same name as the sub domain
      sub = sub[1];
      var domain  = sub+".github.com"
      request.url = "/streamie/public" + request.url;
      request.headers.host = domain;
      console.log("Proxy to http://"+domain+request.url);
	    var proxy = new httpProxy.HttpProxy(request, response);
	    proxy.proxyRequest(80, domain, request, response);
    } 
    // serve from the local disk
    else {
      console.log("Static" +url.pathname);
      request.addListener('end', function () {
        file.serve(request, response);
      });
    }
  }
});
server.listen(port);

var socket = io.listen(server);

var clients = {};

var dummies = [
  '{"text":"@fearphage sitll missing the point. if MS makes the OS, and IE is the default browser, advertising MS products to that person is decent bet.","geo":null,"retweet_count":null,"truncated":false,"in_reply_to_user_id":8749632,"created_at":"Tue Aug 24 19:21:18 +0000 2010","coordinates":null,"in_reply_to_status_id":22024527110,"source":"web","retweeted":false,"favorited":false,"place":null,"user":{"profile_use_background_image":true,"location":"Austin TX","geo_enabled":false,"friends_count":364,"profile_link_color":"2FC2EF","verified":false,"notifications":null,"follow_request_sent":null,"favourites_count":11,"created_at":"Fri Oct 10 17:27:28 +0000 2008","profile_sidebar_fill_color":"252429","profile_image_url":"http://a1.twimg.com/profile_images/251788021/getify-logo_normal.gif","description":"Getify Solutions. JavaScript, or I\'m bored by it. -- warning: i prematurely optimize, so deal with it.","url":"http://blog.getify.com","time_zone":"Central Time (US & Canada)","profile_sidebar_border_color":"181A1E","screen_name":"getify","lang":"en","listed_count":148,"following":null,"profile_background_image_url":"http://s.twimg.com/a/1281738360/images/themes/theme9/bg.gif","protected":false,"statuses_count":8141,"profile_background_color":"1A1B1F","name":"Kyle Simpson","show_all_inline_media":false,"profile_background_tile":false,"id":16686076,"contributors_enabled":false,"utc_offset":-21600,"profile_text_color":"666666","followers_count":854},"id":22024650484,"contributors":null,"in_reply_to_screen_name":"fearphage"}',
  '{"text":"@unscriptable CVC is a pattern, not a framework. but my *code* could kick your code\'s butt without even entering the ring. :) lol.","geo":null,"retweet_count":null,"truncated":false,"in_reply_to_user_id":15899501,"created_at":"Tue Aug 24 18:59:27 +0000 2010","coordinates":null,"in_reply_to_status_id":22023145153,"source":"web","retweeted":false,"favorited":false,"place":null,"user":{"profile_use_background_image":true,"location":"Austin TX","geo_enabled":false,"friends_count":364,"profile_link_color":"2FC2EF","verified":false,"notifications":null,"follow_request_sent":null,"favourites_count":11,"created_at":"Fri Oct 10 17:27:28 +0000 2008","profile_sidebar_fill_color":"252429","profile_image_url":"http://a1.twimg.com/profile_images/251788021/getify-logo_normal.gif","description":"Getify Solutions. JavaScript, or I\'m bored by it. -- warning: i prematurely optimize, so deal with it.","url":"http://blog.getify.com","time_zone":"Central Time (US & Canada)","profile_sidebar_border_color":"181A1E","screen_name":"getify","lang":"en","listed_count":148,"following":null,"profile_background_image_url":"http://s.twimg.com/a/1282351897/images/themes/theme9/bg.gif","protected":false,"statuses_count":8132,"profile_background_color":"1A1B1F","name":"Kyle Simpson","show_all_inline_media":false,"profile_background_tile":false,"id":16686076,"contributors_enabled":false,"utc_offset":-21600,"profile_text_color":"666666","followers_count":854},"id":22023322662,"contributors":null,"in_reply_to_screen_name":"unscriptable"}'
];


function now() {
  return (new Date).getTime();
}

// On Socket.io connections
socket.on('connection', function(client){
  console.log("Connection");
  
  var tweety, interval;
  
  // We always send JSON
  function send(data) {
    client.send(JSON.stringify(data))
  }
  
  var last = now();
  
  client.on('message', function(msg){
    var data = JSON.parse(msg);
    last = now();
    
    if(data == "ping") {
      send("pong")
    }
    else if(data.token) { // only interested in messages with tokens
      
      // try to find the token in the databse and reuse the credentials
      oauth.reuse(key, secret, data.token, function (err, requester, info) {
        if(err) {
          console.log("Cant find "+data.token+": "+err);
          // we need a new auth from the client
          send({
            error: "no_auth"
          });
        } else {
          // all good, lets go
          send({
            action: "auth_ok",
            info: info
          })
          
          var open = true;
          
          interval = setInterval(function () {
            if(now() - last > 10000) {
              clearInterval(interval)
              if(tweety && open) {
                console.log("Client Connection Timeout. Close Stream")
                tweety.end();
              }
            }
          }, 10000)
          
          // connect to backend twitter stream
          tweety = twitterClient.connect(requester, function (err, data) {
            console.log("Stream response "+err+data)
            if(err) {
              open = false;
              console.log(err);
              send({
                streamError: err
              });
              if(!err.connection == "close") {
                tweety.end();
              }
            } else {
              dummies.push(data);
              send({
                tweet: data
              });
              console.log(data);
            }
          });
        }
      });
    }
  })
  
  // send testing data
  /*setInterval(function () {var data = dummies[Math.floor(dummies.length * Math.random())];
    console.log("Mock "+data)
    client.send(JSON.stringify({
      tweet: data
    }))
  }, 2000);*/
  
  client.send(JSON.stringify("hello world"));
  
  stats.inc("con");
  client.on('disconnect', function(){
    stats.dec("con");
    if(interval) {
      clearInterval(interval);
    }
    if(tweety) {
      tweety.end();
    }
  })
});
