<script>
    // import Paper, { Content as Card } from "@smui/paper";
    import Card, { Content } from "@smui/card";
    import LayoutGrid, { Cell } from "@smui/layout-grid";
    import Button, { Group, Label, Icon } from "@smui/button";

    export let memory;
</script>

<Card variant="outlined">
    <LayoutGrid>
        <Cell spanDevices={{ desktop: 3, tablet: 2}}>
            <figure class="image is-128x128">
                <img
                    class="thumbnail"
                    src="https://bulma.io/images/placeholders/128x128.png"
                    alt="Thumbnail placeholder"
                />
            </figure>
        </Cell>

        <Cell spanDevices={{ desktop: 6, tablet: 5 }}>
            <Content>
            <h4>
                <a href="${memory.url}">{memory.name}</a>
            </h4>
            <div>{memory.abstract}</div>
            <h5>{memory["@type"]} / {memory.encodingFormat}</h5>
        </Content>
        </Cell>

        <Cell spanDevices={{ desktop: 3}}>
            <Group class="memory-actions">
                <Button variant="outlined">
                    <Icon class="material-icons">download</Icon>
                    <Label>Download</Label>
                </Button>
                <Button variant="outlined">
                    <Icon class="material-icons">delete</Icon>
                    <Label>Forget</Label>
                </Button>
                <Button variant="outlined">
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
