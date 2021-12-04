<script lang="ts">
    import { SearchResults } from './store';
    import Result from './Result.svelte'
</script>

<div>
    {#each $SearchResults as result}
        <Result memory={result.thing}/>
    {/each}
</div>