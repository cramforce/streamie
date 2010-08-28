/*
 * Whatever is defined here will be available in the helpers variable of underscore templates.
 */

require.def("stream/helpers",
  function() {
    
    return {
      // encode text into HTML to avoid XSS attacks.
      // underscore templates do not auto encode. If in doubt, use this!
      html: function html(text) {
        text = text.toString().replace(/&/g, "&amp;");
        text = text.replace(/</g, "&lt;");
        text = text.replace(/>/g, "&gt;");
        text = text.replace(/"/g, "&quot;");
        text = text.replace(/'/g, "&#39;");
        return text;
      }
    }
      
  }
);