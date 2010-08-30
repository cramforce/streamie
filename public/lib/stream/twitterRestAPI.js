
/*
 * Allows calling of all Twitter REST APIs.
 * OAuth, etc. is handled by backend
 *
 * You can make all Rest API calls document here http://apiwiki.twitter.com/Twitter-API-Documentation
 * Including and especially the authenticated APIs
 */

require.def("stream/twitterRestAPI",
  function() {
    
    function handler(method, url, requestData, callback) {
      
      var success = function(data, status, xhr) {
        callback.apply(this, arguments);
      };
      
      var error = function (xhr, status, errorThrown) {
        console.log("[Twitter RestAPI Error] Status '"+xhr.statusText+"' URL: "+url+" Request Data "+JSON.stringify(requestData))
        callback.apply(this, arguments); // we always call the callback. Check our status!
      };
      
      $.ajax({
        url: "/twitter"+url,
        type: method,
        data: requestData,
        success: success,
        error: error
      });
    }
    
    var api = {
      // make get requests. Callback is Function(data, status, xhr) where status is "success" or something else
      get: function (url, data, callback) {
        if(typeof data == "function") {
          callback = data;
          data = null;
        }
        handler("GET", url, data, callback);
      },
      
      // make post requests. Callback is Function(data, status, xhr) where status is "success" or something else
      post: function (url, data, callback) {
        if(typeof data == "function") {
          callback = data;
          data = null;
        }
        handler("POST", url, data, callback);
      }
    };
    
    return api;
  }
);