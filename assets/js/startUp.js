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
    liveMapResetModalBody = 'Resetting Will Erase Live Data From Map',
    liveMapResetModalBtn = '<button type="button" id="liveMapResetModalBtn" class="btn btn-danger" data-dismiss="modal">Reset</button>',
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
    hourIndex = 0, // helps keep track of the hour indexes for historical data
    decayRate = 300000, // is used to keep track of the user input for the time interval for decay
    refreshRate = 3000, // used to keep track of user inputted refesh rate at 3 seconds
    client = '', // keeps track of the clientID for historical purposes
    hourPoints = [], // used to store an array of points for each hour
    // daterange picker varaibles
    start_date = moment().startOf('day'),
    end_date = moment().endOf('day'),
    // setup calendars
    datepicker = new DatePicker(start_date, end_date, 0),
    // status for playback: 0 = not last loop, 1 = last loop
    playbackData = {'status': 0, 'initStart': undefined}, // used to keep track of data for looping
    // all boolean states 
    stateOf = {
      'firstPass': true, // keeps track of whether an error occurred during client validation
      'selfClose': false, // helps keep track of whether or not the websocket closed due to an error or by the user
      'mapChanged': false, // helps keep track of whether or not to redraw the map
      'wait': false, // helps keep track of whether or not the user is stateOf.waiting for a response from the frontend
      'checkedEvent': true, // helps determine whether or not a checkbox is to be checked or not when created
      'tsEvaluated': false, // whetehr or no the timestamp in the url has been evaluated
      'waiting': false, //keeps track of whether or not a historical interval is playing to keep multiple playback requests from overlapping
      'liveTime': true, // keeps track of the mode that the user is in
      'eventMap' : new Map() // makes adding new events during runtime simple and fast
    },
    // jQuery objects used for fast DOM manipulation
    DOMElements = {
      'dateSelector': $('#dateSelector'),
      'clearHistoricData': $('#clearHistoricData'),
      'dateButton': $('#dateButton'),
      'decaySlider': $("#myRange"),
      'decayOutput': $("#demo"),
      'refreshSlider': $("#myRefreshRange"),
      'refreshOutput': $("#refresh"),
      'key': $('#keytext'),
      'key1': $('#colors1'),
      'key2': $('#colors2'),
      'key3': $('#colors3'),
      'defaultHamburgerBtn': $('#normalHamburger'),
      'sidebarWrapper': $('#sidebar-wrapper'),
      'menuSidebarToggle': $('#toggleMenu'),
      'homeSidebarToggle': $('#toggle'),
      'body': $('body'),
      'timeDisplay': $('#time'),
      'logoTime': $('#logoTime'),
      'eventList': $('#eventList'),
      'marquee': $('#wrapper > div.navbar.fixed-top > div.ticker-background > div > marquee'),
      'liveBtn': $('#liveBtn'),
      'US': $("#unitedStatesMapRecenter"),
      'southEastUS': $("#southeasternUSMapRecenter"),
      'northWestUS': $("#northWesternUSMapRecenter"),
      'southAmerica': $("#southAmericaMapRecenter"),
      'europe': $("#europeMapRecenter"),
      'asia': $("#asiaMapRecenter"),
      'recenter': $("#worldMapRecenter"),
      'decaySubmit': $('#decaySubmit'),
      'filterSubmit': $('#filterSubmit'),
      'spinner': $('div.animationload'),
      'liveMapReset': $('#liveMapReset'),
      // jQuery object variables that will be created later
      'clientID': undefined,
      'clientSubmit': undefined
    },
    // setup timers for interval based updates
    decayTimer = function() {
      clearInterval(decayInterval);
      if (heatmapLayer._data.size !== 0) {
        heatmapLayer._data.forEach(decay);
        stateOf.mapChanged = true;
      }
      decayInterval = setInterval(decayTimer, decayRate);
    },
    decayInterval = setInterval(decayTimer, decayRate),
    refreshTimer = function() {
      clearInterval(refreshInterval);
      if (stateOf.mapChanged) {
        heatmapLayer._draw();
        stateOf.mapChanged = false;
      }
      refreshInterval = setInterval(refreshTimer, refreshRate);
    },
    refreshInterval = setInterval(refreshTimer, refreshRate),
    historicalInterval, // to be used for making sure that the historical interval is cleared as needed
    checkInterval,
    historicalTimer = function(count, startDate, range, diff) {
      clearInterval(historicalInterval);
      if (count < hourPoints.length) {
        if (count % 24 === 0) {
          resetMap();
          adjustZoomGrade();
        }
        if (Object.keys(hourPoints[count]).length > 0) {
          addPoints(hourPoints[count]);
          adjustZoomGrade();
          heatmapLayer._update();
        }

        updateHistoryTime(moment.unix(startDate).add(count, "hours").valueOf() / 1000);
        // start the interval agian if all went well with the last interval
        historicalInterval = setInterval(historicalTimer, 1000, count + 1, startDate, range, diff);
      } else {
        stateOf.waiting = false;
        if (playbackData.status === 1) {
          playback(playbackData.initStart, diff);
        }
      }
    },
    ws, // websocket
    URLData = { // data from the url
      'query': parseQuery(window.location.href), // the query string from the url
      'cid': undefined, // the clientID
      'd': undefined, // the decay rate
      'r': undefined, // the refresh rate
      'l': undefined, // the location of x, y, and z
      'f': undefined, // filter list
      'ts': undefined, // the timestamp a start and an end date
      'url': window.location.href, // the current url to be updated and reused
      'token': '?' // the token for adding to the url, the question mark is the default first value
    }, loadingPrompts = [
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

  if (URLData.query !== undefined) {
    URLData.token = '&';
    URLData.cid = getCID(URLData.query);
    URLData.d= getDecay(URLData.query);
    URLData.r = getRefresh(URLData.query);
    URLData.l = getLocation(URLData.query);
    URLData.f = getFilters(URLData.query);
    URLData.ts = getTimeStamp(URLData.query);
  }

  // sets the max bounds of the map
  map.setMaxBounds([
    [85, 180],
    [-85, -180]
  ]);

  // updates URL whenever the map zoom is changed
  map.addEventListener('zoomend', function(event) {
    var z = map.getZoom(),
        token = "&z=" + z;

    if (!URLData.url.includes("?")) {
      URLData.url += "?";
    }

    if (URLData.url.includes("z=")) {
      var rexpression = /z=-?[0-9]*/g;
      URLData.url = URLData.url.replace(rexpression, "z=" + z);
    } else {
      URLData.url += token;
    }
    window.history.replaceState({}, document.title, URLData.url);
  });

  //  updates URL whenever the map view is moved
  map.addEventListener('moveend', function(event) {
    var center = map.getCenter(),
        x = center.lat,
        y = center.lng,
        token = "&x=" + Math.round(x * 100) / 100 + "&y=" + Math.round(y * 100) / 100;
    if (!URLData.url.includes("?")) {
      URLData.url += "?";
    }

    if (URLData.url.includes("x=")) {
      var rexpression = /x=-?[0-9]*[.]?[0-9]*/g;
      URLData.url = URLData.url.replace(rexpression, "x=" + Math.round(x * 1000) / 1000);
      rexpression = /y=-?[0-9]*[.]?[0-9]*/g;
      URLData.url = URLData.url.replace(rexpression, "y=" + Math.round(y * 1000) / 1000);
    } else {
      URLData.url += token;
    }
    window.history.replaceState({}, document.title, URLData.url);
  });

  // sets the heatmapLayer
  heatmapLayer._max = 32;
  adjustZoomGrade(); // setup legend text
  // add location event listeners
  DOMElements.US.mousedown(unitedStatesMapRecenter);
  DOMElements.southAmerica.mousedown(southAmericaMapRecenter);
  DOMElements.europe.mousedown(europeMapRecenter);
  DOMElements.asia.mousedown(asiaMapRecenter); //northWesternUSMapRecenter
  DOMElements.southEastUS.mousedown(southeasternUSMapRecenter);
  DOMElements.northWestUS.mousedown(northWesternUSMapRecenter);
  DOMElements.recenter.mousedown(worldMapRecenter);

  // slider for Decay Time
  DOMElements.decayOutput.text(DOMElements.decaySlider.val()); // Display the default slider value
  DOMElements.refreshOutput.text(DOMElements.refreshSlider.val()); // Display the default slider value

  // changes the decay slider rate
  DOMElements.decaySlider.on('input', function() {
    DOMElements.decayOutput.text(this.value);
  });

  // changes the refresh slider rate
  DOMElements.refreshSlider.on('input', function() {
    DOMElements.refreshOutput.text(this.value);
  });

  // remove invisiblility of the slider
  DOMElements.sidebarWrapper.addClass('visible');

  // add toggle and overlay to sidebar
  DOMElements.sidebarWrapper.slideReveal({
    trigger: DOMElements.homeSidebarToggle,
    push: false,
    width: 390,
    autoEscape: true,
    overlayColor: "rgba(0,0,0,0.6)",
    overlay: true
  });

  // this allows the second button to close the menu
  DOMElements.menuSidebarToggle.mousedown(function() {
    DOMElements.sidebarWrapper.slideReveal("toggle");
  });

  // this removes the red button from the homeToggle
  DOMElements.homeSidebarToggle.mousedown(function() {
    DOMElements.defaultHamburgerBtn.removeClass('circle');
  });

  // start showing the time to the user
  updateLiveTime();

  // try to connect to the websosket, if there is an error display the error modal
  createWebsocket();
  // if an error occurs opening the websocket the modal will not load

  DOMElements.filterSubmit.mousedown(openMapResetModal);
  DOMElements.decaySubmit.mousedown(openDecayModal);

  DOMElements.liveMapReset.mousedown(openLiveMapResetModal);

  // add event listener for live button click
  DOMElements.liveBtn.mousedown(function() { // mousedown occurs before click, so it starts the event sooner
    DOMElements.liveBtn.prop('disabled', true);
    DOMElements.logoTime.prop("disabled", false);
    DOMElements.dateButton.prop('disabled', false);
    DOMElements.clearHistoricData.prop('disabled', false);
    // make sure historical data stops being added
    clearInterval(historicalInterval);
    DOMElements.homeSidebarToggle.css("pointer-events", "auto"); // to re-enable button while in historical
    // add decay refresh intervals
    refreshInterval = setInterval(refreshTimer, refreshRate);
    decayInterval = setInterval(decayTimer, decayRate);
    clearInterval(checkInterval);
    DOMElements.dateSelector.removeClass('visible');
    resetMap();
    removeTimeStamp();
    stateOf.selfClose = false;
    stateOf.waiting = false;
    stateOf.liveTime = true;
    updateLiveTime();
    createWebsocket();
  });

  DOMElements.logoTime.mousedown(function() {
    stateOf.liveTime = false;
    DOMElements.liveBtn.prop("disabled", false);
    DOMElements.logoTime.prop("disabled", true);
    DOMElements.clearHistoricData.prop("disabled", true);
    DOMElements.homeSidebarToggle.css("pointer-events", "none"); // to disable button while in historical
    // remove decay and refresh intervals
    resetMap();
    clearInterval(refreshInterval);
    clearInterval(decayInterval);
    DOMElements.dateSelector.addClass('visible');
    stateOf.selfClose = true; // let the program know that the websocket was closed internally
    ws.close();
  });

  // Set decay to query value
  if (URLData.d !== undefined) {
    DOMElements.decaySlider.val(URLData.d);
    DOMElements.decayOutput.text(DOMElements.decaySlider.val());
    urlQueryDecay();
  }
  // Set refresh to query value
  if (URLData.r !== undefined) {
    DOMElements.refreshSlider.val(URLData.r);
    DOMElements.refreshOutput.text(DOMElements.refreshSlider.val());
    urlQueryRefresh();
  }
  // if the user passes in a location, change view there.
  // TODO: Separate xy and z
  if (URLData.l !== undefined && URLData.l.x !== undefined && URLData.l.y !== undefined && URLData.l.z !== undefined) {
    map.setView(new L.latLng(parseFloat(URLData.l.x[0]), parseFloat(URLData.l.y[0])), URLData.l.z[0]);
  }
  if (URLData.f !== undefined) {
    URLData.f = getFilters(URLData.query);
  }
  // add event listener for querying for historical data
  DOMElements.dateButton.mousedown(function() {
    DOMElements.clearHistoricData.prop('disabled', false);
    hourPoints = [];
    hourIndex = 0;
    playback(datepicker.start, datepicker.diff);
  });

  //used to reset the map at the user
  DOMElements.clearHistoricData.mousedown(function() {
    DOMElements.dateButton.prop('disabled', false);
    DOMElements.clearHistoricData.prop('disabled', true);
    // make sure historical data stops being added
    clearInterval(historicalInterval);
    clearInterval(checkInterval);
    resetMap();
    removeTimeStamp();
    stateOf.waiting = false;
  });

  /**** functions from this point on ****/
  /**
   * playback gets the playback data and makes sure that is displayed in an orderly fashion
   * @param {Integer} start is the start date in seconds as unix time
   * @param {Integer} diff is the amount of days that the start date and end date encompase
   */
  function playback(start, diff) {
    if (getActiveEvents().filter.length <= 0) {
      errorAlert('401: Invalid event selection.');
      return;
    } else if (diff <= 0) {
      errorAlert('401: Invalid date selection.');
      return;
    }
    DOMElements.dateButton.prop('disabled', true);
    stateOf.wait = true;

    var i = 0,
      tmpStart = start,
      range = 86400,
      end = start + range;
    playbackData.status = 0;

    setTimeStampURL(start, end);
    // check to see if any data exists
    if (hourPoints.length > 0) {
      playbackData.status = 1;
      historicalInterval = setInterval(historicalTimer, 1000, 0, start, range, diff);
    } else {
      playbackData.initStart = start;
      //TODO: assign parameters by each day range of datepicker.start and datepicker.end
      var checkWaiting = function(loop) {
        clearInterval(checkInterval);
        if (stateOf.waiting === false && i < diff) {
          if (i + 1 === diff) {
            playbackData.status = 1;
          }
          getPlaybackData(tmpStart, end, diff);
          tmpStart = end;
          end += range;
          i++;
        } else {
          if (!loop) { // never gets run as of right now, but could be used for not doing looping
            DOMElements.dateButton.prop('disabled', false);
            return;
          }
        }
        checkInterval = setInterval(checkWaiting, 1000, loop);
      };
      checkInterval = setInterval(checkWaiting, 1000, true);
    }
  }

  /**
   * openMapResetModal opens a modal for resetting the map
   */
  function openLiveMapResetModal() {
    createModal('liveMapResetModal', 'Are You Sure You Want To Reset Live Map?', false,
      liveMapResetModalBody, true, liveMapResetModalBtn); // create reset modal for future use
    // makes the modal open
    $('#liveMapResetModal').modal({
      keyboard: false
    });
    // add event listener for reseting the maps points
    $("#liveMapResetModalBtn").mousedown(function() {
      resetMap();
    });
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
      decayRate = DOMElements.decaySlider.val() * 1000;
      refreshRate = DOMElements.refreshSlider.val() * 1000;
      setDecayURL(DOMElements.decaySlider.val());
      setRefreshURL(DOMElements.refreshSlider.val());
      clearInterval(decayInterval);
      decayInterval = setInterval(decayTimer, decayRate);
      clearInterval(refreshInterval);
      refreshInterval = setInterval(refreshTimer, refreshRate);
    });
  }

  /**
   * urlQueryDecay ensures that the decay interval is on the amount specified in the url
   */
  function urlQueryDecay() {
    decayRate = DOMElements.decaySlider.val() * 1000;
    clearInterval(decayInterval);
    decayInterval = setInterval(decayTimer, decayRate);
  }

  /**
   * urlQueryRefresh ensures that the refresh interval is on the amount specified in the url
   */
  function urlQueryRefresh() {
    refreshRate = DOMElements.refreshSlider.val() * 1000;
    clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshTimer, refreshRate);
  }

  /**
   * hideModal hides the default user modal
   * @param {String} ID is the html id of the modal to hide
   */
  function hideModal(ID) {
    $('#' + ID).hide();
    DOMElements.body.removeClass('modal-open');
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
    if (heatmapLayer._data.size > heatmapLayer.cfg.maxPoints && stateOf.liveTime) {
      clearPoints(heatmapLayer._data.size - heatmapLayer.cfg.maxPoints);
    }
    stateOf.mapChanged = true;
  }

  /**
   * clearPoints takes in the amount of points tp remove and removes it from the heatmapLayer._data
   * @param {Integer} numPoints the number of points to remove
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
    stateOf.eventMap.forEach(function(value, key, map) {
      listEvents += getListItem(key, value);
    });
    // if the events that are to be added are the first, then add them as checked
    if (stateOf.firstPass && URLData.f === undefined) {
      stateOf.checkedEvent = true;
    } else {
      stateOf.checkedEvent = false;
    }
    $.each(events, function(index, value) {
      if (!stateOf.eventMap.has(value)) { // the value does not already exist, so add it to the list
        listEvents += getListItem(value, stateOf.checkedEvent); // get the HTML markdown
        stateOf.eventMap.set(value, stateOf.checkedEvent);
        if (!stateOf.firstPass) { // if the events being added are not the initial batch display the message
          DOMElements.defaultHamburgerBtn.addClass('circle');
          eventAlert(value);

          window.setTimeout(function() { // this makes the eventAlert disappear after three seconds.
            $(".alert").fadeTo(1000, 0).slideUp(1000, function() {
              $(this).remove();
            });
          }, 3000);
        }
      }
    });
    DOMElements.eventList.html(listEvents); // saves time on DOM lookup because it is all added at once
    DOMElements.eventList.height(stateOf.eventMap.size * 40 + 'px'); // dynamically allocate the height of the event list
    // make sure that the ticker has the appropriate values on start up
    if (stateOf.firstPass) {
      updateTicker(getActiveEvents().filter);
    }
    stateOf.firstPass= false; // the error messages should be displayed in the error modal
    // add event listeners for the checkboxes being clicked
    var eventCheckboxes = $('#eventList li input');
    eventCheckboxes.mousedown(function() {
      var id = $(this).attr('id');
      stateOf.eventMap.set(id, !stateOf.eventMap.get(id)); // flip the value of the checkbox in the map
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
   */
  function getActiveEvents() {
    var events = {
      'filter': []
    };
    // check to see which events are active
    stateOf.eventMap.forEach(function(value, key, map) {
      if (value) {
        events.filter.push(key);
      }
    });
    return events;
  }

  /*
   * urlQueryFilters sets the filters to the filters submitted in the url query and then submits them to the WebSocket
   */
  function urlQueryFilters() {
    $.each(URLData.f, function(index, value) {
      stateOf.eventMap.set(value.split("%20").join(" "), true);
    });
    sendActiveEventList();
  }

  /**
   * submitClientID gets the user provided clientID and sends it to the server
   */
  function submitClientID() {
    // set the clientID and then send it
    client = DOMElements.clientID.val();
    setCidURL(client);
    // show the loading spinner and disable the client
    showSpinner();
    DOMElements.clientSubmit.prop('disabled', true);
    stateOf.wait = true;
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
    DOMElements.body.append(modal);
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
    DOMElements.timeDisplay.html(theTime);
  }

  /**
   * updatestateOf.liveTime updates the time for the user while live mode is active
   */
  function updateLiveTime() {
    if (URLData.ts !== undefined && stateOf.liveTime !== true) {
      return;
    }
    var theTime = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
    displayTime(theTime);
    var t = setTimeout(function() {
      updateLiveTime();
    }, 500);
    if (!stateOf.liveTime) {
      clearTimeout(t);
    }
  }

  /**
   * updateHistoryTime takes in a date as unix seconds and displays it to the user
   * @param {Integer} theTime is the time to be displayed to the user during historical mode
   */
  function updateHistoryTime(theTime) {
    stateOf.liveTime = false;
    // Formate time to look readable
    var date = moment.unix(theTime);
    if (!date.isDST()) {
      date.subtract(1, "hour"); // should take an hour away when DST goes away
    }
    displayTime(date.format("dddd, MMMM Do YYYY, h:mm:ss a"));
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
    DOMElements.marquee.html(tickerText);
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
    var a = heatmapLayer._max / 4,
      b = heatmapLayer._min,
      c = a / 2;
    DOMElements.key.html('<i class="fas fa-fire"></i>');
    DOMElements.key1.html(Math.ceil(b));
    DOMElements.key2.html(Math.ceil(c));
    DOMElements.key3.html(Math.ceil(a));
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
   * @param {Integer} count
   * @returns {Integer} is 1 less than count
   */
  function decayMath(count) {
    return count - 1;
  }

  /**
   * errorAlert creates and displays an alert with an error message
   * @param {String} message is the message to display in the error message
   */
  function errorAlert(message) {
    var alert = '<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
      '<strong>Oops! Something went wrong.</strong> ' + message +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
      '<span aria-hidden="true">&times;</span> </button></div>',
      already = $('.alert');
    if (already.length > 0) {
      already.remove();
    }
    DOMElements.body.append(alert);
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
    DOMElements.body.append(alert);
    $('.alert').alert();
  }

  /**
   * getPlaybackData makes an ajax call to get data for playback
   * @param {Integer} startDate is the starting date for the for the desired data in seconds
   * @param {Integer} endDate is the ending date for the for the desired data in seconds
   * @param {Integer} diff is the amount if days that the startDate and endDate span
   */
  function getPlaybackData(startDate, endDate, diff) {
    showSpinner();
    stateOf.waiting = true;
    var frames = 24, // the amount of chunks the overall date range should be broken up into. Allows for faster querying and requests.
      range = (endDate - startDate) / frames, // finds the amount of time each chunk is going to have
      requestArray = [], // allows us to check when all promises are completed
      startIndex = hourIndex;

    function successFunc(result) {
      hourPoints[result.Index] = result.Batch;
    }

    function errFunc() {
      // get rid of the spinner
      DOMElements.dateButton.prop('disabled', false);
      errorAlert("505: Unable to get historical data.");
    }

    for (var i = 0; i < frames; i++) {
      var playbackRequest = {
        index: hourIndex,
        filters: getActiveEvents().filter,
        clientID: client,
        startTime: startDate + range * i,
        endTime: startDate + range * (i + 1)
      };
      hourIndex++;
      //oldTime(time);
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
      stateOf.wait = false;
      hideSpinner();
      // if (noData) {
      //   errorAlert('No data was found for the provided date range.', );
      // }
      // starts animating the array
      historicalInterval = setInterval(historicalTimer, 1000, startIndex, playbackData.initStart, range, diff);
    });
  } // end of getPlaybackData

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
      self.diff = tempEnd.add(1, "days").diff(tempStart, 'days');
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
      if (stateOf.wait) {
        hideSpinner();
        DOMElements.clientSubmit.prop('disabled', false);
      }
      stateOf.wait = false;
      var data = JSON.parse(e.data);
      if (data instanceof Array) {
        hideModal('startModal');
        if (URLData.f !== undefined && stateOf.firstPass) {
          urlQueryFilters();
        }
        addEvents(data);

        if (URLData.ts !== undefined && !stateOf.tsEvaluated) {
          stateOf.tsEvaluated = true;
          // Run historical mode
          setTimeout(function() {
            // Stop updating livetime
            stateOf.liveTime = false;
            // Close websocket
            ws.close();
            // Click on historical mode button
            DOMElements.logoTime.trigger('mousedown');
            playback(datepicker.start, datepicker.diff);
            DOMElements.logoTime.prop("disabled", true);
          }, 1000);
        }
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
      if (URLData.cid !== undefined) {
        client = URLData.cid[0].split("%20").join(" "); // gets the client ID from the query and replaces all "%20" with " "
        sendID();
      } else if (stateOf.liveTime && !stateOf.firstPass) {
        sendID();
      } else {
        // listen to see if a clientID is entered in the input box
        createModal('startModal', 'Please Enter Your Client ID:', true, startModalBody,
          false, startModalBtn); // creates the starting modal
        // starting modal opens
        $('#startModal').modal();
        DOMElements.clientID = $('#cIDinput');
        DOMElements.clientSubmit = $('#enter');
        DOMElements.clientID.on('input', function() {
          if (this.value.trim().length > 0) { // the user has actually input text
            DOMElements.clientSubmit.prop("disabled", false);
          } else { // disable the button becuase the input box is empty
            DOMElements.clientSubmit.prop("disabled", true);
          }
        });

        // Execute a function when the user releases a key on the keyboard
        DOMElements.clientID.bind('keyup', function(event) {
          // get the first and only clientSubmit button from the array and make sure that it is not disabled
          if (event.keyCode === 13 && !DOMElements.clientSubmit[0].disabled) {
            // Trigger the button element with a click
            DOMElements.clientSubmit.mousedown();
          }
        });

        DOMElements.clientSubmit.mousedown(submitClientID);
      }
    };

    // when the connection closes display that the connection has been made
    ws.onclose = function() {
      console.log("Connection closed.");
      // if the websocket was not closed internally
      if (!stateOf.selfClose) {
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

  /**
   *  showSpinner shows spinner and generates random text
   */
  function showSpinner() {
    var message1 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)],
      message2 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)];
    while (message2 === message1) {
      message2 = loadingPrompts[Math.floor(Math.random() * loadingPrompts.length)];
    }
    $('.randomText').text(message1);
    setTimeout(function() {
      $('.randomText').text(message2);
    }, 5000);
    DOMElements.spinner.addClass('visible');
  }


  /**
   *  hideSpinner hides the spinner
   */
  function hideSpinner() {
    DOMElements.spinner.removeClass('visible');
  }

  /**
   * parseQuery takes in a url and parses it appropriately for later use
   * @param {String} urlString is the url to parse
   * @return {Array} is the query part of the url seperated into an array
   */
  function parseQuery(urlString) {
    var params = {},
      queryArray,
      pair;
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

  /**
   * getCID gets the clientID from the given array, if it exists
   * @param {Array} params is the array of url parameters 
   * @return {Object} is either the clientID array or undefined 
   */
  function getCID(params) {
    if (params.hasOwnProperty("cid") === true && params.cid.length === 1) {
      return params.cid;
    } else {
      return undefined;
    }
  }

  /**
   * getDecay gets the decayRate from the given array, if it exists
   * @param {Array} params is the array of url parameters 
   * @return {Object} is either the decayRate or undefined 
   */
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

  /**
   * getRefresh gets the refreshRate from the given array, if it exists
   * @param {Array} params is the array of url parameters 
   * @return {Object} is either the refreshRate or undefined 
   */
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

  /**
   * getLocation gets the location from the given array, if it exists
   * @param {Array} params is the array of url parameters 
   * @return {Object} it either has the properties x, y, and z or is undefined 
   */
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

  /**
   * getFilters gets the filters from the given array, if they exist
   * @param {Array} params is the array of url parameters 
   * @return {Object} it is either an array or is undefined 
   */
  function getFilters(params) {
    if (params.hasOwnProperty("f") === true) {
      return params.f;
    } else {
      return undefined;
    }
  }

  /**
   * getTimeStamp gets the timestamps from the given array, if they exist
   * @param {Array} params is the array of url parameters 
   * @return {Object} it is either an array or is undefined 
   */
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

  /**
   * setCidURL puts the clientID into the url
   * @param {String} cid is the clientID
   */
  function setCidURL(cid) {
    var rexpression = /cid\=[^&]*/g;
    ensureProperToken();

    if (URLData.url.includes("cid=")) {
      URLData.url = URLData.url.replace(rexpression, "cid=" + cid);
    } else {
      URLData.url += URLData.token + "cid=" + cid;
    }
    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * setFiltersURL puts the active filters into the url
   */
  function setFiltersURL() {
    var activeEvents = getActiveEvents().filter,
        token = "";
    for (var i = 0; i < activeEvents.length; i++) {
      token += "&f=" + activeEvents[i];
    }

    if (!URLData.url.includes("?")) {
      URLData.url += "?";
    }

    // takes out previous filter query flags
    URLData.url = URLData.url.replace(/[\?\&][fF]\=[^&]*/g, "");
    URLData.url += token;
    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * setDecayURL sets the decay rate value in the query string of the url
   * @param {Integer} d the decay rate that is on the slider
   */
  function setDecayURL(d) {
    ensureProperToken();

    var rexpression = /[\?\&]d\=[0-9]*/g;
    if (URLData.url.includes("&d=")) {
      URLData.url = URLData.url.replace(rexpression, URLData.token + "d=" + d);
    } else {
      URLData.url += URLData.token + "d=" + d;
    }
    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * setRefreshURL sets the refresh rate in the query string of the url
   * @param {Integer} r is the refreshRate from the slider
   */
  function setRefreshURL(r) {
    ensureProperToken();

    var rexpression = /[\?\&]r\=[0-9]*/g;
    if (URLData.url.includes("r=")) {
      URLData.url = URLData.url.replace(rexpression, URLData.token + "r=" + r);
    } else {
      URLData.url += URLData.token + "r=" + r;
    }
    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * Inserts timestamp into url
   * @param {Integer} ts_start is the start date in unix time in seconds
   * @param {Integer} ts_end is the end date in unix time in seconds
   */
  function setTimeStampURL(ts_start, ts_end) {
    // make sure the token is correct
    ensureProperToken();
    var token = URLData.token + "ts=" + ts_start + "&ts=" + ts_end;

    if (URLData.url.includes("ts=")) {
      // Look for ts key in query and go through value
      var rexpression = /[/?/&][tT][sS]\=[0-9]*/g;
      URLData.url = URLData.url.replace(rexpression, "");
      DOMElements.clearHistoricData.prop('disabled', false);
    }
    URLData.url += token;

    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * Removes time stamps from url
   */
  function removeTimeStamp() {
    if (URLData.url.includes("ts=")) {
      var rexpression = /[\?\&][tT][sS]\=[0-9]*/g;
      URLData.url = URLData.url.replace(rexpression, "");
    }
    window.history.replaceState({}, document.title, URLData.url);
  }

  /**
   * ensureProperToken makes sure that the correct token is available
   */
  function ensureProperToken() {
    // determine whether or not the url query exists
    if (!URLData.url.includes("?")) {
      URLData.token = '?'; 
    } else {
      URLData.token = '&'; 
    }
  }
});