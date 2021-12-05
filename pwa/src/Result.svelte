<script>
    import { Image } from "@smui/image-list";
    import { generateFromString } from "generate-avatar";
    import { navigate } from "svelte-routing";
    import { SelectedMemory } from "./store";
    // import Paper, { Content as Card } from "@smui/paper";
    import Card, { Content } from "@smui/card";
    import LayoutGrid, { Cell } from "@smui/layout-grid";
    import Button, { Group, Label, Icon } from "@smui/button";

    export let memory;

    function viewMemory() {
        SelectedMemory.setMemory(memory);
        navigate("/view/memory");
    }

    function viewScreenshot() {
        SelectedMemory.setMemory(memory);
        navigate("/view/memory/screenshot");
    }

    function defaultImage(e) {
        console.log(e);
        const svg = generateFromString(memory["@id"]);
        e.target.src = `data:image/svg+xml;utf8,${svg}`;
    }

    async function forgetMemory() {
        const response = await fetch(`/memory?@id=${memory["@id"]}`, {
            method: "DELETE",
        });
        
        // TODO handle 401

        // TODO trigger SearchBar#doSearch
    }
</script>

<Card variant="outlined">
    <LayoutGrid>
        <Cell spanDevices={{ desktop: 3, tablet: 2 }}>
            <Image
                on:click={viewScreenshot}
                src="/memory/attachment?@id={memory[
                    '@id'
                ]}&attachment=thumbnail"
                alt="Thumbnail"
                on:error={defaultImage}
            />
        </Cell>

        <Cell spanDevices={{ desktop: 6, tablet: 5 }}>
            <Content>
                <h4>
                    <a href={memory.url}>{memory.name}</a>
                </h4>
                <div>{memory.abstract}</div>
                <h5>{memory["@type"]} / {memory.encodingFormat}</h5>
            </Content>
        </Cell>

        <Cell spanDevices={{ desktop: 3 }}>
            <Group class="memory-actions">
                <Button variant="outlined">
                    <a href="/memory/attachment?@id={memory['@id']}&attachment={memory['@id']}">
                        <Icon class="material-icons">download</Icon>
                        <Label>Download</Label>
                    </a>
                </Button>
                <Button variant="outlined" on:click={forgetMemory}>
                    <Icon class="material-icons">delete</Icon>
                    <Label>Forget</Label>
                </Button>
                <Button variant="outlined" on:click={viewMemory}>
                    <Icon class="material-icons">read_more</Icon>
                    <Label>View</Label>
                </Button>
            </Group>
        </Cell>
    </LayoutGrid>
</Card>

<style>
    /* Stack buttons vertically on large screens */
    @media only screen and (min-width: 840px) {
        :global(.memory-actions) {
            display: flex;
            flex-direction: column;
        }
    }
    /* Icons only on small screens */
    @media only screen and (max-width: 400px) {
        :global(.memory-actions) :global(.mdc-button__label) {
            display: none;
        }
    }
</style>
