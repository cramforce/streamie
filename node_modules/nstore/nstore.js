var Path = require('path'),
    Fs = require('fs'),
    Step = require('step'),
    Pattern = require('pattern'),
    Hash = require('pattern/hash'),
    Queue = require('pattern/queue'),
    File = require('./lib/file');

const CHUNK_LENGTH = 40 * 1024,
      TAB = 9,
      NEWLINE = 10;

var nStore = module.exports = Pattern.extend({

  // Set up out local properties on the object
  // and load the datafile.
  initialize: function initialize(filename, callback) {
    this.filename = filename;
    this.fd = null;
    this.index = Hash.new();
    this.toWriteCallbacks = [];
    this.toWrite = Hash.new();
    this.isWriting = Hash.new();
    this.stale = 0;
    this.dbLength = 0;
    this.busy = false;
    this.filterFn = null;
    this.loadDatabase(callback);
    Object.seal(this);
  },

  get length() {
    return this.index.length;
  },

  genKey: function genKey() {
    // Lower 0x20 from Date.now and 0x100000000 from Math.random
    // Last character is from timestamp, the rest is random using full
    // precision of Math.random (32 bit integer)
    var key = (0x2000000000 * Math.random() + (Date.now() & 0x1f)).toString(32);
    if (this.index.hasOwnProperty(key) || this.toWrite.hasOwnProperty(key) || this.isWriting.hasOwnProperty(key)) {
      return this.genKey();
    }
    return key;
  },

  loadDatabase: function (callback) {
    var buffer = new Buffer(CHUNK_LENGTH);
    var index = Hash.new();
    var scanned = false;
    var self = this;
    var stale = 0;
    var counter = 0;
    this.busy = true;

    Fs.open(this.filename, 'a+', 0666, function (err, fd) {
      if (err) { callback(err); return; }
      var line = [0, null, null];
      function readChunk(position) {
        Fs.read(fd, buffer, 0, CHUNK_LENGTH, position, function (err, bytes) {
          if (err) throw err;
          if (!bytes) {
            scanned = position;
            check();
            return;
          }
          buffer.length = bytes;
          for (var i = 0; i < bytes; i++) {
            switch (buffer[i]) {
              case TAB:
                line[1] = position + i;
                next = NEWLINE;
                break;
              case NEWLINE:
                line[2] = position + i;
                emit(line);
                line = [position + i + 1, position + i, null];
                break;
            }
          }
          readChunk(position + bytes);
        });
      }
      readChunk(0);

      function check() {
        if (counter === 0 && scanned !== undefined) {
          self.dbLength = scanned;
          self.index = index;
          self.fd = fd;
          self.stale = stale;
          self.busy = false;
          process.nextTick(function () {
            if (typeof callback === 'function') callback(null, self);
            self.checkQueue();
          });
        }
      }

      function emit(line) {
        counter++;
        File.read(fd, line[0], line[1] - line[0], function (err, key) {
          if (index.hasOwnProperty(key)) {
            stale++;
          }
          if (line[2] - line[1] - 1 === 0) {
            delete index[key];
          } else {
            index[key] = {
              position: line[1] + 1,
              length: line[2] - line[1] - 1
            };
          }
          counter--;
          check();
        });

      }
    });
  },

  save: function save(key, doc, callback) {
    if (!key) {
      key = this.genKey();
    }
    this.toWrite[key] = doc;
    this.toWriteCallbacks.push(function (err) {
      if (err) callback(err);
      else callback(err, key);
    });
    this.checkQueue();
  },

  // Load a single record from the disk
  get: function getByKey(key, callback) {
    function missing() {
      var error = new Error("Document does not exist for " + key);
      error.errno = process.ENOENT;
      callback(error);
    }
    // Check the cache of just written values
    if (this.toWrite.hasOwnProperty(key)) {
      var value = this.toWrite[key];
      if (value === undefined) return missing();
      process.nextTick(function () {
        callback(null, value, key);
      });
      return;
    }
    // Check the cache of in-progress  values
    if (this.isWriting.hasOwnProperty(key)) {
      var value = this.isWriting[key];
      if (value === undefined) return missing();
      process.nextTick(function () {
        callback(null, value, key);
      });
      return;
    }
    // Read from disk otherwise
    try {
      var info = this.index[key];
      if (!info || info.length == 0) {
        missing();
        return;
      }

      File.read(this.fd, info.position, info.length, function (err, buffer) {
        if (err) { callback(err); return; }
        try {
          var data = JSON.parse(buffer.toString());
          callback(null, data, key);
        } catch (err) {
          callback(err);
        }
      });
    } catch (err) {
      callback(err);
    }
  },

  // Checks the save queue to see if there is a record to write to disk
  checkQueue: function checkQueue() {
    // Only run when not locked
    if (this.busy) return;
    // Skip if there is nothing to write
    if (this.toWriteCallbacks.length === 0) return;
    // Lock the table
    this.busy = true;

    // Grab items off the queue
    this.isWriting = this.toWrite;

    this.toWrite = Hash.new();

    var callbacks = this.toWriteCallbacks.splice(0, this.toWriteCallbacks.length);
    function callback(err) {
      for (var i = 0, l = callbacks.length; i < l; i++) {
        callbacks[i](err);
      }
      callbacks.length = 0;
      self.busy = false;
      self.checkQueue();
    }

    var updates = Hash.new(),
        offset = this.dbLength,
        self = this,
        output;

    // Use Step to handle errors
    Step(
      function () {
        // Serialize the data to be written
        output = self.isWriting.map(function (value, key) {
          var doc = value === undefined ? "" : JSON.stringify(value),
              docLength = Buffer.byteLength(doc),
              keyLength = Buffer.byteLength(key);

          // New data for the disk index
          updates[key] = {
            position: offset + keyLength + 1,
            length: docLength
          };

          offset += keyLength + docLength + 2;

          return key + "\t" + doc + "\n";
        }).join("");
        output = new Buffer(output);
        File.write(self.fd, output, self.dbLength, this);
      },
      function (err) {
        if (err) return callback(err);
        updates.forEach(function (value, key) {
          if (self.index.hasOwnProperty(key)) {
            self.stale++;
            if (value.length === 0) {
              delete self.index[key];
            }
          }
          if (value !== undefined) {
            self.index[key] = value;
          }
        });
        self.dbLength += output.length;
        callback();
      },
      callback
    );
  },

  // compactDatabase: function (clear, callback) {
  //   if ((!clear && this.stale === 0) || this.busy) return;
  //   var tmpFile = Path.join(Path.dirname(this.filename), this.genKey() + ".tmpdb"),
  //       tmpDb;
  //
  //   this.busy = true;
  //   var self = this;
  //   Step(
  //     function makeNewDb() {
  //       tmpDb = nStore.new(tmpFile, this);
  //     },
  //     function copyData(err) {
  //       if (err) throw err;
  //       if (clear) return true;
  //       var group = this.group();
  //       var copy = Step.fn(
  //         function (key) {
  //           self.get(key, this);
  //         },
  //         function (err, doc, key) {
  //           if (err) throw err;
  //           if (self.filterFn && self.filterFn(doc, key)) {
  //             return true;
  //           }
  //           tmpDb.save(key, doc, this);
  //         }
  //       );
  //
  //       self.index.forEach(function (info, key) {
  //         copy(key, group());
  //       });
  //     },
  //     function closeOld(err) {
  //       if (err) throw err;
  //       Fs.close(self.fd, this);
  //     },
  //     function moveNew(err) {
  //       if (err) throw err;
  //       Fs.rename(tmpFile, self.filename, this);
  //     },
  //     function transitionState(err) {
  //       if (err) throw err;
  //       self.dbLength = tmpDb.dbLength;
  //       self.index = tmpDb.index;
  //       self.fd = tmpDb.fd;
  //       self.stale = tmpDb.stale;
  //       return true;
  //     },
  //     function cleanup(err) {
  //       self.busy = false;
  //       process.nextTick(function () {
  //         self.checkQueue();
  //       });
  //       if (err) throw err;
  //       return true;
  //     },
  //     function prologue(err) {
  //       if (callback) {
  //         callback(err);
  //       }
  //     }
  //   );
  //
  // },

  remove: function removeByKey(key, callback) {
    try {
      var info = this.index[key];
      if (!info) {
        var error = new Error("Document does not exist for " + key);
        error.errno = process.ENOENT;
        callback(error);
        return;
      }
      this.save(key, undefined, callback);
    } catch(err) {
      callback(err);
    }
  },

});
Object.freeze(nStore);
