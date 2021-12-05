<script lang="ts">
    import { navigate } from "svelte-routing";
    import Button from "@smui/button";
    import LayoutGrid, { Cell } from "@smui/layout-grid";

    // File input element is bound to this variable
    let input: HTMLInputElement;
    // Show image preview?
    let showPreview = false;
    // Image preview container
    let container: HTMLDivElement;
    // Placeholder image
    let placeholder: HTMLSpanElement;
    // Uploaded video
    let video: HTMLVideoElement;

    // These values are bound to properties of the video
    let time = 0;
    let duration: number;
    let paused = true;

    let showControls = true;
    let showControlsTimeout: any;

    // Used to track time of last mouse down event
    let lastMouseDown: Date;

    function handleMove(e: any) {
        // Make the controls visible, but fade out after
        // 2.5 seconds of inactivity
        clearTimeout(showControlsTimeout);
        showControlsTimeout = setTimeout(() => (showControls = false), 2500);
        showControls = true;

        if (!duration) return; // video not loaded yet
        if (e.type !== "touchmove" && !(e.buttons & 1)) return; // mouse not down

        const clientX =
            e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const { left, right } = this.getBoundingClientRect();
        time = (duration * (clientX - left)) / (right - left);
    }

    // we can't rely on the built-in click event, because it fires
    // after a drag — we have to listen for clicks ourselves
    function handleMousedown(e: any) {
        lastMouseDown = new Date();
    }

    function handleMouseup(e: any) {
        // @ts-ignore
        if (new Date() - lastMouseDown < 300) {
            if (paused) e.target.play();
            else e.target.pause();
        }
    }

    function format(seconds: any) {
        if (isNaN(seconds)) return "...";

        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        if (seconds < 10) seconds = "0" + seconds;

        return `${minutes}:${seconds}`;
    }

    function onChange() {
        // Abort if there are no images
        if (!input.files) return;

        // Get file from the bound file input element
        const file: File = input.files[0];

        if (file) {
            showPreview = true;

            const reader = new FileReader();
            // Set image src to our new image when loading is doone
            reader.addEventListener("load", () =>
                video.setAttribute("src", <string>reader.result)
            );
            // Actually read the image data
            reader.readAsDataURL(file);
        } else {
            showPreview = false;
        }
    }

    // https://svelte.dev/repl/b17c13d4f1bb40799ccf09e0841ddd90?version=3.44.2
    // async function rememberVideo() {
    //     const form = new FormData();
    //     // form.append('image', )
    //     const response = await fetch("/memory", {
    //         method: "POST",
    //     });
    //     if (response.ok) {
    //         // TODO display popup message
    //         navigate("/");
    //     } else {
    //         // TODO display popup message
    //     }
    // }
</script>

<form action="/memory" method="POST" enctype="multipart/form-data">
    <LayoutGrid>
        <Cell span={6}>
            <input
                bind:this={input}
                on:change={onChange}
                name="video"
                type="file"
                accept="video/*"
                capture="environment"
            />
        </Cell>
        <Cell span={6}>
            <Button>Remember</Button>
        </Cell>

        <Cell span={12}>
            <!-- Preview -->
            <div id="preview" bind:this={container}>
                {#if showPreview}
                    <video
                        bind:this={video}
                        alt="Preview"
                        on:mousemove={handleMove}
                        on:touchmove|preventDefault={handleMove}
                        on:mousedown={handleMousedown}
                        on:mouseup={handleMouseup}
                        bind:currentTime={time}
                        bind:duration
                        bind:paused
                    >
                        <track kind="captions" />
                    </video>
                {:else}
                    <span bind:this={placeholder}>Image Preview</span>
                {/if}
            </div>
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
