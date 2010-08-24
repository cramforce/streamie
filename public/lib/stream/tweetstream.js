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
        for(var i = 0, len = this.plugins.length; i < len; ++i) {
          var plugin = this.plugins[i];
          var cont = plugin.func.call(plugin, tweet, this);
          if(cont === false) {
            return null;
          }
        }
        
        return tweet;
      }
    };
    
    return {
      Stream: Stream
    }
      
  }
);