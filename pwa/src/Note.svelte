<script lang="ts">
    import { navigate } from 'svelte-routing';
    import Textfield from "@smui/textfield";
    import Button from "@smui/button";
    import Grid, { Cell } from "@smui/layout-grid";
    import Select, { Option } from '@smui/select';

    let note = "";

    // FIXME this is not being changed
    let encodingFormat = "text/markdown";

    async function remember() {

        // Post note to server
        const formData = new FormData();
        formData.append('mimetype', encodingFormat);
        formData.append('note', note);
        const response = await fetch('/memory', { 
            method: 'POST',
            body: formData
        });

        console.log(response);

        // TODO request login if response is 401

        navigate('/');
    }

</script>

<Grid style="width: 100%;">
    <Cell span={12}>
        <h1>Remember a note</h1>
    </Cell>
    <Cell span={12}>
        <Textfield textarea style="width: 100%;" bind:value={note} />
    </Cell>
    <Cell span={10}>
        <Select bind:encodingFormat label="Formatting">
              <Option value="text/markdown">Markdown</Option>
              <Option value="text/plain">Plain Text</Option>
          </Select>
    </Cell>
    <Cell span={2}>
        <Button outlined on:click={remember}>Remember</Button>
    </Cell>
</Grid>
