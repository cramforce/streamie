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
          
          // close mainstatus when user hits escape
          $(document).bind("key:escape", function () {
            if(mainstatus.hasClass("show")) {
              mainstatus.removeClass("show");
            }
          });
          
          $("#header").delegate("#mainnav a", "click", function (e) {
            var a = $(this);
            a.blur();
            var li = a.closest("li");
            
            if(li.hasClass("add")) { // special case for new tweet
              e.preventDefault();
              if(mainstatus.hasClass("show")) {
                mainstatus.removeClass("show");
              } else {
                mainstatus.addClass("show");
                mainstatus.find("[name=status]").focus();
              }
              return;
            }
            
            a.closest("#mainnav").find("li").removeClass("active");
            li.addClass("active")
          });
          
          mainstatus.bind("status:send", function () {
            mainstatus.removeClass("show");
          });
          
         //  $("#header").delegate("#mainnav li.add", "mouseenter mouseleave", function () {
//             mainstatus.toggleClass("tease");
//           })
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
            var signal = newCount > 0 ? "("+newCount+") " : "";
            document.title = document.title.replace(/^(?:\(\d+\) )*/, signal); 
          }
          win.bind("scroll", function () {
            dirty = win.scrollTop() > 0;
            if(!dirty) { // we scrolled to the top. Back to 0 unread
              newCount = 0;
              setTimeout(function () { // not do this winthin the scroll event. Makes Chrome much happier performance wise.
                redraw();
                $(document).trigger("tweet:unread", [newCount])
              }, 0);
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
      
      // listen to keyboard events and translate them to semantic custom events
      keyboardShortCuts: {
        name: "keyboardShortCuts",
        func: function () {
          
          function trigger(e, name) {
            $(e.target).trigger("key:"+name);
          }
          
          $(document).keyup(function (e) {
            if(e.keyCode == 27) { // escape
              trigger(e, "escape")
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
      
      // display state in the favicon
      favicon: {
        name: "favicon",
        colorCanvas: function (color) {
          // remove the current favicon. Just changung the href doesnt work.
          var favicon = $("link[rel~=icon]")
          favicon.remove()
          
          // make a quick canvas.
          var canvas = document.createElement("canvas");
          canvas.width = 16;
          canvas.height = 16;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = color;  
          ctx.fillRect(0, 0, 16, 16);
          
          // convert canvas to DataURL
          var url = canvas.toDataURL();

          // put in a new favicon
          $("head").append($('<link rel="shortcut icon" type="image/x-icon" href="'+url+'" />'));
        },
        
        func: function (stream, plugin) {
          
          $(document).bind("tweet:unread", function (e, count) {
            var color = "#000000";
            if(count > 0) {
              color = "#278BF5";
            }
            plugin.colorCanvas(color);
          })
        }
      },
      
      // Use the REST API to load the users's friends timeline, mentions and friends's retweets into the stream
      // this also happens when we detect that the user was offline for a while
      prefillTimeline: {
        name: "prefillTimeline",
        func: function (stream) { 
          
          function prefill () {
            var all = [];
            var returns = 0;
            var calls   = 3;
            var handle = function (tweets, status) {
              returns++;
              if(status == "success") {
                all = all.concat(tweets)
              };
              if(returns == 4) { // all four APIs returned, we can start drawing
                var seen = {};
                all = all.filter(function (tweet) { // filter out dupes
                  var ret = !seen[tweet.id];
                  seen[tweet.id] = true;
                  return ret;
                });
                all = _(all).sortBy(function (tweet) { // sort tweets from all 3 API calls
                  return (new Date(tweet.created_at)).getTime();
                });
                all.forEach(function (tweet) { // process tweets into the stream
                  var t = tweetModule.make(tweet);
                  t.prefill = true;
                  stream.process(t); // if the tweet is already there, is will be filtered away
                })
              }
            }

            // Make API calls
            rest.get("/1/statuses/retweeted_to_me.json?count=20", handle);
            rest.get("/1/statuses/friends_timeline.json?count=20", handle);
            rest.get("/1/statuses/mentions.json?count=20", handle);
            rest.get("/1/favorites.json", handle);
          }
          
          $(document).bind("awake", function (e, duration) { // when we awake, we might have lost some tweets
            setTimeout(prefill, 4000); // wait for network to come online
          });
          
          prefill(); // do once at start
        }
      }
      
    }
      
  }
);