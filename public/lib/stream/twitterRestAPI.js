
/*
 * Allows calling of all Twitter REST APIs.
 * OAuth, etc. is handled by backend
 *
 * You can make all Rest API calls document here http://apiwiki.twitter.com/Twitter-API-Documentation
 * Including and especially the authenticated APIs
 * 
 * For examples of usage of API calls, see
 * streamplugins.js/prefillTimeline &
 * status.js
 *
 * In development load the page with ?cache in the URL to fetch data from localStorage
 *
 */

require.def("stream/twitterRestAPI",
  function() {
    
    var devCacheEnabled = location.search.match(/cache/); // enable an API cache to make loading faste in development
    var DevCache = {};
    
    function handler(method, url, requestData, callback) {
      
      if(devCacheEnabled) {
        var cache = sessionStorage.getItem("devcache:"+url);
        if(cache) {
          cache = JSON.parse(cache);
          setTimeout(function () {
            callback(cache.data, cache.status);
          }, 0)
        }
      }
      
      var success = function(data, status, xhr) {
        if(devCacheEnabled) {
          if(status == "success") {
            sessionStorage.setItem("devcache:"+url, JSON.stringify({
              data: data,
              status: status
            }));
          }
        }
        callback.apply(this, arguments);
      };
      
      var error = function (xhr, status, errorThrown) {
        console.log("[Twitter RestAPI Error] Status '"+xhr.statusText+"' URL: "+url+" Request Data "+JSON.stringify(requestData)); // always log to the console if there was an API error
        callback.apply(this, arguments); // we always call the callback. Check our status!
      };
      
      // make the actual request
      $.ajax({
        url: "/twitter"+url, // all URLs starting with /twitter get proxied to twitter (with oauth signing)
        type: method, // Why is this not called method in jQuery?
        data: requestData,
        success: success,
        error: error
      });
    }
    
    var api = {
      // make get requests. Callback is Function(data, status, xhr) where status is "success" or something else
      get: function (url, data, callback) {
        if(typeof data == "function") { // data can be left out
          callback = data;
          data = null;
        }
        handler("GET", url, data, callback);
      },
      
      // make post requests. Callback is Function(data, status, xhr) where status is "success" or something else
      post: function (url, data, callback) {
        if(typeof data == "function") { // data can be left out
          callback = data;
          data = null;
        }
        handler("POST", url, data, callback);
      }
    };
    
    return api;
  }
);