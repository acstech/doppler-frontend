import Vue from 'vue'
import App from './App.vue'
import router from './router'

import * as VueGoogleMaps from "vue2-google-maps";

Vue.use(VueGoogleMaps, {
    load: {
        // key: "REPLACE-THIS-WITH-YOUR-KEY-FROM-ABOVE",
        libraries: "places" // necessary for places input
    }
});



Vue.config.productionTip = false

new Vue({
    router,
    render: h => h(App)
}).$mount('#app')