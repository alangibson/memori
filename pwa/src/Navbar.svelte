<script>
    import { Link } from "svelte-routing";
    import { Image, ImageAspectContainer } from "@smui/image-list";
    import TopAppBar, { Row, Section } from "@smui/top-app-bar";
    import { AuthenticationState } from "./store";
    import IconButton, { Icon } from "@smui/icon-button";
    import { Svg } from "@smui/common/elements";

    async function logOut() {
        const response = await fetch("/authorization", { method: "DELETE" });
        AuthenticationState.isAuthenticated(!response.ok);
    }

    function back() {
        window.history.back();
    }

    function forward() {
        window.history.forward();
    }
</script>

<TopAppBar variant="static">
    <Row>
        <Section>
            <IconButton class="material-icons">
                <Link to="/">
                    <img
                        src="/icons/icon-white-192x192.png"
                        alt="Go to home page"/>
                </Link>
            </IconButton>
        </Section>

        <Section style="justify-content: center; align-items: center;">
            <IconButton class="material-icons" on:click={back}
                >arrow_back_ios</IconButton
            >
            <IconButton class="material-icons" on:click={forward}
                >arrow_forward_ios</IconButton
            >
        </Section>

        <Section align="end" toolbar>
            <a
                href="/extension/build/memori-browser-extension-latest.zip"
                target="_blank"
            >
                <IconButton
                    class="material-icons"
                    aria="Download Browser Extension"
                >
                    browser_updated
                </IconButton>
            </a>
            <IconButton class="material-icons" aria="Log Out" on:click={logOut}>
                logout
            </IconButton>
        </Section>
    </Row>
</TopAppBar>
