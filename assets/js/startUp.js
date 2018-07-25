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
    firstPass = true, // keeps track of whether an error occurred during client validation
    selfClose = false, // helps keep track of whether or not the websocket closed due to an error or by the user
    mapChanged = false, // helps keep track of whether or not to redraw the map
    wait = false, // helps keep track of whether or not the user is waiting for a response from the frontend
    checkedEvent = true, // helps determine whether or not a checkbox is to checked or not
    tsEvaluated = false,
    waiting = false, //keeps track of whether or not a historical interval is playing to keep multiple playback requests from overlapping
    client = '', // keeps track of the clientID for historical purposes
    hourPoints = [], // used to store an array of points for each hour
    eventMap = new Map(), // makes adding new events during runtime simple and fast
    // daterange picker varaibles
    start_date = moment().startOf('day'),
    end_date = moment().endOf('day'),
    // setup calendars
    datepicker = new DatePicker(start_date, end_date, 0),
    //  jQuery objects used for fast DOM manipulatoin
    dateSelector = $('#dateSelector'),
    clearHistoricData = $('#clearHistoricData'),
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
    logoTime = $('#logoTime'),
    liveTime = true,
    eventList = $('#eventList'),
    marquee = $('#wrapper > div.navbar.fixed-top > div.ticker-background > div > marquee'),
    liveBtn = $('#liveBtn'),
    //nextButton = $('#nextButton'),
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
    historicalInterval, // to be used for making sure that the historical interval is cleared as needed
    checkInterval,
    historicalTimer = function(count, startDate, range) {
      clearInterval(historicalInterval);
      if (count < hourPoints.length) {
        if (hourPoints[count]) {
          addPoints(hourPoints[count]);
          updateHistoryTime(moment.unix(startDate).add(count, "hours") / 1000);
          adjustZoomGrade();
          heatmapLayer._update();
        }
        // start the interval agian if all went well with the last interval
        historicalInterval = setInterval(historicalTimer, 1000, count + 1, startDate, range);
      } else {
        waiting = false;
      }
    },
    ws, // websocket
    query = parseQuery(window.location.href),
    cid, d, r, l, f, ts;

  if (query !== undefined) {
    cid = getCID(query);
    d = getDecay(query);
    r = getRefresh(query);
    l = getLocation(query);
    f = getFilters(query);
    ts = getTimeStamp(query);
  }

  // sets the max bounds of the map
  map.setMaxBounds([
    [85, 180],
    [-85, -180]
  ]);

  var loadingPrompts = [
    "Migrating servers to a single Raspberry Pi powered by Hammie, our onsite hamster technician...",
    "Stealing map back from Nicholas Cage…",
    "Harnessing the power of one thousand gophers...",
    "Reading documentation on how to write good documentation...",
    "Trying to escape Vim…",
    "Withdrawing 0.00411340 BTC mining fee…",
    "Using middle-out compression…",
    "Downloading more RAM…",
    "Directing to Honey Pot...",
    "Updating Windows Again...",
    "Tracing IP address…",
    "Crossing fingers hoping nothing breaks...",
    "Gaining root access to 127.0.0.1",
    "Downloading WannaCry",
    "Integrating ChainBlock Technology",
    "Arguing with the design team…",
    "Desearching and Reveloping...",
    "Googling 'How to load user content'",
  ];

  // sets the heatmapLayer
  heatmapLayer._max = 32;
  adjustZoomGrade(); // setup legend text
  // add location event listeners
  US.mousedown(unitedStatesMapRecenter);
  southAmerica.mousedown(southAmericaMapRecenter);
  europe.mousedown(europeMapRecenter);
  asia.mousedown(asiaMapRecenter); //northWesternUSMapRecenter
  southEastUS.mousedown(southeasternUSMapRecenter);
  northWestUS.mousedown(northWesternUSMapRecenter);
  recenter.mousedown(worldMapRecenter);

  // slider for Decay Time
  decayOutput.text(decaySlider.val()); // Display the default slider value
  refreshOutput.text(refreshSlider.val()); // Display the default slider value

  // changes the decay slider rate
  decaySlider.on('input', function() {
    decayOutput.text(this.value);
  });

  // changes the refresh slider rate
  refreshSlider.on('input', function() {
    refreshOutput.text(this.value);
  });

  // remove invisiblility of the slider
  sidebarWrapper.addClass('visible');

  // add toggle and overlay to sidebar
  sidebarWrapper.slideReveal({
    trigger: homeSidebarToggle,
    push: false,
    width: 390,
    autoEscape: true,
    overlayColor: "rgba(0,0,0,0.6)",
    overlay: true
  });

  // this allows the second button to close the menu
  menuSidebarToggle.mousedown(function() {
    sidebarWrapper.slideReveal("toggle");
    // defaultHamburgerBtn.removeClass('circle');
  });

  // this removes the red button from the homeToggle
  homeSidebarToggle.mousedown(function() {
    defaultHamburgerBtn.removeClass('circle');
  });

  // start showing the time to the user
  updateLiveTime();

  // try to connect to the websosket, if there is an error display the error modal
  createWebsocket();
  // if an error occurs opening the websocket the modal will not load

  filterSubmit.mousedown(openMapResetModal);
  decaySubmit.mousedown(openDecayModal);

  // add event listener for live button click
  liveBtn.mousedown(function() { // mousedown occurs before click, so it starts the event sooner
    liveBtn.prop('disabled', true);
    logoTime.prop("disabled", false);
    dateButton.prop('disabled', false);
    clearHistoricData.prop('disabled', false);
    // make sure historical data stops being added
    clearInterval(historicalInterval);
    homeSidebarToggle.css("pointer-events", "auto"); // to re-enable button while in historical
    // add decay refresh intervals
    refreshInterval = setInterval(refreshTimer, refreshRate);
    decayInterval = setInterval(decayTimer, decayRate);
    clearInterval(checkInterval);
    dateSelector.removeClass('visible');
    resetMap();
    removeTimeStamp();
    selfClose = false;
    waiting = false;
    liveTime = true;
    updateLiveTime();
    createWebsocket();
  });

  logoTime.mousedown(function() {
    liveTime = false;
    liveBtn.prop("disabled", false);
    logoTime.prop("disabled", true);
    homeSidebarToggle.css("pointer-events", "none"); // to disable button while in historical
    // remove decay and refresh intervals
    resetMap();
    clearInterval(refreshInterval);
    clearInterval(decayInterval);
    dateSelector.addClass('visible');
    selfClose = true; // let the program know that the websocket was closed internally
    ws.close();
  });

  // Set decay to query value
  if (d !== undefined) {
    decaySlider.val(d);
    decayOutput.text(decaySlider.val());
    urlQueryDecay();
  }
  // Set refresh to query value
  if (r !== undefined) {
    refreshSlider.val(r);
    refreshOutput.text(refreshSlider.val());
    urlQueryRefresh();
  }
  // if the user passes in a location, change view there.
  // TODO: Separate xy and z
  if (l !== undefined && l.x !== undefined && l.y !== undefined && l.z !== undefined) {
    map.setView(new L.latLng(parseFloat(l.x[0]), parseFloat(l.y[0])), l.z[0]);
  }
  if (f !== undefined) {
    f = getFilters(query);
  }

  // add event listener for querying for historical data
  dateButton.mousedown(function() {
    playback();
  });

  //used to reset the map at the user
  clearHistoricData.mousedown(function() {
    resetMap();
  });

  /**** functions from this point on ****/
  function playback() {
    if (getActiveEvents().filter.length > 0 && datepicker.diff > 0) {
      dateButton.prop('disabled', true);
      clearHistoricData.prop('disabled', true);
      wait = true;
      setTimeStampURL(datepicker.start, datepicker.end);
      var start = datepicker.start,
        end = start + 86400,
        i = 0;

      //TODO: assign parameters by each day range of datepicker.start and datepicker.end
      var checkWaiting = function() {
        clearInterval(checkInterval);
        if (waiting === true) {
          checkInterval = setInterval(checkWaiting, 1000);
        } else if (i < datepicker.diff) {
          resetMap();
          getPlaybackData(start, end);
          start = end;
          end += 86400;
          i++;
          checkInterval = setInterval(checkWaiting, 1000);
        } else {
          dateButton.prop('disabled', false);
          clearHistoricData.prop('disabled', false);
        }
      };
      checkInterval = setInterval(checkWaiting, 1000);
    } else {
      createAlert('401: Invalid event selection.', 'danger');
    }
  }

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
    $("#resetButtonFinal").mousedown(function() {
      sendActiveEventList();
      setFiltersURL();
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

    $("#decayButtonFinal").mousedown(function() {
      decayRate = decaySlider.val() * 1000;
      refreshRate = refreshSlider.val() * 1000;
      setDecayURL(decaySlider.val());
      setRefreshURL(refreshSlider.val());
      clearInterval(decayInterval);
      decayInterval = setInterval(decayTimer, decayRate);
      clearInterval(refreshInterval);
      refreshInterval = setInterval(refreshTimer, refreshRate);
    });
  }

  function urlQueryDecay() {
    decayRate = decaySlider.val() * 1000;
    clearInterval(decayInterval);
    decayInterval = setInterval(decayTimer, decayRate);
  }

  function urlQueryRefresh() {
    refreshRate = refreshSlider.val() * 1000;
    clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshTimer, refreshRate);
  }

  /**
   * hideModal hides the default user modal
   * @param {String} ID is the html id of the modal to hide
   */
  function hideModal(ID) {
    $('#' + ID).hide();
    body.removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#' + ID).remove(); // make sure that the modal is no longer in the DOM (makes element lookup faster)
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
    if (heatmapLayer._data.size > heatmapLayer.cfg.maxPoints && liveBtn.is(":disabled")) {
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
    var listEvents = '';
    // get all current events and add the appropriate list item
    eventMap.forEach(function(value, key, map) {
      listEvents += getListItem(key, value);
    });
    // if the events that are to be added are the first, then add them as checked
    if (firstPass && f === undefined) {
      checkedEvent = true;
    } else {
      checkedEvent = false;
    }
    $.each(events, function(index, value) {
      if (!eventMap.has(value)) { // the value does not already exist, so add it to the list
        listEvents += getListItem(value, checkedEvent); // get the HTML markdown
        eventMap.set(value, checkedEvent);
        if (!firstPass) { // if the events being added are not the initial batch display the message
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
    // make sure that the ticker has the appropriate values on start up
    if (firstPass) {
      updateTicker(getActiveEvents().filter);
    }
    firstPass = false; // the error messages should be displayed in the error modal
    // add event listeners for the checkboxes being clicked
    var eventCheckboxes = $('#eventList li input');
    eventCheckboxes.mousedown(function() {
      var id = $(this).attr('id');
      eventMap.set(id, !eventMap.get(id)); // flip the value of the checkbox in the map
    });
  }

  /**
   * getListItem markup gets the appropriate list item markup based on what is passed in
   * @param {String} value is to be the id and value of the list item
   * @param {Boolean} checked determines whether or not to give the list item a checked value
   */
  function getListItem(value, checked) {
    let checkValue = "";
    if (checked) {
      checkValue = "checked";
    }
    return '<li><input type="checkbox" id="' + value + '" value="' + value + '" ' + checkValue + '> &nbsp;&nbsp;' + value + '</li>';
  }
  /**
   *  sendActiveEventList checks to see which events to send back as active
   */
  function sendActiveEventList() {
    // make sure websocket is open
    if (ws.readyState === ws.OPEN) {
      var events = getActiveEvents();
      updateTicker(events.filter);
      // send the the events to the server
      ws.send(JSON.stringify(events));
    }
  }

  /**
   * getActiveEvents gets the active events and returns an object that contains the list
   * @param {Object} events is an object that has the property filters which is the list of active filters
   */
  function getActiveEvents() {
    var events = {
      'filter': []
    };
    // check to see which events are active
    eventMap.forEach(function(value, key, map) {
      if (value) {
        events.filter.push(key);
      }
    });
    return events;
  }

  /*
   * Sets the filters to the filters submitted in the url query and then submits them to the WebSocket
   */
  function urlQueryFilters() {
    // var events = $('#eventList li input');
    $.each(f, function(index, value) {
      eventMap.set(value.split("%20").join(" "), true);
    });
    sendActiveEventList();
  }

  /**
   * submitClientID gets the user provided clientID and sends it to the server
   */
  function submitClientID() {
    // set the clientID and then send it
    client = clientID.val();
    setCidURL(client);
    // show the loading spinner and disable the client
    showSpinner();
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
    var modal = '<div class="modal fade" id="' + ID + '" tabindex="-1" role="dialog" aria-labelledby="startModalTitle" aria-hidden="false" data-keyboard="false">';
    if (forceStay) {
      modal = '<div class="modal fade" id="' + ID + '" tabindex="-1" role="dialog" aria-labelledby="startModalTitle" aria-hidden="false" data-backdrop="static" data-keyboard="false" >';
    }
    modal += '<div class="modal-dialog modal-dialog-centered" role="document">';
    modal += '<div class="modal-content">';
    modal += '<div class="modal-header">';
    modal += '<h5 class="modal-title">' + title + '</h5>';
    modal += '</div>';
    modal += '<div class="modal-body">';
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
   * @param {String} theTime is a string that will be displayed to the user
   */
  function displayTime(theTime) {
    timeDisplay.html(theTime);
  }

  function displayHistoricalTime(theTime) {
    timeDisplay.html(theTime);
  }

  /**
   * updateLiveTime updates the time for the user while live mode is active
   */
  function updateLiveTime() {
    if (ts !== undefined && liveTime !== true) {
      return;
    }
    var theTime = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
    displayTime(theTime);
    var t = setTimeout(function() {
      updateLiveTime();
    }, 500);
    if (!liveTime) {
      clearTimeout(t);
    }
  }

  /**
   * updateHistoryTime takes in a date as unix seconds and displays it to the user
   * @param {Integer} theTime is the time to be displayed to the user during historical mode
   */
  function updateHistoryTime(theTime) {
    liveTime = false;
    // Formate time to look readable
    var date = moment.unix(theTime);
    if (!date.isDST()) {
      date.subtract(1, "hour"); // should take an hour away when DST goes away
    }
    displayHistoricalTime(date.format("dddd, MMMM Do YYYY, h:mm:ss a"));
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
    map.setView(new L.LatLng(17.937, -38.0938), 3); // this sets the location and zoom amount
  }

  /**
   * adjustZoomGrade updates the values in the heatmap legend
   */
  function adjustZoomGrade() {
    var a = heatmapLayer._max / 4;
    var b = heatmapLayer._min;
    var c = a / 2;
    key.html('<i class="fas fa-fire"></i>');
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
   * createAlert creates and displays an alert with an error message
   * @param {String} message is the message to display in the error message
   * @param {String} classType is the class type that the alert will use, for example 'danger'
   */
  function createAlert(message, classType) {
    var alert = '<div class="alert alert-' + classType + ' alert-dismissible fade show" role="alert">' +
      '<strong>Oops! Something went wrong.</strong> ' + message +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span> </button></div>',
      already = $('.alert');
    if (already.length > 0) {
      already.remove();
    }
    body.append(alert);
    $('.alert').alert();
  }

  /**
   * eventAlert creates and displays an alert when a new filter is added.
   * @param {String} message is the message to display in the error message
   */
  function eventAlert(message) {
    var alert = '<div class="alert alert-success alert-dismissible fade show" role="alert">' +
      '<strong>New Event Added:&nbsp;&nbsp;</strong> ' + message +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span></button></div>',
      already = $('.alert');
    if (already.length > 0) {
      already.remove();
    }
    body.append(alert);
    $('.alert').alert();
  }

  /**
   * getPlaybackData makes an ajax call to get data for playback
   * @param {Integer} startDate is the starting date for the for the desired data in seconds
   * @param {Integer} endDate is the ending date for the for the desired data in seconds
   * @return {Object}
   */
  function getPlaybackData(startDate, endDate) {
    showSpinner();
    waiting = true;
    var frames = 24; // the amount of chunks the overall date range should be broken up into. Allows for faster querying and requests.
    var range = (endDate - startDate) / frames; // finds the amount of time each chunk is going to have
    var requestArray = []; // allows us to check when all primises are completed
    var start = moment.unix(startDate);

    function successFunc(result) {
      hourPoints[result.Index] = result.Batch;
    }

    function errFunc() {
      // get rid of the spinner
      dateButton.prop('disabled', false);
      createAlert("505: Unable to get historical data.", "danger");
    }

    for (var i = 0; i < frames; i++) {
      var playbackRequest = {
        index: i,
        filters: getActiveEvents().filter,
        clientID: client,
        startTime: startDate + range * i,
        endTime: startDate + range * (i + 1)
      };
      requestArray.push($.ajax({
        url: 'http://localhost:8000/receive/ajax',
        crossDomain: true,
        dataType: 'json',
        data: playbackRequest,
        success: successFunc,
        error: errFunc,
        timeout: 30000 // sets timeout to 30 seconds
      }));
    }

    //runs when requestArray promises are all done.
    $.when.apply($, requestArray).done(function() {
      // let noData = true;
      // check to see if no data was returned
      // for (var i = 0; i < frames; i++) {
      //   if (Object.keys(hourPoints[i]).length !== 0) {
      //     noData = false;
      //     break;
      //   }
      // }
      wait = false;
      hideSpinner();
      // if (noData) {
      //   createAlert('No data was found for the provided date range.', 'warning');
      // }
      // starts animating the array
      historicalInterval = setInterval(historicalTimer, 1000, 0, startDate, range);
    });
  } // end of getPlaybackData


  /**
   * @class DatePicker
   * @example First include the following element into the markup HTML for a concrete element.  <div class="drp"></div>
   * @example Call the constructor in a javascript file.  var mydatepicker = new DatePicker(start, end, 0);
   * @param {Moment} start Start date
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
      self.time = true;
    }
    self.markup = '<div style="position: relative; width: auto; height: 36px; margin-bottom: 10px;" class="rangecontainer">\n\
                            <div style="position: absolute;top: 0px;bottom: 0px;display: block;left: 0px;right: 50%;padding-right: 20px;width: 50%;"><input style="height: 100%;display: block;" type="text" name="start" id="start" class="form-control" /></div>\n\
                            <div style="position: absolute;top: 0px;bottom: 1px;display: block;left: 50%;z-index:+2;margin-left: -20px;width: 40px;text-align: center;background: linear-gradient(#eee,#ddd);border: solid #CCC 1px;border-left: 0px;border-right: 0px;height: 36px !important;"><i style="position:absolute;left:50%;margin-left:-7px;top:50%;margin-top: -7px;" class="fa fa-calendar"></i></div>\n\
                            <div style="position: absolute;top: 0px;bottom: 0px;display: block;left: 50%;right: 0px;padding-left: 20px;width: 50%;"><input style="height: 100%;display: block;" type="text" name="end" id="end" class="form-control" /></div>\n\
                      </div>'; // get start and end elements for faster operation speed
    self.element.html(self.markup);
    self.startDrp = $('.rangecontainer input#start');
    self.endDrp = $('.rangecontainer input#end');
    self.container = $('div#drp .rangecontainer');

    // update the the value of the object
    self.update = function update() {
      var tempStart = moment(self.startDrp.val()).startOf('day'),
        tempEnd = moment(self.endDrp.val()).endOf('day');
      self.start = Math.floor(tempStart.valueOf() / 1000);
      self.end = Math.floor(tempEnd.valueOf() / 1000);
      self.diff = tempEnd.diff(tempStart, 'seconds');
    };

    new Drp(start.format(self.format), 'start');
    new Drp(end.format(self.format), 'end');

    self.update();

    self.container.on('change', 'input', function(e) {
      self.update();
    });

    /**
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
    ws = new WebSocket("ws://localhost:8000/receive/ws");
    // log any messages recieved
    ws.addEventListener("message", function(e) {
      if (wait) {
        hideSpinner();
        clientSubmit.prop('disabled', false);
      }
      wait = false;
      var data = JSON.parse(e.data);
      if (data instanceof Array) {
        hideModal('startModal');
        if (f !== undefined && firstPass) {
          urlQueryFilters();
        }
        addEvents(data);

        if (ts !== undefined && !tsEvaluated) {
          tsEvaluated = true;
          // Run historical mode
          setTimeout(function() {
            if (ts !== undefined && moment(parseInt(ts[0])).isValid()) {
              // Stop updating livetime
              liveTime = false;
              // Close websocket
              ws.close();
              // Convert ts to int
              // var tsInt = parseInt(ts[0]);
              // Helps with calculating end date
              var secondsDay = 86400;
              // Click on historical mode button
              logoTime.trigger('mousedown');
              playback();
              logoTime.prop("disabled", true);
            }
          }, 1000);
        }
      } else {
        if (JSON.stringify(data).indexOf("Error") != -1) { // if error recieved
          createAlert(data.Error, "danger");
        } else { // if point(s) recieved
          addPoints(JSON.parse(data));
          adjustZoomGrade(); // update ledgend
        }
      }
    });

    // on open display that the websocket connection succeeded
    ws.onopen = function() {
      console.log("Connection made!");
      if (cid !== undefined) {
        client = cid[0].split("%20").join(" "); // gets the client ID from the query and replaces all "%20" with " "
        sendID();
      } else if (liveBtn.is(':disabled') && !firstPass) {
        sendID();
      } else {
        // listen to see if a clientID is entered in the input box
        createModal('startModal', 'Please Enter Your Client ID:', true, startModalBody,
          false, startModalBtn); // creates the starting modal
        // starting modal opens
        $('#startModal').modal();
        clientID = $('#cIDinput');
        clientSubmit = $('#enter');
        clientID.on('input', function() {
          if (this.value.trim().length > 0) { // the user has actually input text
            clientSubmit.prop("disabled", false);
          } else { // disable the button becuase the input box is empty
            clientSubmit.prop("disabled", true);
          }
        });

        // Execute a function when the user releases a key on the keyboard
        clientID.bind('keyup', function(event) {
          // get the first and only clientSubmit button from the array and make sure that it is not disabled
          if (event.keyCode === 13 && !clientSubmit[0].disabled) {
            // Trigger the button element with a click
            clientSubmit.mousedown();
          }
        });

        clientSubmit.mousedown(submitClientID);
      }
    };

    // when the connection closes display that the connection has been made
    ws.onclose = function() {
      console.log("Connection closed.");
      // if the websocket was not closed internally
      if (!selfClose) {
        hideModal('startModal');
        createAlert('505: Unable to connect to live data.', "danger");
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

  /**
   *  showSpinner shows spinner and generates random text
   */
  function showSpinner() {
    var message1 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)];
    var message2 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)];
    while (message2 === message1) {
      message2 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)];
    }
    $('.randomText').text(message1);
    setTimeout(function() {
      $('.randomText').text(message2);
    }, 5000);
    spinner.addClass('visible');
  }


  /**
   *  hideSpinner hides the spinner
   */
  function hideSpinner() {
    spinner.removeClass('visible');
  }

  function parseQuery(urlString) {
    var params = {};
    var queryArray;
    var pair;
    // Check if url contains query
    if (urlString.includes("?") === false) {
      return undefined;
    } else {
      // Remove first part of URL then split rest of string to get an array of key-value pairs
      queryArray = urlString.substring(urlString.indexOf('?') + 1).split('&');
      // Iterate through query string
      for (var i = 0; i < queryArray.length; i++) {
        // Get key-value pair
        pair = queryArray[i].split('=');
        // Check if key already exists in object
        if (params.hasOwnProperty(pair[0]) === true) {
          // Add value to key
          params[pair[0]].push(pair[1]);
        } else {
          // Create a new array
          params[pair[0]] = [];
          // Push value to array
          params[pair[0]].push(pair[1]);
        }
      }
      // ?cid=client1&d=600&r=1&l=southeast&f=check-in&f=donations TODO: Remove
    }
    return params;
  }

  function getCID(params) {
    if (params.hasOwnProperty("cid") === true && params.cid.length === 1) {
      return params.cid;
    } else {
      return undefined;
    }
  }

  function getDecay(params) {
    if (params.hasOwnProperty("d") === true && params.d.length === 1) {
      if (params.d > 600 || params.d < 1) {
        return undefined;
      }
      return params.d;
    } else {
      return undefined;
    }
  }

  function getRefresh(params) {
    if (params.hasOwnProperty("r") === true && params.r.length === 1) {
      if (params.r > 60 || params.r < 1) {
        return undefined;
      }
      return params.r;
    } else {
      return undefined;
    }
  }

  function getLocation(params) {

    if (params.hasOwnProperty("x") === true && params.x.length === 1 && params.hasOwnProperty("y") === true && params.y.length === 1 && params.hasOwnProperty("z") === true && params.z.length === 1) {
      return {
        x: params.x,
        y: params.y,
        z: params.z
      };
    } else {
      return undefined;
    }
  }

  function getFilters(params) {
    if (params.hasOwnProperty("f") === true) {
      return params.f;
    } else {
      return undefined;
    }
  }

  function getTimeStamp(params) {
    if (params.hasOwnProperty("ts") === true && params.ts.length === 2 &&
      moment(parseInt(params.ts[0])).isValid() && moment(parseInt(params.ts[1])).isValid()) {
      // remove old datepicker
      $("div#drp").empty();
      datepicker = new DatePicker(moment.unix(parseInt(params.ts[0])).startOf("day"), moment.unix(parseInt(params.ts[1])).endOf("day"), 0);
      return params.ts;
    } else {
      return undefined;
    }
  }
  //  updates url live to have clientID parameter
  function setCidURL(cid) {
    // Get URL
    var url = window.location.href;
    var token = "";
    if (!url.includes("?")) {
      token += "?";
    }
    token += "&";

    var rexpression = /cid\=[^&]*/g;
    var updatedURL = url;
    if (url.includes("cid=")) {
      updatedURL = url.replace(rexpression, "cid=" + cid);
    } else {
      updatedURL += token + "cid=" + cid;
    }
    window.history.replaceState({}, document.title, updatedURL);
  }

  // nav's in coming changes
  function setFiltersURL() {
    var updatedURL = window.location.href;
    var activeEvents = getActiveEvents().filter;
    var token = "";
    for (var i = 0; i < activeEvents.length; i++) {
      token += "&f=" + activeEvents[i];
    }

    if (!updatedURL.includes("?")) {
      updatedURL += "?";
    }

    // takes out previous filter query flags
    updatedURL = updatedURL.replace(/[\?\&][fF]\=[^&]*/g, "");
    updatedURL += token;
    window.history.replaceState({}, document.title, updatedURL);
  }

  //  updates URL whenever the map view is moved
  map.addEventListener('moveend', function(event) {
    var url = window.location.href;
    var updatedURL = url;
    var center = map.getCenter();
    var x = center.lat;
    var y = center.lng;
    var token = "&x=" + Math.round(x * 100) / 100 + "&y=" + Math.round(y * 100) / 100;
    if (!url.includes("?")) {
      updatedURL += "?";
    }

    if (url.includes("x=")) {
      var rexpression = /x=-?[0-9]*[.]?[0-9]*/g;
      updatedURL = updatedURL.replace(rexpression, "x=" + Math.round(x * 1000) / 1000);
      rexpression = /y=-?[0-9]*[.]?[0-9]*/g;
      updatedURL = updatedURL.replace(rexpression, "y=" + Math.round(y * 1000) / 1000);
    } else {
      updatedURL += token;
    }
    window.history.replaceState({}, document.title, updatedURL);
    return;
  });

  // updates URL whenever the map zoom is changed
  map.addEventListener('zoomend', function(event) {
    var url = window.location.href;
    var updatedURL = url;
    var z = map.getZoom();
    var token = "&z=" + z;

    if (!url.includes("?")) {
      updatedURL += "?";
    }

    if (url.includes("z=")) {
      var rexpression = /z=-?[0-9]*/g;
      updatedURL = updatedURL.replace(rexpression, "z=" + z);
    } else {
      updatedURL += token;
    }
    window.history.replaceState({}, document.title, updatedURL);
    return;
  });

  function setDecayURL(d) {
    // Get URL
    var url = window.location.href;
    var token = "";
    if (!url.includes("?")) {
      token += "?";
    }

    token += "&";

    var rexpression = /[\?\&]d\=[0-9]*/g;
    var updatedURL = url;
    if (url.includes("&d=")) {
      updatedURL = url.replace(rexpression, token + "d=" + d);
    } else {
      updatedURL += token + "d=" + d;
    }
    window.history.replaceState({}, document.title, updatedURL);
  }

  function setRefreshURL(r) {
    // Get URL
    var url = window.location.href;
    var token = "";
    if (!url.includes("?")) {
      token += "?";
    } else {
      token += "&";
    }
    var rexpression = /[\?\&]r\=[0-9]*/g;
    var updatedURL = url;
    if (url.includes("r=")) {
      updatedURL = url.replace(rexpression, token + "r=" + r);
    } else {
      updatedURL = url + token + "r=" + r;
    }
    window.history.replaceState({}, document.title, updatedURL);
  }

  /**
   * Inserts timestamp into url
   */
  function setTimeStampURL(ts_start, ts_end) {
    // Get URL
    var updatedURL = window.location.href;
    // Build up regex
    var token = "&ts=" + ts_start + "&ts=" + ts_end;
    // Check if you have a query started
    if (!updatedURL.includes("?")) {
      updatedURL += "?";
    }

    if (updatedURL.includes("ts=")) {
      // Look for ts key in query and go through value
      var rexpression = /[/?/&][tT][sS]\=[0-9]*/g;
      updatedURL = updatedURL.replace(rexpression, "");
    }
    updatedURL += token;

    window.history.replaceState({}, document.title, updatedURL);
  }

  /**
   * Removes time stamps from url
   */
  function removeTimeStamp() {
    var url = window.location.href;
    if (url.includes("ts=")) {
      var rexpression = /[\?\&][tT][sS]\=[0-9]*/g;
      url = url.replace(rexpression, "");
    }
    window.history.replaceState({}, document.title, url);
  }
});
