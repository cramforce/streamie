require('./helper');

expect("load");
var users = nStore.new('fixtures/toDelete.db', function () {
  fulfill("load");
  assert.equal(users.length, 3, "There should be 3 users");

  expect("remove");
  users.remove("creationix", function (err) {
    fulfill("remove");
    if (err) throw err;
    assert.equal(users.length, 2, "There should be 2 users now");
    expect("get fail");
    users.get("creationix", function (err, doc, meta) {
      fulfill("get fail");
      assert.ok(err instanceof Error, "error is an Error");
      assert.equal(err.errno, process.ENOENT, "Error instance should be ENOENT");
      assert.ok(!doc, "no doc loaded");
      assert.ok(!meta, "no meta loaded");
    });
    expect("get");
    users.get("ryah", function (err, doc, meta) {
      fulfill("get");
      if (err) throw err;
      assert.ok(doc, "doc loaded");
      assert.ok(meta, "meta loaded");
      expect("clear");
      users.clear(function (err) {
        fulfill("clear");
        if (err) throw err;
      });
      assert.equal(users.length, 2, "There should be two users still");
    });
  });

  expect("fail");
  users.remove("baduser", function (err) {
      fulfill("fail");
      assert.ok(err instanceof Error, "error is an Error");
      if (err.errno !== process.ENOENT) throw err;
  });
});

