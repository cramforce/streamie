require.def("stream/app",
  ["stream/tweetstream", "stream/tweet", "stream/plugins", "stream/client", "/ext/underscore.js", "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"],
  function(tweetstream, tweetModule, basePlugins, client) {
    var plugins = [
      basePlugins.tweetsOnly, 
      basePlugins.template,
      basePlugins.htmlEncode,
      basePlugins.formatTweetText,
      basePlugins.renderTemplate, 
      basePlugins.prepend,
      basePlugins.keepScrollState,
      basePlugins.age
    ];
    
    var stream = new tweetstream.Stream();
    
    return {
      plugins: plugins,
      start: function () {
        $(function () {
          stream.addPlugins(plugins)
          client.connect(function(data) {
            data = JSON.parse(data);
            if(data.error) {
              console.log("Error: "+data.error)
              if(data.error == "no_auth") {
                location.href = "/access"
              }
            }
            else if(data.tweet) {
              stream.process(tweetModule.make(JSON.parse(data.tweet)));
            } else {
              //console.log(data);
            }
          });
        })
      }
    }
  }
);