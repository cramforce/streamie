require.def("stream/tweetstream",
  ["stream/tweet"],
  function(tweetModule) {
      
    function Stream() {
      this.plugins = [];
    }
    
    Stream.prototype = {
      addPlugins: function (plugins) {
        this.plugins.push.apply(this.plugins, plugins);
      },
      
      canvas: function () {
        return $("#canvas")
      },
      
      process: function (tweet) {
        var self = this;
        var i = 0;
        function next () {
          var plugin = self.plugins[i++];
          if(plugin) {
            plugin.func.call(next, tweet, self)
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