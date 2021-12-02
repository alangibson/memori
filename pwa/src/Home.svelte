<script lang="ts">
    import Fab, { Icon } from "@smui/fab";
    import MenuSurface, { MenuSurfaceComponentDev } from "@smui/menu-surface";
    import List, { Item } from "@smui/list";
    import Button, { Label } from '@smui/button';
    import Navbar from "./Navbar.svelte";
    import LogIn from "./LogIn.svelte";
    import Notices from "./Notices.svelte";
    import Tools from "./Tools.svelte";
    import Results from "./Results.svelte";

    let surface: MenuSurfaceComponentDev;
    let clicked = "";
</script>

<Navbar />
<LogIn />
<Notices />
<Tools />
<Results />

<Fab
    style="position: fixed; right: 1em; bottom: 1em;"
    on:click={() => surface.setOpen(true)}
>
    <Icon class="material-icons">add</Icon>
    <MenuSurface bind:this={surface} anchorCorner="BOTTOM_LEFT">
        <List>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">post_add</Icon>
                    <Label>Note</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">add_a_photo</Icon>
                    <Label>Photo</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">keyboard_voice</Icon>
                    <Label>Audio</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">video_call</Icon>
                    <Label>Video</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">add_link</Icon>
                    <Label>Link</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={() => (clicked = "Cut")}>
                <Button>
                    <Icon class="material-icons">upload_file</Icon>
                    <Label>File</Label>
                </Button>
            </Item>
        </List>
    </MenuSurface>
</Fab>

<style>
</style>
