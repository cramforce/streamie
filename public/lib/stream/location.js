/*
 * Module for fetching the user location
 */

require.def("stream/location",
  function() {
    
    var loc;
    
    $(document).bind("awake", function (e, duration) {
      if(duration > 5 * 60 * 1000) { // we slept a while, the user might be somewhere else now
        loc = null;
      }
    });
    
    // invalidate after timer?
    
    var busy = false;
    function get(cb) {
      if(loc) {
        return cb(loc);
      }
      if(!busy && navigator.geolocation) {
        busy = true;
        navigator.geolocation.getCurrentPosition(function (position) {
          // console.log(position.coords.latitude +";"+ position.coords.longitude) // left in for doc purposes :)
          loc = position;
          cb(loc);
          busy = false;
        })
      }
    }
    
    return {
      get: get
    }
      
  }
);