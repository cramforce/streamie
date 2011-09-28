/*
 * List of built in plugins for initialization
 */

require.def("stream/initplugins",
  ["stream/tweet", "stream/settings", "stream/twitterRestAPI", "stream/helpers", "text!../templates/tweet.ejs.html", "ext/cookie.js"],
  function(tweetModule, settings, rest, helpers, templateText) {
    
    settings.registerNamespace("general", "General");
    settings.registerKey("general", "showTwitterBackground", "Show my background from Twitter",  false);
    
    settings.registerNamespace("notifications", "Notifications");
    settings.registerKey("notifications", "tweets", "Notify for new tweets (yellow icon)",  true);
    settings.registerKey("notifications", "mentions", "Notify for new mentions (green icon)",  true);
    settings.registerKey("notifications", "direct", "Notify for new direct messages (blue icon)",  true);
    settings.registerKey("notifications", "sound", "Play a sound for new tweets",  false);
    
    return {
      
      // when location.hash changes we set the hash to be the class of our HTML body
      hashState: {
        ScrollState: {},
        StyleAppended: {},
        func: function hashState (stream, plugin) {
          var win = $(window);
          function change() {
            var val = location.hash.replace(/^\#/, "");
            $("body").attr("class", val);
            // { custom-event: stat:XXX }
            $(document).trigger("state:"+val);
            
            var scrollState = plugin.ScrollState[val || "all"];
            if(scrollState != null) {
              win.scrollTop(scrollState);
            }
            
            if(!plugin.StyleAppended[val] && val != "all") {
              plugin.StyleAppended[val] = true;
              var className = val.replace(/[^\w-]/g, "");
              // add some dynamic style to the page to hide everything besides things tagged with the current state
              var style = '<style type="text/css" id>'+
                'body.'+className+' #content #stream li {display:none;}\n'+
                'body.'+className+' #content #stream li.'+className+' {display:block;}\n'+
                '</style>';
            
              style = $(style);
              $("head").append(style);
            }
          }
          win.bind("hashchange", change); // who cares about old browsers?
          change();
          
          var scrollTimer;
          function scrollTimeout() {
            window.Streamie_Just_Scrolled = false;
          }
          win.bind("scroll", function () {
            plugin.ScrollState[location.hash.replace(/^\#/, "") || "all"] = win.scrollTop();
            window.Streamie_Just_Scrolled = true;
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(scrollTimeout, 1000);
          });
        }
      },
      
      // change the background to the twitter background
      background: {
        func: function background (stream) {
          settings.subscribe("general", "showTwitterBackground", function (bool) {
            if(bool) {
              stream.userInfo(function (user) {
                if(user.profile_background_image_url_https) {
                  $("body").css("backgroundImage", "url("+user.profile_background_image_url_https+")")
                }
              })
            } else {
               $("body").css("backgroundImage", null)
            }
          });
        }
      },
      
      // make the clicked nav item "active"
      navigation: {
        func: function navigation (stream) {
          var mainstatus = $("#mainstatus");
          
          mainstatus.bind("close", function () {
            if(mainstatus.hasClass("show")) {
              mainstatus.removeClass("show");
            }
          });
          
          // meta navigation
          // Logout button
          $("#meta").delegate(".logout", "click", function (e) {
            e.preventDefault();
            cookie.set("token", ""); // delete cookie
            location.reload(); // reload page
          });
          
          // main header
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
                // Needs to be aligned after the .slide transition. Setting focus immeditately
                // delays the transition by about 2 seconds in Chrome.
                setTimeout(function() {
                  mainstatus.find("[name=status]").focus();
                }, 500); 
              }
            }
            if(li.hasClass("activatable")) { // special case for new tweet
              a.closest("#mainnav").find("li").removeClass("active");
              li.addClass("active")
            }
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
        func: function signalNewTweets () {
          var win = $(window);
          var dirty = win.scrollTop() > 0;
          var newCount = 0;
          
          function redraw() {
            var signal = newCount > 0 ? "("+newCount+") " : "";
            document.title = document.title.replace(/^(?:\(\d+\) )*/, signal);
          }
          
          win.bind("scroll", function () {
            dirty = win.scrollTop() > 0;
            if(!dirty) { // we scrolled to the top. Back to 0 unread
              newCount = 0;
              setTimeout(function () { // not do this winthin the scroll event. Makes Chrome much happier performance wise.
                $(document).trigger("tweet:unread", [newCount]); // notify
                $(document).trigger("notify:tweet:unread", [newCount]); // we want to have this event bypass throttle because it always involves user interaction
              }, 0);
            }
          });
          $(document).bind("notify:tweet:unread", function () {
            redraw();
          });
          $(document).bind("tweet:new", function (e, tweet) {
            if(tweet.yourself) { // your own tweets are never unread
              return;
            }
            newCount++;
            $(document).trigger("tweet:unread", [newCount, tweet.mentioned, tweet.direct_message])
          })
        }
      },      
      
      // Tranform "tweet:unread" events into "notify:tweet:unread" events
      // Filter events based on setting.
      throttableNotifactions: {
        func: function throttableNotifactions () {
          $(document).bind("tweet:unread", function (e, count, isMention, isDirectMessage) {
            function notify() {
              $(document).trigger("notify:tweet:unread", [count, isMention, isDirectMessage]);
              
              if(settings.get('notifications', 'sound')) {
                var audio = $('<audio />')
                audio.attr({
                  src: '/sounds/new_tweet.wav',
                  autoplay: true
                });
                audio.hide();
                audio.bind('ended', function() {
                  audio.remove()
                });
                
                $('body').append(audio)
              }
            }
            if(isMention) {
              if(settings.get("notifications", "mentions")) {
                notify();
              }
            } else if(isDirectMessage) {
              if(settings.get("notifications", "direct")) {
                notify();
              }
            } else {
              if(settings.get("notifications", "tweets")) {
                notify();
              }
            }
          });
        }
      },
      
      // listen to keyboard events and translate them to semantic custom events
      keyboardShortCuts: {
        func: function keyboardShortCuts () {
          
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
        func: function personalizeForCurrentUser (stream) {
          $("#currentuser-screen_name").text("@"+stream.user.screen_name)
        }
      },
      
      // sends an event after user
      notifyAfterPause: {
        func: function notifyAfterPause () {
          
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
        func: function favicon (stream, plugin) {
          var importantActive = false;
          $(document).bind("notify:tweet:unread", function (e, count, isMention, isDirectMessage) {
            var url;
            if(count > 0) {
              url =  "images/streamie-unread.ico";
              if(isMention) {
                url = "images/streamie-mention.ico";
                importantActive = true;
              }
              else if(isDirectMessage) {
                url = "images/streamie-direct.ico"
                importantActive = true;
              } else {
                if(importantActive) { // we should not change away
                  return;
                }
              }
            } else {
              importantActive = false;
              url = "images/streamie-empty.ico"; 
            }
            
            // remove the current favicon. Just changing the href doesnt work.
            var favicon = $("link[rel~=icon]")
            favicon.remove();

            // put in a new favicon
            $("head").append($('<link rel="shortcut icon" type="image/x-icon" href="'+url+'" />'));
          })
        }
      },
      
      // Use the REST API to load the users's friends timeline, mentions and friends's retweets into the stream
      // this also happens when we detect that the user was offline for a while
      prefillTimeline: {
        func: function prefillTimeline (stream) { 

          function prefill () {
            var all = [];
            var returns = 0;
            var calls   = 3;
            var handle = function (tweets, status) {
              returns++;
              if(status == "success") {
                all = all.concat(tweets)
              };
              if(returns == 6) { // all four APIs returned, we can start drawing
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


            var since = stream.newestTweet();
            function handleSince(tweets) {
              if(tweets) {
                var oldest = tweets[tweets.length-1];
                if(oldest) {
                  if(parseInt(oldest.id, 10) > since) {
                    oldest._missingTweets = true; // mark the oldest tweet if it is newer than the one we knew before
                  }
                }
                if(oldest) {
                  // fetch other types of statuses since the last regular status
                  rest.get("/1/statuses/retweeted_to_me.json?include_entities=true&since_id="+oldest.id, handle);
                  rest.get("/1/statuses/mentions.json?include_entities=true&since_id="+oldest.id, handle);
                } else {
                  rest.get("/1/statuses/retweeted_to_me.json?include_entities=true&count=20", handle);
                  rest.get("/1/statuses/mentions.json?include_entities=true&count=50", handle);
                }
              }
              handle.apply(this, arguments);
            }

            // Make API calls
            rest.get("/1/statuses/friends_timeline.json?include_entities=true&count=100", handleSince);
            rest.get("/1/favorites.json?include_entities=true&", handle);
            rest.get("/1/direct_messages.json?include_entities=true&", handle);
            rest.get("/1/direct_messages/sent.json?include_entities=true&", handle);
            console.log("[prefil] prefilling timeline");
          }

          $(document).bind("awake", function (e, duration) { // when we awake, we might have lost some tweets
            setTimeout(prefill, 4000); // wait for network to come online
          });

          prefill(); // do once at start
        }
      },
      
      registerWebkitNotifications: {
        func: function registerWebkitNotifications() {
          var permission = window.webkitNotifications &&
            window.webkitNotifications.checkPermission();
        
          //- The user can only be asked for to allow webkitNotifications if she slicks
          //  something. If we requestPermission() without user interaction, it is ignored
          //  silently.
          //- callback() is called when the user clicks on the settings dialog
        
          var callback = function(value, namespace, key) {
            var permission = window.webkitNotifications &&
              window.webkitNotifications.checkPermission();
            if (value) {
              // user tried to enable notifications, let's see if we have the rights
              // if we have the rights or the user disabled webkitNotifications, there's
              // nothing to be done here
              if (permission === 1) {
                // rights "not set" -> request
                window.webkitNotifications.requestPermission(function() {
                  // after the user allowed or disallowed webkitNotification rights, change the
                  // gui accordingly
                  settings.set(namespace, key, window.webkitNotifications.checkPermission() == 0);
                }); 
              } else if (permission == 2) {
                // "blocked" -> tell the user how to unblock (it seems she wants to do that)
                // todo: non-chrome users do what? 
                // -> let's wait for the second browser to implement webkitNotifications
                alert('To enable notifications, go to ' +
                  '"Preferences > Under the Hood > Content Settings > Notifications > Exceptions"' +
                  ' and remove blocking of "' + window.location.hostname + '"');
                settings.set(namespace, key, false); //disable again
              } 
            }
          } 
        
          if (window.webkitNotifications) {
            // only register settings if browser allows that
            settings.registerKey('notifications', 'enableWebkitNotifications', 'Chrome notifications',
              permission === 0, [true, false]);
            settings.subscribe('notifications', 'enableWebkitNotifications', callback);
            if (permission !== 0) {
              // override stored value, as an enabled buttons sucks if the feature is disabled :(
              // if the user tries to enable it but blocked the webkitNotification rights,
              // a js alert will be shown (see callback() above)
              settings.set('notifications', 'enableWebkitNotifications', false);
            }
          } 
        }
      }
    }
  }
);
