+++
title = "SLEEPWALKER: The Backdoor That Does Nothing Until a Packet Says Otherwise"
date = "2026-08-26"
+++

SLEEPWALKER is a 59,904-byte Windows DLL designed to run passively inside an enterprise environment. It side-loads into ESET's management agent by impersonating Microsoft's `dpapi.dll`. The implant generates no active outbound beacons, registers no public domains, and maintains no fixed command infrastructure, remaining inert until an incoming packet matches a specific trigger.

## Load path and DLL side-loading

The binary exports the seven standard Data Protection API (DPAPI) functions matching the legitimate `dpapi.dll`, and embeds version resources copied directly from ESET Management Agent. It side-loads into `ERAAgent.exe` by placing itself directly in the application's working directory, taking advantage of standard Windows DLL search order.

Side-loading into a signed endpoint management service offers operational advantages: the host process starts automatically with elevated system privileges and is typically excluded from aggressive endpoint detection inspection.

## Trigger mechanism and custom bytecode

The embedded configuration decrypts via AES-256-CCM to initiate a passive network listener across all local network interfaces. By running in promiscuous capture mode, a multi-homed system or internal gateway can intercept triggers sent across adjacent subnets.

Command payloads are delivered as custom bytecode rather than plain text strings. The custom virtual machine supports 23 distinct instructions covering:

- Task scheduling and timing control.
- In-memory data transfer without disk writes.
- Multi-stage payload delivery verified with SHA-256 checksums prior to execution.
- Direct in-memory shellcode execution.

Transport options in the code include raw packet sockets (TCP, UDP, ICMP), SMB named pipes for lateral movement, and VMware VMCI (Virtual Machine Communication Interface) sockets. VMCI allows direct communication between hypervisors and guest virtual machines, bypassing traditional virtual switch network monitoring. The sample also includes dormant logic for a DNS-based trigger.

## Registry changes and host artifacts

When enabling the SMB transport, the malware configures anonymous access to its named pipe by modifying local security authority keys:

```text
HKLM\SYSTEM\CurrentControlSet\Control\Lsa\EveryoneIncludesAnonymous = 1
HKLM\SYSTEM\CurrentControlSet\Control\Lsa\NullSessionPipes += <pipe name>
```

When cleaning up, the routine notes whether its write succeeded, but does not verify if `NullSessionPipes` had existing entries prior to infection. Naive cleanup scripts that simply clear the registry value risk deleting legitimate system entries.

Host indicators of compromise include:

```text
- Unexpected dpapi.dll or dpapisvc.dll in the ERAgent.exe folder
- SHA-256: d347170752a28e2b8c4b8b9f3cab2e3a6541ba11682c94498d26eb9002779d60
- MD5: 2318327b29bb1c0e2d2b5f0211fc7fac
- EveryoneIncludesAnonymous set to 1
- Unrecognized named pipes appended to NullSessionPipes
```

## Detection strategy

Because the malware generates no outbound network telemetry, detection depends on file integrity monitoring and host auditing:

1. Monitor endpoint agent directories for newly created DLLs matching system library names like `dpapi.dll`.
2. Audit registry changes targeting `HKLM\SYSTEM\CurrentControlSet\Control\Lsa\NullSessionPipes`.
3. Track non-standard processes opening raw packet capture sockets or configuring promiscuous interface modes.
