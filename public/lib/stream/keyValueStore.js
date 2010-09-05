/*
 * A keyValueStore. Puts stuff in LocalStorage. Persists lazily once a second.
 * If you have this open in multiple windows. You loose data. Randomly.
 * You should thus only use it for stuff that isn't as important.
 */

require.def("stream/keyValueStore",
  function() {
    
    var Instances = {};
    
    function Store(name) {
      this.name = name;
      this.storage = {};
      var self = this;
      setInterval(function () {
        self._persistSync();
      }, 1000);
      
      Instances[name] = this;
      this._load();
    }
    
    // get a key
    Store.prototype.get = function (key) {
      return this.storage[key];
    }
    
    // set a key
    Store.prototype.set = function (key, val) {
      var cur = this.storage[key];
      if(cur != val) {
        this.storage[key] = val;
        this.dirty = true;
      };
    }
    
    // returns all keys in the store
    Store.prototype.keys = function (key, val) {
      return Object.keys(this.storage);
    }
    
    Store.prototype._load = function () {
      var val =  window.localStorage["store:"+this.name];
      if(val) {
        this.storage = JSON.parse(val);
      }
    }
    
    Store.prototype._persistSync = function () {
      if(this.dirty) {
        window.localStorage["store:"+this.name] = JSON.stringify(this.storage);
      }
    }
    
    return {
      Store: function (name) {
        var cur = Instances[name];
        if(cur) return cur;
        return new Store(name);
      }
    }
      
  }
);