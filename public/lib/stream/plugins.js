require.def("stream/plugins",
  ["stream/tweet", "text!../templates/tweet.ejs.html"],
  function(tweetModule, templateText) {
    var template = _.template(templateText);
    
    return {
      tweetsOnly: {
        name: "tweetsOnly",
        func: function (tweet) {
          if(tweet.data.text == null) {
            return false;
          }
        }
      },
      
      template: {
        name: "template",
        func: function (tweet) {
          tweet.template = template
        }
      },
      
      renderTemplate: {
        name: "renderTemplate",
        func: function (tweet) {
          tweet.html = tweet.template({
            tweet: tweet
          })
        }
      },
      
      prepend: {
        name: "prepend",
        func: function (tweet, stream) {
          stream.canvas().prepend(tweet.html);
        }
      }
      
    }
      
  }
);