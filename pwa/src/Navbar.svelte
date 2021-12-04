<script>
    import IconButton from "@smui/icon-button";
    import TopAppBar, {
        Row,
        Section,
        Title
    } from "@smui/top-app-bar";
    import { AuthenticationState } from "./store";

    async function logOut() {
        const response = await fetch('/authorization', { method: 'DELETE' });
        AuthenticationState.isAuthenticated(! response.ok);
    }
</script>

<TopAppBar variant="static">
    <Row>
        <Section>
            Memori<Title>Never Forget</Title>
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
