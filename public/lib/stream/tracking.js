/*
 * Does anonymous tracking of streamie usage
 */

require.def("stream/tracking",
  ["stream/settings"],
  function(settings) {
    
    settings.registerNamespace("tracking", "Tracking");
    settings.registerKey("tracking", "allowed", "Allow anonymous tracking of my usage of Streamie",  true);
    
    var events = [
      "status:send", 
      "tweet:new",
      "state:conversation",
      "state:mention",
      "state:retweet",
      "state:starred",
      "state:direct",
      "status:retweet",
      "status:favorite",
      "status:favoriteDestroy"
    ];
    
    function track(event, value) {
      if(settings.get("tracking", "allowed")) {
        
        var parts = event.split(":"); // split up the parts of the custom event
        var key   = parts[1];
        key = key.replace(/\d+/g, "");
        
        if(typeof _gaq != "undefined") {
          _gaq.push(['_trackEvent', parts[0], key, event, value]);
        }
      }
    }
    
    events.forEach(function (name) {
      $(document).bind(name, function (e, value) {
        track(name, value)
      })
    })
        
    return {}
  }
);