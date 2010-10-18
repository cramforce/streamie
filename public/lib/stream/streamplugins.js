/*
 * List of built in plugins for tweet processing
 * 
 */

require.def("stream/streamplugins",
  ["stream/tweet", "stream/settings", "stream/twitterRestAPI", "stream/helpers", "stream/keyValueStore", "text!../templates/tweet.ejs.html"],
  function(tweetModule, settings, rest, helpers, keyValue, templateText) {
    
    settings.registerNamespace("stream", "Stream");
    settings.registerKey("stream", "showRetweets", "Show Retweets",  true);
    settings.registerKey("stream", "keepScrollState", "Keep scroll level when new tweets come in",  true); 
    settings.registerKey("stream", "translate", "Automatically translate to your prefered language", false ); 
    settings.registerKey("stream", "preferedLanguage", "Prefered language", "en", { "en": "English", "fr": "French" } ); 
    
    var template = _.template(templateText);
    
    var Tweets = {};
    var Conversations = {};
    var ConversationCounter = 0;

    settings.subscribe("stream", "translate", function(value){
      console.log("translate value is now "+value);
      //window.location.reload();
    });	
    settings.subscribe("stream", "preferedLanguage", function(value){
      console.log("preferedLanguage value is now "+value);
      //window.location.reload();
    });	
    
    return {            
      // Turns direct messages into something similar to a tweet
      // Because Streamie uses a stream methaphor for everything it does not make sense to
      // make a special case for direct messages
      handleDirectMessage: {
        func: function handleDirectMessage (tweet) {
          if(tweet.data.sender) {
            tweet.direct_message = true;
            tweet.data.user = tweet.data.sender; // the user is the sender
          }
          this();
        }
      },
      
      // Turns retweets into something similar to tweets
      handleRetweet: {
        func: function handleRetweet (tweet) {
          if(tweet.data.retweeted_status) {
            if(settings.get("stream", "showRetweets")) {
              var orig = tweet.data;
              tweet.data = tweet.data.retweeted_status;
              tweet.retweet = orig;
            } else {
              console.log(JSON.stringify(tweet, null, " "));
              return;
            }
          }
          this();
        }
      },
      
      // we only show tweets. No direct messages. For now
      tweetsOnly: {
        func: function tweetsOnly (tweet, stream) {
          if(tweet.data.text != null) {
            if(stream.count == 0) {
              $(document).trigger("tweet:first");
            }
            stream.count++;
            if(tweet.data.user.id == stream.user.user_id) {
              tweet.yourself = true;
            }
            this();
          }
        }
      },
      
      // marks a tweet whether we've ever seen it before using localStorage
      everSeen: {
        func: function everSeen (tweet, stream) {
          var key = "tweet"+tweet.data.id;
          if(window.localStorage) {
            keyValue.Store("screen_names").set("@"+tweet.data.user.screen_name, 1);
            if(window.localStorage[key]) {
              tweet.seenBefore = true;
            } else {
              window.localStorage[key] = 1;
            }
            var data = tweet.retweet ? tweet.retweet : tweet.data;
            var newest = stream.newestTweet();
            if(data.id > newest) {
              stream.newestTweet(data.id);
            }
          }
          this();
        }
      },
      
      // find all mentions in a tweet. set tweet.mentioned to true if the current user was mentioned
      mentions: {
        regex: /(^|\W)\@([a-zA-Z0-9_]+)/g,
        func: function mentions (tweet, stream, plugin) {
          var screen_name = stream.user.screen_name;
          tweet.mentions = [];
          tweet.data.text.replace(plugin.regex, function (match, pre, name) {
            if(name == screen_name) {
              tweet.mentioned = true;
            }
            tweet.mentions.push(name);
            return match;
          });
          this();
        }
      },

      // translate 
      translate: {
        func: function translate (tweet, stream) {
          // if stream.translate setting is disable, or translate has been already tried, do nothing and go on
          if( settings.get("stream", "translate") == false || tweet.translateProcess ){
            this();
            return;
          }
          var dstLang	= settings.get("stream", "preferedLanguage");
          var gtranslate_proc	= new gTranslateProc(tweet.data.text);
          tweet.translateProcess= true;
          google.language.translate(gtranslate_proc.prepared_text, "", dstLang, function(result){
            //console.log("tweet to translate [", result, "] ", tweet);
            if(result.error)	return;
            var srcLang	= result.detectedSourceLanguage;
            if( srcLang == dstLang )	return;
            //console.log("[", srcLang, "] ", tweet.data.text)
            //console.log("[", dstLang, "] ", result.translation);	    
            /**
             * - UI issue
             *   - how to show users than this tweet as been translated
             *   - how to show users that a translation is available
             *   - how to allow translation back and forth
             *     - toggle as tweet action is ok
            */
            tweet.translate	= {
              srcLang	: srcLang,
              curLang	: dstLang,
              texts		: {}
            }
            var srcText	= tweet.data.text;
            var dst_text	= gtranslate_proc.process_result(result.translation);
            tweet.translate.texts[srcLang]	= srcText;
            tweet.translate.texts[dstLang]	= dst_text;
            // reprocess this tweet
            stream.reProcess(tweet);
      	  });
          this();
        }
      },

      // set the tweet template
      template: {
        func: function templatePlugin (tweet) {
          tweet.template = template;
          this();
        }
      },
      
      // render the template (the underscore.js way)
      renderTemplate: {
        func: function renderTemplate (tweet, stream) {
          tweet.html = tweet.template({
            stream: stream,
            tweet: tweet,
            helpers: helpers
          });
          this();
        }
      },
      
      // if a tweet with the name id is in the stream already, do not continue
      avoidDuplicates: {
        func: function avoidDuplicates (tweet, stream) {
          var id = tweet.data.id;
          if(Tweets[id] && tweet.streamDirty) {
      	    this();
      	  } else if(Tweets[id]) {
            // duplicate detected -> do not continue;
          } else {
            Tweets[id] = tweet;
            this();
          }
        }
      },
      
      // 
      conversations: {
        func: function conversations (tweet, stream, plugin) {
          var id = tweet.data.id;
          var in_reply_to = tweet.data.in_reply_to_status_id;
          if(tweet.data._conversation) {
            tweet.conversation = Conversations[id] = tweet.data._conversation
          }
          else if(Conversations[id]) {
            tweet.conversation = Conversations[id];
          }
          else if(Conversations[in_reply_to]) {
            tweet.conversation = Conversations[id] = Conversations[in_reply_to];
          } else {
            tweet.conversation = Conversations[id] = {
              index: ConversationCounter++
            };
            if(in_reply_to) {
              Conversations[in_reply_to] = tweet.conversation;
            }
          }
          tweet.fetchNotInStream = function (cb) {
            var in_reply_to = tweet.data.in_reply_to_status_id;
            if(in_reply_to && !Tweets[in_reply_to]) {
              rest.get("/1/statuses/show/"+in_reply_to+".json", function (status) {
                if(status) {
                  status._after = tweet;
                  status._conversation = tweet.conversation;
                  stream.process(tweetModule.make(status));
                  if(cb) {
                    cb(status);
                  }
                }
              })
            }
          };
          this();
        }
      },
      
      // put the tweet into the stream
      prepend: {
        func: function prepend (tweet, stream) {
          var previous_node	= tweet.node;
          tweet.node = $(tweet.html);
          tweet.node.data("tweet", tweet); // give node access to its tweet
          if( tweet.streamDirty ){
            console.assert(previous_node);
            previous_node.replaceWith(tweet.node);		
          } else if(tweet.data._after) {
            var target = tweet.data._after;
            target.node.after(tweet.node);
            tweet.fetchNotInStream();
          } else {
            stream.canvas().prepend(tweet.node);
          }
          this();
        }
      },
      
      // htmlencode the text to avoid XSS
      htmlEncode: {
        func: function htmlEncode (tweet, stream, plugin) {
          if( ! tweet.translate ){
            var text	= tweet.data.text;
          }else{
            var text	= tweet.translate.texts[tweet.translate.curLang];
          }
          text = helpers.htmlDecode(text);
          text = helpers.htmlEncode(text);
          tweet.textHTML = text;
          this();
        }
      },
      
      // calculate the age of the tweet and update it
      // tweet.created_at now includes an actual Date
      age: {
        func: function age (tweet) {
          tweet.created_at = new Date(tweet.data.created_at);
          function update () {
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
            var text = "";
            for(var unit in units) { // hopefully nobody extends Object :) Should use Object.keys instead.
              var val = units[unit];
              if(val > 0) {
                text = "";
                text += val + " " + unit;
                if(val > 1) text+="s "; // !i18n
              }
            };
            
            if(tweet.node) {
              tweet.node.find(".created_at a").text(text);
            }
          }
          update()
          setInterval(update, 5000)
          this();
        }
      },
      
      // Format text to HTML hotlinking, links, things that looks like links, scree names and hash tags
      // Also filters out some more meta data and puts that on the tweet object. Currently: hashTags
      formatTweetText: {
        //from http://gist.github.com/492947 and http://daringfireball.net/2010/07/improved_regex_for_matching_urls
        GRUBERS_URL_RE: /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig,
        SCREEN_NAME_RE: /(^|\W)\@([a-zA-Z0-9_]+)/g,
        HASH_TAG_RE:    /(^|\s)\#(\S+)/g,
        func: function formatTweetText (tweet, stream, plugin) {
          var text = tweet.textHTML;
          
          text = text.replace(plugin.GRUBERS_URL_RE, function(url){
            return '<a href="'+((/^\w+\:\//.test(url)?'':'http://')+helpers.html(url))+'">'+helpers.html(url)+'</a>';
          })
					
          // screen names
          text = text.replace(plugin.SCREEN_NAME_RE, function (all, pre, name) {
            return pre+'<a href="http://twitter.com/'+name+'" class="user-href">@'+name+'</a>';
          });
          // hash tags
          tweet.hashTags = [];
          text = text.replace(plugin.HASH_TAG_RE, function (all, pre, tag) {
            tweet.hashTags.push(tag);
            return pre+'<a href="http://search.twitter.com/search?q='+encodeURIComponent(tag)+'" class="tag">#'+tag+'</a>';
          });
          
          tweet.textHTML = text;
          
          this();
        }
      },
      
      // runs the link plugins defined in app.js on each link
      executeLinkPlugins: {
        func: function executeLinkPlugins (tweet, stream) {
          var node = $("<div>"+tweet.textHTML+"</div>");
          var as = node.find("a");
          
          as.each(function () {
            var a = $(this);
            stream.linkPlugins.forEach(function (plugin) {
              plugin.func.call(function () {}, a, tweet, stream, plugin);
            })
          })
          
          tweet.textHTML = node.html();
          this();
        }
      },
      
      // Trigger a custom event to inform everyone about a new tweet
      // Event is not fired for tweet from the prefill
      newTweetEvent: {
        func: function newTweetEvent (tweet) {
          // Do not fire for tweets
          if(!tweet.prefill) {
            // { custom-event: tweet:new }
            tweet.node.trigger("tweet:new", [tweet])
          }
          this();
        }
      },
      
      // when we insert a new tweet
      // adjust the scrollTop to show the same thing as before
      keepScrollState: {
        WIN: $(window),
        func: function keepScrollState (tweet, stream, plugin) {
          var next = tweet.node.next();
          if(next.length > 0) {
            var height = next.offset().top - tweet.node.offset().top;
            tweet.height = height;
            if(settings.get("stream", "keepScrollState")) {
              if(!tweet.prefill || !tweet.seenBefore) {
                var win = plugin.WIN;
                var cur = win.scrollTop();
              
                
                var top = cur + height;
                
                win.scrollTop( top );
              }
            }
          }
          this();
        }
      },
      
      // Notify the user via webkit notification
      webkitNotify: {
        // how many notifications are currently shown?
        current: 0,
        func: function webkitNotify(tweet, stream, plugin) {
          // only show tweets not seen before, while not prefilling, 
          // if we have the rights and its enabled in the settings
          if (!tweet.seenBefore && 
            !tweet.prefill &&
            !tweet.yourself &&
            plugin.current < 5 &&
            settings.get('notifications', 'enableWebkitNotifications') &&
            window.webkitNotifications && 
            window.webkitNotifications.checkPermission() == 0) {
            try {
              var notification = 
                window.webkitNotifications.createNotification(tweet.data.user.profile_image_url, 
                  tweet.data.user.name, 
                  tweet.data.text);
              notification.show();
              notification.onclose = function() {
                --plugin.current;
              } //onclose
              ++plugin.current;               
              //hide after 5 seconds
              setTimeout(function() {
                notification.cancel();
              }, 5000);
            } catch(e) {
            }
          }
          this();
        } 
      }
      
    }
      
  }
);
