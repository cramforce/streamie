/*
 * Whatever is defined here will be available in the helpers variable of underscore templates.
 */

require.def("stream/helpers",
  function() {
    
    var AMP_RE = /&/g;
    var LT_RE  = /</g;
    var GT_RE  = />/g;
    var QUOT_RE = /"/g;
    var SINGLE_RE = /'/g;
    
    return {
      // encode text into HTML to avoid XSS attacks.
      // underscore templates do not auto encode. If in doubt, use this!
      html: function html(text) {
        text = text.toString().replace(AMP_RE, "&amp;");
        text = text.replace(LT_RE, "&lt;");
        text = text.replace(GT_RE, "&gt;");
        text = text.replace(QUOT_RE, "&quot;");
        text = text.replace(SINGLE_RE, "&#39;");
        return text;
      }
    }
      
  }
);