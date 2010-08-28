require.def("stream/helpers",
  function() {
    
    return {
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