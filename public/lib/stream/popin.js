/*
 * Module to represent a popin window
 *
 * So far no support for dragging, resizing, etc.
 *
 */

require.def("stream/popin",
  function() {
    
    function makeModal(ele) {
      var overlay = $("#overlay");
      if(overlay.length == 0) {
        overlay = $('<div id="overlay" class="modalOverlay" />');
        $("body").append(overlay);
      }
      overlay.show();
    }
    
    function hideModal() {
      $("#overlay").hide();
    }
    
    return {
      // show a popin from the given id
      show: function (id, options) { // options.modal
        var ele = $("#"+id);
        
        var defaults = {
          modal: true
        };
        
        if(!options) options = {};
        jQuery.extend(options, defaults)
        
        ele.delegate(".close", "click", function (e) {
          $(e.target).trigger("close");
        });
        ele.bind("close", function (e) {
          hideModal();
          ele.removeClass("show");
        });
        
        if(options.modal) {
          makeModal(ele);
        }
        
        ele.addClass("show");
        
        return {
          close: function () {
            ele.trigger("close");
          }
        }
      }
    }
      
  }
);