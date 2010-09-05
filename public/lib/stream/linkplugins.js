/*
 * Plugins that do transformations on links in tweets
 * e.g. short URL expanding, image preview
 */

require.def("stream/linkplugins",
  ["stream/helpers", "/ext/parseUri.js"],
  function(helpers) {
    
    return {
      
      imagePreview: {
        name: "imagePreview",
        transformations: {
          standard: function (url) {
            return "http://"+url.host+"/show/thumb"+url.path;
          },
          yfrog: function (url) {
            return "http://"+url.host+url.path+".th.jpg";
          }
        },
        domains: ["img.ly", "twitpic.com", "yfrog"],
        func: function (a, tweet, stream, plugin) { // a is a jQuery object of the a-tag
          var prefixLength = "http://".length;
          var href = a.attr("href") || "";
          var domains = plugin.domains;
          for(var i = 0, len = domains.length; i < len; ++i) {
            var domain = domains[i];
            if(href.indexOf(domain) === prefixLength) {
              var url = parseUri(href);
              var trans = plugin.transformations[domain] || plugin.transformations.standard;
              var previewURL = trans(url);
              var image = new Image();
              image.src = previewURL;
              /*image.width = 150;
              image.height = 150;*/
              a.addClass("image").append(image);
            }
          }
        }
      },
    }
      
  }
);