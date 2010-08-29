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
            // { custom-event: stat:XXX }
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
          var mainstatus = $("#mainstatus");
          
          $("#header").delegate("#mainnav a", "click", function (e) {
            var a = $(this);
            a.blur();
            var li = a.closest("li");
            
            if(li.hasClass("add")) { // special case for new tweet
              e.preventDefault();
              if(mainstatus.hasClass("active")) {
                mainstatus.removeClass("active");
              } else {
                mainstatus.addClass("active");
                mainstatus.find("[name=status]").focus();
              }
              return;
            }
            
            a.closest("#mainnav").find("li").removeClass("active");
            li.addClass("active")
          });
          
          mainstatus.bind("status:send", function () {
            mainstatus.removeClass("active");
          });
          
          $("#header").delegate("#mainnav li.add", "mouseenter mouseleave", function () {
            mainstatus.toggleClass("tease");
          })
        }
      },
      
      // signals new tweets
      signalNewTweets: {
        name: "signalNewTweets",
        func: function () {
          var win = $(window);
          var dirty = win.scrollTop() > 0;
          var newCount = 0;
          function redraw() { // this should do away
            var signal = newCount > 0 ? "[NEW] " : "";
            document.title = document.title.replace(/^(?:\[NEW\] )*/, signal); 
          }
          win.bind("scroll", function () {
            dirty = win.scrollTop() > 0;
            if(!dirty) { // we scrolled to the top. Back to 0 unread
              newCount = 0;
              redraw();
              $(document).trigger("tweet:unread", [newCount])
            }
          });
          $(document).bind("tweet:new", function () {
            newCount++;
            if(dirty) {
              redraw()
              $(document).trigger("tweet:unread", [newCount])
            }
          })
        }
      },
      
      personalizeForCurrentUser: {
        name: "personalizeForCurrentUser",
        func: function (stream) {
          $("#currentuser-screen_name").text("@"+stream.user.screen_name)
        }
      },
      
      // sends an event after user
      notifyAfterPause: {
        name: "notifyAfterPause",
        func: function () {
          
          function now() {
            return (new Date).getTime();
          }
          var last = now();
          setInterval(function () { // setInterval will not fire when the computer is asleep
            var time = now();
            var duration = time - last;
            if(duration > 4000) {
              console.log("Awake after "+duration);
              $(document).trigger("awake", [duration]);
            }
            last = time;
          }, 2000)
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