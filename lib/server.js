var http = require('http'),
      sys = require('sys'),
      io = require('socket.io'),
      static = require('node-static'),
      oauth  = require('./oauth'),
      twitterClient = require('./twitter-stream-client');

var key = process.ARGV[2];
var secret = process.ARGV[3];
if(!key || !secret) {
  sys.error("USAGE node process.js KEY SECRET");
  process.exit();
}

var file = new(static.Server)('../public', { cache: 0 });

var server = http.createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
});
server.listen(8888);

var socket = io.listen(server);

var clients = {};

var dummies = [
  '{"text":"@fearphage sitll missing the point. if MS makes the OS, and IE is the default browser, advertising MS products to that person is decent bet.","geo":null,"retweet_count":null,"truncated":false,"in_reply_to_user_id":8749632,"created_at":"Tue Aug 24 19:21:18 +0000 2010","coordinates":null,"in_reply_to_status_id":22024527110,"source":"web","retweeted":false,"favorited":false,"place":null,"user":{"profile_use_background_image":true,"location":"Austin TX","geo_enabled":false,"friends_count":364,"profile_link_color":"2FC2EF","verified":false,"notifications":null,"follow_request_sent":null,"favourites_count":11,"created_at":"Fri Oct 10 17:27:28 +0000 2008","profile_sidebar_fill_color":"252429","profile_image_url":"http://a1.twimg.com/profile_images/251788021/getify-logo_normal.gif","description":"Getify Solutions. JavaScript, or I\'m bored by it. -- warning: i prematurely optimize, so deal with it.","url":"http://blog.getify.com","time_zone":"Central Time (US & Canada)","profile_sidebar_border_color":"181A1E","screen_name":"getify","lang":"en","listed_count":148,"following":null,"profile_background_image_url":"http://s.twimg.com/a/1281738360/images/themes/theme9/bg.gif","protected":false,"statuses_count":8141,"profile_background_color":"1A1B1F","name":"Kyle Simpson","show_all_inline_media":false,"profile_background_tile":false,"id":16686076,"contributors_enabled":false,"utc_offset":-21600,"profile_text_color":"666666","followers_count":854},"id":22024650484,"contributors":null,"in_reply_to_screen_name":"fearphage"}',
  '{"text":"@unscriptable CVC is a pattern, not a framework. but my *code* could kick your code\'s butt without even entering the ring. :) lol.","geo":null,"retweet_count":null,"truncated":false,"in_reply_to_user_id":15899501,"created_at":"Tue Aug 24 18:59:27 +0000 2010","coordinates":null,"in_reply_to_status_id":22023145153,"source":"web","retweeted":false,"favorited":false,"place":null,"user":{"profile_use_background_image":true,"location":"Austin TX","geo_enabled":false,"friends_count":364,"profile_link_color":"2FC2EF","verified":false,"notifications":null,"follow_request_sent":null,"favourites_count":11,"created_at":"Fri Oct 10 17:27:28 +0000 2008","profile_sidebar_fill_color":"252429","profile_image_url":"http://a1.twimg.com/profile_images/251788021/getify-logo_normal.gif","description":"Getify Solutions. JavaScript, or I\'m bored by it. -- warning: i prematurely optimize, so deal with it.","url":"http://blog.getify.com","time_zone":"Central Time (US & Canada)","profile_sidebar_border_color":"181A1E","screen_name":"getify","lang":"en","listed_count":148,"following":null,"profile_background_image_url":"http://s.twimg.com/a/1282351897/images/themes/theme9/bg.gif","protected":false,"statuses_count":8132,"profile_background_color":"1A1B1F","name":"Kyle Simpson","show_all_inline_media":false,"profile_background_tile":false,"id":16686076,"contributors_enabled":false,"utc_offset":-21600,"profile_text_color":"666666","followers_count":854},"id":22023322662,"contributors":null,"in_reply_to_screen_name":"unscriptable"}'
];

socket.on('connection', function(client){
  console.log("Connection");
  
  oauth.request(key, secret, function (error, url, cont) {
    if(error) {
      console.log(error);
      throw error;
    } else {
      setTimeout(function () {
        cont(function (error, requester) {
          if(error) {
            console.log(error);
            throw error;
          } else {
            var tweety = twitterClient.connect(requester, function (err, data) {
              console.log("Stream response "+err+data)
              if(err) {
                console.log(err);
                client.send(JSON.stringify(err))
              } else {
                dummies.push(data);
                client.send(JSON.stringify({
                  tweet: data
                }));
                console.log(data);
              }
            });
          }
        })
      }, 20000)
    }
  });
  
  /*setInterval(function () {var data = dummies[Math.floor(dummies.length * Math.random())];
    console.log("Mock "+data)
    client.send(JSON.stringify({
      tweet: data
    }))
  }, 2000)*/
  
  client.send(JSON.stringify("hello world"));
  
  client.on('message', function(msg){
    console.log(msg);
  })
  client.on('disconnect', function(){
    tweety.end();
  })
});
