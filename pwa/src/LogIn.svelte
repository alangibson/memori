<script>
    import { Content } from '@smui/card';
    import Button from "@smui/button";
    import Textfield from "@smui/textfield";
    import Icon from "@smui/textfield/icon";
    import HelperText from "@smui/textfield/helper-text";
    import Banner, { Label } from "@smui/banner";

    let token = "";
</script>

<Banner open mobileStacked>
    <Content slot="label">
        <p>
            We got a bad response from the server. Are you sure you are logged
            in? Click the Create Token button if you're new here.
        </p>
        <form method="get" action="/login">
            <Textfield variant="outlined" bind:value={token} label="Token">
                <Icon class="material-icons" slot="leadingIcon">vpn_key</Icon>
                <HelperText slot="helper">Secret token</HelperText>
            </Textfield>

            <Button>
                <Icon class="material-icons">login</Icon>
                <Label>Log In</Label>
            </Button>
            <Button color="secondary">
                <Icon class="material-icons">vpn_key</Icon>
                <Label>Create Token</Label>
            </Button>
        </form>
    </Content>
    <Button slot="actions">
        <Icon class="material-icons">close</Icon>
        <Label>Close</Label>
    </Button>
</Banner>
