+++
title = "The Newtonsoft.Json Fork That Rigged a Betting Platform"
date = "2026-09-19"
+++

# The Newtonsoft.Json Fork That Rigged a Betting Platform

Most supply chain attacks are dumb. A typosquatted package that steals environment variables, a post-install script that phones home, the same pattern over and over. JFrog found one in July 2026 that is different: a trojanized fork of Newtonsoft.Json, published to NuGet, that rigs live game results on a single online betting platform while functioning as a perfectly normal JSON library for everyone else.

## The Package

The package is named `Newtonsoftt.Json.Net`, one extra "t" past the real `Newtonsoft.Json`. Seven versions were published between August 13 and October 10, 2025: 11.0.4, 11.0.5, 11.0.7, 11.0.8, 11.0.9, 11.0.10, and 11.0.11. About 1,200 downloads total. The owner, MagicalPuff96, later unlisted it, so it no longer surfaces in NuGet search, but the artifacts remain downloadable.

All seven versions contain the same trojanized fork of Newtonsoft.Json 13.0, spread across three generations. The malicious behavior only activates after the host initializes `JsonConvert.DefaultSettings`, and it can only succeed on systems that expose the target's specific game backend method, and only after a randomized delay.

## The Rigging

The target is Digitain, an online betting platform, specifically its FG-Crash game backend. The backdoor initiates itself through the altered `DefaultSettings` property setter, which invokes attacker-controlled code. A randomized delay sidesteps detection before the malicious functionality fires.

The end goal is to rig crash-game round results and exfiltrate them to a hardcoded server at `185.126.237[.]64:5341`, masquerading as telemetry data. The exfiltration uses the header `X-Seq-ApiKey: theper...25`.

The three generations show the author iterating:

- Gen-1 was a local-only rigging proof of concept
- Gen-2 added exfiltration, hidden behind reflection and ConfuserEx obfuscation
- Gen-3 cleaned up the rigging and stabilized the exfiltration
- Version 11.0.11 was left completely unobfuscated, consistent with an accidental clean build being published

The package metadata leaks an internal Digitain repository URL in all seven versions. That is the tell: the author had access to FG-Crash's source code. This is not a random attacker throwing typosquats at the wall. This is someone with inside knowledge of the target's codebase building a weaponized dependency.

## Why This Matters

The design is the story. A developer who installs the package by typo gets a real, working Newtonsoft.Json build. The malicious behavior begins only after `JsonConvert.DefaultSettings` is initialized, only on systems exposing the target's specific backend method, and only after a delay. For any other project, the package is harmless. That makes it nearly invisible to sandbox analysis, which runs the code and sees nothing, and to reputation systems, which see a functional library.

The single-entity targeting is also a reminder that supply chain attacks are not only about scale. The npm worms that hit hundreds of packages make headlines. A package that quietly rigs one betting platform for months is the kind of attack that never gets a press release, because the victim does not even know the library they depend on is the attacker.

## The Blue Team Read

For defenders, the lesson is about dependency review. The usual checks, is the package name right, does it have downloads, does it work, would all pass here. The signals that catch this class of attack are deeper:

- Package metadata leaking internal repository URLs
- Obfuscation layers in a library that has no reason to be obfuscated
- Behavior gated behind configuration initialization rather than running at load
- Version history that shows iterative hardening of payloads

The uncomfortable part is that none of these are automatable with a simple scanner. They require reading the code, or at least asking why a JSON library needs ConfuserEx. The attackers are betting that nobody does that. Most of the time, they win.