<script lang="ts">
    import { Image } from "@smui/image-list";
    import Tab from "@smui/tab";
    import TabBar from "@smui/tab-bar";
    import { createAvatar } from "@dicebear/avatars";
    import * as style from "@dicebear/avatars-jdenticon-sprites";
    import { navigate } from "svelte-routing";
    import { SelectedMemory } from "./store";
    import Card, { Content } from "@smui/card";
    import LayoutGrid, { Cell, InnerGrid } from "@smui/layout-grid";
    import Button, { Group, Label, Icon } from "@smui/button";

    export let memory: any;

    function viewMemory() {
        SelectedMemory.setMemory(memory);
        navigate("/view/memory");
    }

    function viewScreenshot() {
        SelectedMemory.setMemory(memory);
        navigate("/view/memory/screenshot");
    }

    function defaultImage(e: any) {
        e.target.src = createAvatar(style, {
            seed: memory["@id"],
            dataUri: true,
        });
    }

    async function forgetMemory() {
        await fetch(`/memory?@id=${memory["@id"]}`, {
            method: "DELETE",
        });

        // TODO handle 401

        // TODO trigger SearchBar#doSearch
    }

    function url(): string {
        if (memory.url.startsWith("cid:"))
            return `/memory/attachment?@id=${memory["@id"]}&attachment=${memory["@id"]}`;
        else return memory.url;
    }

    function tabNames(): string[] {
        return [
            memory["@type"],
            ...memory["m:embedded"]
                .map((memory: any) => memory["@type"])
                // Blacklist some object types
                .filter(
                    (typeName: string) =>
                        !["Organization", "WPHeader"].includes(typeName)
                ),
        ];
    }

    let active = tabNames()[0];
</script>

<Card variant="outlined">
    <LayoutGrid>
        <Cell spanDevices={{desktop: 2, phone: 4}}>
            {#each [memory, ...memory["m:embedded"]] as schema}
                <div style={active != schema["@type"] ? "display: none" : ""}>
                    <Image
                        on:click={viewScreenshot}
                        src="/memory/attachment?@id={schema[
                            '@id'
                        ]}&attachment=thumbnail"
                        alt="Thumbnail"
                        on:error={defaultImage}
                    />
                </div>
            {/each}
        </Cell>

        <Cell spanDevices={{desktop: 10, phone: 4}}>
            <TabBar tabs={tabNames()} let:tab bind:active>
                <Tab {tab} minWidth>
                    <Label>{tab}</Label>
                </Tab>
            </TabBar>

            {#each [memory, ...memory["m:embedded"]] as schema}
                {#if active == schema["@type"]}
                    <!-- style={active != schema["@type"] ? "display: none" : ""} -->
                    <InnerGrid>
                        <Cell spanDevices={{desktop: 8, phone: 4}}>
                            <Content style="overflow-wrap: break-word;">
                                <h4>
                                    <a href={url()}>{schema.name}</a>
                                </h4>
                                <div>
                                    {schema.abstract}
                                </div>
                                <h5>
                                    {schema["@type"]} / {schema.encodingFormat}
                                </h5>
                            </Content>
                        </Cell>
                        <Cell spanDevices={{desktop: 4, phone: 4}}>
                            <Group class="memory-actions">
                                <Button variant="outlined">
                                    <a
                                        href="/memory/attachment?@id={schema[
                                            '@id'
                                        ]}&attachment={schema['@id']}"
                                    >
                                        <Icon class="material-icons"
                                            >download</Icon
                                        >
                                        <Label>Download</Label>
                                    </a>
                                </Button>
                                <Button
                                    variant="outlined"
                                    on:click={forgetMemory}
                                >
                                    <Icon class="material-icons">delete</Icon>
                                    <Label>Forget</Label>
                                </Button>
                                <Button
                                    variant="outlined"
                                    on:click={viewMemory}
                                >
                                    <Icon class="material-icons">read_more</Icon
                                    >
                                    <Label>More</Label>
                                </Button>
                            </Group>
                        </Cell>
                    </InnerGrid>
                {/if}
            {/each}
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
