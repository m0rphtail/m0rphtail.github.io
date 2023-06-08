#!/bin/bash

port=4444
time=300

./build.sh
echo "starting server on port " ${port}
python3 -m http.server ${port} &
server_pid=$!

sleep ${time}
kill $server_pid

