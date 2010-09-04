/*
 * Class reprensenting the stream of tweets
 */

require.def("stream/tweetstream",
  ["stream/tweet"],
  function(tweetModule) {
      
    function Stream(settings) {
      this.settings    = settings; // settings for streamie
      this.plugins     = []; // I have a set of plugins for transforming tweets
      this.linkPlugins = []; // A set of plugins for tranforming links in tweets
    }
    
    Stream.prototype = {
      
      user: { // the current authorized user
        screen_name: null, // will be populated after auth
        user_id: null
      },
      
      // register more plugins for stream processing
      addPlugins: function (plugins) {
        this.plugins.push.apply(this.plugins, plugins);
      },
      
      // register more plugins for link processing
      addLinkPlugins: function (plugins) {
        this.linkPlugins.push.apply(this.linkPlugins, plugins);
      },
      
      // this is where we draw
      canvas: function () {
        return $("#stream")
      },
      
      // go through the list of plugins for a tweet.
      // Each plugin will get the next plugin as its this
      // You need to call this: this()
      // to go to the next plugin. Do not forget this unless you want to end processing
      // This callback mechanism allows you to to asynchronous (think Ajax or animations) things while processing a tweet
      // tweet is mutable. You can do stuff with it :)
      process: function (tweet) {
        var self = this;
        var i = 0;
        function next () {
          var plugin = self.plugins[i++];
          if(plugin) {
            plugin.func.call(next, tweet, self, plugin)
          }
        }
        next();
      }
    };
    
    return {
      Stream: Stream
    }
      
  }
);