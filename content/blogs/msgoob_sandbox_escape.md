+++
title = "MSG_OOB: The Esoteric Kernel Feature That Became a Sandbox Escape"
date = "2025-08-08"
+++

A Project Zero writeup from August 2025 ties together three things I would have sworn I already understood: an obscure kernel feature almost nobody actually uses, a sandbox that quietly exposes more surface area than it should, and a use-after-free that only triggers under one very specific sequence of syscalls. The bug itself is CVE-2025-38236, sitting in Linux's `MSG_OOB` support for UNIX domain sockets, and the exploit chain built around it runs all the way from Chrome renderer code execution up to the kernel.

## A feature almost nobody touches

`MSG_OOB` handles out-of-band data — a single byte you can push ahead of the rest of the stream. Support for it on `AF_UNIX` stream sockets only landed in 2021, with Linux 5.15. It's a deliberately constrained feature: exactly one byte, only one pending at a time, and sending a second OOB message before the first is consumed just demotes the first one back to ordinary in-band data. Practically nothing uses this — Oracle's products being the rare exception — and there was even a proposal in 2024 to remove it from the kernel entirely. And yet it's on by default any time `AF_UNIX` is compiled in, and there wasn't even a way to disable it until December 2024.

Chrome's Linux renderer sandbox happens to allow stream-oriented UNIX domain sockets, and critically, it doesn't filter the `flags` argument on `send()` or `recv()`. Which means this obscure feature that essentially nobody relies on was, all along, fully reachable from inside a sandbox that was supposed to be locking things down.

## The bug itself

The actual trigger sequence is short enough to read in one glance:

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

Here's what's happening mechanically: an OOB message sits in the receive queue as an ordinary SKB, and the socket keeps an `oob_skb` pointer referencing it. Reading it with `MSG_OOB` bumps its `consumed` field, which leaves behind a zero-length SKB still sitting in the queue. The normal receive path calls `manage_oob()` to tidy things up — and this is exactly where a 2024 fix for an unrelated spurious-EOF bug introduced the actual vulnerability. When the queue contains a zero-length SKB immediately followed by an OOB SKB, that cleanup routine deletes the zero-length one and skips forward past it, but never clears the `oob_skb` pointer that was referencing it. The pointer is left dangling, and the very next `MSG_OOB` receive call ends up touching freed memory.

Here's the detail I find genuinely funny: the fix for this only got backported as far as 6.9.8, which means older LTS branches never had the buggy fix applied to them at all. So a bug that was introduced by a well-intentioned patch ended up being contained, almost by accident, by that same patch's limited backport reach.

## Getting from a UAF to kernel code execution

The real value in the writeup is the middle section — the part that walks through what it actually takes to turn this use-after-free into working kernel code execution, starting from inside a renderer sandbox. The full exploit needed heap grooming to force the freed SKB to get reallocated usefully, deliberate delay injection to win a race condition, and a second, entirely separate memory corruption bug that was only found through manual code review, all stitched together across eight syscalls. That second bug required an exact sequence to trigger, which explains why fuzzing never caught it — the odds of a fuzzer stumbling onto the right syscalls in the right order drop off exponentially with every additional syscall you need to chain.

Two things from the exploit-building process stuck with me in particular:

**You don't need FUSE or userfaultfd to delay `copy_from_user()`.** Applying `mprotect()` to a large anonymous VMA that's backed by zeropage mappings — around 128 MiB of page tables — delays kernel execution by roughly a second, all on its own. userfaultfd is the usual tool people reach for here, and I've seen serious arguments made for restricting it, but this technique is a good reminder that doing so wouldn't have closed off much.

**Usercopy hardening slows you down; it doesn't stop you.** The checks placed on `copy_to_user()` calls targeting arbitrary kernel addresses were genuinely annoying to work around, but ultimately workable, since access is still permitted to almost everything except type-specific SLUB pages.

## What this actually teaches

The conclusion the original author draws is the one worth underlining: Chrome's Linux renderer sandbox exposes kernel attack surface that is never legitimately exercised from inside that sandbox in the first place. `MSG_OOB` isn't used by Chrome, isn't used by almost anyone, and was still fully reachable purely because the sandbox filters which syscalls get through, not which flags accompany them. The kernel doesn't help matters here either — obscure, barely-used features get exposed through the exact same syscalls as core, load-bearing functionality.

Chrome's fix was straightforward: block `MSG_OOB` in renderers outright. The kernel's fix was the underlying commit itself. But the lesson I keep coming back to is broader than either patch: building a sandbox isn't just about restricting what code inside it can do — you're implicitly defining the attack surface of everything sitting underneath it too. Every flag, every obscure code path, every "nobody actually uses this" corner of the API is a potential bridge across that boundary. The features nobody uses are, almost by definition, the features nobody bothers auditing — and the features nobody audits are exactly the ones that eventually end up in a writeup like this one.
