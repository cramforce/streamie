

var Subscribers = {};

function Subscription (channels, cb) {
  this.channels = channels;
  this.cb = cb;
}

Subscription.prototype.unsubscribe = function () {
  var cb   = this.cb;
  this.channels.forEach(function (channel) {
    var subs = Subscribers[channel];
    if(subs) {
      var filtered = subs.filter(function (s) {
        return s !== cb;
      });
      if(filtered.length === 0) {
        delete Subscribers[channel]
      } else {
        Subscribers[channel] = filtered;
      }
    }
  })
}

exports.subscribe = function (channels, listenerCB) {
  if(typeof listenerCB != "function") {
    throw new Error("subscribe needs a callback parameter");
  }
  channels.forEach(function (channel) {
    var subs = Subscribers[channel];
    if(!subs) {
      subs = Subscribers[channel] = [];
    }
    subs.push(listenerCB);
  })
  return new Subscription(channels, listenerCB);
}

exports.publish = function (channel, data) {
  var subs = Subscribers[channel];
  if(subs) {
    for(var i = 0, len = subs.length; i < len; ++i) {
      subs[i](data, channel);
    }
  }
}

function ok(bool, msg) {
  if(bool) {
    console.log("OK "+msg);
  } else {
    console.log("OK "+msg);
  }
}

function test() {
  var pubsub = exports;
  var s0 = pubsub.subscribe(["foo", "bar"], function (data, channel) {
    console.log("Fire s0 "+channel+" "+data);
  });
  var s1 = pubsub.subscribe(["bar"], function (data, channel) {
    console.log("Fire s1 "+channel+" "+data);
  });
  var s2 = pubsub.subscribe(["foo", "bar", "baz"], function (data, channel) {
    console.log("Fire s2 "+channel+" "+data);
  });
  
  pubsub.publish("foo", 1);
  pubsub.publish("foo", 2);
  pubsub.publish("bar", 3);
  pubsub.publish("baz", 4);
  
  ok(Subscribers["bar"].length === 3, "3 subs to bar");
  s1.unsubscribe();
  pubsub.publish("bar", 5);
  ok(Subscribers["bar"].length === 2, "2 subs to bar");
  s2.unsubscribe();
  pubsub.publish("bar", 6);
  ok(Subscribers["bar"].length === 1, "1 subs to bar");
  s0.unsubscribe();
  ok(!("bar" in Subscribers), "no subscribers to bar");
  pubsub.publish("bar", 7);
  var s3 = pubsub.subscribe(["foo", "bar"], function (data, channel) {
    console.log("Fire s3 "+channel+" "+data);
  });
  ok(("bar" in Subscribers), "A subscriber came back");
  pubsub.publish("bar", 8);
}
