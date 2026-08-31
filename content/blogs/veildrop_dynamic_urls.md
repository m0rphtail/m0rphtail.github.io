+++
title = "VEIL#DROP: The Malware That Builds a New URL for Every Victim"
date = "2026-07-01"
+++

The VEIL#DROP analysis from July ends in the PureLogs stealer, and the component that earns the study is the loader's URL construction: it builds the next-stage blogspot URL *at runtime*, inserting a random number of forward slashes into the path so that every single victim fetches a syntactically unique URL pointing at the same resource. A URL filter with exact-match signatures just died of old age.

## The chain

It starts with a fake document. `transcript.pdf.js`, a JavaScript file wearing a PDF's clothes, executed by Windows Script Host. WSH hands off to PowerShell with execution policy bypasses, and the PowerShell does housekeeping before anything interesting happens: terminates `wscript.exe` to cut the forensic thread, deletes `transcript.pdf.js` to erase the entry point, then loads the real payload.

The stager lives on Blogger, `htlwub00klocate.blogspot[.]com`, which is the first of several moves that make this chain feel like it was designed by someone who has sat in a SOC. Google's infrastructure passes reputation filtering by definition. The loaded page shows the victim a benign document, Google's homepage or similar, so the human sees "PDF opened" while the machine sees a payload fetch. The victim's own perception is part of the evasion.

```text
transcript.pdf.js ──WSH──► PowerShell (bypass flags)
    │ kills wscript.exe, deletes itself
    ▼
Blogger stager (trusted domain, reputation-filter pass)
    ▼
XOR-decrypted loader ──in-memory──► .NET assembly (reflective load)
    ▼
PureLogs stealer (MaaS, author "PureCoder"/"PureLog")
```

## The dynamic URL trick

After XOR decryption, the loader enters the part Securonix singles out. Instead of a hardcoded URL, the script builds the fetch target like this:

```powershell
# conceptual: N is random per execution
$slashes = "/" * (Get-Random -Minimum 2 -Maximum 12)
$url = "https://htlwub00klocate.blogspot.com$slashes/payload.html"
# https://htlwub00klocate.blogspot.com/payload.html
# https://htlwub00klocate.blogspot.com///payload.html
# https://htlwub00klocate.blogspot.com///////payload.html
#             ... all resolve to the same post
```

Blogger, like most web stacks, normalizes redundant slashes, so every variant returns the same content. The malware gets a fresh URL string per victim for free. Static URL signatures, indicator blocks, and path-based URL filtering all depend on the URL being the same string twice. It never is.

On top of that, the decoded script does runtime mutation: placeholder values replaced with random strings at execution, so hash-based detections and script signatures get one shot at exactly one victim's build. The reconstructed script executes entirely in memory, and the .NET assembly comes in via reflective loading, no disk artifact.

If reflective loading is blocked by environment controls, the loader falls back to a cascading LOLBin chain, `regsvcs.exe`, `installutil.exe`, `msbuild.exe`, `aspnet_compiler.exe`, trying each until one works. Securonix notes it "does not depend on any single LOLBin." That fallback list is basically a survey of which Microsoft-signed binaries developers have requested get blocked in hardened environments. The loader ships the answer to every hardening config, not just one.

## Conclusion

Two things make this worth the study time.

First, the URL trick is a transferable idea, and transferable ideas are the ones that matter. The specific implementation (Blogger, slashes) will be burned within weeks of the writeup; the underlying move, "the indicator space is larger than the detection space, so enumerate the indicator and you lose," is the whole modern offense in one line. Every URL-filtering vendor has to answer "what do you match on when the URL is never the same twice" now, because this trick will show up in next month's campaign wearing a different domain.

Second, the defensive anchor that survives all of it is process ancestry and in-memory execution artifacts. The chain can mutate URLs, hashes, and scripts all it wants; it cannot easily change `wscript.exe → powershell.exe -bypass → in-memory .NET` without giving up the delivery. That's where the YARA-in-memory scanning and AMSI coverage belong, and it's why AMSI tampering keeps being the escalation of choice for these families. The battle isn't over the payload, it's over whether the loader can run unsigned code in a script host at all. Everything after that step is negotiable; nothing before it is.

For PureLogs, the MaaS angle stays the economic story: a subscription stealer with support, delivered through a chain whose loader engineering is better than most APT tooling. Commodity is a spectrum, and at the top end, the only difference from targeted ops is the victim selection algorithm.
