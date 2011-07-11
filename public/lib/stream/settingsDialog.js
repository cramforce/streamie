/*
 * Module for the settings dialog
 */

require.def("stream/settingsDialog",
  ["stream/text", "stream/settings", "stream/helpers", "text!../templates/settingsDialog.ejs.html"],
  function(text, settings, helpers, templateText) {
    
    var template = _.template(templateText);
    
    var visible = false;
    function hide() {
      visible = false;
      $("#settings").removeClass("show");
    }
    function show() {
      visible = true;
      $("#settings").addClass("show");
    }
    
    function draw() {
      $("#settings").html(template({
        settings: settings,
        helpers: helpers,
        text: text.get
      }));
    }
    
    $(document).bind("settings:set", function () { // settings change redraw;
      if(visible) {
        draw();
      }
    });
    
    function bind() {
      $("#header").delegate(".settings > a", "click", function (e) {
        e.preventDefault();
        
        if(visible) {
          hide()
        } else {
          draw();
          show();
        }
      });
      
      // listen for changes on the settings. Immediately update settings.
      $("#header").delegate("#settingsForm input.setting, #settingsForm select.setting", "change", function () {
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