require.def("stream/plugins",
  ["stream/tweet", "text!../templates/tweet.ejs.html"],
  function(tweetModule, templateText) {
    var template = _.template(templateText);
    
    function html(text) {
      text = text.toString().replace(/&/g, "&amp;");
      text = text.replace(/</g, "&lt;");
      text = text.replace(/>/g, "&gt;");
      text = text.replace(/"/g, "&quot;");
      text = text.replace(/'/g, "&#39;");
      return text;
    }
    
    return {
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
            html: html
          });
          this();
        }
      },
      
      prepend: {
        name: "prepend",
        func: function (tweet, stream) {
          tweet.node = $(tweet.html);
          stream.canvas().prepend(tweet.node);
          this();
        }
      },
      
      htmlEncode: {
        name: "htmlEncode",
        func: function (tweet, stream) {
          var text = tweet.data.text;
          text = html(text);
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
      
      prefillTimeline: {
        name: "prefillTimeline",
        func: function (stream) {
          var all;
          var handle = function (tweets) {
            if(all) {
              all = all.concat(tweets)
              var seen = {};
              all = all.filter(function (tweet) {
                var ret = !seen[tweet.id];
                seen[tweet.id] = true;
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
          $.get("/twitter/1/statuses/friends_timeline.json?count=20", function (tweets, status) {
            if(status == "success") {
              handle(tweets)
            }
          });
          $.get("/twitter/1/statuses/mentions.json?count=20", function (tweets, status) {
            if(status == "success") {
              handle(tweets)
            }
          });
        }
      }
      
    }
      
  }
);