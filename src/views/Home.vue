<template>
<div class="home">
    <gmap-map :center="center" :zoom="2" style="width:100%; height: 800px;">
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
                lat: 0,
                lng: 0
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
        },
        showPoint: function (delay, location) {
            var self = this;
            setTimeout(function () {
                self.addMarker(location)
            }, 1000 * delay);
        }
    },
    mounted: function () {
        var self = this;
        var locations = [{
                latitude: 62.902913055,
                longitude: -150.503664652
            },
            {
                latitude: 34.196000,
                longitude: -79.838000
            },
            {
                latitude: 30.196000,
                longitude: -50.838000
            },
            {
                latitude: 20.196000,
                longitude: -50.838000
            },
            {
                latitude: 50.196000,
                longitude: -30.838000
            },
            {
                latitude: 90.196000,
                longitude: -40.838000
            }
        ];

        for (var x = 0; x < locations.length; x++) {
            self.showPoint(x, locations[x]);
        }
    }
}
</script>
