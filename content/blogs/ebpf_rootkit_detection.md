+++
title = "eBPF Rootkits Don't Fool the Kernel, They Fool the Tools You Trust to Read It"
date = "2026-07-27"
+++

Rootkits aren't hiding from the kernel at all. They're hiding from the tools that ask the kernel questions on your behalf. One of them, VoidLink, pulls this off by editing the memory of `ss` while `ss` is running.

## The trick that surprised me

`ss -tn` is how most of us check active TCP connections. Under the hood, it opens a Netlink socket, fires off a `SOCK_DIAG_BY_FAMILY` request, and reads back a chain of `inet_diag_msg` records — one per socket. Each record carries a length field, and the parser uses that length to walk from one record to the next.

VoidLink drops a kprobe on the entry to `__sys_recvmsg` to grab the pointer to the user-space buffer. Then a kretprobe fires right after the kernel has filled that buffer, but before user space actually gets to read it. In that narrow window, it calls `bpf_probe_write_user()` and quietly inflates the length field on the record sitting just before the one it wants hidden. When the parser's cursor moves next, it jumps clean over the hidden connection. As far as `ss` can tell, one earlier message was just a bit longer than usual — nothing to see here.

```c
// the shape of it, from Datadog's analysis
// kprobe on __sys_recvmsg: capture the user buffer pointer
// kretprobe: after kernel fills buffer, before user space reads
bpf_probe_write_user(buf + offset_of_A.nlmsg_len,
                     &inflated_len, sizeof(inflated_len));
// A.nlmsg_len += NLMSG_ALIGN(B.nlmsg_len)
// NLMSG_NEXT jumps A -> C, B never seen
```

What makes this actually work, and not just crash the parser, is that `NLMSG_OK` only ever checks whether `nlmsg_len` is less than or equal to the remaining bytes in the buffer. VoidLink inflates record A's length by exactly the size of record B — and B's bytes are still physically sitting there in the buffer, just skipped over. So the bounds check passes every time. No out-of-bounds read, no inconsistency, nothing that would ever make the parser suspicious. It genuinely never knows.

## LinkPro: getting bpftool to lie about what's loaded

LinkPro takes a different approach — it hides its own eBPF programs from anyone trying to enumerate what's running. It sets a tracepoint on `sys_enter_bpf`, watching specifically for `BPF_PROG_GET_NEXT_ID` (11), `BPF_MAP_GET_NEXT_ID` (12), and `BPF_LINK_GET_NEXT_ID` (31). It stashes the call context in a map keyed by `pid_tgid`, then a kretprobe on `__x64_sys_bpf` checks whatever `next_id` the kernel is about to hand back against its own private allowlist of program IDs. Match found, and it calls `bpf_override_return(ctx, -ENOENT)`.

`-ENOENT` happens to be exactly what a `GET_NEXT_ID` walk returns naturally once it's run out of things to enumerate. Forcing it early just stops the whole walk dead, which means `bpftool prog list` silently truncates right at the hidden program. Datadog actually tested this on a live kernel and found something the authors probably didn't intend: every program with a higher ID than the hidden one vanished too, allowlisted or not. The trick is, if anything, more effective than it was designed to be.

The tell is in the mismatch it leaves behind: `bpftool prog show id N` goes through `BPF_PROG_GET_FD_BY_ID` instead, a path this hook never touches. Compare what enumeration reports against a direct ID lookup, and the gap gives it away immediately.

## What defenders can actually work with

VoidLink, LinkPro, and a third family called Atomic Arch each lean on different helper functions to pull off different effects, but they all share one property worth exploiting: whatever a program is capable of doing is fully knowable the moment it loads — before it ever attaches and starts reshaping what the host reports back.

That makes `BPF_PROG_LOAD` the highest-trust moment to instrument. Capture a full fingerprint right there. A handful of helpers are rare enough in legitimate code that seeing them at all is worth attention, especially in combination or coming from an unfamiliar loader: `bpf_probe_write_user()`, `bpf_override_return()`, `bpf_send_signal()`.

```bash
# helper IDs used, program type, attach target, loader identity
# then alert on:
#   bpf_probe_write_user (helper 36)  - user memory writes
#   bpf_override_return (helper 58)   - function return forgery
#   bpf_send_signal    (helper 44)    - signal injection
#   bpf_get_stackid     (helper 27)   - stack spoofing
```

LinkPro also gives itself away in a much dumber way: both of its handlers log plaintext debug strings — "BPF cmd: %d, start_id: %u" and "HIDING NEXT_ID: %u" — straight to `/sys/kernel/debug/tracing/trace_pipe` on every intercepted syscall. Datadog chalks it up to sloppy development left in by accident and warns against leaning on it as your primary detection method. Fair enough — but I'd still wire up a tripwire for it anyway. It's one grep, and free signal is free signal.

## Where this leaves us

The uncomfortable reality here is that eBPF rootkits are hiding in exactly the same territory your EDR agent lives in. The kernel trusts eBPF programs because it trusts the loader, and the loader is, definitionally, a root process. Once an attacker has root, the kernel's own introspection tools become just another thing they can lie to.

The one angle that actually holds up is catching things at load time. You can't reliably spot a rootkit that's already reshaping every read on the system — by the time it's running, it's already ahead of you. But you can catch it before it gets that far. That means `BPF_PROG_LOAD` telemetry needs to be treated as a genuine first-class detection source, not some debugging afterthought. The window to catch it is small, but the signal inside that window is real — and it's the one place these rootkits haven't yet figured out how to lie.
