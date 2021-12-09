<script lang="ts">
    import { navigate } from "svelte-routing";
    import Button from "@smui/button";
    import LayoutGrid, { Cell } from "@smui/layout-grid";

    let mediaRecorder: MediaRecorder;
    const recordedChunks: Blob[] = [];
    // File input element is bound to this variable
    let input: HTMLInputElement;
    let video: HTMLVideoElement;
    let player: HTMLVideoElement;

    function onChange() {
        // Abort if there are no images
        if (!input.files) return;

        // Get file from the bound file input element
        const file: File = input.files[0];

        if (file) {
            const reader = new FileReader();
            // Set image src to our new image when loading is doone
            reader.addEventListener("load", () =>
                video.setAttribute("src", <string>reader.result)
            );
            // Actually read the image data
            reader.readAsDataURL(file);
        }
    }

    // https://svelte.dev/repl/b17c13d4f1bb40799ccf09e0841ddd90?version=3.44.2
    async function remember() {
        // Get file from the bound file input element
        const file: File | undefined = input.files?.[0];

        if (!file) return;

        const form = new FormData();
        form.append("video", file);
        const response = await fetch("/memory", {
            method: "POST",
            body: form,
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

    function rememberRecording(e: Event) {
        e.preventDefault();

        mediaRecorder.requestData();
        // Trigger MediaRecorder stop event
        mediaRecorder.stop();
    }

    function pause(e: Event) {
        e.preventDefault();

        if (mediaRecorder.state == "paused") 
            mediaRecorder.resume();
        else {
            mediaRecorder.pause();

            const blob = new Blob(recordedChunks, {
                type: "videop/webm",
            });

            player.src = URL.createObjectURL(blob);
        }
    }

    function record(e: Event) {
        e.preventDefault();

        const handleSuccess = function (stream: MediaStream) {
            console.debug(`Invoking handleSuccess with stream ${stream}`);

            // player.srcObject = stream;

            mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm",
            });

            // Accumulate audio data as it comes in
            mediaRecorder.addEventListener("dataavailable",
                function (e: BlobEvent) {
                    console.debug(`Adding blob of size ${e.data.size}`);
                    if (e.data.size > 0) recordedChunks.push(e.data);
                }
            );

            mediaRecorder.addEventListener("stop", function () {
                // TODO reset icons

                console.debug("Media recorder stopped");

                // Turn audio data into a blob
                const blob = new Blob(recordedChunks, { type: "audio/webm" });

                // Remember audio blob
                console.log(`Remembering audio Blob of size ${blob.size}`);
                const formData = new FormData();
                formData.append("video", blob);
                fetch("/memory", {
                    method: "POST",
                    body: formData,
                });
            });

            // Remember to call start() or MedialRecorder will be in inactive state.
            // We specify a time slice of 1 second, otherwise datavailable event is
            // only fired on mediaRecorder.stop()
            mediaRecorder.start(1000);
        };

        navigator.mediaDevices
            .getUserMedia({ audio: true, video: true })
            .then(handleSuccess)
            .catch((error) => console.error(error));
    }
</script>

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
        <Button on:click={remember}>Remember</Button>
    </Cell>
    <Cell span={12}>
        <button on:click={record}>Record</button>
        <button on:click={pause}>Pause</button>
        <button on:click={rememberRecording}>Remember</button>
    </Cell>
    <Cell span={12}>
        <video id="player" controls bind:this={player}>
            <track kind="captions" />
        </video>
    </Cell>
</LayoutGrid>
