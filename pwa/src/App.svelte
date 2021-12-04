<script lang="ts">
	import Navbar from "./Navbar.svelte";
	import LogIn from "./LogIn.svelte";
	import Notices from "./Notices.svelte";
	import { Router, Link, Route } from "svelte-routing";
	import Home from "./Home.svelte";
	import Note from "./Note.svelte";
	import Create from "./Create.svelte";
	import { AuthenticationState } from "./store";
	import "svelte-material-ui/bare.css";
	import ViewMemory from "./ViewMemory.svelte";
import ViewScreenshot from "./ViewScreenshot.svelte";

	// Ping the server to see if we are authorized
	async function ping() {
		const response = await fetch("/ping", {
			credentials: "same-origin",
		});
		AuthenticationState.isAuthenticated(response.ok);
	}
	ping();
</script>

<main>
	<Navbar />
	<LogIn />
	<Notices />
	<Router>
		<Route path="/"><Home /></Route>
		<Route path="/note"><Note /></Route>
		<Route path="/view/memory"><ViewMemory /></Route>
		<Route path="/view/memory/screenshot"><ViewScreenshot /></Route>
	</Router>

	<Create />
</main>

<svelte:head>
	<style src="./styles/global.scss"></style>
</svelte:head>
