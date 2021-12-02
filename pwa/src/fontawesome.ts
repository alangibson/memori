import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faMarker, faCamera, faMicrophone, faVideo, faLink, faFile } from '@fortawesome/free-solid-svg-icons';

library.add(faMarker, faCamera, faMicrophone, faVideo, faLink, faFile)

window.addEventListener('DOMContentLoaded', () => {
  dom.i2svg()
  dom.watch()
})