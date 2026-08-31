+++
title = "SLEEPWALKER: The Backdoor That Does Nothing Until a Packet Says Otherwise"
date = "2026-08-26"
+++

A Windows backdoor analysis from August inverts everything detection is built around. SLEEPWALKER is a 59,904-byte DLL side-loaded into ESET's own management agent, impersonating Microsoft's `dpapi.dll`, with no domains, no IPs, no URLs, and no outbound traffic of its own. It sits inert until a specific network packet crosses an interface it watches. Then a 23-instruction bytecode language nobody has ever seen anywhere else takes over.

I read it twice. The second read was slower.

## The load path

The DLL exports the same seven data protection functions as the real `dpapi.dll` and carries a version resource copied from ESET Management Agent. Side-loading into `ERAAgent.exe` relies on Windows DLL search order, not a flaw in ESET's product. Writing the file into the application directory requires local admin an operator already holds. There's nothing to patch here. The response to a confirmed match is incident response and a rebuild.

ESET isn't new territory for this. Kaspersky caught ToddyCat abusing a search-order flaw in ESET's command-line scanner to load a malicious DLL. Side-loading the vendor's own agent is a different, and in some ways worse, trick: the host process is signed, trusted, present on every protected endpoint, and it auto-starts. The malware couldn't ask for a better home.

## The trigger

The embedded config decrypts with AES-256-CCM into a single instruction: watch every network interface, indefinitely, for a magic packet. The listener captures everything crossing each watched interface, including traffic addressed to other machines, so a host that bridges two segments, a gateway, a VPN box, can catch a trigger meant for a different machine entirely.

Commands don't arrive as strings. They're bytecode in a format that exists only inside this file. Recovering the encryption key gets you opcodes, not text. The 23 instructions cover scheduling, data movement, staged file delivery verified against a SHA-256 before execution, and direct in-memory code execution. Not one of them writes to disk.

The transports are where it gets interesting: TCP, UDP, ICMP, SMB named pipes with credentialed lateral movement, raw promiscuous capture, and VMware's VMCI. VMCI rides through the hypervisor's virtual machine communication interface rather than a network adapter, so a packet capture taken between two machines misses it. Mandiant documented UNC3886 using VMCI sockets for persistence between compromised ESXi hosts and their guests. Same technique, new tenant.

The analyzed sample's opcode enables only the raw-packet listener, but a second opcode enables a DNS-based trigger that exists in the binary but wasn't active in this build. There's dormant capability baked in and switched off, which tells you something about the development discipline behind it.

## The tradecraft details that separate signal from noise

Two registry changes make the SMB named-pipe channel reachable by unauthenticated callers:

```text
HKLM\SYSTEM\CurrentControlSet\Control\Lsa\EveryoneIncludesAnonymous = 1
HKLM\SYSTEM\CurrentControlSet\Control\Lsa\NullSessionPipes += <pipe name>
```

And the cleanup is subtly malicious: the routine records whether its own write to `NullSessionPipes` succeeded, not whether the entry already existed. A removal script that naively reverses changes will delete a legitimate pre-infection entry. I've cleaned up enough Windows boxes to know that's the kind of detail that turns an IR engagement into a week.

The host indicators, verbatim:

```text
- unexpected dpapi.dll beside ERAgent.exe
- unexpected dpapisvc.dll in the same directory
- SHA-256: d347170752a28e2b8c4b8b9f3cab2e3a6541ba11682c94498d26eb9002779d60
- MD5:    2318327b29bb1c0e2d2b5f0211fc7fac
- EveryoneIncludesAnonymous = 1
- unexpected entry in NullSessionPipes
```

The writeup ships a YARA rule and a read-only PowerShell scanner that checks all of it. That's the right way to publish.

## Conclusion

No infrastructure to sinkhole, no beacon to detect, no handshake to fingerprint. It just listens, on interfaces you already trust, inside a process your EDR almost certainly whitelists, and does nothing until its operator decides otherwise.

The honest caveat: the assessment rests on a single binary with no collection context. No attribution, no victim, no proof it was ever deployed. It might be a research exercise that leaked. But built-to-be-side-loaded into a security vendor's agent, with a bespoke bytecode VM whose only job is to be invisible, doesn't read like ambition to me. It reads like someone who studied how responders work and built the thing they'd least like.

If you run ESET on Windows and you've never diffed what's sitting next to `ERAAgent.exe`, do it this week. It's a five-minute check, and the alternative is that someone else does it for you.
