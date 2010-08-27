require.def("stream/status",
  ["stream/twitterRestAPI"],
  function(rest) {
    
    return {
      observe: {
        name: "oberserve",
        func: function (tweet) {
          $(document).delegate("form.status", "submit", function (e) {
            var form = $(e.target);
            var status = form.find("[name=status]");
            if(status.val().length > 140) return false;
            rest.post(form.attr("action"), form.serialize(), function () {
              form.find("textarea,input[type=hidden]").val("");
            })
            return false;
          });
          
          $(document).delegate("form.status [name=status]", "keyup change paste", function (e) {
            var val = e.target.value;
            var target = $(e.target).closest("form").find(".characters");
            target.text( e.target.value.length + " characters" );
          })
        }
      },
    }
      
  }
);