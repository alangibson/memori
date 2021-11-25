<template>
  <div>
    <Navbar />
    <LogIn />
    <Notices />
    <Tools />
    <Results />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import LogIn from './LogIn.vue';
import Navbar from './Navbar.vue';
import Notices from './Notices.vue';
import Tools from './Tools.vue';
import Results from './Results.vue';

@Options({
  components: {
    LogIn,
    Navbar,
    Notices,
    Tools,
    Results
  },
  props: {
    // msg: String,
  },
})
export default class Home extends Vue {
  // msg!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
