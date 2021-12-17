# Memori Browser Extension

## Build

```
npm run build
```

## Run extension in Firefox with hot reload

```
cd extension
npx web-ext run --verbose

# 1) Go go about:debugging 2) Click "This Firefox" 3) Click "Inspect" under plugin
```

## Run server

```
npm exec -- @memori/extension start
```
