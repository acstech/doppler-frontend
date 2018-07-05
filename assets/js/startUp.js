  'use strict';
  // none of these varaibles or functions are accessible outside of this document ready function
  $(document).ready(function(){
    var success = false, // keeps track of whether an error occurred during client validation
        ws, // websocket
        sidebarToggle = $('.menu-toggle'), // makes one traversal to get the DOM element
        body = $('body'), // speeds up the appending an element to the body DOM element
        timeDisplay = $('#time'), // find the id time once for speeding up later DOM manipulation
        clientID, // is used to reduce DOM element lookup
        clientSubmit, // makes manipulating the clientSubmit button easy
        eventList = $('#eventList'),
        eventMap = new Map(), // makes adding new events during runtime simple and fast
        eventUL = $(".dropdown-events dd ul"), // makes element manipulation faster due to one DOM lookup
        newEvent = $('#newEvent'), // makes element manipulation faster due to one DOM lookup
        fade = function() {
          newEvent.fadeOut();
        },
        checked = ''; // determines whether or not an event comes in as checked or not
    const startModalBody =  '<form idCheck=""><div class="form-group">' +
                            '<input id="cIDinput" type="text" class="form-control" name="clientIDBox" placeholder="ID" value="">' +
                            '</div></form><p id="modaltext"> </p>',
          startModalBtn =   '<button type="submit" id="enter" class="btn btn-primary" disabled>Enter</button>',
          errorModalBody =  '<p class="text-danger" id="errorMessage"></p>',
          errorModalBtn =   '<button type="button" id="errorDismiss" class="btn btn-primary" data-dismiss="modal">Okay</button>',
          resetModalBody =  'Changing Filters Will Result In A Map Reset!!',
          resetModalBtn =   '<button type="button" id="resetButtonFinal" class="btn btn-danger" data-dismiss="modal">Change</button>';
    // add toggle to sidebar
    $("#sidebar-wrapper").slideReveal({
      trigger: $("#toggle"),
      push: true,
      width: 390,
      autoEscape: false
    });
    // start showing the time to the user
    displayTime();
    // add event listener on the menu button to open and close the menu tab
    sidebarToggle.click(function(){
      sidebarToggle.toggleClass('open');
    });

    // try to connect to the websosket, if there is an error display the error modal
    try {
      ws = new WebSocket("ws://localhost:8000/receive/ws");
      // if an error occurs opening the websocket the modal will not load
      createModal('startModal', 'Please Enter Your Client ID:', true, startModalBody,
                  false, startModalBtn ); // creates the starting modal
      // starting modal opens
      $('#startModal').modal();
      $('#filterSubmit').click(openMapResetModal);
      // listen to see if a clientID is entered in the input box
      clientID = $('#cIDinput');
      clientSubmit = $('#enter');
      clientID.on('input',function() {
        if (this.value.trim().length > 0 ) { // the user has actually input text
          clientSubmit.prop("disabled",false);;
        } else { // disable the button becuase the input box is empty
          clientSubmit.prop("disabled",true);
        }
      });
      // on open display that the websocket connection succeeded
      ws.onopen = function (event) {
        console.log("Connection made!");
      };
      // log any messages recieved
      ws.addEventListener("message", function(e) {
        var data = JSON.parse(e.data);
        if ( data instanceof Array) {
            addEvents(data);
            hideModal('startModal');
        } else {
          if (JSON.stringify(data).indexOf("Error") != -1) { // if error recieved
            console.log("Error:" + data.Error);
            if (!success) {
              $('#modaltext').text(data.Error);
            } else { // open error modal for the user
              errorModal(data.Error);
            }
          } else if (JSON.stringify(data).indexOf("Success") != -1) {
            console.log("Success:" + data.Success);
            if (!success) {
              $('#modaltext').text(data.Success);
            } else { // open error modal for the user
              successModal(data.Success);
            }
          } else { // if point(s) recieved
            addPoints(data);
          }
        }
      });
      // when the connection closes display that the connection has been made
      ws.onclose = function() {
        console.log("Connection closed.");
        errorModal('505: Unable to connect to live data.');
      };
      clientSubmit.click(submitClientID);
      // add event listeners for the drop down that make it show and hide
      $(".dropdown-events dt a").click( function() {
        eventUL.slideToggle('fast');
      });

      $(document).bind('click', function(e) {
        var $clicked = $(e.target);
        if (!$clicked.parents().hasClass("dropdown-events")) eventUL.hide();
      });
    } catch(err) {
      errorModal('505: Unable to connect to live data.');
    }

    /**
     * openMapResetModal opens a modal for resetting the map
     */
    function openMapResetModal()  {
      createModal('resetModal', 'Are You Sure You Want To Change Filters?', false,
                  resetModalBody, true, resetModalBtn); // create reset modal for future use
      // makes the modal open
      $('#resetModal').modal({
        keyboard: false
      });
      // add event listener for reseting the maps points
      $("#resetButtonFinal").click(function(){
        sendActiveEventList();
        resetMap();
      });
    }

    /**
     * hideModal hides the default user modal
     * @param {String} ID is the html id of the modal to hide
     */
    function hideModal( ID ){
      $('#' + ID).hide();
      body.removeClass('modal-open');
      $('.modal-backdrop').remove();
      $('#' + ID).remove(); // make sure that the modal is no longer in the DOM (makes element lookup fater)
    }

    /**
     * errorModal hides the regular modal and displays the error modal
     * @param {String} msg is the error message to display to the user
     */
    function errorModal( msg ) {
      hideModal('startModal'); // just in case the connection closes after the client ID has been validated
      createModal('errorModal', 'An error occurred.', true, errorModalBody,
                  false, errorModalBtn); // creates error modal
      // add error message
      $('#errorMessage').html(msg + '<br><br>Please reload the page to try again.');
      $('#errorModal').modal();
      // remove the modal from the DOM after 4 seconds
       $('#errorDismiss').click(function(){
        hideModal('errorModal');
      });
    }

    function successModal ( msg ) {
      hideModal('startModal'); // just in case the connection closes after the client ID has been validated
      createModal('successModal', 'Success', true, errorModalBody,
                  false, errorModalBtn); // creates error modal
      // add error message
      $('#errorMessage').html(msg);
      $('#successModal').modal();
      // remove the modal from the DOM after 4 seconds
      $('#errorDismiss').click(function(){
        hideModal('successModal');
      });
    }

    /**
     * addPoints takes in an obejct, parses that data into JSON, adds the relevant data to a map, and
     * then decides how to add the points to the map
     * @param {Object} data is an object that contains data such as lat, lng, and count
     */
    function addPoints(data) {
      var pointArr = JSON.parse(data),
          dataKeys = Object.keys(pointArr),
          dataValues = Object.values(pointArr),
          size = dataKeys.length,
          index,
          value;

      // goes through array and adds points based on if they already existed or not
      for (var i = 0; i < size; i++){
        index = dataKeys[i];
        value = dataValues[i];
        value.count = parseInt(value.count) * 100; // scale the point so it does not decay too quickly
        // check whether or not the 'bucket' already exists
        if (dataMap.has(index)) {
          // update the count of the 'bucket'
          value.count = dataMap.get(index).count + value.count;
          dataMap.set(index, value);

          // update the max and min for rendering the points relatively
          heatmapLayer._max = Math.max(heatmapLayer._max, dataMap.get(index).count);
          heatmapLayer._min = Math.min(heatmapLayer._min, dataMap.get(index).count);
        } else { // the 'bucket' is missing so add the new 'bucket'
          dataMap.set(index, value);

          // update the max and min for rendering the points relatively
          heatmapLayer._max = Math.max(heatmapLayer._max, dataMap.get(index).count);
          heatmapLayer._min = Math.min(heatmapLayer._min, dataMap.get(index).count);
        }
      }
      // redraw the heatmap
      heatmapLayer._draw();
    }

    /**
     * addEvents takes in an array and outputs each element as a button for the user to click
     * @param {Array} events is the list of events to be appended as the user's filtering options
     */
    function addEvents( events ) {
      // add all events to the select box as options
      var listEvents = eventList.html(); // gets all current event list items in string form
      // if the events that are to be added are the first, then add them as checked
      if ( eventMap.size === 0 && !success ) {
        checked = "checked";
      } else {
        checked = "";
      }
      $.each(events, function( index, value ) {
        if ( !eventMap.has(value)) { // the value does not already exist, so add it to the list
          listEvents += '<li><input type="checkbox" id="' + index + '" value="' + value + '" ' + checked + '> ' + value + '</li>';
          eventMap.set(value,value);
          if ( success ) { // if the events being added are not the initial batch display the message
            newEvent.text("New Event Filter Recieved").fadeIn();
            setTimeout(fade, 5000); // have the text dissapeat after 5 seconds
          }
        }
      });
      eventList.html(listEvents); // saves time on DOM lookup because it is all added at once
      eventList.height( eventMap.size * 40 + 'px' ); // dynamically allocate the height of the event list
      success = true; // the error messages should be displayed in the error modal
    }

    /**
     *  sendActiveEventList checks to see which events to send back as active
     */
    function sendActiveEventList() {
      // make sure websocket is open
      if(ws.readyState === ws.OPEN){
        var events = {'filter':[]},
            activeEvents = $('#eventList li input:checked');
        // determine if there is an 'active' event
        if (activeEvents.length > 0 ) {
          // collect all id's for the events that are 'active'
          $.each(activeEvents, function( index, value ) {
              events.filter.push(value.value);
          });
        }
        // send the the events to the server
        ws.send(JSON.stringify(events));
     }
    }

    /**
     * submitClientID gets the user provided clientID and sends it to the server
     */
    function submitClientID() {
      console.log(clientID.val());
      ws.send(JSON.stringify({clientID: clientID.val()}));
    }

    /**
     * createModal appends a modal to the body of the html page for later use
     * @param {String} ID is the html id associated with the modal
     * @param {String} title is the text to be displayed as the text of the modal title
     * @param {Boolean} forceStay is whether or no the user should be able to click off of the modal
     * @param {String} modalBody is the html elements to be placed in the body of the modal
     * @param {Boolean} cancel is whether or not a cancel button should be shown
     * @param {String} submitBtn is the string reprentation of the html for the submit button
     */
    function createModal ( ID, title, forceStay, modalBody, cancel, submitBtn) {
      // create the modal html in string representation
      var modal = '<div class="modal fade" id="' + ID + '" tabindex="-1" role="dialog" aria-labelledby="startModalTitle" aria-hidden="false"> data-keyboard="false"';;
      if ( forceStay ) {
        modal = '<div class="modal fade" id="' + ID + '" tabindex="-1" role="dialog" aria-labelledby="startModalTitle" aria-hidden="false" data-backdrop="static" data-keyboard="false" >';
      }
      modal += '<div class="modal-dialog modal-dialog-centered" role="document">';
      modal += '<div class="modal-content">';
      modal += '<div class="modal-header">';
      modal += '<h5 class="modal-title">' + title + '</h5>';
      modal += '</div>';
      modal += '<div class="modal-body">'
      modal += modalBody;
      modal += '</div>';
      modal += '<div class="modal-footer">';
      // add the cancel button if it is wanted
      if (cancel) {
        modal += '<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>';
      }
      modal += submitBtn;
      modal += '</div></div></div></div>';
      // append the modal to the body for later use
      body.append(modal);
      // handles if there are any page size changes
      $('#' + ID).modal('handleUpdate');
    }

    /**
     * resetMap removes all points on the map after the user confirms that the map is to be reset
     */
    function resetMap () {
      heatmapLayer.setData(emptyData);
      dataMap.clear(); // remove all data from storage
      hideModal('resetModal');
    }

    /**
     * displayTime displays live time on the map
     */
    function displayTime() {
      function checkTime(i) {
          return (i < 10) ? "0" + i : i;
      }
      var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var monthsArray = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];

      function startTime() {
          var today = new Date(),
              month = monthsArray[today.getMonth()],
              dateFrontEnd = today.getDate(), // not sure why I had to redeclare the varibles here
              year = today.getFullYear(),
              wd = days[today.getDay()],
              h = checkTime(today.getHours()),
              m = checkTime(today.getMinutes()),
              s = checkTime(today.getSeconds());
          timeDisplay.html(wd + " " + month + " "+ dateFrontEnd + " " + year + ": " + " "
                          + h + ":" + m + ":" + s);
          var t = setTimeout(function () {
            startTime();
          }, 500);
      }
      startTime();
    }

    // Get the input field fo hitting enter on keyboard to enter site
    var input = document.getElementById("cIDinput");
    var enter = document.getElementById("enter");
    // Execute a function when the user releases a key on the keyboard
    $(input).bind('keyup', function(event) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Number 13 is the "Enter" key on the keyboard
      if (event.keyCode === 13) {
        // Trigger the button element with a click
        $(enter).click();
      }
    });
  });
