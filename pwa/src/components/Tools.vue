<template>
    <section class="section">
      <div class="container">
        <Search/>
        <Toolbar/>
      </div>
    </section>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Toolbar from './Toolbar.vue';
import Search from './Search.vue';

@Options({
  components: {
    Toolbar,
    Search
  },
  props: {
  },
})
export default class Tools extends Vue {
}
</script>

<style scoped>
</style>
