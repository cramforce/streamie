var http = require('http'),
      sys = require('sys'),
      io = require('socket.io'),
      static = require('node-static'),
      httpProxy = require('http-proxy'),
      oauth  = require('./oauth'),
      twitterClient = require('./twitter-stream-client'),
      twitterProxy  = require('./twitter-rest-proxy');


var host = process.ARGV[2];
var key = process.ARGV[3];
var secret = process.ARGV[4];
var port = parseInt(process.ARGV[5], 10) || 8888;
if(!host || !key || !secret) {
  sys.error("USAGE node process.js HOST KEY SECRET PORT");
  process.exit();
}

var file = new(static.Server)('../public', { cache: 0 });

var Token = {};
var Requester = {};

var server = http.createServer(function (request, response) {
  function respondError(error) {
    console.log(error);
    response.writeHead(501, {
      'Content-Type': "text/plain"
    });
    response.end(error);
  }
  
  // please somebody put in a middleware/router thing!
  var url = require('url').parse(request.url, true);
  console.log(JSON.stringify(request.headers))
  if(url.pathname.match(/^\/access$/)) {
    var otherhost = request.headers.host;
    var re = new RegExp(host+"$");
    var targetHost = host;
    if(otherhost.match(re)) {
      targetHost = otherhost;
    }
    var oauth_callback_url = "http://"+host+"/oauth_callback?host="+targetHost;
    oauth.request(key, secret, oauth_callback_url, function (error, token, url, cont) {
      if(error) {
        respondError(error);
      } else {
        console.log("oauth step 1 success");
        Token[token] = cont;
        response.writeHead(302, {
          'Location': url
        });
        response.end()
      }
    })
  }
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
  else if(url.pathname.match(/^\/oauth_transfer/)) {
    response.writeHead(302, {
      'Location': "/",
      'Set-Cookie': "token="+url.query.oauth_token
    });
    response.end()
  }
  else if(url.pathname.match(/^\/twitter/)) {
    request.url = request.url.replace(/^\/twitter/, ""); // now proxy make request to sub dir
    console.log("Twitter API call" + request.url);
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
        console.log("Proxying API call "+request.url);
        twitterProxy.proxy(requester, request, response)
      }
    })
    
  } else {
    var curhost = request.headers.host;
    var sub  = curhost.match(/(.*)\..*\..*/);
    if(sub) {
      sub = sub[1];
      var domain  = sub+".github.com"
      request.url = "/twitter-stream-proxy/public" + request.url;
      request.headers.host = domain;
      console.log("Proxy to http://"+domain+request.url);
      var proxy = new httpProxy.HttpProxy;
      proxy.watch(request, response);
      proxy.proxyRequest(80, domain, request, response);
    } else {
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

socket.on('connection', function(client){
  console.log("Connection");
  
  var tweety;
  
  function send(data) {
    client.send(JSON.stringify(data))
  }
  
  client.on('message', function(msg){
    var data = JSON.parse(msg);
    if(data.token) {
      oauth.reuse(key, secret, data.token, function (err, requester, info) {
        if(err) {
          console.log("Cant find "+data.token+": "+err);
          send({
            error: "no_auth"
          });
        } else {
          send({
            action: "auth_ok",
            info: info
          })
          tweety = twitterClient.connect(requester, function (err, data) {
            console.log("Stream response "+err+data)
            if(err) {
              console.log(err);
              send(err)
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
  
  /*setInterval(function () {var data = dummies[Math.floor(dummies.length * Math.random())];
    console.log("Mock "+data)
    client.send(JSON.stringify({
      tweet: data
    }))
  }, 2000);*/
  
  client.send(JSON.stringify("hello world"));
  
  
  client.on('disconnect', function(){
    if(tweety) {
      tweety.end();
    }
  })
});
