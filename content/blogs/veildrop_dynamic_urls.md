+++
title = "VEIL#DROP: Malware That Builds a New URL for Every Victim"
date = "2026-09-27"
+++

# VEIL#DROP: Malware That Builds a New URL for Every Victim

Securonix documented a multi-stage malware chain in July 2026 that uses Blogger pages to deliver the PureLogs stealer. The chain is called VEIL#DROP, and the part worth studying is the dynamic stage generation: the malware constructs a unique blogspot URL for every execution by inserting a random number of forward slashes into the URL string, defeating static URL signatures, indicator-based blocking, and URL filtering.

## The Chain

The initial payloads are distributed via spear-phishing or drive-by compromise. The infection chain begins with a deceptively named JavaScript file masquerading as a document, like `transcript.pdf.js`, which executes through Windows Script Host and launches PowerShell with execution policy bypasses enabled.

The PowerShell script retrieves a next-stage payload hosted on Blogger, `htlwub00klocate.blogspot[.]com`. Using Google's trusted infrastructure as a stager lets the attackers bypass reputation-based defenses and blend in with legitimate web activity. The downloaded payload loads a benign web page like Google, creating the impression that a PDF document is opened, while the infection proceeds silently in the background.

The loader also terminates processes like `wscript.exe` to minimize the forensic trail, deletes `transcript.pdf.js` to eliminate evidence of execution, and decrypts an embedded payload.

## The Evasion Core

Following XOR decryption, the loader transitions into the most evasive component of the framework: dynamic stage generation combined with runtime mutation.

Instead of static indicators like hardcoded URLs or predictable execution patterns, the malware constructs the next-stage payload location dynamically during execution. It builds a unique blogspot URL for each execution by inserting a random number of forward slashes into the URL string. A URL like `blogspot.com/evil` becomes `blogspot.com/////evil` with a random number of slashes, which breaks the exact-match signatures most URL filters use.

The decoded script also introduces runtime mutation and polymorphism, replacing placeholder values within the script with randomly generated strings and values during execution. This variability defeats script signatures and file hashes.

## The Payload

The chain ultimately deploys PureLogs Stealer, a .NET-based infostealer known for harvesting a wide range of sensitive data. PureLogs is offered under a malware-as-a-service model by a threat actor known as PureCoder, also called PureLog.

## Why This Matters

The dynamic URL generation is the detail that should change how detection teams think about URL-based blocking. Most URL filtering works on exact or prefix matches. The random-slash insertion defeats both, because the URL is different for every victim. The same technique works against hash-based detection, because the script mutates at runtime.

The Blogger abuse is the other half of the story. Google's infrastructure is trusted, which means reputation-based defenses pass it. The attackers are not fighting the blocklist, they are hiding inside the allowlist.

## The Blue Team Read

For defenders, the signals are:

- JavaScript files masquerading as documents, like `transcript.pdf.js`
- PowerShell execution with bypass flags from script hosts
- Blogger URLs with unusual slash patterns in the path
- `wscript.exe` termination from unexpected processes
- XOR-decrypted payloads with runtime string mutation

The deeper lesson is about the arms race in URL-based detection. Static indicators are dying. The malware that matters now generates its infrastructure dynamically, mutates its payloads at runtime, and hides inside trusted platforms. The detection that survives is behavioral: what is the script doing, not what URL is it using.

For anyone running a SOC, the VEIL#DROP pattern is worth adding to the playbook. The next variant will not use Blogger, and it will not use PureLogs, but it will still build a new URL for every victim, because that technique works.