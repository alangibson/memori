<script>
    import IconButton from "@smui/icon-button";
    import { Image, ImageAspectContainer } from "@smui/image-list";
    import TopAppBar, { Row, Section } from "@smui/top-app-bar";
    import { AuthenticationState } from "./store";

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
            Memori
        </Section>

        <Section>
            <IconButton class="material-icons" on:click={back}
                >arrow_back_ios</IconButton
            >
            <IconButton class="material-icons" on:click={forward}
                >arrow_forward_ios</IconButton
            >
        </Section>

        <Section align="end" toolbar>
            <IconButton class="material-icons" aria="Log Out" on:click={logOut}>
                logout
            </IconButton>
            <!-- <IconButton class="material-icons">
                apps
            </IconButton> -->
        </Section>
    </Row>
</TopAppBar>
