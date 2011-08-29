require.def("stream/status",
  ["stream/text", "stream/twitterRestAPI", "stream/streamplugins", "stream/helpers", "stream/popin", "stream/location", "stream/settings", "stream/keyValueStore", "text!../templates/status.ejs.html", "/ext/jquery.autocomplete.js"],
  function(text, rest, streamPlugins, helpers, popin, location, settings, keyValue, replyFormTemplateText) {
    var replyFormTemplate = _.template(replyFormTemplateText);
    
    settings.registerNamespace("status", "Status");
    settings.registerKey("status", "autocompleteScreenNames", "As-you-type autocomplete for screen names",  true);
    settings.registerKey("status", "addLocation", "Add your current location to status updates",  true);
    
    settings.registerKey("stream", "showJSON", "Show JSON representation of tweet on double click", false ); 
    
    var TWEET_MAX_LENGTH = 140;
    
    // get (or make) a form the reply to a tweet
    function getReplyForm(li) { // tweet li
      var form = li.find("form.status");
      if(form.length == 0) { // no form yet, create it
        li.find("div.status").append(replyFormTemplate({
          tweet: li.data("tweet"),
          helpers: helpers,
          text: text.get
        }));
        form = li.find("form.status");
        var textarea = form.find("[name=status]");
        textarea.data("init-val", textarea.val());
        textarea.focus();
        form.bind("status:send", function () {
          form.trigger("close");
        });
        form.bind("close", function () {
          form.hide();
          li.removeClass("form");
        });
      }
      li.addClass("form");
      return form;
    }
    
    // Sets status textarea text and sets caret or selection.
    // If start is null, it default to the end of the text.
    // If end is null, there will be no "selection"
    function setCaret(form, text, start, end) { 
      var textarea = form.find("[name=status]");
      if(!text) {
        text = textarea[0].value
      }
      textarea.val(text);
      textarea.focus();
      if(start == null) {
        start = text.length;
      }
      if(end == null) {
        end = start
      }
      textarea[0].setSelectionRange(start, end);
    }
    
    return {
      // handle event for the reply form inside tweets
      translateToggle: {
        func: function translateToggle (stream) {
          $(document).delegate("#stream .actions .translate_toggle", "click", function (e) {
            // get the tweet
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            // if not a translated tweet, do nothing
            if(!tweet.translate)  return;
            // switch to the next language
            var availLangs	= _.keys(tweet.translate.texts);
            var curIdx	= _.indexOf(availLangs, tweet.translate.curLang);
            curIdx		= (curIdx+1) % availLangs.length;
            tweet.translate.curLang	= availLangs[curIdx];     
            // reprocess this tweet
            stream.reProcess(tweet);
          });
        }
      },
      // implement autocomplete for screen_names
      autocomplete: {
        func: function autocomplete (stream) {
          $(document).bind("status:focus", function (e, textarea) {
            if(settings.get("status", "autocompleteScreenNames")) {
              if(!textarea.data("autocomplete:names")) {
                textarea.data("autocomplete:names", true);
                textarea.autocomplete(keyValue.Store("screen_names").keys(), {
                  multiple: true,
                  multipleSeparator: " "
                });
              }
            }
          })
        }
      },
      
      // observe events on status forms
      observe: {
        func: function oberserve (stream) {
          
          function shortenDirectMessagePrefix(val) {
            return val.replace(/^d\s+\@?\w+\s/, ""); // remove direct message prefix
          }
          
          // When the user hits escape, close the form
          $(document).bind("key:escape", function (e) {
            var target = $(e.target);
            if(target.is(":input") && target.closest("form.status").length > 0) {
              target.trigger("close");
            }
          });
          
          $(document).delegate("form.status .close", "click", function (e) {
            e.preventDefault();
            $(this).trigger("close");
          });
          
          // submit event
          $(document).delegate("form.status", "submit", function (e) {
            var form = $(this);
            var status = form.find("[name=status]");
            
            var val = status.val();
            val = shortenDirectMessagePrefix(val);
            
            if(val.length > TWEET_MAX_LENGTH) return false; // too long for Twitter
            
            // post to twitter
            rest.post(form.attr("action"), form.serialize(), function (data, status) {
              if(status == "success") {
                var textarea = form.find("textarea");
                var val = textarea.data("init-val") || "";
                textarea.val(val);
                // { custom-event: status:send }
                form.trigger("status:send");
              } else {
                alert("Posting the tweet failed. Sorry :(")
              }
            })
            return false;
          });
          
          var last;
          function updateCharCount (e) {
            var val = e.target.value;
            val = shortenDirectMessagePrefix(val);
            var length = val.length;
            
            if(length != last) {
              var text = TWEET_MAX_LENGTH - length;
              if(text < 0) {
                text = '<span class="toolong">'+text+'</span>'
              }
              else if(text < 20) {
                text = '<span class="warn">'+text+'</span>'
              }
              $(e.target).closest("form").find(".characters").html( text );
              last = length;
            }
          }
          
          $(document).delegate("form.status [name=status]", "keyup change paste", updateCharCount)
          
          // update count every N millis to catch any changes, though paste, auto complete, etc.
          $(document).delegate("form.status [name=status]", "focus", function (e) {
            updateCharCount(e)
            var textarea = $(e.target);
            var interval = textarea.data("charUpdateInterval");
            if(interval) {
              clearInterval(interval);
            }
            textarea.data("charUpdateInterval", setInterval(function () { updateCharCount(e) }, 200));
            textarea.trigger("status:focus", [textarea]);
          })
          $(document).delegate("form.status [name=status]", "blur", function (e) {
            var interval = $(e.target).data("charUpdateInterval");
            if(interval) {
              clearInterval(interval);
            }
          })
        }
      },
      
      // Send a direct message
      newDirectMessage: {
        func: function newDirectMessage (stream) {
          var RE = streamPlugins.formatTweetText.GRUBERS_URL_RE;
          
          // listen to click on the shortenURLs buttons
          $(document).delegate("form.status .directMessage", "click", function (e) {
            e.preventDefault();
            var form = $(this).closest("form.status");
            var input = form.find("[name=status]");
            
            var text = input.val();
            if(!text.match(/^d\s+/)) {
              var prefix = 'd @';
              text = prefix + (text ? ' ' + text : '');
              setCaret(form, text, prefix.length, prefix.length);
            }
            
          });
        }
      },
      
      // Shorten URLs in statuses
      shortenURLs: {
        func: function shortenURLs (stream) {
          // Get credentials from localStorage (later settings) or use streamie's
          // We assume that these can be public so they are in the repo.
          var apiKey = window.localStorage.getItem("bitly-apiKey") || "R_c80c96d15b82d9d02ef130575666a461";
          var user   = window.localStorage.getItem("bitly-user")   || "streamie";
          var domain = window.localStorage.getItem("bitly-domain") || "j.mp";
          
          var baseURL = "http://api.bit.ly/v3/shorten?apiKey="+
            encodeURIComponent(apiKey)+"&login="+
            encodeURIComponent(user)+"&domain="+
            encodeURIComponent(domain)+"&format=json&callback=?&longURL=";
          
          var RE = streamPlugins.formatTweetText.GRUBERS_URL_RE;
          
          // listen to click on the shortenURLs buttons
          $(document).delegate("form.status .shortenURLs", "click", function (e) {
            e.preventDefault();
            var form = $(this).closest("form.status");
            var input = form.find("[name=status]");
            var matches = input.val().match(RE);
            if(matches) {
              matches.forEach(function(longURL) {
                if(longURL.length > "http://j.mp/aYYiOl".length) { // it is worth it?
                  var url = baseURL+encodeURIComponent(longURL);
                  $.getJSON(url, function (info, status) {
                    if(info) {
                      if(info.status_code != "200") {
                        alert('URL shortening failed');
                        console.log("[BITLY] "+url);
                        console.log(info)
                      } else {
                        var text = input.val();
                        // replace actual status text
                        text = text.replace(longURL, info.data.url);
                        input.val(text);
                        input.focus();
                      }
                    }
                  })
                }
              })
            }
          });
          
        }
      },
      
      // Implement image Upload via the imgur API
      mediaUpload: {
        func: function imageUpload (stream) {
          
          var statusForm;
          
          // show popin
          $(document).delegate("form.status .attachImage", "click", function (e) {
            e.preventDefault();
            statusForm = $(this).closest("form.status");
            popin.show("imageUpload");
          });
          
          // user selected file, upload immediately and add URL to status
          $(document).delegate("#imageUpload [name=file]", "change", function () {
            var file = this;
            var form = $(this).closest("form");
            
            if(typeof FormData == "undefined") {
              alert("Media upload is not supported by your browser!");
              return;
            }
            
            var formData = new FormData();  
            formData.append("image", file.files[0]);
            
            // use native XHR because jQuery does evil stuff that I couldn't work around.
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "/imgur/2/upload.json");  
            xhr.send(formData);
            $("#imageUpload .progress").text("Uploading...");
            
            xhr.onreadystatechange = function () {
              if(this.readyState == 4) {
                $("#imageUpload .progress").text("");
                if(this.status == 200) {
                  console.log(this.responseText);
                  var image = JSON.parse(this.responseText);
                  var textarea = statusForm.find("[name=status]");
                  var cur = textarea.val();
                  
                  var url = image.upload.links.imgur_page;
                  
                  textarea.val(cur + " " + url);
                  textarea.change();
                  
                  $("#imageUpload").trigger("close");
                  textarea.focus();
                } else {
                  console.log("[FileUpload Error] Status '"+xhr.statusText+"' URL: "+url);
                }
              }
            };
          })
        }
      },
      
      // handle event for the reply form inside tweets
      replyForm: {
        func: function replyForm (stream) {
          $(document).delegate("#stream .actions .reply", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var form = getReplyForm(li);
            form.show();
            
            var author = tweet.data.user.screen_name;
            var ats = ["@"+author];
            tweet.mentions.forEach(function (at) {
              if(at != author && at != streamie.user.screen_name) {
                ats.push("@"+at);
              }
            })
            
            var prefix = (tweet.direct_message ? "d " : "");
            var text  =  prefix + ats.join(" ")+" ";
            var start = (prefix + ats[0]).length + 1;
            var end   = text.length;
            setCaret(form, text, start, end);
          })
        }
      },
      
      // The old style retweet, with the ability to comment on the original text
      quote: {
        func: function quote (stream) {
          $(document).delegate("#stream .quote", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var form = getReplyForm(li);
            form.find("[name=in_reply_to_status_id]").val(""); // no reply
            
            // make text. TODO: Style should be configurable
            var text = tweet.data.text + " /via @"+tweet.data.user.screen_name
            
            form.show();
            setCaret(form, text)
          })
        }
      },
      
      // Click on retweet button
      retweet: {
        func: function retweet (stream) {
          $(document).delegate("#stream .actions .retweet", "click", function (e) {
            if(confirm("Do you really want to retweet?")) {
              var button = $(this);
              var li = button.parents("li");
              var tweet = li.data("tweet");
              var id = tweet.data.id;
              
              // Post to twitter
              rest.post("/1/statuses/retweet/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  button.hide();
                  $(document).trigger("status:retweet")
                  // todo: Maybe redraw the tweet with more fancy marker?
                }
              })
            }
          })
        }
      },
      
      // Adds geo coordinates to statusses
      location: {
        func: function locationPlugin () {
          $(document).delegate("textarea[name=status]", "focus", function () {
            if(settings.get("status", "addLocation")) {
              var form = $(this).closest("form");
            
              location.get(function (position) {
                form.find("[name=lat]").val(position.coords.latitude)
                form.find("[name=long]").val(position.coords.longitude)
                form.find("[name=display_coordinates]").val("true");
              });
            }
          });
        }
      },
      
      // Click on delete button
      deleteStatus: {
        func: function deleteStatus (stream) {
          $(document).delegate("#stream .actions .delete", "click", function (e) {
            var button = $(this);
            var li = button.parents("li");
            var tweet = li.data("tweet");
            var id = tweet.data.id;
            
            if(!tweet.deleted) {
              if(confirm('Do you really want to delete this tweet?')) {
                rest.post("/1/statuses/destroy/"+id+".json", function (tweetData, status) {
                  if(status == "success") {
                    $(document).trigger("status:delete");
                    button.remove();
                    // Everything else happens through the Streaming API delete event
                  }
                });
              }
            }
          })
        }
      },
      
      // Click on favorite button
      favorite: {
        func: function favorite (stream) {
          $(document).delegate("#stream .actions .favorite", "click", function (e) {
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var id = tweet.data.id;
            
            if(!tweet.data.favorited) {
              rest.post("/1/favorites/create/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  $(document).trigger("status:favorite")
                  tweet.data.favorited = true;
                  li.addClass("starred");
                }
              });
            } else {
              rest.post("/1/favorites/destroy/"+id+".json", function (tweetData, status) {
                if(status == "success") {
                  $(document).trigger("status:favoriteDestroy")
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
        func: function conversation (stream) {
          
          $(document).delegate("#stream .conversation", "click", function (e) {
            e.preventDefault();
            var li = $(this).parents("li");
            var tweet = li.data("tweet");
            var con = tweet.conversation;
            
            $("#mainnav").find("li").removeClass("active") // evil coupling
            
            $("#stream li").removeClass("conversation");
            var className = "conversation"+con.index;
            window.location.hash = "#"+className;
            
            $("li."+className).each(function () {
              var li = $(this);
              var tweet = li.data("tweet");
              tweet.fetchNotInStream()
            })
          })
        }
      },
      
      // calculate the age of the tweets and update it
      age: {
        func: function age (tweet) {
          function update() {
            if(window.Streamie_Just_Scrolled) { // never draw while scrolling
              return;
            }
            $('#stream').children().each(function() {
              var tweet = $(this).data('tweet');
            
            
              var millis = (new Date()).getTime() - tweet.created_at.getTime();
          
              tweet.age = millis;
              var units   = {
                second: Math.round(millis/1000),
                minute: Math.round(millis/1000/60),
                hour:   Math.round(millis/1000/60/60),
                day:    Math.round(millis/1000/60/60/24),
                week:   Math.round(millis/1000/60/60/24/7),
                month:  Math.round(millis/1000/60/60/24/30), // aproximately
                year:   Math.round(millis/1000/60/60/24/365), // aproximately
              };
              var txt = "";
              for(var unit in units) { // hopefully nobody extends Object :) Should use Object.keys instead.
                var val = units[unit];
                if(val > 0) {
                  txt = "";
                  var u = "{num} " + unit;
                  if(val > 1) {
                    u = u + "s";
                  }
                  txt = text.get("unit", u, {num: val});
                }
              };
          
              if(tweet.node) {
                var created_at = tweet.node.data('_age_created_at');
                if(!created_at) {
                  created_at = tweet.node.find(".created_at a");
                  tweet.node.data('_age_created_at', created_at);
                }
                var cur = created_at.text();
                if(cur != text) {
                  created_at.text(txt);
                }
              }
          
            });
          }
          update()
          setInterval(update, 5000)
        }
      },
      
      // Uncollapse a tweet
      uncollapse: {
        func: function uncollapse (stream) {
          $(document).delegate(".collapsed", "click", function (e) {
            $(this).removeClass("collapsed");
            e.preventDefault();
            e.stopPropagation();
          });
        }
      },
      
      // Double click on tweet text turns text into JSON; Hackability FTW!
      // What you see below, is a combination of CSS transitions, JS animations
      // and more voodoo. Why do we do it? Because we can!
      showJSON: {
        func: function showJSON (stream) {
          $(document).delegate("#stream p.text", "dblclick", function (e) {
            if(!settings.get("stream", "showJSON")) {
              return;
            }
            var target = $(this)
            var li = target.closest("li.tweet");
            var copy = li.clone(); // used to display the JSON
            var p = copy.find("p.text");
            copy.find(".actions").remove(); // do not make sense in the context
            
            target.animate({ // initial size increase to fit the JSON
              height: "400px"
            }, 500, function () {
            
              copy.addClass("back");
              copy.addClass("yourself");
              var position = li.position();
              copy.css({
                top: position.top+"px",
                left: position.left+"px"
              });
            
              var tweet = li.data("tweet");
              var pre   = $("<pre class='text json'/>");
              tweet = _.clone(tweet);
              delete tweet.node; // chrome hates stringifying these;
            
            
              pre.text(JSON.stringify( tweet, null, " " ));
              pre.width($(this).width())
            
              p.css("position", "absolute").after(pre);
              pre.hide().fadeIn(1500);
              p.hide();
            
              li.after(copy);
            
              target.height(); // measuring the height at this point helps. I love browsers!
            
              li.addClass("flipped");
            
              pre.bind("dblclick", function () {
                copy.remove();
                li.removeClass("flipped");
                target.css("height", "auto");
              });
            });
          })
        }
      }
    }
      
  }
);