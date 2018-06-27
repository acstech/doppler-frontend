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
      this._max = 1;
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
      var bounds, zoom, scale;
      var generatedData = { max: this._max, min: this._min, data: [] };

      bounds = this._map.getBounds();
      zoom = this._map.getZoom();
      scale = Math.pow(2, zoom);

      if (this._data.length == 0) {
        if (this._heatmap) {
          this._heatmap.setData(generatedData);
        }
        return;
      }


      var latLngPoints = [];
      var radiusMultiplier = this.cfg.scaleRadius ? scale : 1;
      var localMax = 0;
      var localMin = 0;
      var valueField = this.cfg.valueField;
      var len = this._data.length;

      while (len--) {
        var entry = this._data[len];
        var value = entry[valueField];
        var latlng = entry.latlng;


        // we don't wanna render points that are not even on the map ;-)
        if (!bounds.contains(latlng)) {
          continue;
        }
        // local max is the maximum within current bounds
        localMax = Math.max(value, localMax);
        localMin = Math.min(value, localMin);

        var point = this._map.latLngToContainerPoint(latlng);
        var latlngPoint = { x: Math.round(point.x), y: Math.round(point.y) };
        latlngPoint[valueField] = value;

        var radius;

        if (entry.radius) {
          radius = entry.radius * radiusMultiplier;
        } else {
          radius = (this.cfg.radius || 2) * radiusMultiplier;
        }
        latlngPoint.radius = radius;
        latLngPoints.push(latlngPoint);
      }
      if (this.cfg.useLocalExtrema) {
        generatedData.max = localMax;
        generatedData.min = localMin;
      }

      generatedData.data = latLngPoints;

      this._heatmap.setData(generatedData);
    },

    // clears data and inserts new data
    setData: function(data) {

      // cut down the size of the input if it exceeds the maxSize limit
      if(this.maxSize > 0){
        while (data.data.length > this.maxSize){
          data.data.shift();
        }
      }

      this._max = data.max || this._max;
      this._min = data.min || this._min;
      var latField = this.cfg.latField || 'lat';
      var lngField = this.cfg.lngField || 'lng';
      var valueField = this.cfg.valueField || 'value';
      var timeField = this.cfg.timeField || 'time';

      // transform data to latlngs
      var data = data.data;
      var len = data.length;
      var d = [];

      while (len--) {
        var entry = data[len];
        var latlng = new L.LatLng(entry[latField], entry[lngField]);

        // gives inserted data the current time (UNIX) and passes the object into the data array
        var dataObj = { latlng: latlng, time: Math.round(new Date().getTime() / 1000)};
        //dataObj[timeField] = entry[timeField]
        dataObj[valueField] = entry[valueField];
        if (entry.radius) {
          dataObj.radius = entry.radius;
        }
        d.push(dataObj);
      }
      this._data = d;

      // removes the extra data
      if (this.cfg.maxSize > 0) {
        this.removeDataPoints();
      }

      // removes decayed data
      if (this.cfg.maxTime > 0) {
        this.decayDataPoints();
      }

      this._draw();
    },
    // removes data from the head until there are under maxSize data points
    removeDataPoints: function(){
      while (this._data.length > this.cfg.maxSize) {
        this._data.shift(); // pops the head off the array
      }
    },
    // pops head off of data array once
    removeData: function(){
        this._data.shift();
        this._draw();
    },
    // removes data from the head if they are more than maxTime seconds old
    decayDataPoints: function(){
      if (this.cfg.maxTime > 0) {
        // gets the oldest time a point can be before it is removed
        var oldestTime = (Math.round(new Date().getTime() / 1000)) - this.cfg.maxTime;
        var stop = false;
        while(!stop && (this._data.length > 0)){
          if(this._data[0].time < oldestTime) {
            this._data.shift(); //pops from head
          }
          else {
            stop = true;
          }
        }
      }
      this._draw();
    },
    // experimential... not ready.
    addData: function(pointOrArray) {
      if (pointOrArray.length > 0) {
        var len = pointOrArray.length;
        while(len--) {
          this.addData(pointOrArray[len]);
        }
      } else {
        var latField = this.cfg.latField || 'lat';
        var lngField = this.cfg.lngField || 'lng';
        var valueField = this.cfg.valueField || 'value';
        var timeField = this.cfg.timeField || 'time'
        var entry = pointOrArray;
        var latlng = new L.LatLng(entry[latField], entry[lngField]);
        // added: sets 'time' to current time in seconds
        var dataObj = { latlng: latlng, time: Math.round(new Date().getTime() / 1000)};


        dataObj[valueField] = entry[valueField];
        this._max = Math.max(this._max, dataObj[valueField]);
        this._min = Math.min(this._min, dataObj[valueField]);

        if (entry.radius) {
          dataObj.radius = entry.radius;
        }

        // puts input data on array
        this._data.push(dataObj);

        // cleans data for overfilling and decay
        if (this.cfg.maxSize > 0) {
          this.removeDataPoints();
        }
        if (this.cfg.maxTime > 0) {
          // this.decayDataPoints();
        }
        // refreshes heatmap
        // this._draw();
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
