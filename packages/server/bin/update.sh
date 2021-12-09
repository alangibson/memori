#!/usr/bin/env bash

#
# Must be run from project root directory.
#
# https://dev.to/severo/using-webhooks-to-update-a-self-hosted-jekyll-blog-59al 
#

systemctl stop memori

# Commented out because this could seriously mess up a dev system
# git reset --hard HEAD
git pull

cd server
npm i --also=dev
sudo cp memori.service /etc/systemd/system/memori.service

systemctl daemon-reload
systemctl start memori
