/*
 * Class representing a tweet
 */

require.def("stream/tweet",
  function() {
    
    function make(data) {
      return new Tweet(data);
    }
    
    function Tweet(data) {
      this.data = data; // a tweet has data. Nothing else
    }
    
    // why are there no methods here?
    // try to only use streamPlugins to deal with tweets!
    
    return {
      make: make // factory method
    }
      
  }
);