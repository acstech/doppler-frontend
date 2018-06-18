// this is a testing socket that goes from the server to the client using the below

var ws = new WebSocket("ws://localhost:8000/v3/ws");

ws.addEventListener("message", function(e) {console.log(e);});
