# nStore

A simple in-process key/value document store for node.js. nStore uses a safe append-only data format for quick inserts, updates, and deletes.  Also a index of all documents and their exact location on the disk is stored in in memory for fast reads of any document.  This append-only file format means that you can do online backups of the datastore using simple tools like rsync.  The file is always in a consistent state.

## Warning

This library is still under development.  There are bugs.  APIs will change.  Docs may be wrong.

Keep in mind this is something I make in my free time and that's something I've had very little of lately thanks to my many other projects.  I would love for someone with database and javascript smarts to partner with to make nStore super awesome.

## Setup

All the examples assume this basic setup. Loading the database is async so there is a callback for when it's safe to query the database.

Creating a database is easy, you just call the nStore function to generate a collection object.

    // Load the library
    var nStore = require('nstore');
    // Create a store
    var users = nStore.new('data/users.db', function () {
      // It's loaded now
    });


## Creating a document

To insert/update documents, just call the save function on the collection.

    // Insert a new document with key "creationix"
    users.save("creationix", {name: "Tim Caswell", age: 29}, function (err) {
        if (err) { throw err; }
        // The save is finished and written to disk safely
    });

    // Or insert with auto key
    users.save(null, {name: "Bob"}, function (err, key) {
        if (err) { throw err; }
        // You now have the generated key
    });

## Loading a document

Assuming the previous code was run, a file will now exist with the persistent data inside it.

    // Load the document with the key "creationix"
    users.get("creationix", function (err, doc, key) {
        if (err) { throw err; }
        // You now have the document
    });


## Removing a document

Remove is by key only.

    // Remove our new document
    users.remove("creationix", function (err) {
        if (err) { throw err; }
        // The document at key "creationix" was removed
    });

## Clearing the whole collection

You can also quickly clear the entire collection

    // Clear
    users.clear(function (err) {
      // The database is now empty
    });

This clears all the keys and triggers a compaction.  Only after the compact finishes is the data truly deleted from the disk, however any further queries cannot see the old data anymore.

## Querying the database

There are no indexes, however, nStore provides a simple query interface to get at data quickly and easily.  You can filter using `condition` expressions or plain functions.

To use queries, you need to include the query addon.

    var nStore = require('nstore');
    nStore = nStore.extend(require('nstore/query')());

### Query as a single callback

For convenience you can pass in a callback and get the results as a single object.

    // Using a callback for buffered results
    users.find({age: 29}, function (err, results) {
      // results is an object keyed by document key with the document as the value
    });


### Query using streams.

Also you can stream results.

    var stream = users.find({age: 29});
    stream.on("document", function (doc, key) {
      // This is a single document
    });
    stream.on("end", function () {
      // No more data is expected
    })

### `all` shortcut

If you want no condition you can use the `all()` shortcut.

    users.all(function (err, results) {
      // All the users are now in a single object.
    });

### Structure of `condition` expressions.

A simple condition is pairs of key's and values.  This builds a condition where all columns named by the key must equal the corresponding value.

This matches rows where `name` is `"Tim"` and `age` is `29`:

    {name: "Tim", age: 29}

If a key contains space, then the operator after it is used instead of equal.

This matches rows where `age` is greater than `18` and `age` is less than `50`:

    {"age >": 18, "age <": 50}

The supported operators are:

 - `<` - less than
 - `<=` - less than or equal to
 - `>=` - greater than or equal to
 - `>` - greater than
 - `!=` or `<>` - not equal to
  
If an array of hash-objects is passed in, then each array item is grouped and ORed together.

This matches `name` is `"Tim"` or `age` < `8`:

    [{name: "Tim"}, {"age <": 8}]


## Special compaction filter

There are times that you want to prune stale data from a database, like when using nStore to store session data.  The problem with looping over the index keys and calling `remove()` on them is that it bloats the file. Deletes are actually appends to the file.  Instead nStore exposes a special filter function that, if specified, will filter the data when compacting the data file.

    // Prune any items that have a doc.lastAccess older than 1 hour.
    var session = nStore.new('data/sessions.db', function () {
      // It's loaded now
    });
    session.filterFn = function (doc, meta) {
      return doc.lastAccess > Date.now() - 360000;
    };

