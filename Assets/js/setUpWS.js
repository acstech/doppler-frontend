
$(document).ready(function(){
  var connected = false;

  ws = new WebSocket("ws://localhost:8000/receive/ws");
  ws.onopen = function (event) {
    console.log("Connection made!");
    connected = true;
  };


  ws.onclose = function(event) {
    console.log("Connection closed.");
    connected = false;
  }
});
