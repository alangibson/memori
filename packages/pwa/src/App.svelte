<script lang="ts">
	import Navbar from "./Navbar.svelte";
	import LogIn from "./LogIn.svelte";
	import Notices from "./Notices.svelte";
	import { Router, Route } from "svelte-routing";
	import Home from "./Home.svelte";
	import AddNote from "./AddNote.svelte";
	import Create from "./Create.svelte";
	import { AuthenticationState } from "./store";
	import "svelte-material-ui/bare.css";
	import ViewMemory from "./ViewMemory.svelte";
	import ViewScreenshot from "./ViewScreenshot.svelte";
	import AddImage from "./AddImage.svelte";
	import AddVideo from "./AddVideo.svelte";
	import AddAudio from "./AddAudio.svelte";
	import AddLink from "./AddLink.svelte";
	import AddFile from "./AddFile.svelte";
	import WebShareTarget from "./WebShareTarget.svelte";

	// URL for SSR
	export let url = "";

	// Ping the server to see if we are authorized
	async function ping() {
		const response = await fetch("/ping", {
			credentials: "same-origin",
		});
		AuthenticationState.isAuthenticated(response.ok);
	}
	ping();
</script>

<Router url="{url}">

	<Navbar />
	<LogIn />
	<Notices />


	<Route path="/"><Home /></Route>
	<Route path="/add/note"><AddNote /></Route>
	<Route path="/add/image"><AddImage /></Route>
	<Route path="/add/video"><AddVideo /></Route>
	<Route path="/add/audio"><AddAudio /></Route>
	<Route path="/add/link"><AddLink /></Route>
	<Route path="/add/file"><AddFile /></Route>
	<Route path="/webshare"><WebShareTarget /></Route>
	<Route path="/view/memory"><ViewMemory /></Route>
	<Route path="/view/memory/screenshot"><ViewScreenshot /></Route>
</Router>

<Create />

<svelte:head>
	<style src="./styles/global.scss"></style>
</svelte:head>

