+++
title = "The Month Linux Broke: Handling a Wave of Universal Kernel 0-Days"
date = "2026-09-02"
+++

# The Month Linux Broke: Handling a Wave of Universal Kernel 0-Days

There used to be a rhythm to Linux kernel privilege escalation bugs. Dirty Cow dropped in 2016 and we all scrambled. Dirty Pipe came in 2022 and we scrambled again. One universal local privilege escalation every five to eight years was the pattern, and operations teams planned around it.

In the spring of 2026 that pattern broke. Two landed in the same week, and more kept coming.

## The Bugs

The wave started with copy.fail, a local privilege escalation that works on every Linux distro since 2017. It exploits the kernel's AF_ALG crypto socket interface, where a splice operation lets you glue a socket you own to a file descriptor you don't. Because of a 2017 optimization that shares scatter lists between input and output, the kernel temporarily writes four bytes outside the page cache entry of the target file. You point that at `/usr/bin/su`, overwrite the page cache copy in memory while the on-disk binary stays untouched, then run `su` and get a root shell. A 732-byte Python script was the entire exploit. One version, every distro, no per-kernel offsets to patch.

Roughly two weeks later came Dirty Frag, another universal LPE built on the same splice primitive, this time landing out-of-bounds page cache writes through ESP. The researcher openly credited copy.fail as the motivation: one person found a pattern, and everyone else went looking for the pattern everywhere else in the kernel.

Then bad_epoll arrived in July, a use-after-free triggered by linking two epoll objects and closing them both at once. The race window is six instructions wide. AddressSanitizer cannot even instrument it, the free and the conflicting write happen inside a span smaller than the checks ASan runs, which is also why Anthropic's Mythos missed it. A human found it with his eyes. That detail is worth sitting with: the best AI vulnerability researcher on the planet and a sanitizing compiler both walked past a bug that one patient human caught.

## What Actually Changed

Two shifts matter more than the individual CVEs.

First, vulnerability research became pattern farming. Every one of these bugs is a known kernel primitive used in a slightly wrong place. When discovery is pattern recognition, and AI makes pattern recognition cheap, finding the next instance of a pattern in a 30-million-line codebase stops being a multi-year effort. The LinkedIn post that got passed around put it well: these bugs sat dormant for years, protected only by a lack of human bandwidth. The backlog is being cleared, and we are the backlog.

Second, "universal" stopped being an exception. A bug that needs per-droso offsets gets patched slowly because every vendor builds their own fix. A logic bug like copy.fail with one 732-byte script that works everywhere compresses your patch window to zero. The mitigation math defenders rely on, "not exploited in the wild yet, we have time," assumes the exploit is hard to write. It no longer is.

## How I Handle It

I ran Linux fleet response long enough to know the gap between "patch available" and "hosts rebooted" is measured in weeks, not days. Kernel reboots are the worst kind of maintenance window. So when universal LPEs drop, triage looks like this.

Exposure first. Which hosts actually have unprivileged users or code execution paths an attacker could already reach? A universal LPE matters on a jump host, a container node, or a developer laptop. It matters much less on an appliance with no user logins. Asset inventory is the whole game here, and it has to exist before the CVE drops, not after.

Then detection before patch. You will not reboot a fleet in 48 hours. You can, however, watch for the known exploit primitives. For this wave: unexpected AF_ALG socket binds, splice syscalls between unusual file descriptor pairs, epoll object linking patterns from unprivileged processes. None of these are perfect, and none of them catch a novel variant. They buy time, and time is what patching needs.

And then the boring discipline. Staged rollouts, canary reboots, and a standing kernel-update runbook that has actually been rehearsed instead of sitting in a wiki. The teams that ate this wave quietly were the ones with a reboot cadence already scheduled. The teams that got hurt were the ones who discovered during triage that their kernel was three years out of support.

## The Honest Take

The kernel is not falling apart. It is being audited at a speed it was never staffed for. The bugs were always there. What changed is that finding them went from a career-defining effort to a pattern search, and that pattern search is now available to anyone.

For blue teams this is actually good news with terrible timing. Every dormant universal LPE that gets found and patched is one that never burns us at 3 AM. But between here and the fully patched fleet is a window measured in months, and during that window, assume any foothold on a Linux host is an hour away from root.