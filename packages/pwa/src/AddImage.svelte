<script lang="ts">
    import { navigate } from "svelte-routing";
    import Button from "@smui/button";
    import LayoutGrid, { Cell } from "@smui/layout-grid";

    // File input element is bound to this variable
    let input: HTMLInputElement;
    // Show image preview?
    let showImage = false;
    // Uploaded image
    let image: HTMLImageElement;

    function onChange() {
        // Abort if there are no images
        if (!input.files) return;

        // Get file from the bound file input element
        const file: File = input.files[0];

        if (file) {
            showImage = true;

            const reader = new FileReader();
            // Set image src to our new image when loading is doone
            reader.addEventListener("load", () =>
                image.setAttribute("src", <string>reader.result)
            );
            // Actually read the image data
            reader.readAsDataURL(file);
        } else {
            showImage = false;
        }
    }

    // https://svelte.dev/repl/b17c13d4f1bb40799ccf09e0841ddd90?version=3.44.2
    async function remember() {

        // TODO post image?
        // const form = new FormData();
        // form.append('image', )

        const response = await fetch("/memory", {
            method: "POST",
        });
        if (response.ok) {
            // TODO display popup message
            navigate("/");
        } else {
            // TODO display popup message
        }
    }
</script>

<form action="/memory" method="POST" enctype="multipart/form-data">
    <LayoutGrid>
        <Cell span={12}>
            <input
                bind:this={input}
                on:change={onChange}
                name="image"
                type="file"
                accept="image/*"
                capture="environment"
            />
        </Cell>

        <Cell span={12}>
            <!-- Image preview -->
            <div id="preview">
                {#if showImage}
                    <img bind:this={image} src="" alt="Preview" />
                {:else}
                    <span>Image Preview</span>
                {/if}
            </div>
        </Cell>

        <Cell span={12}>
            <Button on:click={remember}>Remember</Button>
        </Cell>
    </LayoutGrid>
</form>

<style>
    #preview {
        min-width: 300px;
        min-height: 100px;
        border: 2px solid #ddd;
        margin-top: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #ccc;
    }
    #preview img {
        width: 100%;
    }
</style>
