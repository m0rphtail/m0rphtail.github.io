+++
title = "How eBPF Rootkits Manipulate System Inspection Tools"
date = "2026-07-27"
+++

eBPF rootkits generally evade detection by modifying the data that user-space auditing tools retrieve from the kernel. VoidLink, for example, conceals active network connections by altering the memory buffers of `ss` during runtime.

## Hiding sockets in ss

Running `ss -tn` opens a Netlink socket, issues a `SOCK_DIAG_BY_FAMILY` request, and parses a series of `inet_diag_msg` records returned by the kernel. The user-space parser relies on the length header of each record to advance through the buffer.

VoidLink places a kprobe on `__sys_recvmsg` to record the user-space buffer destination. A corresponding kretprobe fires after the kernel writes the socket data into the buffer, but before user space reads the result. In that window, it invokes `bpf_probe_write_user()` to increase the length field of the record preceding the target socket. When `ss` parses the response, it skips over the hidden socket entirely:

```c
// based on Datadog's analysis of VoidLink
// kprobe on __sys_recvmsg: capture user buffer pointer
// kretprobe: after kernel writes buffer, before user space reads
bpf_probe_write_user(buf + offset_of_A.nlmsg_len,
                     &inflated_len, sizeof(inflated_len));
// A.nlmsg_len += NLMSG_ALIGN(B.nlmsg_len)
// NLMSG_NEXT advances A -> C, skipping B
```

The record parser uses `NLMSG_OK` to confirm that `nlmsg_len` does not exceed the remaining bytes in the buffer. Because record B remains inside the allocated buffer, the bounds check passes without throwing a parsing error.

## Evading bpftool with LinkPro

LinkPro focuses on hiding loaded eBPF programs from administrative inspection. It attaches a tracepoint to `sys_enter_bpf`, targeting `BPF_PROG_GET_NEXT_ID` (11), `BPF_MAP_GET_NEXT_ID` (12), and `BPF_LINK_GET_NEXT_ID` (31). It stores the process context in a map keyed by `pid_tgid`, and a kretprobe on `__x64_sys_bpf` checks the returned `next_id` against an internal list of program IDs to conceal. On a match, it invokes `bpf_override_return(ctx, -ENOENT)`.

Returning `-ENOENT` mimics the standard end of the program list. This halts enumeration prematurely, causing `bpftool prog list` to stop reporting at the hidden ID. In tests conducted by Datadog, this also caused all programs loaded with higher IDs to disappear from enumeration results.

Defenders can detect this suppression by checking for discrepancies: direct lookups using `bpftool prog show id N` rely on `BPF_PROG_GET_FD_BY_ID`, an interface that LinkPro does not intercept. Discrepancies between list output and direct ID lookups indicate interception.

## Detection via program loading

eBPF rootkit families like VoidLink, LinkPro, and Atomic Arch rely on distinct helper functions that can be audited during program initialization, before programs attach to probe points:

```bash
# capture program properties at BPF_PROG_LOAD:
# monitor use of sensitive helper functions:
#   bpf_probe_write_user (helper 36)  - writes to user memory
#   bpf_override_return (helper 58)   - overrides kernel return values
#   bpf_send_signal    (helper 44)    - signal injection
#   bpf_get_stackid     (helper 27)   - stack modification
```

Monitoring the `BPF_PROG_LOAD` syscall provides reliable visibility because the program bytecode and requested helpers must be verified by the kernel before execution. Specific helpers like `bpf_probe_write_user()` and `bpf_override_return()` are rare in standard monitoring agents, making their presence an effective indicator of compromise.

LinkPro also leaves residual debug logging, printing messages such as "BPF cmd: %d, start_id: %u" and "HIDING NEXT_ID: %u" to `/sys/kernel/debug/tracing/trace_pipe` on intercepted calls. Checking trace pipes for these string patterns provides an immediate, low-overhead detection method.
