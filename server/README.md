
Test progressive web app

```
cd server

# Run ngrok
wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
./ngrok http --host-header=rewrite 4321

# Run server
npm run serve
```

