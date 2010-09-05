/*
 * Module for the settings dialog
 */

require.def("stream/settingsDialog",
  ["stream/settings", "stream/helpers", "text!../templates/settingsDialog.ejs.html"],
  function(settings, helpers, templateText) {
    
    var template = _.template(templateText);
    
    var visible = false;
    function hide() {
      visible = false;
      var elem = $("#settings");
      elem.removeClass("show").css("top", -elem.outerHeight());
    }
    function show() {
      visible = true;
      $("#settings").css("top", 65).addClass("show");
    }
    
    function bind() {
      hide();
      $("#header").delegate(".settings > a", "click", function (e) {
        e.preventDefault();
        
        if(visible) {
          hide()
        } else {
          $("#settings").html(template({
            settings: settings,
            helpers: helpers
          }));
          show();
        }
      });
      
      // listen for changes on the settings. Immediately update settings.
      $("#header").delegate("#settingsForm input.setting", "change", function () {
        var input   = $(this);
        var name    = this.name;
        var checked = input.is(":checkbox") ? this.checked : input.val();
        
        var parts = name.split(/\./);
        // parts[0] is always "settings"
        var namespace = parts[1];
        var key       = parts[2];
        settings.set(namespace, key, checked);
      });
      
      $("#header").delegate("#settingsForm .close", "click", hide)
    }
    
    return {
      init: {
        name: "init",
        func: bind
      }
    }
  }
);