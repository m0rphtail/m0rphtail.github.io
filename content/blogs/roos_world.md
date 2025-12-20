+++
title = "Roos world Writeup (ImaginaryCTF 2021)"
date = "2021-08-02"
updated = "2024-07-12"
+++

# Roos World

The source code of the webpage had a comment written in `JSFuck`.

So i used an [online tool](https://enkhee-osiris.github.io/Decoder-JSFuck/) to run the file, and got this.

```js
console.log(atob("aWN0ZnsxbnNwM2N0MHJfcjAwX2cwZXNfdGgwbmt9"));
```

Decoding from base64 I get the flag.

``` bash
echo "aWN0ZnsxbnNwM2N0MHJfcjAwX2cwZXNfdGgwbmt9" | base64 -d
```

#### flag >> `ictf{1nsp3ct0r_r00_g0es_th0nk}`