<script lang="ts">
	import Home from "./Home.svelte";
	import { AuthenticationState } from './store';
	import "svelte-material-ui/bare.css";

	// Ping the server to see if we are authorized
	async function ping() {
		const response = await fetch('/ping', {
			credentials: 'same-origin'
		});
		AuthenticationState.isAuthenticated(response.ok);
	}
	ping();

</script>

<main>
	<Home />
</main>

<svelte:head>
	<style src="./styles/global.scss"></style>
</svelte:head>
