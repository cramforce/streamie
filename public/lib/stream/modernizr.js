/*
 * Streamie specific extensions to Modernizr
 */

require.def("stream/modernizr",
  ["/ext/modernizr-1.5.js"],
  function(settings) {
    
    // Add test to modernizr to check whether the browser is able to display advanced utf8 characters
    Modernizr.addTest("non-utf8", function () {
      return navigator.userAgent.match(/Windows/) ? true : false; // TODO turn this into a feature test
    })
    
    return {}
  }
);