+++
title = "MSG_OOB: The Esoteric Kernel Feature That Became a Sandbox Escape"
date = "2025-08-08"
+++

# MSG_OOB: The Esoteric Kernel Feature That Became a Sandbox Escape

Project Zero's Jann Horn published a writeup in August 2025 that I read twice, because it connects three things I thought I understood: an obscure kernel feature almost nobody uses, a sandbox that exposes more than it should, and a use-after-free that took a specific sequence of syscalls to hit. The bug is CVE-2025-38236, in Linux's `MSG_OOB` support for UNIX domain sockets, and the exploit goes from Chrome renderer code execution to kernel.

## The feature nobody uses

`MSG_OOB` is out-of-band data, a single byte you can send ahead of the rest of the stream. Support for it on `AF_UNIX` stream sockets landed in 2021 (Linux 5.15). The feature is severely limited: one byte, one pending at a time, and sending two OOB messages in a row demotes the first to normal in-band data. Almost nothing uses it, Oracle products being the notable exception. There was even a 2024 proposal to remove it entirely. But it's enabled by default whenever `AF_UNIX` is compiled in, and it wasn't even possible to disable it until December 2024.

The Chrome Linux renderer sandbox allows stream-oriented UNIX domain sockets and doesn't filter the `flags` argument of `send()`/`recv()`. So this esoteric feature, used by almost nobody, was fully reachable from inside the sandbox.

## The bug

The trigger sequence is short enough to fit in a comment:

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

The mechanics: an OOB message sits in the receive queue as a normal SKB, with the socket's `oob_skb` pointer referencing it. Receiving it with `MSG_OOB` increments its `consumed` field, leaving a remaining-length-0 SKB in the queue. The normal receive path calls `manage_oob()` to clean up, and a 2024 fix for a spurious EOF introduced the bug: when the queue has a length-0 SKB followed by an OOB SKB, the cleanup deletes the length-0 SKB and skips forward, but never clears the `oob_skb` pointer. The pointer dangles, and the next `recv(MSG_OOB)` uses freed memory.

The fix was only backported to 6.9.8, so older LTS branches were safe from the buggy fix. That's a detail worth remembering: the bug was introduced by a fix, and the fix's backport discipline accidentally protected most users.

## The exploit journey

The writeup's real value is the middle: what it takes to turn that UAF into kernel code execution from inside a renderer sandbox. The exploit needed heap grooming to reallocate the freed SKB, delay injection to win races, and a second memory corruption bug found by code review, all chained through 8 syscalls. The second bug needed exactly the right sequence, which is why fuzzing missed it: the chance of a fuzzer chaining the right syscalls in the right order drops exponentially with each additional syscall.

Two takeaways from the exploit work stuck with me:

**`copy_from_user()` delays don't need FUSE or userfaultfd.** Applying `mprotect()` to a large anonymous VMA filled with zeropage mappings, 128 MiB of page tables, delays kernel execution by around a second. The standard tooling for this is userfaultfd, which I've seen argued for restricting, but this shows the restriction wouldn't have helped much.

**Usercopy hardening is a speed bump, not a wall.** The checks on `copy_to_user()` from arbitrary kernel addresses were annoying but workable, since access to almost anything except type-specific SLUB pages is allowed.

## What I take from it

The conclusion Jann draws is the one I'd underline: Chrome's Linux renderer sandbox exposes kernel attack surface that is never legitimately used in the sandbox. `MSG_OOB` isn't used by Chrome, isn't used by almost anyone, and was still reachable from inside the sandbox because the sandbox filters syscalls, not flags. The kernel contributes by exposing esoteric features through the same syscalls as core functionality.

The fix on Chrome's side was to block `MSG_OOB` in renderers. The fix on the kernel side was the commit. The lesson on my side: when you build a sandbox, you're not just restricting what the code can do, you're defining the attack surface of everything underneath it. Every flag, every obscure feature, every "nobody uses this" path is a potential bridge. The features nobody uses are the ones nobody audits, and the ones nobody audits are the ones that end up in a writeup like this.


---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*
