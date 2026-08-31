+++
title = "eBPF Rootkits: Hiding From ss by Editing Its Memory"
date = "2026-07-27"
+++

# eBPF Rootkits: Hiding From ss by Editing Its Memory

I read Datadog's piece on eBPF rootkits twice. The first time I was looking for the usual story, kernel malware, hook this, hide that. The second time I understood what actually matters: the rootkits are not hiding from the kernel, they are hiding from the tools that read the kernel. And one of them, VoidLink, does it by editing the memory of `ss` while `ss` is running.

## The trick that made me stop

`ss -tn` shows active TCP connections. Under the hood it opens a Netlink socket, sends a `SOCK_DIAG_BY_FAMILY` request, and reads back a chain of `inet_diag_msg` records, one per socket. Each record has a length field, and the parser walks the chain using that length as a cursor.

VoidLink puts a kprobe on `__sys_recvmsg` entry to grab the user space buffer pointer, then a kretprobe fires after the kernel fills the buffer but before user space reads it. At that point it calls `bpf_probe_write_user()` to inflate the length field of the message before the one it wants to hide. The parser's cursor jumps straight over the hidden connection. From `ss`'s perspective, message A is just a little longer than usual.

```c
// the shape of it, from Datadog's analysis
// kprobe on __sys_recvmsg: capture the user buffer pointer
// kretprobe: after kernel fills buffer, before user space reads
bpf_probe_write_user(buf + offset_of_A.nlmsg_len,
                     &inflated_len, sizeof(inflated_len));
// A.nlmsg_len += NLMSG_ALIGN(B.nlmsg_len)
// NLMSG_NEXT jumps A -> C, B never seen
```

The detail that makes it work: `NLMSG_OK` only checks that `nlmsg_len <= len` (remaining bytes). VoidLink inflates A's length by exactly the size of B's bytes, which are physically present in the buffer, so the check always passes. No out-of-bounds read, no inconsistency, no crash. The parser never knows.

## LinkPro: making bpftool lie to you

LinkPro hides its own eBPF programs from enumeration. It attaches a tracepoint on `sys_enter_bpf` watching for `BPF_PROG_GET_NEXT_ID` (11), `BPF_MAP_GET_NEXT_ID` (12), and `BPF_LINK_GET_NEXT_ID` (31), stashes the call context in a map keyed by `pid_tgid`, then a kretprobe on `__x64_sys_bpf` checks the `next_id` the kernel is about to return against an allowlist of its own program IDs. On a match it calls `bpf_override_return(ctx, -ENOENT)`.

`-ENOENT` is the natural terminator of a `GET_NEXT_ID` walk. Returning it mid-iteration stops the enumerator entirely, so `bpftool prog list` truncates at the hidden program. Datadog confirmed this on a live kernel: every program with a higher ID also disappeared, whether or not it was on the allowlist. The mechanism is stronger than the authors intended.

The detection signal is the discrepancy: `bpftool prog show id N` uses `BPF_PROG_GET_FD_BY_ID`, which the hook does not touch. Compare the enumerated set against direct ID lookups and the gap shows up.

## What defenders actually have

The three families, VoidLink, LinkPro, Atomic Arch, use different helpers for different effects, but they share one property: the helper capabilities are knowable at load time, before the program attaches and starts shaping what the host reports.

`BPF_PROG_LOAD` is the point of highest trust. Capture the full load-time fingerprint. Uncommon helpers like `bpf_probe_write_user()`, `bpf_override_return()`, and `bpf_send_signal()` deserve caution, especially together or from suspicious loaders.

```bash
# what I'd log at BPF_PROG_LOAD time
# helper IDs used, program type, attach target, loader identity
# then alert on:
#   bpf_probe_write_user (helper 36)  - user memory writes
#   bpf_override_return (helper 58)   - function return forgery
#   bpf_send_signal    (helper 44)    - signal injection
#   bpf_get_stackid     (helper 27)   - stack spoofing
```

LinkPro also leaks through `bpf_printk`: both handlers log "BPF cmd: %d, start_id: %u" and "HIDING NEXT_ID: %u" to `/sys/kernel/debug/tracing/trace_pipe` in plain text on every intercepted syscall. Datadog calls it a leftover from sloppy development and says not to rely on it as the primary detection. I'd still ship a tripwire for it, because it costs one grep.

## My read

The uncomfortable part is that eBPF rootkits hide in the same place EDR agents live. The kernel trusts eBPF programs because the loader is supposed to be trusted, and the loader is a root process. Once you are root, the kernel's own introspection tooling becomes the thing you lie to.

The load-time angle is the one that survives. You cannot reliably detect a rootkit that is already shaping every read, but you can catch the load before it starts. That means treating `BPF_PROG_LOAD` telemetry as a first-class detection source, not a debugging aid. The window is small, the signal is real, and it is the only place the rootkit has not yet learned to lie.

---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*