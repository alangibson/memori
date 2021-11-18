#!/usr/bin/env bash

#
# https://dev.to/severo/using-webhooks-to-update-a-self-hosted-jekyll-blog-59al 
#

systemctl daemon-reload
systemctl stop memori
git pull
systemctl start memori
