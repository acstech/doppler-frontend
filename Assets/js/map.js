'use strict';
  // the basic map layer using openstreetmap -- Matt
  var baseLayer = L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution: '...',
      maxZoom: 18
    }
  );


  // configures the map's settings -- Matt
  var cfg = {
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    // if scaleRadius is false it will be the constant radius used in pixels
    "radius": 22,
    "maxOpacity": 1.0, // put in slider on front-end side to adjust the opacity

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
    // which field name in your data represents the data value - default "value"
    valueField: 'count'
  };



// added the document.addEventListener to listen for the map to load
document.addEventListener("DOMContentLoaded", function(event) {
  // heatmap instanciation
  var heatmapLayer = new HeatmapOverlay(cfg);

  var map = new L.Map('map-canvas', {
    center: new L.LatLng(36.080599, -96.750646),
    zoom: 4,
    worldCopyJump: true,
    layers: [baseLayer, heatmapLayer]
  });

  heatmapLayer.setData(emptyData);

  //heatmapLayer.addData(eastData.data)    this is used to add data to the mape

// function for our state change to make the map animated
  function stateChange() {
    setTimeout (function () {
        heatmapLayer.addData(eastData.data)}, 1000); // can changed back to heatmapLayer.setData(eastData}, 1000);
    setTimeout (function () {
        heatmapLayer.addData(centralData.data)}, 3000);// can changed back to heatmapLayer.setData(centralData}, 1000);
    setTimeout (function () {
        heatmapLayer.addData(westData.data)}, 5000);// can changed back to heatmapLayer.setData(westData}, 1000);
    };

    // added to get the realm button so on a click, it changes states
    document.getElementById("realm").addEventListener("click", stateChange);
  });
