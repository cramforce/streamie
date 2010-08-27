
/*
 * Allows calling of all Twitter REST APIs.
 * OAuth, etc. is handled by backend
 */

require.def("stream/twitterRestAPI",
  function() {
    
    return {
      get: function (url, data, callback) {
        $.get("/twitter"+url, data, callback);
      },
      
      post: function (url, data, callback) {
        $.post("/twitter"+url, data, callback);
      }
    }
      
  }
);