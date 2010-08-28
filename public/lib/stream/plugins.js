require.def("stream/plugins",
  ["stream/tweet", "stream/twitterRestAPI", "stream/helpers", "text!../templates/tweet.ejs.html"],
  function(tweetModule, rest, helpers, templateText) {
    var template = _.template(templateText);
    
    return {
      
      handleRetweet: { // turns retweets into something similar to tweets
        name: "handleRetweet",
        func: function (tweet) {
          if(tweet.data.retweeted_status) {
            var orig = tweet.data;
            tweet.data = tweet.data.retweeted_status;
            tweet.retweet = orig;
          }
          this();
        }
      },
      
      tweetsOnly: {
        name: "tweetsOnly",
        func: function (tweet) {
          if(tweet.data.text != null) {
            this();
          }
        }
      },
      
      mentions: {
        name: "mentions",
        func: function (tweet, stream) {
          var screen_name = stream.user.screen_name;
          tweet.mentions = [];
          tweet.data.text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (match, pre, name) {
            if(name == screen_name) {
              tweet.mentioned = true;
              tweet.mentions.push(name);
            }
            return match;
          });
          this();
        }
      },
      
      template: {
        name: "template",
        func: function (tweet) {
          tweet.template = template;
          this();
        }
      },
      
      renderTemplate: {
        name: "renderTemplate",
        func: function (tweet) {
          tweet.html = tweet.template({
            tweet: tweet,
            helpers: helpers
          });
          this();
        }
      },
      
      prepend: {
        name: "prepend",
        func: function (tweet, stream) {
          tweet.node = $(tweet.html);
          tweet.node.data("tweet", tweet); // give node access to its tweet
          stream.canvas().prepend(tweet.node);
          this();
        }
      },
      
      htmlEncode: {
        name: "htmlEncode",
        func: function (tweet, stream) {
          var text = tweet.data.text;
          text = helpers.html(text);
          tweet.textHTML = text;
          this();
        }
      },
      
      age: {
        name: "age",
        func: function (tweet) {
          tweet.created_at = new Date(tweet.data.created_at);
          function update () {
            tweet.age = (new Date()).getTime() - tweet.created_at.getTime();
            tweet.node.find(".created_at").text(Math.round(tweet.age / 1000) + " seconds ago")
          }
          update();
          setInterval(update, 1000)
          this();
        }
      },
      
      formatTweetText: {
        name: "formatTweetText",
        func: function (tweet, stream) {
          var text = tweet.textHTML;
          
          text = text.replace(/https?:\/\/\S+/ig, function (href) {
            return '<a href="'+href+'">'+href+'</a>';
          });
          text = text.replace(/(^|\s)(www\.\S+)/ig, function (all, pre,www) {
            return pre+'<a href="http://'+www+'">'+www+'</a>';
          });
          text = text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (all, pre, name) {
            return pre+'<a href="http://twitter.com/'+name+'" class="user-href">@'+name+'</a>';
          });
          text = text.replace(/(^|\s)\#(\S+)/g, function (all, pre, tag) {
            return pre+'<a href="http://search.twitter.com/search?q='+encodeURIComponent(tag)+'" class="tag">#'+tag+'</a>';
          });
          
          tweet.textHTML = text;
          
          this();
        }
      },
      
      keepScrollState: {
        name: "keepScrollState",
        func: function (tweet, stream) {
          var win = $(window);
          var cur = win.scrollTop();
          if(cur != 0) {
            var next = tweet.node.next()
            var top = cur + next.offset().top - tweet.node.offset().top;
            win.scrollTop( top );
          }
          this();
        }
      },
      
      // init plugins
      
      hashState: {
        name: "hashState",
        func: function (stream) {
          function change() {
            var val = location.hash.replace(/^\#/, "");
            $("body").attr("class", val);
            $(document).trigger("state:"+val);
          }
          $(window).bind("hashchange", change);
          change();
        }
      },
      
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
      
      prefillTimeline: {
        name: "prefillTimeline",
        func: function (stream) {
          var all = [];
          var returns = 0;
          var calls   = 3;
          var handle = function (tweets, status) {
            returns++;
            if(status != "success") {
              return
            };
            all = all.concat(tweets)
            if(returns == 3) {
              var seen = {};
              all = all.filter(function (tweet) {
                var ret = !seen[tweet.id];
                seen[tweet.id] = true;
                tweet.prefill = true;
                return ret;
              });
              all = _(all).sortBy(function (tweet) {
                return (new Date(tweet.created_at)).getTime();
              });
              all.forEach(function (tweet) {
                stream.process(tweetModule.make(tweet));
              })
            } else {
              all = tweets;
            }
            
          }
          rest.get("/1/statuses/retweeted_to_me.json?count=20", handle);
          rest.get("/1/statuses/friends_timeline.json?count=20", handle);
          rest.get("/1/statuses/mentions.json?count=20", handle);
        }
      }
      
    }
      
  }
);