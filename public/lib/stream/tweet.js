require.def("stream/tweet",
  function() {
    
    function make(data) {
      return new Tweet(data);
    }
    
    function Tweet(data) {
      this.data = data;
    }
    
    return {
      make: make
    }
      
  }
);