<script lang="ts">
    import { Link, navigate } from "svelte-routing";
    import Fab, { Icon } from "@smui/fab";
    import List, { Item } from "@smui/list";
    import Button, { Label } from "@smui/button";
    import MenuSurface, { MenuSurfaceComponentDev } from "@smui/menu-surface";

    let surface: MenuSurfaceComponentDev;

    function addNote() {
        surface.setOpen(false);
        navigate("/note");
    }

    function addImage() {
        surface.setOpen(false);
        navigate("/add/image");
    }

    function addAudio() {}

    function addVideo() {
        surface.setOpen(false);
        navigate("/add/video");
    }

    function addLink() {}

    function addFile() {}
</script>

<Fab
    style="position: fixed; right: 1em; bottom: 1em;"
    on:click={() => surface.setOpen(true)}
>
    <Icon class="material-icons">add</Icon>
    <MenuSurface bind:this={surface} anchorCorner="BOTTOM_LEFT">
        <List>
            <Item on:SMUI:action={addNote}>
                <Button>
                    <Icon class="material-icons">post_add</Icon>
                    <Label>Note</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={addImage}>
                <Button>
                    <Icon class="material-icons">add_a_photo</Icon>
                    <Label>Photo</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={addAudio}>
                <Button>
                    <Icon class="material-icons">keyboard_voice</Icon>
                    <Label>Audio</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={addVideo}>
                <Button>
                    <Icon class="material-icons">video_call</Icon>
                    <Label>Video</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={addLink}>
                <Button>
                    <Icon class="material-icons">add_link</Icon>
                    <Label>Link</Label>
                </Button>
            </Item>
            <Item on:SMUI:action={addFile}>
                <Button>
                    <Icon class="material-icons">upload_file</Icon>
                    <Label>File</Label>
                </Button>
            </Item>
        </List>
    </MenuSurface>
</Fab>
