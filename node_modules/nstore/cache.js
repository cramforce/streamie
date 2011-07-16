// This plugin implements an MRU cache to speed up reads
module.exports = function CachePlugin(maxSize) {
  var values = {},
      items = 0;

  function push(key, doc) {
    if (!values.hasOwnProperty(key)) {
      if (items >= maxSize) return;
      items++;
    }
    values[key] = doc;
  }

  var self = {
    save: function save(key, doc, callback) {
      // Go ahead and generate the auto key so we know what to cache
      if (!key) key = this.genKey();
      push(key, doc);
      // Call super
      self.__proto__.save.call(this, key, doc, callback);
    },
    get: function get(key, callback) {
      if (values.hasOwnProperty(key)) {
        var value = values[key];
        process.nextTick(function () {
          callback(null, value, key);
        });
        return;
      }

      // Call super
      self.__proto__.get.call(this, key, function (err, doc, key) {
        if (err) return callback(err);
        push(key, doc);
        callback(err, doc, key);
      });
    },
    remove: function remove(key, callback) {
      if (values.hasOwnProperty(key)) {
        delete values[key];
        items--;
      }
      // Call super
      self.__proto__.remove.call(this, key, callback);
    }
  };
  return self;
};

