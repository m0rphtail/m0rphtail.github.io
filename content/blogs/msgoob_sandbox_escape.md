+++
title = "MSG_OOB: The Esoteric Kernel Feature That Became a Sandbox Escape"
date = "2025-08-08"
+++

In August 2025, Project Zero published a writeup detailing CVE-2025-38236, a use-after-free in Linux's `MSG_OOB` support for UNIX domain sockets. The full exploit chain turns code execution in a Chrome renderer process into arbitrary kernel code execution, using a feature that almost no modern software relies on.

## An obscure socket feature

`MSG_OOB` handles out-of-band data, allowing a single byte to be sent ahead of the normal stream. Support for it on `AF_UNIX` stream sockets was introduced in Linux 5.15 in 2021. The implementation is strict: exactly one byte at a time, and sending a second OOB byte before reading the first demotes the original byte back to in-band data. Outside of some legacy Oracle products, almost nothing relies on this behavior. A kernel RFC in 2024 even proposed dropping it entirely. Still, it remained compiled into the default `AF_UNIX` module with no option to disable it until late 2024.

Chrome's Linux renderer sandbox allowed stream-oriented UNIX domain sockets and did not inspect the `flags` argument passed to `send()` or `recv()`. That left the entire `MSG_OOB` code path reachable from inside the renderer.

## The vulnerability

The trigger sequence is compact:

```c
char dummy;
int socks[2];
socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
send(socks[1], "A", 1, MSG_OOB);
recv(socks[0], &dummy, 1, MSG_OOB);
send(socks[1], "A", 1, MSG_OOB);
recv(socks[0], &dummy, 1, MSG_OOB);
send(socks[1], "A", 1, MSG_OOB);
recv(socks[0], &dummy, 1, 0);        // normal recv
recv(socks[0], &dummy, 1, MSG_OOB);  // UAF
```

Under the hood, an OOB message sits in the receive queue as a standard socket buffer (SKB), referenced by an `oob_skb` pointer. Reading it with `MSG_OOB` increments its `consumed` counter, leaving a zero-length SKB in the queue. The regular receive routine calls `manage_oob()` to clean up. 

A 2024 patch intended to fix an unrelated spurious EOF bug introduced the flaw in `manage_oob()`. When the receive queue holds a zero-length SKB directly followed by another OOB SKB, the cleanup code unlinks the zero-length buffer and advances the queue, but fails to clear the dangling `oob_skb` pointer. Calling `recv(..., MSG_OOB)` again dereferences that freed memory.

Because the buggy patch was only backported as far as kernel 6.9.8, older LTS releases never received it and were never vulnerable.

## Escalating to kernel execution

Turning this use-after-free into reliable kernel code execution from inside the sandbox required chaining multiple techniques. The exploit used heap grooming to reclaim the freed SKB, deliberate timing delays to stabilize a race condition, and a second memory corruption bug discovered during code review. That second bug required an eight-syscall sequence to trigger, which explains why automated fuzzers never hit it.

Two implementation details in the exploit stand out:

Delays do not require FUSE or `userfaultfd`. Calling `mprotect()` across a large anonymous VMA backed by zero pages (around 128 MiB of page tables) stalls `copy_from_user()` in kernel space for roughly a second. Restricting `userfaultfd` does not mitigate this delay primitive.

Usercopy hardening adds friction without stopping exploitation. While kernel checks restrict writing to arbitrary kernel addresses through `copy_to_user()`, writes remain allowed across most memory regions outside type-specific SLUB caches.

## Sandbox attack surface

The core takeaway from the exploit is that Chrome's renderer sandbox exposed kernel attack surface that renderers never needed. `MSG_OOB` was reachable simply because seccomp filters checked syscall numbers rather than argument flags.

Chrome resolved the issue by blocking `MSG_OOB` flags inside renderers, while the kernel patched the pointer cleanup in `manage_oob()`. Effective sandboxing restricts both direct process actions and the exposed kernel interfaces underneath. Barely used socket flags and legacy subsystems rarely receive heavy auditing, making them prime targets for sandbox escapes.
