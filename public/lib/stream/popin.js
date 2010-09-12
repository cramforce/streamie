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
    
    var current;
    
    $(document).bind("key:escape", function (e) {
      if(current) {
        current.trigger("close");
        return false;
      }
    });
    
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
          current = null;
        });
        
        if(options.modal) {
          makeModal(ele);
          current = ele;
        }
        
        ele.addClass("show");
        ele.focus();
        
        return {
          close: function () {
            ele.trigger("close");
          }
        }
      }
    }
      
  }
);