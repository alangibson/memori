<template>
  <section class="section">
    <div class="container">
      <Result />
      <Result />
      <Result />
    </div>
  </section>
</template>


<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Result from "./Result.vue";

@Options({
  components: {
    Result,
  },
  props: {},
})
export default class Results extends Vue {}
</script>

<style scoped>
</style>
