<script lang="ts">
	import Home from "./Home.svelte";
	// import '@fortawesome/fontawesome-free/css/all.min.css'
	// import '@fortawesome/fontawesome-svg-core';
	// import "./fontawesome";
	import "svelte-material-ui/bare.css";
	// import 'material-icons/iconfont/material-icons.css';

	// TODO ping the server to see if we are authorized

</script>

<main>
	<Home />
</main>

<svelte:head>
	<style src="./styles/global.scss"></style>
</svelte:head>
