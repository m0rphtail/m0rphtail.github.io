+++
title = "The Newtonsoft.Json Fork That Rigged a Betting Platform"
date = "2026-07-22"
+++

# The Newtonsoft.Json Fork That Rigged a Betting Platform

A typosquatted fork of Newtonsoft.Json on NuGet keeps coming back to me: it is a completely normal JSON library for everyone, and a weapon for exactly one target. No credential theft, no persistence, no lateral movement. Its whole purpose is rigging the results of one crash game on one betting platform.

## The package

The name is `Newtonsoftt.Json.Net`, one extra "t" past the real thing. Seven versions went up between August 13 and October 10, 2025: 11.0.4 through 11.0.11, with 11.0.6 missing, presumably because publishing it failed or the author skipped it. Around 1,200 downloads. The owner, `MagicalPuff96`, later unlisted it, so it's invisible in NuGet search, but the artifacts remain downloadable from the registry. That's worth remembering: unlisted is not removed.

All seven versions contain the same trojanized fork of Newtonsoft.Json 13.0 across three generations. The package metadata leaks an internal Digitain repository URL, in all seven versions, and that leak is the tell that the author had access to FG-Crash's source code. This wasn't an attacker throwing typosquats at a wall. This was someone who knew the target's backend built a dependency just for it.

## The trigger design

This is the part worth studying, because it defeats every check in the standard playbook:

```csharp
// what the typo-installer sees: a working JSON library
var settings = new JsonSerializerSettings();
JsonConvert.DefaultSettings = () => settings;   // ← backdoor arms HERE
```

The malicious behavior begins only after the host initializes `JsonConvert.DefaultSettings`, can only succeed on systems exposing the target's specific game backend method, and only fires after a randomized delay. The analysis put it plainly: non-targeted consumers see a working JSON library and no rigging behavior, which is exactly what makes the typosquat so effective.

Run it in a sandbox: functional date math, no network, no obvious ugliness. Static analysis: it's a real fork of a real library with real commits. Reputation checks: 1,200 downloads, plausible version numbers. Nothing fires because nothing is wrong, unless you're Digitain.

## Three generations, one goal

The version history is the author iterating under real conditions:

- Gen-1: local-only rigging, a proof of concept
- Gen-2: added exfiltration, hidden behind reflection and ConfuserEx
- Gen-3: cleaned up the rigging, stabilized the exfil. 11.0.11 shipped completely unobfuscated, which JFrog reads as an accidental clean build. Even careful attackers slip.

The rigged results went to `185.126.237.64:5341`, wearing the header `X-Seq-ApiKey: theper...25`, dressed as telemetry. Digitain says it knew and has taken steps, with the full extent of exposure unknown.

## My read

Two things stick with me.

First, supply chain attacks are not all about scale. The npm worms that poison hundreds of packages make the news because the numbers are big. A typosquat that targets one company's crash game, runs for months, and would have been a perfectly functional JSON library forever if the metadata hadn't leaked a repo URL is the scarier story. The bar for "nobody noticed this" is not skill, it's that nobody looked with intent.

Second, the countermeasures here are old and they work. JFrog's advice: remove the package, block the C2, and pin Newtonsoft.Json via `packages.lock.json`. Lockfiles don't stop a first install, but they make every subsequent install a diff instead of a drift, and diffs get reviewed. The teams that got burned here didn't have a lockfile problem, they had a one-character typo in a `dotnet add` command, which is exactly the kind of mistake nobody expects to matter until it does.

Check your transitive dependencies for near-miss names of the libraries you actually use. `Newtonsoftt` took me ten seconds to spot once I knew to look, and the packages that matter on your stack have near-misses too.
