#!/usr/bin/env bash

#
# Must be run from project root directory.
#
# https://dev.to/severo/using-webhooks-to-update-a-self-hosted-jekyll-blog-59al 
#

systemctl stop memori

git pull
sudo cp server/memori.service /etc/systemd/system/memori.service
systemctl daemon-reload

systemctl start memori
