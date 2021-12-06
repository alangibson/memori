<script lang="ts">
    import Textfield from '@smui/textfield';
    import { navigate } from "svelte-routing";
    import Button from "@smui/button";
    import LayoutGrid, { Cell } from "@smui/layout-grid";

    // Input element is bound to this variable
    let value: string = '';

    async function remember() {
        const form = new FormData();
        form.append('uri-list', value);
        const response = await fetch("/memory", {
            method: "POST",
            body: form
        });
        if (response.ok) {
            // TODO display popup message
            console.debug(response);
            navigate("/");
        } else {
            // TODO display popup message
            console.error(response);
        }
    }
</script>

<h1>Remember a link</h1>

<LayoutGrid>
    <Cell span={12}>
        <Textfield bind:value name="uri-list" label="Link to remember"/>
    </Cell>
    <Cell span={12}>
        <Button on:click={remember}>Remember</Button>
    </Cell>
</LayoutGrid>
