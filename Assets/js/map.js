  // this makes sure that the page is ready before trying to add anything to it
  $(document).ready(function() {
    // the basic map layer using openstreetmap -- Matt
  var baseLayer = L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution: '...',
      maxZoom: 18,
      minZoom: 3
    }
  ),
  frequency = 1000, // is used to keep track of the user input for the time interval for decay
  slider = $("#myRange"),
  output = $("#demo"),
  timer = function(){ // set up a timer for the decay function to avoid hitting the amount of max points
    clearInterval(interval);
    dataMap.forEach(decay);
    console.log(frequency);
    heatmapLayer.setData({'data':Array.from(dataMap.values())});
    console.log(heatmapLayer._data.length + " vs. " + dataMap.size);
    interval = setInterval(timer, frequency);
  },
  interval = setInterval(timer, frequency);
  // configures the map's settings -- Matt
  const cfg =     {
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
    //  cap on the amount of points allowed on map before they are removed in FIFO order.
    //  set to -1 if you do not want a cap on points (Try not to let there be
    //  more than 40k points, or program will crash.)
    "maxSize": 30000,
    // mount of seconds a point stays on the map before being removed
    // set to -1 if you do not want points to decay
    "maxTime": 3600,
    // which field name in your data represents the latitude - default "lat"
    latField: 'lat',
    // which field name in your data represents the longitude - default "lng"
    lngField: 'lng',
    // which field name in your data represents the data value - default "value"
    valueField: 'count',

    blur: 1
  };
  // global variables not limited to this file
   heatmapLayer = new HeatmapOverlay(cfg); // heatmap instanciation
   dataMap = new Map();
  //  leaflet map
  var map = new L.Map('map-canvas', {
    center: new L.LatLng(37.937, -96.0938),
    zoom: 4,
    worldCopyJump: true, // keeps the overlayed heatmap oriented in the center.
    layers: [baseLayer, heatmapLayer],
    zoomControl: false,
  });
  //Sets the max bounds of the map
  map.setMaxBounds([
    [85, 180],
    [-85, -180]
  ]);
  // sets the heatmapLayer
  heatmapLayer.setData({max: 300, min:1, data:[{lat: 0, lng: 0, count: 6400}]});

  // add location event listeners
  $("#unitedStatesMapRecenter").click(unitedStatesMapRecenter);
  $("#southAmericaMapRecenter").click(southAmericaMapRecenter);
  $("#europeMapRecenter").click(europeMapRecenter);
  $("#asiaMapRecenter").click(asiaMapRecenter); //northWesternUSMapRecenter
  $("#southeasternUSMapRecenter").click(southeasternUSMapRecenter);
  $("#northWesternUSMapRecenter").click(northWesternUSMapRecenter);
  $("#worldMapRecenter").click(worldMapRecenter);
  // Sets the heatmapLayer
//  heatmapLayer.setData({max: 8, data:[{lat: 0, lng: 0}]});
  // slider for Decay Time
  output.text( slider.val()); // Display the default slider value
  // Update the current slider value (each time you drag the slider handle)
  slider.on('input', function() {
      output.text( this.value );
      frequency = this.value * 1000;
      clearInterval(interval);
      interval = setInterval(timer, frequency);
  });

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
   * decay takes in a value, a key, and a map and determines if a point should stay on it based on the
   * count property of the value after having the decayMath function applied to it
   * @param {Objetc} value is the value of the key/value pair stored in the map (it should have a count property)
   * @param {String} key is the key of the key/value pair stored in the map
   * @param {Objetc} map is the map that the key/value pair is from
   */
  function decay(value, key, map) {
    // check to see if decaying the point will give it a count of 0 or less, if so remove it
    // floor is used to allow for different decay rates
    var nCount = Math.floor(decayMath(value.count));
    if ( nCount <= 0 ) {
      map.delete(key);
    } else { // set the new count
      map.get(key).count = nCount;
    }
  }

  /**
   * decayMath decays the given integer by subtracting 25 from it and returns that value
   * @param {int} count
   * @returns {int} is 25 less than count
   */
  function decayMath( count ) {
    return count - 25;
  }
});
