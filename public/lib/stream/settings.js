/*
 * Settings for Streamie
 * These are global settings and thus the module is a singleton.
 * Settings use namespaces which should be short strings describing your
 * component like "notifications"
 *
 * Code needs to "register" namespaces and key within those namespaces.
 * By providing labels, defaultValues and possible values, we can auto generate
 * a UI to control the settings.
 *
 * The current implementation uses window.localStorage;
 */

require.def("stream/settings",
  function() {
    
    var defaultSettings = {};
    
    var settings;
    
    // init settings from localStorage
    function init() {
      if(settings) {
        return;
      }
      if(window.localStorage) {
        var val = window.localStorage["streamie.settings"];
        if(val) {
          settings = JSON.parse(val);
        } else {
          settings = {};
        }
      } else {
        console.log("We really need localStorage!")
        settings = {};
      }
    }
    
    // save to localStorage
    function persist() {
      if(window.localStorage) {
        init();
        window.localStorage["streamie.settings"] = JSON.stringify(settings);
      }
    }
    
    // Container class for namespaces inside the default setting.
    function Namespace(name, label, settings) {
      this.name     = name;
      this.label    = label;
      this.settings = settings;
    }
    Namespace.prototype = {
      keys: function () {
        return Object.keys(this.settings).sort()
      }
    }
    
    return {
      
      // register a namespace and give it a label (for the UI)
      registerNamespace: function (name, label) {
        if(defaultSettings[name]) {
          throw new Error("Namespace already exists: "+name)
        }
        defaultSettings[name] = new Namespace(name, label, {});
      },
      
      // register a key in a namespace and give it a label (for the UI)
      registerKey: function (namespace, key, label, defaultValue, values) {
        if(!defaultSettings[namespace]) {
          throw new Error("Unknown namespace "+namespace)
        }
        if(!key || !label || typeof defaultValue == "undefined") {
          throw new Error("Please provide all these parameters")
        }
        
        defaultSettings[namespace].settings[key] = {
          label: label,
          defaultValue: defaultValue,
          values: values // possible values
        }
      },
      
      // synchronous get of a settings key in a namespace
      get: function (namespace, key) {
        init();
        var ns = settings[namespace];
        if(ns) {
          if(key in ns) {
            return ns[key]
          }
          else {
            return defaultSettings[namespace].settings[key].defaultValue;
          }
          return defaultValue;
        } else {
          return defaultSettings[namespace].settings[key].defaultValue;
        }
      },
      
      // set a key in a namespace
      set: function (namespace, key, value) {
        init();
        var ns = settings[namespace];
        if(!ns) {
          ns = settings[namespace] = {};
        }
        ns[key] = value
        console.log("[settings] set "+namespace+"."+key+" = "+value);
        persist(); // maybe do this somewhat lazily, like once a second
      },
      
      // returns sorted (by name) list of namespaces
      namespaces: function () {
        var namespaces = Object.keys(defaultSettings).sort().map(function (name) {
          return defaultSettings[name];
        });
        return namespaces;
      },
      
      // debugging only. Direct access to all settings
      _data: function () {
        return settings;
      }
    }
  }
);