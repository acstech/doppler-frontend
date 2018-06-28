  // the basic map layer using openstreetmap -- Matt
  var baseLayer = L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution: '...',
      maxZoom: 18,
      minZoom: 3
    }
  );

  // configures the map's settings -- Matt
  var cfg =     {
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    // if scaleRadius is false it will be the constant radius used in pixels
    "radius": 27,
    "maxOpacity": 1.0, // put in slider on front-end side to adjust the opacity
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
    // which field name in your data represents the time value - default "time"
    // added for time series data and decay
    timeField: 'time',
  };

  // this makes sure that the page is ready before trying to add anything to it
  $(document).ready(function(){
    // heatmap instanciation
     heatmapLayer = new HeatmapOverlay(cfg);

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
    heatmapLayer.setData({max: 8, data:[{lat: 0, lng: 0}]});


    // for demoing
    // $("#testData").click(stateChangeIII);

    //stateChange makes the map animated
    function stateChange() {
      setTimeout (function () {
          heatmapLayer.addData(eastData.data)}, 1000); // can changed back to heatmapLayer.setData(eastData}, 1000);
      setTimeout (function () {
          heatmapLayer.addData(centralData.data)}, 3000);// can changed back to heatmapLayer.setData(centralData}, 1000);
      setTimeout (function () {
          heatmapLayer.addData(westData.data)}, 5000);// can changed back to heatmapLayer.setData(westData}, 1000);
      }

      function stateChangeII() {
            heatmapLayer.addData(eastData.data);
      }

      // $("#testData").click(stateChangeII);

      //unitedStatesMapRecenterFunc changes the view to the United States
    function unitedStatesMapRecenterFunc() {
      map.setView(new L.LatLng(37.937, -96.0938), 4); // this sets the location and zoom amount
      console.log("I was clicked!")
    }
      $("#unitedStatesMapRecenter").click(unitedStatesMapRecenterFunc);

    // function changes the view to the South America
    function southAmericaMapRecenterFunc() {
        map.setView(new L.LatLng(-26.339, -54.9938), 4); // this sets the location and zoom amount
    }
      $("#southAmericaMapRecenter").click(southAmericaMapRecenterFunc);

    // function changes the view to the Europe
    function europeMapRecenterFunc() {
        map.setView(new L.LatLng(48.2082, 16.0938), 5); // this sets the location and zoom amount
    }
      $("#europeMapRecenter").click(europeMapRecenterFunc);

    // function changes the view to the Asia
    function asiaMapRecenterFunc() {
        map.setView(new L.LatLng(25.937, 120.0938), 4); // this sets the location and zoom amount
    }
      $("#asiaMapRecenter").click(asiaMapRecenterFunc); //northWesternUSMapRecenter

    // function changes the view to the Southeastern US
    function southeasternUSMapRecenterFunc() {
        map.setView(new L.LatLng(32.937, -80.0938), 6); // this sets the location and zoom amount
    }
      $("#southeasternUSMapRecenter").click(southeasternUSMapRecenterFunc);

    // function changes the view to the Southeastern US
    function northWesternUSMapRecenterFunc() {
        map.setView(new L.LatLng(43.937, -116.0938), 6); // this sets the location and zoom amount
    }
      $("#northWesternUSMapRecenter").click(northWesternUSMapRecenterFunc);

    // function changes the view to the Southeastern US
    function worldMapRecenterFunc() {
        map.setView(new L.LatLng(16.937, -3.0938), 3); // this sets the location and zoom amount
    }
      $("#worldMapRecenter").click(worldMapRecenterFunc);

    // Sets the heatmapLayer
    heatmapLayer.setData({max: 8, data:[{lat: 0, lng: 0}]});

    // this function makes the map reset to 0 elements after the "Map Reset" and modal are clicked
    function resetMap () {
        heatmapLayer.setData(emptyData);
    }
      $("#resetButtonFinal").click(resetMap);
  }); // end of document.ready

  // this function is used for puttin glive date and time on front-end
  function getTimeForMain() {
    var date = new Date();
    var displayDate = date.getTime();
    document.getElementById("dateDisplay").innerHTML = displayDate;
  }
