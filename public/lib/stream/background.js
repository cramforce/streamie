/*
 * Module for managing background mode in Chrome.
 */

require.def("stream/background",
  function() {
    
    if(window.Streamie_Background) {
      $(document).bind("streamie:init:complete", function () {
        window.Streamie_Loaded = true;
      })
    } else {
      
      if(window.chrome.app.isInstalled) {
        var bg = window.open('/background.html#yay', 'background', 'background');
        window.Background = bg;
      }
    }
    
    return {}
  }
);