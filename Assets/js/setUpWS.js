$(document).ready(function(){
  var connected = false;

  // connect to the websocket
  ws = new WebSocket("ws://localhost:8000/receive/ws");
  // log any messages recieved
  ws.addEventListener("message", function(e) {
    console.log(e);
    var data = JSON.parse(e.data)
    // check to see what type of data was recieved
    if ( data instanceof Array) {
      addEvents(data)
    } else {
      console.log("Point recieved")

      // console.log(JSON.parse(str.data));
      // console.log(str);
      // var dirtyj = JSON.parse(str.data);
      // var cleanj  = {
      //   lat: dirtyj.lat,
      //   lng: dirtyj.lng,
      //   count: dirtyj.count
      // }
      // heatmapLayer.addData(cleanj);

    }
  });
  // on open display that the websocket connection succeeded

  ws.onopen = function (event) {
    console.log("Connection made!");
    connected = true;
  };

  // send a message when the clientID is entered
  $('button#id').click(function(){
    if (connected) {
      ws.send(JSON.stringify({
        clientID: $('input#cIDinput').val()
      }));
    }
  });
  // when the connection closes display that the connection has been made

  ws.onclose = function(event) {
    console.log("Connection closed.");
    connected = false;
  }
});
