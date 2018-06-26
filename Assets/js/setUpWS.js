'use strict';
$(document).ready(function(){
  var connected = false;

  // connect to the websocket
  var ws = new WebSocket("ws://localhost:8000/receive/ws");
  // log any messages recieved
  ws.addEventListener("message", function(e) {
    var data = JSON.parse(e.data)
    // check to see what type of data was recieved
    if ( data instanceof Array) {
      addEvents(data)
    } else {

      var cleanj  = {
        lat: data.lat,
        lng: data.lng,
        count: data.count
      };
      heatmapLayer.addData(cleanj);
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
  $("#enter").click(submitClientID);
  /**
   * addEvents takes in an array and outputs each element as a button for the user to click
   * @param events is the list pof events to be appended as the user's filtering options
   */
  function addEvents( events ) {
    // add all events to the select box as options
    $.each(events, function( index, value ) {
      $('select.eventList').append('<option id="' + index + '" value="' + value + '">' + value + '</option>');
    });
    $('select.eventList').select2();
    $('.pull-left #filterSubmit').click(function() {sendActiveEventList()});
  }

  /**
   *  sendActiveEventList checks to see which events to send back as active
   */
  function sendActiveEventList() {
    var events = {'filter':[]};
    // determine if there is an 'active'
    if ($('.select2-selection__choice').length > 0 ) {
      // collect all id's for the events that are 'active'
      $.each($('.select2-selection__choice'), function( index, value ) {
          events.filter.push(value.title);
      });
    }
    // send the the events to the server
    ws.send(JSON.stringify(events));
  }

  /**
   * submitClientID gets the user provided clientID and sends it to the server
   */
  function submitClientID() {
    console.log($("#cIDinput").val());
    var clientName = {clientID: $("#cIDinput").val()};
    ws.send(JSON.stringify(clientName));
  }
});
