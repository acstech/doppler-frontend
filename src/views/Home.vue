<template>
<div class="home">
    <gmap-map :center="center" :zoom="4" style="width:100%; height: 800px;">
        <gmap-marker :key="index" v-for="(m, index) in markers" :position="m.position"></gmap-marker>
    </gmap-map>
</div>
</template>

<script>
export default {
    name: 'home',
    data() {
        return {
            center: {
                lat: 37,
                lng: -95
            },
            markers: []
        };
    },
    methods: {
        addMarker(location) {
            var self = this;
            var marker = {
                lat: location.latitude,
                lng: location.longitude
            };

            self.markers.push({
                position: marker
            });
            console.log(self.markers.length)
        },
        delMarker() {
            var self = this;
              self.markers.pop();
            console.log(self.markers.length)
        },
        showPoint: function (delay, location) {
            var self = this;
            setTimeout(function () {
                self.addMarker(location)
            }, 1000 * delay);
        },
        hidePoint: function (delay, length) {
        var self = this;
            setTimeout(function () {
                self.delMarker()
            }, (6000) * delay);
       }
    },
    mounted: function () {
        var self = this;
        var locations = [{
                latitude: 30.902913055,
                longitude: -100.503664652
            },
            {
                latitude: 34.196000,
                longitude: -79.838000
            },
            {
                latitude: 30.196000,
                longitude: -110.838000
            },
            {
                latitude: 30.196000,
                longitude: -97.838000
            },
            {
                latitude: 50.196000,
                longitude: -80.838000
            },
            {
                latitude: 40.196000,
                longitude: -93.838000
            }
        ];

        for (var x = 0; x < locations.length; x++) {
            self.showPoint(x, locations[x]);
        }
        for (var x = 0; x <= locations.length; x++) {
            self.hidePoint(x, locations.length);
        }
    }
}
</script>
