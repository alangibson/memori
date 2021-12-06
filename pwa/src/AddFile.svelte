<script lang="ts">
    import Button from "@smui/button";
    import LayoutGrid, { Cell } from "@smui/layout-grid";
</script>

<h1>Remember files</h1>

<form method="POST" action="/memory" enctype="multipart/form-data">
<LayoutGrid>
    <Cell span={12}>
        <input id="files" name="file" type="file" multiple={true} />
    </Cell>
    <Cell span={12}>
        <Button >Remember</Button>
    </Cell>
</LayoutGrid>
</form>
