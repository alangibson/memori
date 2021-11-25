sudo apt update
sudo apt install nginx nodejs npm

cd /var/www/html/

git clone https://github.com/localtunnel/server
cd server/
npm install
# https://github.com/localtunnel/server/issues/90
npm install esm@3

sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx

snap install certbot --classic

certbot --server https://acme-v02.api.letsencrypt.org/directory \
  -d *.my.memori.link --manual --preferred-challenges dns-01 certonly

cp site.conf /etc/nginx/sites-available/my.memori.link
ln -s  /etc/nginx/sites-available/my.memori.link  /etc/nginx/sites-enabled/my.memori.link
nginx -t

systemctl restart nginx

cp localtunnel-server.service /etc/systemd/system
systemctl daemon-reload
systemctl enable localtunnel-server
systemctl start localtunnel-server
systemctl status localtunnel-server
