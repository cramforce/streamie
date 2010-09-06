/*
 * Class reprensenting the stream of tweets
 */

require.def("stream/tweetstream",
  ["stream/tweet", "stream/twitterRestAPI"],
  function(tweetModule, rest) {
      
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
      
      // sets or returns the newest tweet ever seen
      newestTweet: function (newID) {
        if(newID) {
          window.localStorage.newestTweet = newID
        }
        return parseInt(window.localStorage.newestTweet || 0, 10);
      },
      
      // this is where we draw
      canvas: function () {
        return $("#stream")
      },
      
      // Get the full info for the current user. See http://apiwiki.twitter.com/Twitter-REST-API-Method:-users%C2%A0show
      // the callback "cb" will receive the data. The API call is cache after the first call
      userInfo: function (cb) {
        if(this.__userInfo) {
          var user = this.__userInfo;
          setTimeout(function () {
            cb(user)
          }, 0)
        }
        rest.get("/1/users/show.json?id="+this.user.user_id, function (user, status) {
          if(status == "success") {
            this.__userInfo = user;
            cb(user);
          } else {
            console.log("Fetching user data failed")
          }
        });
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
            plugin.func.displayName = plugin.name;
            plugin.func.call(next, tweet, self, plugin)
          }
        }
        next();
      },
      
      count: 0 // count is incremented in the streamplugin/tweetsOnly
    };
    
    return {
      Stream: Stream
    }
      
  }
);