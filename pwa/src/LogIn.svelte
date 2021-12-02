<script>
    import { Content } from '@smui/card';
    import Button from "@smui/button";
    import Textfield from "@smui/textfield";
    import Icon from "@smui/textfield/icon";
    import HelperText from "@smui/textfield/helper-text";
    import Banner, { Label } from "@smui/banner";

    let token = "";
</script>

<Banner open mobileStacked content$style="max-width: max-content;">

    <!-- <Icon slot="icon" class="material-icons">warning</Icon> -->
 
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

    <!-- <Label slot="label">

        We got a bad response from the server. Are you sure you are logged in?

        <form method="get" action="/login">
            <Textfield variant="outlined" bind:value={token} label="Token">
                <Icon class="material-icons" slot="leadingIcon">key</Icon>
                <HelperText slot="helper">Secret token</HelperText>
              </Textfield>

            <Button>Log In</Button>
        </form>

    </Label> -->

    <Button slot="actions">
        <Icon class="material-icons">close</Icon>
        <Label>Close</Label>
    </Button>
</Banner>

<!-- <div>
    <div class="notification is-warning">
        <button class="delete" />
        <div class="container">
            <div class="columns">
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <p>
                                We got a bad response from the server. Are you
                                sure you are logged in?
                            </p>
                            <form method="get" action="/login">
                                <div class="field">
                                    <label class="label">Token</label>
                                    <div class="control">
                                        <input
                                            name="token"
                                            class="input"
                                            type="text"
                                            placeholder="Secret Token"
                                        />
                                    </div>
                                </div>
                                <div class="field is-grouped">
                                    <div class="control">
                                        <button class="button is-link"
                                            >Log In</button
                                        >
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="column">
                    <div class="card">
                        <div class="card-content">
                            <p>
                                If you haven't created a Mind yet, you can
                                create one here. Just enter a name and click
                                Create. We'll respond with your secret token and
                                automatically log you in.
                            </p>
                            <form method="POST">
                                <label for="mindName">Name</label>
                                <input name="mindName" />
                                <button>Create</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div> -->
