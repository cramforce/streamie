/*
 * A module for filtering tweets
 */

require.def("stream/tweet",
  function() {
    
    function attacheHideCSS(id, className;) {
      var style = '<style type="text/css" id="'+id+'">'+
        'body.'+className+' #content #stream li {display:none;}\n'+
        'body.'+className+' #content #stream li.'+className+' {display:block;}\n'+
        '</style>';
    
      style = $(style);
      $("head").append(style);
    }
    
    // why are there no methods here?
    // try to only use streamPlugins to deal with tweets!
    
    return {
      make: make // factory method
    }
      
  }
);