// import './plugins/fontawesome'
import { createApp } from 'vue'
import App from './App.vue'
require('@/assets/main.scss');
// import { faMarker } from '@fortawesome/free-solid-svg-icons'
// TODO only import the icons we need
import '@fortawesome/fontawesome-free/css/all.min.css'

createApp(App).mount('#app')
