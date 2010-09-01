require.def("stream/status",
  ["stream/twitterRestAPI", "stream/helpers", "stream/location", "text!../templates/status.ejs.html"],
  function(rest, helpers, location, replyFormTemplateText) {
    var replyFormTemplate = _.template(replyFormTemplateText);
    
    // get (or make) a form the reply to a tweet
    function getReplyForm(li) { // tweet li
      var form = li.find("form.status");
      if(form.length == 0) { // no form yet, create it
        li.find("div.status").append(replyFormTemplate({
          tweet: li.data("tweet"),
          helpers: helpers
        }));
        form = li.find("form.status");
        form.find("[name=status]").focus();
        form.bind("status:send", function () {
          form.hide();
          li.removeClass("form");
          $(window).scrollTop(0); // Good behavior?
        })
      }
      return form;
    }
    
    return {
      
      // observe events on status forms
      observe: {
        name: "oberserve",
        func: function (stream) {
          
          // submit event
          $(document).delegate("form.status", "submit", function (e) {
            var form = $(this);
            var status = form.find("[name=status]");
            if(status.val().length > 140) return false; // too long for Twitter
            
            // post to twitter
            rest.post(form.attr("action"), form.serialize(), function () {
              form.find("textarea").val("");
              // { custom-event: status:send }
              form.trigger("status:send");
            })
            return false;
          });
          
          function updateCharCount (e) {
            var val = e.target.value;
            var target = $(e.target).closest("form").find(".characters");
            target.text( e.target.value.length );
          }
          
          $(document).delegate("form.status [name=status]", "keyup change paste", updateCharCount)
          
          // update count every N millis to catch any changes, though paste, auto complete, etc.
          $(document).delegate("form.status [name=status]", "focus", function (e) {
            updateCharCount(e)
            $(e.target).data("charUpdateInterval", setInterval(function () { updateCharCount(e) }, 100));
          })
          $(document).delegate("form.status [name=status]", "blur", function (e) {
            var interval = $(e.target).data("charUpdateInterval");
            if(interval) {
              clearInterval(interval);
            }
          })
        }
      },
      
      // handle event for the reply form inside tweets
      replyForm: {
        name: "replyForm",
        func: function (stream) {
          $(document).delegate("#stream .actions .reply", "click", function (e) {
            var li = $(this).parents("li");
            var form = getReplyForm(li);
            form.show();
            li.addClass("form");
          })
        }
      },
      
      // The old style retweet, with the ability to comment on the original text
      quote: {
        name: "quote",
        func: function (stream) {
          $(document).delegate("#stream .quote", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var form = getReplyForm(li);
            form.find("[name=in_reply_to_status_id]").val(""); // no reply
            
            // make text. TODO: Style should be configurable
            var text = tweet.data.text + " /via @"+tweet.data.user.screen_name
            
            form.find("[name=status]").val(text);
            form.show();
          })
        }
      },
      
      // Click on retweet button
      retweet: {
        name: "retweet",
        func: function (stream) {
          $(document).delegate("#stream .actions .retweet", "click", function (e) {
            if(confirm("Do you really want to retweet?")) {
              var li = $(this).parents("li");
              var tweet = li.data("tweet");
              var id = tweet.data.id;
              
              // Post to twitter
              rest.post("/1/statuses/retweet/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  li.hide();
                  // todo: Maybe redraw the tweet with more fancy marker?
                }
              })
            }
          })
        }
      },
      
      // adds geo coordinates to statusses
      location: {
        name: "location",
        func: function () {
          $(document).delegate("textarea[name=status]", "focus", function () {
            var form = $(this).closest("form");
            
            location.get(function (position) {
              form.find("[name=lat]").val(position.coords.latitude)
              form.find("[name=long]").val(position.coords.longitude)
              form.find("[name=display_coordinates]").val("true");
            })
          });
        }
      },
      
      // Click on favorite button
      favorite: {
        name: "favorite",
        func: function (stream) {
          $(document).delegate("#stream .actions .favorite", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var id = tweet.data.id;
            
            if(!tweet.data.favorited) {
              rest.post("/1/favorites/create/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  tweet.data.favorited = true;
                  li.addClass("starred");
                }
              });
            } else {
              rest.post("/1/favorites/destroy/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  tweet.data.favorited = false;
                  li.removeClass("starred");
                }
              });
            }
          })
        }
      },
      
      // show all Tweets from one conversation
      conversation: {
        name: "conversation",
        func: function (stream) {
          
          $(document).delegate("#stream .conversation", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var con = tweet.conversation;
            
            $("#mainnav").find("li").removeClass("active") // evil coupling
            
            $("#stream li").removeClass("conversation");
            var className = "conversation"+con.index;
            window.location.hash = "#"+className;
            
            if(!con.styleAppended) {
              con.styleAppended = true;
              // add some dynamic style to the page to hide everything besides this conversation
              var style = '<style type="text/css" id>'+
                'body.'+className+' #content #stream li {display:none;}\n'+
                'body.'+className+' #content #stream li.'+className+' {display:block;}\n'+
                '</style>';
            
                style = $(style);
                $("head").append(style);
            }
            
          })
        }
      },
      
      // Double click on tweet text turns text into JSON; Hackability FTW!
      showJSON: {
        name: "showJSON",
        func: function (stream) {
          $(document).delegate("#stream p.text", "dblclick", function (e) {
            var p = $(this);
            var li = p.closest("li");
            var tweet = li.data("tweet");
            var pre   = $("<pre class='text'/>");
            tweet = _.clone(tweet);
            delete tweet.node; // chrome hates stringifying these;
            pre.text(JSON.stringify( tweet, null, " " ));
            p.hide().after(pre);
            pre.bind("dblclick", function () {
              pre.remove();
              p.show();
            });
          })
        }
      }
    }
      
  }
);