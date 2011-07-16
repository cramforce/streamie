require('./helper');

// console.dir(process.memoryUsage());

var counter = 0;
const NUM = 1000000;
var obj = {F:"B"};
expect("saveall");
var documents = nStore.new('fixtures/new.db', function () {
  for (var i = 0; i < NUM; i++) {
    documents.save((i % 1000) + 1, obj, function () {
    // documents.save(i, obj, function () {
    // documents.save(null, obj, function () {
      counter++;
      if (counter === NUM) {
        fulfill("saveall");
      }
    });
  }
});


// process.on('exit', function () {
//   console.dir(process.memoryUsage());
// });