#!/bin/bash

./build.sh
commit_message=$(date +"%Y-%m-%d %H:%M:%S") && git add . && git commit -m "publish $commit_message" && git push

