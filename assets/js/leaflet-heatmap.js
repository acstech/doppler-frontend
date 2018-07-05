/*
* Leaflet Heatmap Overlay
*
* Copyright (c) 2008-2016, Patrick Wied (https://www.patrick-wied.at)
* Dual-licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
* and the Beerware (http://en.wikipedia.org/wiki/Beerware) license.
*/
(function (name, context, factory) {
  // Supports UMD. AMD, CommonJS/Node.js and browser context
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(
      require('heatmap.js'),
      require('leaflet')
    );
  } else if (typeof define === "function" && define.amd) {
    define(['heatmap.js', 'leaflet'], factory);
  } else {
    // browser globals
    if (typeof window.h337 === 'undefined') {
      throw new Error('heatmap.js must be loaded before the leaflet heatmap plugin');
    }
    if (typeof window.L === 'undefined') {
      throw new Error('Leaflet must be loaded before the leaflet heatmap plugin');
    }
    context[name] = factory(window.h337, window.L);
  }

})("HeatmapOverlay", this, function (h337, L) {
  'use strict';

  // Leaflet < 0.8 compatibility
  if (typeof L.Layer === 'undefined') {
    L.Layer = L.Class;
  }

  var HeatmapOverlay = L.Layer.extend({

    initialize: function (config) {
      this.cfg = config;
      this._el = L.DomUtil.create('div', 'leaflet-zoom-hide');
      this._data = [];
      this._max = 1600;
      this._min = 0;
      this.cfg.container = this._el;
    },

    onAdd: function (map) {
      var size = map.getSize();

      this._map = map;

      this._width = size.x;
      this._height = size.y;

      this._el.style.width = size.x + 'px';
      this._el.style.height = size.y + 'px';
      this._el.style.position = 'absolute';

      this._origin = this._map.layerPointToLatLng(new L.Point(0, 0));

      map.getPanes().overlayPane.appendChild(this._el);

      if (!this._heatmap) {
        this._heatmap = h337.create(this.cfg);
      }

      // this resets the origin and redraws whenever
      // the zoom changed or the map has been moved
      map.on('moveend', this._reset, this);
      this._draw();
    },

    addTo: function (map) {
      map.addLayer(this);
      return this;
    },

    onRemove: function (map) {
      // remove layer's DOM elements and listeners
      map.getPanes().overlayPane.removeChild(this._el);

      map.off('moveend', this._reset, this);
    },
    _draw: function() {
      if (!this._map) { return; }

      var mapPane = this._map.getPanes().mapPane;
      var point = mapPane._leaflet_pos;

      // reposition the layer
      this._el.style[HeatmapOverlay.CSS_TRANSFORM] = 'translate(' +
        -Math.round(point.x) + 'px,' +
        -Math.round(point.y) + 'px)';

      this._update();
    },
    _update: function() {
      var valueField = this.cfg.valueField || 'value';
      var bounds, zoom, scale;
      var generatedData = { max: this._max, min: this._min, data: [] };

      bounds = this._map.getBounds();
      zoom = this._map.getZoom();
      scale = Math.pow(2, zoom);

      if (dataMap.size == 0) {
        if (this._heatmap) {
          this._heatmap.setData(generatedData);
        }
        return;
      }


      var latLngPoints = [];

      var localMax = 0;
      var localMin = 0;

      var mapVar = this._map;

      function convertLatLngtoPixels(value, key, map) {

        localMax = Math.max(value[valueField], localMax);
        localMax = Math.max(value[valueField], localMin);

        var point = mapVar.latLngToContainerPoint(L.latLng(value.latlng));
        var latlngPoint = { x: Math.round(point.x), y: Math.round(point.y) };
        latlngPoint[valueField] = value[valueField];

        latLngPoints.push(latlngPoint);
      }

      dataMap.forEach(convertLatLngtoPixels)

      if (this.cfg.useLocalExtrema) {
        generatedData.max = localMax;
        generatedData.min = localMin;
      }

      generatedData.data = latLngPoints;

      this._heatmap.setData(generatedData);
    },

    // clears data and inserts new data
    setData: function(data) {

      this._max = data.max || this._max;
      this._min = data.min || this._min;
      var latField = this.cfg.latField || 'lat';
      var lngField = this.cfg.lngField || 'lng';
      var valueField = this.cfg.valueField || 'value';

      // transform data to latlngs
      var data = data.data;
      var len = data.length;
      // cut down the size of the input if it exceeds the maxSize limit
      if(this.maxSize > 0){
        if (len > this.maxSize){
          len = this.maxSize;
        }
      }
      var d = [];

      while (len--) {
        var entry = data[len];
        var latlng = new L.LatLng(entry[latField], entry[lngField]);

        var dataObj = { latlng: latlng };
        dataObj[valueField] = entry[valueField];

        d.push(dataObj);
      }
      this._data = d;

      // removes the extra data
      if (this.cfg.maxSize > 0) {
        this.removeDataPoints();
      }

      this._draw();
    },
    // removes data from the head until there are under maxSize data points
    removeDataPoints: function(){
      while (this._data.length > this.cfg.maxSize) {
        this._data.shift(); // pops the head off the array
      }
    },
    _reset: function () {
      this._origin = this._map.layerPointToLatLng(new L.Point(0, 0));

      var size = this._map.getSize();
      if (this._width !== size.x || this._height !== size.y) {
        this._width  = size.x;
        this._height = size.y;

        this._el.style.width = this._width + 'px';
        this._el.style.height = this._height + 'px';

        this._heatmap._renderer.setDimensions(this._width, this._height);
      }
      this._draw();
    }
  });

  HeatmapOverlay.CSS_TRANSFORM = (function() {
    var div = document.createElement('div');
    var props = [
      'transform',
      'WebkitTransform',
      'MozTransform',
      'OTransform',
      'msTransform'
    ];

    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (div.style[prop] !== undefined) {
        return prop;
      }
    }
    return props[0];
  })();

  return HeatmapOverlay;
});
