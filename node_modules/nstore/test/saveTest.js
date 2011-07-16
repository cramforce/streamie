require('./helper');

var thesis = {
  title: "Node is cool",
  author: "creationix",
  reasons: ["Non-Blocking I/O", "Super Fast", "Powered by bacon"]
};

expect("load");
var documents = nStore.new('fixtures/new.db', function (err) {
  if (err) throw err;
  fulfill("load");

  expect("save");
  documents.save("thesis", thesis, function (err) {
    fulfill("save");
    if (err) throw err;
    assert.equal(documents.length, 1, "There should be 1 document in the collection");
    expect("get");
    documents.get("thesis", function (err, doc, key) {
      fulfill("get");
      if (err) throw err;
      assert.deepEqual(doc, thesis, "Loading it back should look the same");
      assert.equal(key, "thesis", "The key should be there");
    });

    expect("autokey");
    documents.save(null, thesis, function (err, key) {
      fulfill("autokey");
      if (err) throw err;
      assert.ok(key, "There should be a generated key");
      assert.equal(documents.length, 2, "There should be 2 documents in the collection");
      expect("get back");
      documents.get(key, function (err, doc, newKey) {
        fulfill("get back");
        if (err) throw err;
        assert.deepEqual(doc, thesis, "Loading it back should look the same");
        assert.deepEqual(newKey, key, "The new key should be the same");
      });

      setTimeout(function () {
        expect("delayed save");
        documents.save("slow", thesis, function (err, key) {
          fulfill("delayed save");
          if (err) throw err;
          assert.equal(documents.length, 3, "There should be 3 documents in the collection");
        });
      });

    });

  });



  
});


