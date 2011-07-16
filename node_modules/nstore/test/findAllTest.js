require('./helper');
nStore = nStore.extend(require('nstore/query')());


expect("load");
var store = nStore.new('fixtures/new.db', function () {
	expect("all");
	fulfill("load");
	Step(
		function() { store.all(this); },
		function() { fulfill("all"); } 
	);
});
