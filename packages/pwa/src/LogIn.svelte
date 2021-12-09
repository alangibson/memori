<script lang="ts">
    import Card, { Content } from "@smui/card";
    import Button from "@smui/button";
    import Textfield from "@smui/textfield";
    import Icon from "@smui/textfield/icon";
    import HelperText from "@smui/textfield/helper-text";
    import { Label } from "@smui/banner";
    import { AuthenticationState } from "./store";

    let token = "";

    async function logIn() {
        const response = await fetch(`/authorization?token=${token}`);
        AuthenticationState.isAuthenticated(response.ok);
    }

    async function createMind(e: Event) {
        console.log("createMind", e);
        const response = await fetch(`/mind`, {
            method: "POST",
        });
        AuthenticationState.isAuthenticated(response.ok);

        if (response.ok) {
            const json = await response.json();
            // TODO display token
            console.info("Token:", json.token);
        } else {
            // TODO display error message
            console.warn(await response.text());
        }
    }
</script>

{#if !$AuthenticationState}
    <Card>
        <!-- <Banner open mobileStacked> -->
        <Content>
            <p>
                We got a bad response from the server. Are you sure you are
                logged in? Click the Create Token button if you're new here.
            </p>
            <Textfield variant="outlined" bind:value={token} label="Token">
                <Icon class="material-icons" slot="leadingIcon">vpn_key</Icon>
                <HelperText slot="helper">Secret token</HelperText>
            </Textfield>

            <Button on:click={logIn}>
                <Icon class="material-icons">login</Icon>
                <Label>Log In</Label>
            </Button>
            <Button color="secondary" on:click={createMind}>
                <Icon class="material-icons">vpn_key</Icon>
                <Label>Create Token</Label>
            </Button>
        </Content>
        <!-- <Button slot="actions">
            <Icon class="material-icons">close</Icon>
            <Label>Close</Label>
        </Button> -->
    </Card>
    <!-- </Banner> -->
{/if}
