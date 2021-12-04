<script lang="ts">
    // import { URLSearchParams } from "url";
    import { Input } from "@smui/textfield";
    import Paper from "@smui/paper";
    import Fab from "@smui/fab";
    import { Icon } from "@smui/common";
    import { AuthenticationState, SearchResults } from './store';

    let q = "";

    async function doSearch() {
        const [response, results] = await search(q);
        AuthenticationState.isAuthenticated(response.ok);
        // Pass results to Results
        SearchResults.setResults(results);
    }

    async function search(q: string): Promise<[Response, []]> {
        // const searchParams = new URLSearchParams({ q: q }).toString();
        const searchParams = `q=${q}`;
        const response = await fetch(`/memory?${searchParams}`);
        const results = await response.json();
        return [response, results];
    }

    function handleKeyDown(event: CustomEvent | KeyboardEvent) {
        event = event as KeyboardEvent;
        if (event.key === "Enter") {
            doSearch();
        }
    }
</script>

<div class="solo-demo-container solo-container">
    <Paper class="solo-paper" elevation={6}>
        <Icon class="material-icons">search</Icon>
        <Input
            bind:value={q}
            on:keydown={handleKeyDown}
            placeholder="Search"
            class="solo-input"
        />
    </Paper>
    <Fab
        on:click={doSearch}
        disabled={q === ""}
        color="primary"
        mini
        class="solo-fab"
    >
        <Icon class="material-icons">arrow_forward</Icon>
    </Fab>
</div>

<style>
    .solo-demo-container {
        padding: 36px 18px;
    }

    .solo-container {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    * :global(.solo-paper) {
        display: flex;
        align-items: center;
        flex-grow: 1;
        max-width: 600px;
        margin: 0 12px;
        padding: 0 12px;
        height: 48px;
    }
    * :global(.solo-paper > *) {
        display: inline-block;
        margin: 0 12px;
    }
    * :global(.solo-input) {
        flex-grow: 1;
        color: var(--mdc-theme-on-surface, #000);
    }
    * :global(.solo-input::placeholder) {
        color: var(--mdc-theme-on-surface, #000);
        opacity: 0.6;
    }
    * :global(.solo-fab) {
        flex-shrink: 0;
    }
</style>
