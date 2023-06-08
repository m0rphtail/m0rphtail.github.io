#!/bin/bash

# Delete all zip files except the latest one
ls -t *.zip | tail -n +2 | xargs rm
rm -rf index.html
unzip -o *.zip
mv *.html index.html
