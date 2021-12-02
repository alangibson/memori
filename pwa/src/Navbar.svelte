<script>
    import Button from "@smui/button";
    import IconButton from "@smui/icon-button";
    import TopAppBar, {
        Row,
        Section,
        Title,
        AutoAdjust,
    } from "@smui/top-app-bar";
</script>

<TopAppBar variant="static">
    <Row>
        <Section>
            Memori<Title>Never Forget</Title>
        </Section>
        <Section align="end" toolbar>
            <IconButton class="material-icons" aria="Log Out">
                logout
            </IconButton>
            <!-- <IconButton class="material-icons">
                apps
            </IconButton> -->
        </Section>
    </Row>
</TopAppBar>
