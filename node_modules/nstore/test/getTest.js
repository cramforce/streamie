require('./helper');

expect("load");
var users = nStore.new('fixtures/sample.db', function () {
  fulfill("load");
  expect("get");
  users.get("creationix", function (err, doc, key) {
    fulfill("get");
    if (err) throw err;
    assert.deepEqual(doc, {name:"Tim Caswell",age:28}, "Document loaded");
    assert.deepEqual(key, "creationix", "Key Loaded");
  });

  expect("get2");
  users.get("tjholowaychuk", function (err, doc, key) {
    fulfill("get2");
    if (err) throw err;
    assert.deepEqual(doc, {name:"TJ Holowaychuck",country:"Canada"}, "Document loaded");
    assert.deepEqual(key, "tjholowaychuk", "Key Loaded");
  });

  expect("get missing");
  users.get("bob", function (err, doc, key) {
    fulfill("get missing");
    assert.ok(err instanceof Error, "error should be an Error");
    if (err.errno !== process.ENOENT) throw err;
    assert.equal(err.errno, process.ENOENT, "Error instance should be ENOENT");
    assert.ok(!doc, "no doc loaded");
    assert.ok(!key, "no key loaded");
  });
});

