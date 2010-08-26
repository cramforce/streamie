require.def("stream/plugins",
  ["stream/tweet", "text!../templates/tweet.ejs.html"],
  function(tweetModule, templateText) {
    var template = _.template(templateText);
    
    return {
      tweetsOnly: {
        name: "tweetsOnly",
        func: function (tweet) {
          if(tweet.data.text != null) {
            this();
          }
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
            tweet: tweet
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
          text = text.toString().replace(/&/g, "&amp;");
          text = text.replace(/</g, "&lt;");
          text = text.replace(/>/g, "&gt;");
          text = text.replace(/"/g, "&quot;");
          text = text.replace(/'/g, "&#39;");
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
      }
      
    }
      
  }
);