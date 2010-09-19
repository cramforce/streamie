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
  ["stream/tweetstream", "stream/tweet", "stream/settings", "stream/streamplugins", "stream/initplugins", "stream/linkplugins", "stream/settingsDialog", "stream/client", "stream/status", "stream/tracking", "stream/modernizr", "/ext/underscore.js", "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"],
  function(tweetstream, tweetModule, settings, streamPlugin, initPlugin, linkPlugin, settingsDialog, client, status) {
    
    // Stream plugins are called in the order defined here for each incoming tweet.
    // Important: Stream plugins have to call this() to continue the execution!
    // They receive two paramters. The tweet which is an instance of stream/tweet.Tweet
    // and the stream which is an instance of stream/tweetstream.Stream.
    var streamPlugins = [
      streamPlugin.handleDirectMessage,
      streamPlugin.handleRetweet,
      streamPlugin.tweetsOnly,
      streamPlugin.everSeen,
      streamPlugin.avoidDuplicates,
      streamPlugin.conversations,
      streamPlugin.mentions,
      streamPlugin.template,
      streamPlugin.htmlEncode,
      streamPlugin.formatTweetText,
      streamPlugin.executeLinkPlugins,
      streamPlugin.renderTemplate,
      streamPlugin.age,
      streamPlugin.prepend,
      streamPlugin.keepScrollState,
      streamPlugin.newTweetEvent,
      streamPlugin.webkitNotify
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
      initPlugin.favicon,
      initPlugin.registerWebkitNotifications,
      initPlugin.throttableNotifactions,
      initPlugin.background,
      status.observe,
      status.mediaUpload,
      status.replyForm,
      status.location,
      status.quote,
      status.retweet,
      status.favorite,
      status.conversation,
      status.autocomplete,
      status.showJSON,
      settingsDialog.init
    ];
    
    // linkPlugins are executed for each link in a tweet
    // they perform actions such as previewing images or expading short URLs
    var linkPlugins = [
      linkPlugin.imagePreview
    ];
    
    var stream = new tweetstream.Stream(settings);
    window.streamie = stream; // make this globally accessible so we can see what is in it.
    
    var initial = true;
    
    return {
      start: function () {
        $(function () {
          stream.addPlugins(streamPlugins);
          stream.addLinkPlugins(linkPlugins);
          
          location.hash = ""; // start fresh, we dont maintain any important state
          
          // connect to the backend system
          var connect = function(data) {
            data = JSON.parse(data); // data must always be JSON
            if(data.error) {
              console.log(data.error);
            }
            else if(data.action == "auth_ok") {
              $("#about").hide();
              $("#header").show();
              $(document).bind("tweet:first", function () {
                $("#content .logo").hide();
              });
              // we are now connected and authorization was fine
              stream.user = data.info; // store the info of the logged user
              if(initial) {
                initial = false;
                // run initPlugins
                initPlugins.forEach(function (plugin) {
                  plugin.func.call(function () {}, stream, plugin);
                });
                $(document).trigger("streamie:init:complete");
              }
            }
            else if(data.tweet) {
              // We actually received a tweet. Let the stream process it
              var data = JSON.parse(data.tweet);
              if(data.direct_message) {
                data = data.direct_message;
              }
              stream.process(tweetModule.make(data));
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