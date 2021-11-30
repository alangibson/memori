<script lang="ts">
	import Navbar from "./Navbar.svelte";
	import LogIn from "./LogIn.svelte";
	import Notices from "./Notices.svelte";
	import Tools from "./Tools.svelte";
	import Results from "./Results.svelte";
	// import '@fortawesome/fontawesome-free/css/all.min.css'
	// import '@fortawesome/fontawesome-svg-core';
</script>

<main>
	<Navbar />
	<LogIn />
	<Notices />
	<Tools />
	<Results />
</main>

<svelte:head>
	<style src="./styles/global.scss"></style>
</svelte:head>
