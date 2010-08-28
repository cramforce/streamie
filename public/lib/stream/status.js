require.def("stream/status",
  ["stream/twitterRestAPI", "stream/helpers", "text!../templates/status.ejs.html"],
  function(rest, helpers, replyFormTemplateText) {
    var replyFormTemplate = _.template(replyFormTemplateText);
    
    return {
      
      // observe events on status forms
      observe: {
        name: "oberserve",
        func: function (stream) {
          $(document).delegate("form.status", "submit", function (e) {
            var form = $(this);
            var status = form.find("[name=status]");
            if(status.val().length > 140) return false; // too long for Twitter
            
            rest.post(form.attr("action"), form.serialize(), function () {
              form.find("textarea").val("");
              form.trigger("status:send");
            })
            return false;
          });
          
          function updateCharCount (e) {
            var val = e.target.value;
            var target = $(e.target).closest("form").find(".characters");
            target.text( e.target.value.length + " characters" );
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
          $(document).delegate("#stream a.reply", "click", function (e) {
            e.preventDefault();
            var li = $(this).closest("li");
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
                $(window).scrollTop(0); // Good behavior?
              })
            }
            form.show();
          })
        }
      }
    }
      
  }
);