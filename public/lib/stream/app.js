/*
 * Main entry point for our app
 * "start" method gets called by require.js when the initial dependencies are loaded.
 * We always have require.js, jQuery and underscore.js everwhere
 */

// we really do not want to break if somebody leaves a console.log in the code
if(typeof console == "undefined") {
  var console = {
    log: function () {},
    error: function () {}
  }
}
require.def("stream/app",
  ["stream/tweetstream", "stream/tweet", "stream/streamplugins", "stream/initplugins", "stream/client", "stream/status", "/ext/underscore.js", "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"],
  function(tweetstream, tweetModule, streamPlugin, initPlugin, client, status) {
    
    // Stream plugins are called in the order defined here for each incoming tweet.
    // Important: Stream plugins have to call this() to continue the execution!
    // They receive two paramters. The tweet which is an instance of stream/tweet.Tweet
    // and the stream which is an instance of stream/tweetstream.Stream.
    var streamPlugins = [
      streamPlugin.handleRetweet,
      streamPlugin.tweetsOnly,
      streamPlugin.mentions,
      streamPlugin.template,
      streamPlugin.htmlEncode,
      streamPlugin.formatTweetText,
      streamPlugin.renderTemplate, 
      streamPlugin.prepend,
      streamPlugin.keepScrollState,
      streamPlugin.age,
      streamPlugin.newTweetEvent
    ];
    
    // initPlugins are loaded when the page is loaded and the backend web socket connection has been established
    // and the stream connection to Twitter was established without authorization problems
    var initPlugins = [
      initPlugin.prefillTimeline,
      initPlugin.hashState,
      initPlugin.navigation,
      initPlugin.signalNewTweets,
      initPlugin.personalizeForCurrentUser,
      initPlugin.notifyAfterPause,
      initPlugin.keyboardShortCuts,
      status.observe,
      status.replyForm,
      status.location,
      status.quote,
      status.retweet,
      status.favorite,
      status.showJSON
    ];
    
    var stream = new tweetstream.Stream();
    window.stream = stream; // make this globally accessible so we can see what is in it.
    
    var initial = true;
    
    return {
      start: function () {
        $(function () {
          stream.addPlugins(streamPlugins);
          
          // connect to the backend system
          var connect = function(data) {
            data = JSON.parse(data); // data must always be JSON
            if(data.error) {
              //console.log("Error: "+data.error)
              if(data.error == "no_auth") {
                if(confirm("Streamie.org is a Twitter client. We'll send you to Twitter to ask for access to your account now. OK?")) {
                  location.href = "/access" // redirect to do oauth
                } else {
                  // No where else to go. Patches welcome;
                  location.href = "http://www.nonblocking.io/2010/08/future-is-here-i-just-forked-running.html";
                }
              }
            }
            else if(data.action == "auth_ok") {
              // we are now connected and authorization was fine
              stream.user = data.info; // store the info of the logged user
              if(initial) {
                initial = false;
                // run initPlugins
                initPlugins.forEach(function (plugin) {
                  plugin.func.call(function () {}, stream);
                })
              }
            }
            else if(data.tweet) {
              // We actually received a tweet. Let the stream process it
              stream.process(tweetModule.make(JSON.parse(data.tweet)));
            }
            else {
              // dunno what to do here
              if(data != "pong") {
                console.log(data);
              }
            }
          };
          var socket = client.connect(connect);
        })
      }
    }
  }
);