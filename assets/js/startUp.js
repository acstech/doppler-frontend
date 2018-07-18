'use strict';
// none of these varaibles or functions are accessible outside of this document ready function
$(document).ready(function() {
  moment.suppressDeprecationWarnings = true;

  const cfg = { // configures the map's settings -- Matt
      // radius should be small ONLY if scaleRadius is true (or small radius is intended)
      // if scaleRadius is false it will be the constant radius used in pixels
      "radius": 20,
      "maxOpacity": 0.8, // put in slider on front-end side to adjust the opacity
      // scales the radius based on map zoom
      "scaleRadius": false,
      // if set to false the heatmap uses the global maximum for colorization
      // if activated: uses the data maximum within the current map boundaries
      //   (there will always be a red spot with useLocalExtremas true)
      "useLocalExtrema": false,
      // which field name in your data represents the latitude - default "lat"
      latField: 'lat',
      // which field name in your data represents the longitude - default "lng"
      lngField: 'lng',
      maxPoints: 35000, // will remove points when exceeded
      // which field name in your data represents the data value - default "value"
      valueField: 'count',
      blur: 1
    },
    startModalBody = '<div class="form-group">' +
    '<input id="cIDinput" type="text" class="form-control" name="clientIDBox" placeholder="ID" value="">' +
    '</div>',
    startModalBtn = '<button type="submit" id="enter" class="btn btn-primary" disabled>Enter</button>',
    resetModalBody = 'Changing Filters Will Result In A Map Reset!!',
    resetModalBtn = '<button type="button" id="resetButtonFinal" class="btn btn-danger" data-dismiss="modal">Change</button>',
    decayModalBody = 'Decay Change: Results In A Faster Or Slower Decay Of Map Points.<br><br>Refresh Change: Results In a Faster Or Slower Map Update.',
    decayModalBtn = '<button type="button" id="decayButtonFinal" class="btn btn-danger" data-dismiss="modal">Change</button>';
  // normal variables starting with the heatmap variables
  var baseLayer = L.tileLayer( // the basic map layer using openstreetmap -- Matt
      'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '...',
        maxZoom: 18,
        minZoom: 3
      }
    ),
    heatmapLayer = new HeatmapOverlay(cfg), // heatmap instanciation
    map = new L.Map('map-canvas', { // leaflet map
      center: new L.LatLng(37.937, -96.0938),
      zoom: 4,
      worldCopyJump: true, // keeps the overlayed heatmap oriented in the center.
      layers: [baseLayer, heatmapLayer],
      zoomControl: false,
    }),
    // primitives and data structures
    decayRate = 300000, // is used to keep track of the user input for the time interval for decay
    refreshRate = 3000, // used to keep track of user inputted refesh rate at 3 seconds
    success = false, // keeps track of whether an error occurred during client validation
    selfClose = false, // helps keep track of whether or not the websocket closed due to an error or by the user
    mapChanged = false, // helps keep track of whether or not to redraw the map
    wait = false, // helps keep track of whether or not the user is waiting for a response from the frontend
    client = '', // keeps track of the clientID for historical purposes
    checked = '', // determines whether or not an event comes in as checked or not
    eventMap = new Map(), // makes adding new events during runtime simple and fast
    // daterange picker varaibles
    start_date = moment().subtract(1, 'days'),
    end_date = moment(),
    // setup calendars
    datepicker = new DatePicker(start_date, end_date, 0),
    //  jQuery objects used for fast DOM manipulatoin
    dateSelector = $('#dateSelector'),
    dateButton = $('#dateButton'),
    decaySlider = $("#myRange"),
    decayOutput = $("#demo"),
    refreshSlider = $("#myRefreshRange"),
    refreshOutput = $("#refresh"),
    key = $('#keytext'),
    key1 = $('#colors1'),
    key2 = $('#colors2'),
    key3 = $('#colors3'),
    defaultHamburgerBtn = $('#normalHamburger'),
    sidebarWrapper = $('#sidebar-wrapper'),
    menuSidebarToggle = $('#toggleMenu'),
    homeSidebarToggle = $('#toggle'),
    body = $('body'),
    timeDisplay = $('#time'),
    liveTime = true,
    eventList = $('#eventList'),
    marquee = $('#wrapper > div.navbar.fixed-top > div.ticker-background > div > marquee'),
    liveBtn = $('#liveBtn'),
    US = $("#unitedStatesMapRecenter"),
    southEastUS = $("#southeasternUSMapRecenter"),
    northWestUS = $("#northWesternUSMapRecenter"),
    southAmerica = $("#southAmericaMapRecenter"),
    europe = $("#europeMapRecenter"),
    asia = $("#asiaMapRecenter"),
    recenter = $("#worldMapRecenter"),
    decaySubmit = $('#decaySubmit'),
    filterSubmit = $('#filterSubmit'),
    spinner = $('div.animationload'),
    // jQuery object variables that will be created later
    clientID,
    clientSubmit,
    // setup timers for interval based updates
    decayTimer = function() {
      clearInterval(decayInterval);
      if (heatmapLayer._data.size !== 0) {
        heatmapLayer._data.forEach(decay);
        mapChanged = true;
      }
      decayInterval = setInterval(decayTimer, decayRate);
    },
    decayInterval = setInterval(decayTimer, decayRate),
    refreshTimer = function() {
      clearInterval(refreshInterval);
      if (mapChanged) {
        heatmapLayer._draw();
        mapChanged = false;
      }
      refreshInterval = setInterval(refreshTimer, refreshRate);
    },
    refreshInterval = setInterval(refreshTimer, refreshRate),
    ws; // websocket

  // sets the max bounds of the map
  map.setMaxBounds([
    [85, 180],
    [-85, -180]
  ]);

  // sets the heatmapLayer
  heatmapLayer._max = 32;
  adjustZoomGrade(); // setup legend text
  // add location event listeners
  US.mouseup(unitedStatesMapRecenter);
  southAmerica.mouseup(southAmericaMapRecenter);
  europe.mouseup(europeMapRecenter);
  asia.mouseup(asiaMapRecenter); //northWesternUSMapRecenter
  southEastUS.mouseup(southeasternUSMapRecenter);
  northWestUS.mouseup(northWesternUSMapRecenter);
  recenter.mouseup(worldMapRecenter);

  // slider for Decay Time
  decayOutput.text(decaySlider.val()); // Display the default slider value
  refreshOutput.text(refreshSlider.val()); // Display the default slider value

  decaySlider.on('input', function() {
    decayOutput.text(this.value);
  });

  refreshSlider.on('input', function() {
    refreshOutput.text(this.value);
  });

  // remove invisiblility of the slider
  sidebarWrapper.addClass('visible');
  // add toggle and overlay to sidebar
  sidebarWrapper.slideReveal({
    trigger: $("#toggle"),
    push: false,
    width: 390,
    autoEscape: true,
    overlayColor: "rgba(0,0,0,0.6)",
    overlay: true
  });

  // this allows the second button to close the menu
  menuSidebarToggle.mouseup(function() {
    sidebarWrapper.slideReveal("toggle");
    // defaultHamburgerBtn.removeClass('circle');
  });

  // this removes the red button from the homeToggle
  homeSidebarToggle.mouseup(function() {
    defaultHamburgerBtn.removeClass('circle');
  });

  // start showing the time to the user
  updateLiveTime();

  // try to connect to the websosket, if there is an error display the error modal
  try {
    createWebsocket();
    // if an error occurs opening the websocket the modal will not load
    createModal('startModal', 'Please Enter Your Client ID:', true, startModalBody,
      false, startModalBtn); // creates the starting modal
    // starting modal opens
    $('#startModal').modal();
    filterSubmit.mouseup(openMapResetModal);
    decaySubmit.mouseup(openDecayModal);
    // add event listener for live button click
    liveBtn.mouseup(function() { // mouseup occurs before click, so it starts the event sooner
      liveBtn.prop("disabled", true);
      timeDisplay.prop("disabled", false);
      // add decay refresh intervals
      refreshInterval = setInterval(refreshTimer, refreshRate);
      decayInterval = setInterval(decayTimer, decayRate);
      dateSelector.removeClass('visible');
      resetMap();
      selfClose = false;
      liveTime = true;
      updateLiveTime();
      //displayTime(today)
      $.when(createWebsocket()).then(function() {
        setTimeout(sendID, 100);
      });
    });

    // mouse up to toggle live data off
    timeDisplay.mouseup(function() {
      liveTime = false;
      liveBtn.prop("disabled", false);
      timeDisplay.prop("disabled", true);
      // remove decay and refresh intervals
      resetMap();
      clearInterval(refreshInterval);
      clearInterval(decayInterval);
      dateSelector.addClass('visible');
      selfClose = true; // let the program know that the websocket was closed internally
      ws.close();
    });

    // add event listener for querying for historical data
    dateButton.mouseup(function() {
      if (datepicker.diff >= 1) {
        wait = true;
        spinner.addClass('visible');
        getPlaybackData(datepicker.start, datepicker.end);
        dateButton.prop('disabled', true);
      } else {
        errorAlert('401: Invalid date range selected.')
      }
    });

    // listen to see if a clientID is entered in the input box
    clientID = $('#cIDinput');
    clientSubmit = $('#enter');
    clientID.on('input', function() {
      if (this.value.trim().length > 0) { // the user has actually input text
        clientSubmit.prop("disabled", false);;
      } else { // disable the button becuase the input box is empty
        clientSubmit.prop("disabled", true);
      }
    });
    // Execute a function when the user releases a key on the keyboard
    clientID.bind('keyup', function(event) {
      // get the first and only clientSubmit button from the array and make sure that it is not disabled
      if (event.keyCode === 13 && !clientSubmit[0].disabled) {
        // Trigger the button element with a click
        clientSubmit.mouseup();
      }
    });

    clientSubmit.mouseup(submitClientID);
  } catch (err) {
    errorAlert('505: Unable to connect to live data.');
  }
  /**** functions from this point on ****/
  /**
   * openMapResetModal opens a modal for resetting the map
   */
  function openMapResetModal() {
    createModal('resetModal', 'Are You Sure You Want To Change Filters?', false,
      resetModalBody, true, resetModalBtn); // create reset modal for future use
    // makes the modal open
    $('#resetModal').modal({
      keyboard: false
    });
    // add event listener for reseting the maps points
    $("#resetButtonFinal").mouseup(function() {
      sendActiveEventList();
      resetMap();
    });
  }

  /**
   * openDecayModal opens a modal for changing decay rate
   */
  function openDecayModal() {
    createModal('decayModal', 'Are You Sure You Want To Change The Decay And Refresh Rate?', false,
      decayModalBody, true, decayModalBtn); // create reset modal for future use
    // makes the modal open
    $('#decayModal').modal({
      keyboard: false
    });

    $("#decayButtonFinal").mouseup(function() {
      decayRate = decaySlider.val() * 1000;
      refreshRate = refreshSlider.val() * 1000;
      clearInterval(decayInterval);
      decayInterval = setInterval(decayTimer, decayRate);
      clearInterval(refreshInterval);
      refreshInterval = setInterval(refreshTimer, refreshRate);
    });
  }

  /**
   * hideModal hides the default user modal
   * @param {String} ID is the html id of the modal to hide
   */
  function hideModal(ID) {
    $('#' + ID).hide();
    body.removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#' + ID).remove(); // make sure that the modal is no longer in the DOM (makes element lookup fater)
  }

  /**
   * addPoints takes in an obejct, parses that data into JSON, adds the relevant data to a map, and
   * then decides how to add the points to the map
   * @param {Object} pointArr is an object that contains data such as lat, lng, and count
   */
  function addPoints(pointArr) {
    var dataKeys = Object.keys(pointArr),
      dataValues = Object.values(pointArr),
      size = dataKeys.length,
      index,
      value;
    // goes through array and adds points based on if they already existed or not
    for (var i = 0; i < size; i++) {
      index = dataKeys[i];
      value = dataValues[i];
      value.count = parseInt(value.count) * 4; // scale the point so it does not decay too quickly
      // check whether or not the 'bucket' already exists
      if (heatmapLayer._data.has(index)) {
        // update the count of the 'bucket'
        value.count = heatmapLayer._data.get(index).count + value.count;
        heatmapLayer._data.set(index, value);

        // update the max and min for rendering the points relatively
        heatmapLayer._max = Math.max(heatmapLayer._max, heatmapLayer._data.get(index).count);
        heatmapLayer._min = Math.min(heatmapLayer._min, heatmapLayer._data.get(index).count);
      } else { // the 'bucket' is missing so add the new 'bucket'
        heatmapLayer._data.set(index, value);

        // update the max and min for rendering the points relatively
        heatmapLayer._max = Math.max(heatmapLayer._max, heatmapLayer._data.get(index).count);
        heatmapLayer._min = Math.min(heatmapLayer._min, heatmapLayer._data.get(index).count);
      }
    }
    if (heatmapLayer._data.size > heatmapLayer.cfg.maxPoints) {
      clearPoints(heatmapLayer._data.size - heatmapLayer.cfg.maxPoints);
    }
    mapChanged = true;
  }

  /**
   * clearPoints takes in the amount of points tp remove and removes it from the heatmapLayer._data
   * @param {int} numPoints the number of points to remove
   */
  function clearPoints(numPoints) {
    var iterator = heatmapLayer._data.entries();
    for (var i = 0; i <= numPoints; i++) {
      heatmapLayer._data.delete(iterator.next().value[0]);
    }
  }

  /**
   * addEvents takes in an array and outputs each element as a button for the user to click
   * @param {Array} events is the list of events to be appended as the user's filtering options
   */
  function addEvents(events) {
    // add all events to the select box as options
    var listEvents = eventList.html(); // gets all current event list items in string form
    // if the events that are to be added are the first, then add them as checked
    if (eventMap.size === 0 && !success) {
      checked = "checked";
    } else {
      checked = "";
    }
    $.each(events, function(index, value) {
      if (!eventMap.has(value)) { // the value does not already exist, so add it to the list
        listEvents += '<li><input type="checkbox" id="' + index + '" value="' + value + '" ' + checked + '> &nbsp;&nbsp;' + value + '</li>';
        eventMap.set(value, value);
        if (success) { // if the events being added are not the initial batch display the message
          defaultHamburgerBtn.addClass('circle');
          eventAlert(value);

          window.setTimeout(function() { // this makes the eventAlert disappear after three seconds.
            $(".alert").fadeTo(1000, 0).slideUp(1000, function() {
              $(this).remove();
            });
          }, 3000);
        }
      }
    });
    eventList.html(listEvents); // saves time on DOM lookup because it is all added at once
    eventList.height(eventMap.size * 40 + 'px'); // dynamically allocate the height of the event list
    // make sure that the ticker has the appropriate values on statrt up
    if (!success) {
      updateTicker(events);
    }
    success = true; // the error messages should be displayed in the error modal
  }

  /**
   *  sendActiveEventList checks to see which events to send back as active
   */
  function sendActiveEventList() {
    // make sure websocket is open
    if (ws.readyState === ws.OPEN) {

      var events = {
          'filter': []
        },
        activeEvents = $('#eventList li input:checked');
      // determine if there is an 'active' event
      if (activeEvents.length > 0) {
        // collect all id's for the events that are 'active'
        $.each(activeEvents, function(index, value) {
          events.filter.push(value.value);
        });
      }

      updateTicker(events.filter);
      // send the the events to the server
      ws.send(JSON.stringify(events));
    }
  }

  /**
   * getActiveEvents getst the active events and returns an object that contains the list
   * @param {Object} events is an object that has the property filters which is the list of active filters
   */

  function getActiveEvents() {
    var events = {
        'filter': []
      },
      activeEvents = $('#eventList li input:checked');
    // determine if there is an 'active' event
    if (activeEvents.length > 0) {
      // collect all id's for the events that are 'active'
      $.each(activeEvents, function(index, value) {
        events.filter.push(value.value);
      });
    }
    return events;
  }

  /**
   * submitClientID gets the user provided clientID and sends it to the server
   */
  function submitClientID() {
    // set the clientID and then send it
    client = clientID.val();
    // show the loading spinner and disable the client
    spinner.addClass('visible');
    clientSubmit.prop('disabled', true);
    wait = true;
    sendID();
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
  function createModal(ID, title, forceStay, modalBody, cancel, submitBtn) {
    // create the modal html in string representation
    var modal = '<div class="modal fade" id="' + ID + '" tabindex="-1" role="dialog" aria-labelledby="startModalTitle" aria-hidden="false"> data-keyboard="false"';;
    if (forceStay) {
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
  function resetMap() {
    heatmapLayer._data.clear(); // remove all data from storage
    heatmapLayer._max = 32;
    heatmapLayer._min = 0;
    heatmapLayer._draw();
    hideModal('resetModal');
  }

  /**
   * displayTime displays live time on the map
   */
  function displayTime(theTime) {
    //  var time = theTime;
    function checkTime(i) {
      return (i < 10) ? "0" + i : i;
    }
    var monthsArray = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var month = monthsArray[theTime.getMonth()],
      dateFrontEnd = theTime.getDate(), // not sure why I had to redeclare the variables here
      year = theTime.getFullYear(),
      wd = days[theTime.getDay()],
      h = checkTime(theTime.getHours()),
      m = checkTime(theTime.getMinutes()),
      s = checkTime(theTime.getSeconds());
    timeDisplay.html(wd + " " + month + " " + dateFrontEnd + " " + year + ": " + " " +
      h + ":" + m + ":" + s);

  }

  function updateLiveTime() {
    var theTime = new Date();
    displayTime(theTime);
    var t = setTimeout(function() {
      updateLiveTime();
    }, 500);
    if (!liveTime) {
      clearTimeout(t);
    }
  }

  function updateHistoryTime(theTime) {
    liveTime = false;
    var passtime = theTime / 1000000;
    var time = new Date(passtime);
    displayTime(time);
  }

  /**
   * updateTicker takes in an array of events and sets the ticker's text to that
   * @param {Array} events is an array of event name
   */
  function updateTicker(events) {
    var tickerText = '',
      eventsLen = events.length;
    // set up the ticker text
    for (var i = 0; i < eventsLen; i++) {
      tickerText += events[i] + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    }
    // put the text in the marquee
    marquee.html(tickerText);
  }

  /**
   * unitedStatesMapRecenter changes the view to the United States
   */
  function unitedStatesMapRecenter() {
    map.setView(new L.LatLng(37.937, -96.0938), 4); // this sets the location and zoom amount
  }

  /**
   * southAmericaMapRecenter changes the view to the South America
   */
  function southAmericaMapRecenter() {
    map.setView(new L.LatLng(-26.339, -54.9938), 4); // this sets the location and zoom amount
  }

  /**
   * europeMapRecenter changes the view to the Europe
   */
  function europeMapRecenter() {
    map.setView(new L.LatLng(48.2082, 16.0938), 5); // this sets the location and zoom amount
  }

  /**
   * asiaMapRecenter changes the view to the Asia
   */
  function asiaMapRecenter() {
    map.setView(new L.LatLng(25.937, 120.0938), 4); // this sets the location and zoom amount
  }

  /**
   * southeasternUSMapRecenter changes the view to the Southeastern US
   */
  function southeasternUSMapRecenter() {
    map.setView(new L.LatLng(31.937, -80.0938), 6); // this sets the location and zoom amount
  }

  /**
   * northWesternUSMapRecenter changes the view to the Northwestern US
   */
  function northWesternUSMapRecenter() {
    map.setView(new L.LatLng(43.937, -116.0938), 6); // this sets the location and zoom amount
  }

  /**
   * worldMapRecenter recenters the map
   */
  function worldMapRecenter() {
    map.setView(new L.LatLng(16.937, -3.0938), 3); // this sets the location and zoom amount
  }

  /**
   * adjustZoomGrade updates the values in the heatmap legend
   */
  function adjustZoomGrade() {
    var a = heatmapLayer._max / 4;
    var b = heatmapLayer._min;
    var c = a / 2;
    key.html('Events');
    key1.html(Math.ceil(b));
    key2.html(Math.ceil(c));
    key3.html(Math.ceil(a));
  }

  /**
   * decay takes in a value, a key, and a map and determines if a point should stay on it based on the
   * count property of the value after having the decayMath function applied to it
   * @param {Object} value is the value of the key/value pair stored in the map (it should have a count property)
   * @param {String} key is the key of the key/value pair stored in the map
   * @param {Object} map is the map that the key/value pair is from
   */
  function decay(value, key, map) {
    // check to see if decaying the point will give it a count of 0 or less, if so remove it
    // floor is used to allow for different decay rates
    var nCount = Math.floor(decayMath(value.count));
    if (nCount <= 0) {
      map.delete(key);
    } else { // set the new count
      map.get(key).count = nCount;
    }
  }

  /**
   * decayMath decays the given integer by subtracting 1 from it and returns that value
   * @param {int} count
   * @returns {int} is 1 less than count
   */
  function decayMath(count) {
    return count - 1;
  }

  /**
   * errorAlert creates and displays an alert with an error message
   * @param {String} message is the message to display in the error message
   */
  function errorAlert(message) {
    // if any alerts are currently on the screen, update them them
    var already = $('.alert'),
      alertBody = '<strong>Oops! Something went wrong.</strong> ' + message +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>';
    if (already.length !== 0) {
      already.html(alertBody);
    } else {
      var alert = '<div class="alert alert-danger alert-dismissible fade show" role="alert">' + alertBody +
        '</button></div>';
      body.append(alert);
      $('.alert').alert();
    }
  }

  /**
   * eventAlert creates and displays an alert when a new filter is added.
   * @param {String} message is the message to display in the error message
   */
  function eventAlert(message) {
    // if any alerts are currently on the screen, update them them
    var already = $('.alert'),
      alertBody = '<strong>New Event Added:&nbsp;&nbsp;</strong> ' + message +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span>';

    var alert = '<div class="alert alert-success alert-dismissible fade show" role="alert">' + alertBody +
      '</button></div>';
    body.append(alert);
    $('.alert').alert();
  }

  /**
   * getPlaybackData makes an ajax call to get data for playback
   * @param {Inter} startDate is the starting date for the for the desired data
   * @param {Date} endDate is the ending date for the for the desired data
   * @return {Object}
   */
  function getPlaybackData(startDate, endDate) {
    var hourPoints = []; // used to store an array of points for each hour
    var frames = 24; // the amount of chunks the overall date range should be broken up into. Allows for faster querying and requests.
    var range = (endDate - startDate) / frames; // finds the amount of time each chunk is going to have
    var requestArray = [];  // allows us to check when all primises are completed
    for (var i = 0; i < frames; i++) {
      var events = getActiveEvents(),
        playbackRequest = {
          index: i,
          filters: events.filter,
          clientID: client,
          startTime: startDate + range * i,
          endTime: startDate + range * (i + 1)
        };
      //oldTime(time);
      updateHistoryTime(playbackRequest.startTime);

      requestArray.push($.ajax({
        url: 'http://localhost:8000/receive/ajax',
        crossDomain: true,
        dataType: 'json',
        data: playbackRequest,
        success: function(result) {
          hourPoints[result.Index] = result.Batch;
          console.log(result.Batch);
        },
        error: function() {
          // get rid of the spinner
          dateButton.prop('disabled', false);
          errorAlert("505: Unable to get historical data.")
        }
      }));
    }

    //runs when requestArray promises are all done.
    $.when.apply($, requestArray).done(function() {
      wait = false;
      spinner.removeClass('visible');
      plotArray(hourPoints, 0);  // starts animating array
    });
  }



    /**
     * plotArray goes through the array and plots each hour every second.
     * @param {Array} hourPoints each index is the group of points for the i'th hour
     * @param {Integer} count the hour that is currently being plotted
     */
    function plotArray(hourPoints, count) {

      // every 1000ms it will add the next hour of points and update the map.
      setTimeout(function() {
        if (count < hourPoints.length && !$("#liveBtn").is(":disabled")) {
          if (hourPoints[count]) {
            addPoints(hourPoints[count]);
            updateHistoryTime(startDate + count * range);
            adjustZoomGrade();
            heatmapLayer._update();
          }
          plotArray(hourPoints, count + 1);
        }
      }, 1000);
    }
  }


  /**
   * @class DatePicker
   * @example First include the following element into the markup HTML for a concrete element.  <div class="drp"></div>
   * @example Call the constructor in a javascript file.  var mydatepicker = new DatePicker(start, end, 0);
   * @param {Moment} start Start date
   * @param {Moment} end End date
   * @param {Integer} time Use 1 to enable time picker option
   * @returns {DatePicker}
   */
  function DatePicker(start, end, time) {
    var self = this; // used to make sure that the proper this variable is being used
    self.element = $("div#drp");
    if (time === 0) {
      self.format = 'MM/DD/YYYY';
      self.time = false;
    } else {
      self.format = 'MM/DD/YYYY HH:mm:ss';
      self.format = true;
    }
    self.markup = '<div style="position: relative; width: auto; height: 36px; margin-bottom: 10px;" class="rangecontainer">\n\
                        <div style="position: absolute;top: 0px;bottom: 0px;display: block;left: 0px;right: 50%;padding-right: 20px;width: 50%;"><input style="height: 100%;display: block;" type="text" name="start" id="start" class="form-control" /></div>\n\
                        <div style="position: absolute;top: 0px;bottom: 1px;display: block;left: 50%;z-index:+2;margin-left: -20px;width: 40px;text-align: center;background: linear-gradient(#eee,#ddd);border: solid #CCC 1px;border-left: 0px;border-right: 0px;height: 36px !important;"><i style="position:absolute;left:50%;margin-left:-7px;top:50%;margin-top: -7px;" class="fa fa-calendar"></i></div>\n\
                  </div>'; //took out the div for the second calendar input
    // get start and end elements for faster operation speed
    self.element.html(self.markup);
    self.startDrp = $('.rangecontainer input#start');
    self.endDrp = $('.rangecontainer input#start'); // got the end date to work by changeing 'end' to 'start'
    self.container = $('div#drp .rangecontainer');

    // update the the value of the object
    self.update = function update() {
      var tempStart = moment(self.startDrp.val()),
        tempEnd = moment(self.endDrp.val()).add(1, 'days');
      self.start = tempStart.valueOf() * 1000000;
      self.end = tempEnd.valueOf() * 1000000;
      self.diff = tempEnd.diff(tempStart, 'days');
    };

    new Drp(start.format(self.format), 'start');
    new Drp(end.format(self.format), 'end');

    self.update();

    self.container.on('change', 'input', function(e) {
      self.update();
    });

    /**
     * @author Rance Aaron
     * @class Drp
     * @description Wrapper object for date range picker
     * @type object
     * @param {String} d date passed by constructor
     * @param {Integer} type Type of output format and either datepicker or datetimepicker
     * @param {String} se Start or End  if another calendar is added at a ltater time.
     */
    function Drp(d, se) {
      // create a new daterange picker
      $('div#drp .rangecontainer input#' + se).daterangepicker({
          parentEl: "#drp",
          singleDatePicker: true,
          showDropdowns: false,
          locale: {
            'format': self.format
          },
          startDate: d,
          timePicker: self.time,
          autoApply: true,
          autoUpdateInput: true,
          maxDate: moment().format(self.format),
          drops: "up",
          minDate: moment().subtract(6, 'months').format(self.format),
        },
        function(start) {
          return start;
        }
      );
    }
  }

  /**
   * createWebsocket opens a connection to the front end API
   */
  function createWebsocket() {
    var dfd = $.Deferred();
    ws = new WebSocket("ws://localhost:8000/receive/ws");
    // log any messages recieved
    ws.addEventListener("message", function(e) {
      if (wait) {
        spinner.removeClass('visible');
        clientSubmit.prop('disabled', false);
      }
      wait = false;
      var data = JSON.parse(e.data);
      if (data instanceof Array) {
        addEvents(data);
        hideModal('startModal');
      } else {
        if (JSON.stringify(data).indexOf("Error") != -1) { // if error recieved
          errorAlert(data.Error);
        } else { // if point(s) recieved
          addPoints(JSON.parse(data));
          adjustZoomGrade(); // update ledgend
        }
      }
    });

    // on open display that the websocket connection succeeded
    ws.onopen = function() {
      console.log("Connection made!");
      dfd.resolve("Connection made!")
    };

    // when the connection closes display that the connection has been made
    ws.onclose = function() {
      console.log("Connection closed.");
      // if the websocket was not closed internally
      if (!selfClose) {
        hideModal('startModal');
        errorAlert('505: Unable to connect to live data.');
      }
    };
  }

  /**
   * sendID sends the client ID to the frontend API over the websocket
   */
  function sendID() {
    console.log(client);
    ws.send(JSON.stringify({
      clientID: client
    }));
  }
});
