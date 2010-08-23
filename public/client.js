(function () {

  var ol = document.createElement("ol");
  document.body.appendChild(ol)
  

  io.setPath('/socket.io/');
  var socket = new io.Socket('localhost', {
    port: 8080
  });
  socket.connect();
  socket.send('some data');
  socket.on('message', function(data) {
    data = JSON.parse(data);
    var li = document.createElement("li");
    li.textContent = data.text || JSON.stringify(data, null, " ");
    ol.appendChild(li);
  });
})();