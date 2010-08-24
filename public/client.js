(function () {
  var ol = document.createElement("ol");
  document.body.appendChild(ol);

  io.setPath('/socket.io/');
  var socket = new io.Socket('localhost', { port: 8888 });
  socket.connect();
  socket.send('client connect');
  socket.on('message', function(data) {
    data = JSON.parse(data);
    // console.log(data);
    var li = document.createElement("li");
    li.textContent = data.text || JSON.stringify(data, null, " ");
    ol.appendChild(li);
    li.focus();
  });
})();
