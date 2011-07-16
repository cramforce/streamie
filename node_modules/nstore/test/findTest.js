require('./helper');

// Enable the cache plugin
// (that only caches some of the values to test the cache miss)
nStore = nStore.extend(require('nstore/cache')(1900));
// Enable the query plugin
nStore = nStore.extend(require('nstore/query')());

var queries = [
  [{age: 50}, 2],
  [{"age =": 50}, 2],
  [{"age <": 50}, 100],
  [{"age <=": 50}, 102],
  [{"age >=": 50}, 1900],
  [{"age >": 50}, 1898],
  [{"age !=": 50}, 1998],
  [{"age <>": 50}, 1998],
  [{age: 50, name: "USER 50"}, 1],
  [{age: 50, name: "USER 51"}, 0],
  [[{age: 50}, {name: "USER 51"}], 3],
  [[{age: 50}, {name: "USER 50"}], 2],
  [{"age <": 50, "age >=": 40}, 20],
  [{"name <": "USER 50", "name >": "USER 40"}, 110],
  [[{age: 50}, {"name >": "USER 50", "age <": 60}], 74],
  [undefined, 2000],
  [[], 2000]
];
var start;

expect("load");
var store = nStore.new('fixtures/new.db', function () {
  fulfill("load");
  expect("one");
  expect("two");
  expect("three");
  Step(
    function () {
      fulfill("one");
      start = Date.now();
      var group1 = this.group();
      var group2 = this.group();
      for (var i = 0; i < 1000; i++) {
        store.save(null, {name: "USER " + i, age: i}, group1());
        store.save(null, {name: "User " + i, age: i}, group2());
      }
    },
    function (err, keys1, keys2) {
      fulfill("two");
      console.log("Insert %s ms", Date.now() - start);
      start = Date.now();

      expect("all");
      store.all(function (err, result) {
        if (err) throw err;
        fulfill("all");
        assert.equal(Object.keys(result).length, 2000, "There should be 200 rows");
      });

      if (err) throw err;
      assert.equal(store.length, 2000, "There should be 200 records now");
      var group = this.group();
      queries.forEach(function (pair, i) {
        store.find(pair[0], group());
      });
    },
    function (err, results) {
      fulfill("three");
      console.log("Query %s ms", Date.now() - start);
      if (err) throw err;
      assert.equal(results.length, queries.length, "All queries should come back");
      expect("result");
      results.forEach(function (result, i) {
        fulfill("result");
        var num = Object.keys(result).length;
        var expected = queries[i][1];
        assert.equal(num, expected, JSON.stringify(queries[i][0]) +
                  ": expected " + expected + " rows, but found " + num);
      });
    },
    function (err) {
      console.error(err.stack);
    }
  );

});
