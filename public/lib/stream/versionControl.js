/*
 * Module to help keep clients on the right version.
 *
 * Update public/version.txt to a higher value whenever you make a change that breaks client compat.
 */

require.def("stream/versionControl",
  function() {
    
    var currentVersion = null;
    
    function check() {
      $.get("/version.txt?bust="+(new Date).getTime(), function (data, status) {
        if(status == "success") {
          var version = data;
          if(version) {
            if(currentVersion) {
              if(currentVersion != version) {
                console.log("[VERSION CONTROL] new version "+version);
                if(confirm("A new version of Streamie is available. Click OK to reload.")) {
                  window.location.reload();
                }
              }
            }
            currentVersion = version;
          }
        }
      })
    }
    
    setInterval(check, 60 * 1000);
  }
);