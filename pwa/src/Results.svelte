<script lang="ts">
    import { AuthenticationState, SearchResults } from "./store";
    import Result from "./Result.svelte";

    // List top memories on load
    // TODO only get most recent N!
    async function preload() {
        const response = await fetch("/memory");
        AuthenticationState.isAuthenticated(response.ok);
        if (response.ok) {
            const results = await response.json();
            SearchResults.setResults(results);
        }
    }

    preload();
</script>

<div>
    {#each $SearchResults as result}
        <Result memory={result.thing} />
    {/each}
</div>
