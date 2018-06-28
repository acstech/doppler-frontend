'use strict';
$(document).ready(function(){
  var connected = false;
  var success = false
  // connect to the websocket
  var ws = new WebSocket("ws://localhost:8000/receive/ws");
  // log any messages recieved
  ws.addEventListener("message", function(e) {
    var data = JSON.parse(e.data);
    if ( data instanceof Array) {
        addEvents(data)
        hideModal()
    } else {
      if (JSON.stringify(data).indexOf("Error") != -1) {
        console.log("Error:" + data.Error);
        if (!success) {
          $(modaltext).text(data.Error)
        }
      } else {
        success = true;
        var pointArr = JSON.parse(data);
        for (var i = 0; i < pointArr.length; i++){
          heatmapLayer.addData(pointArr[i]);
        }
        heatmapLayer._draw();
      }
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
    $('#eventList').empty();
    // add all events to the select box as options
    $.each(events, function( index, value ) {
        $('#eventList').append('<li><input type="checkbox" id="' + index + '" value="' + value + '" checked>' + value + '</li>');
    });
    $(".dropdown-events dt a").on('click', function() {
      $(".dropdown-events dd ul").slideToggle('fast');
    });
    
    $(".dropdown-events dd ul li a").on('click', function() {
      $(".dropdown-events dd ul").hide();
    });
    
    $(document).bind('click', function(e) {
      var $clicked = $(e.target);
      if (!$clicked.parents().hasClass("dropdown-events")) $(".dropdown-events dd ul").hide();
    });
    $('.pull-left #filterSubmit').click(function() {sendActiveEventList()});
  }

  /**
   *  sendActiveEventList checks to see which events to send back as active
   */
  function sendActiveEventList() {
    var events = {'filter':[]};
    // determine if there is an 'active'
    if ($('#eventList li input:checked').length > 0 ) {
      // collect all id's for the events that are 'active'
      $.each($('#eventList li input:checked'), function( index, value ) {
          events.filter.push(value.value);
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

  /**
   * hideModal hides the default user modal
   */
  function hideModal(){
    $('#exampleModalCenter').hide()
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  }
});
