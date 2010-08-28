if(typeof console == "undefined") {
  var console = {
    log: function () {}
  }
}
require.def("stream/app",
  ["stream/tweetstream", "stream/tweet", "stream/plugins", "stream/client", "stream/status", "/ext/underscore.js", "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"],
  function(tweetstream, tweetModule, basePlugins, client, status) {
    var plugins = [
      basePlugins.handleRetweet,
      basePlugins.tweetsOnly,
      basePlugins.mentions,
      basePlugins.template,
      basePlugins.htmlEncode,
      basePlugins.formatTweetText,
      basePlugins.renderTemplate, 
      basePlugins.prepend,
      basePlugins.keepScrollState,
      basePlugins.age
    ];
    
    var initPlugins = [
      basePlugins.prefillTimeline,
      basePlugins.hashState,
      basePlugins.navigation,
      status.observe,
      status.replyForm
    ];
    
    var stream = new tweetstream.Stream();
    window.stream = stream;
    
    var initial = true;
    
    return {
      plugins: plugins,
      start: function () {
        $(function () {
          stream.addPlugins(plugins)
          // get initial tweets
          client.connect(function(data) {
            data = JSON.parse(data);
            if(data.error) {
              //console.log("Error: "+data.error)
              if(data.error == "no_auth") {
                location.href = "/access"
              }
            }
            else if(data.action == "auth_ok") {
              stream.user = data.info;
              if(initial) {
                initial = false;
                initPlugins.forEach(function (plugin) {
                  plugin.func.call(function () {}, stream);
                })
              }
            }
            else if(data.tweet) {
              stream.process(tweetModule.make(JSON.parse(data.tweet)));
            } else {
              console.log(data);
            }
          });
        })
      }
    }
  }
);