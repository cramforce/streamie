/*
 * List of built in plugins for initialization
 */

require.def("stream/initplugins",
  ["stream/tweet", "stream/twitterRestAPI", "stream/helpers", "text!../templates/tweet.ejs.html"],
  function(tweetModule, rest, helpers, templateText) {
    
    return {
      
      // when location.hash changes we set the hash to be the class of our HTML body
      hashState: {
        name: "hashState",
        func: function (stream) {
          function change() {
            var val = location.hash.replace(/^\#/, "");
            $("body").attr("class", val);
            $(document).trigger("state:"+val);
          }
          $(window).bind("hashchange", change); // who cares about old browsers?
          change();
        }
      },
      
      // make the clicked nav item "active"
      navigation: {
        name: "navigation",
        func: function (stream) {
          $("#header").delegate("#mainnav a", "click", function () {
            var a = $(this);
            a.closest("#mainnav").find("li").removeClass("active");
            a.closest("li").addClass("active")
          })
        }
      },
      
      // Use the REST API to load the users's friends timeline, mentions and friends's retweets into the stream
      prefillTimeline: {
        name: "prefillTimeline",
        func: function (stream) {
          var all = [];
          var returns = 0;
          var calls   = 3;
          var handle = function (tweets, status) {
            returns++;
            if(status == "success") {
              all = all.concat(tweets)
            };
            if(returns == 3) { // all three APIs returned, we can start drawing
              var seen = {};
              all = all.filter(function (tweet) { // filter out dupes
                var ret = !seen[tweet.id];
                seen[tweet.id] = true;
                tweet.prefill = true; // tweet is from the prefill
                return ret;
              });
              all = _(all).sortBy(function (tweet) { // sort tweets from all 3 API calls
                return (new Date(tweet.created_at)).getTime();
              });
              all.forEach(function (tweet) { // process tweets into the stream
                stream.process(tweetModule.make(tweet));
              })
            }
          }
          
          // Make API calls
          rest.get("/1/statuses/retweeted_to_me.json?count=20", handle);
          rest.get("/1/statuses/friends_timeline.json?count=20", handle);
          rest.get("/1/statuses/mentions.json?count=20", handle);
        }
      }
      
    }
      
  }
);