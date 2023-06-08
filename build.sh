#!/bin/bash

# Delete all zip files except the latest one
ls -t *.zip | tail -n +2 | xargs rm
rm -r -d */
rm -rf index.html
unzip *.zip
mv *.html index.html
