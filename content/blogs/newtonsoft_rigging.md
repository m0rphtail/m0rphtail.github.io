+++
title = "The Newtonsoft.Json Fork That Rigged a Betting Platform"
date = "2026-07-22"
+++

A typosquatted package on NuGet demonstrates how targeted supply-chain malware can operate: rather than harvesting generic credentials or deploying standard backdoors, it behaved as a fully functional JSON serializer while manipulating the outcome of a specific online betting game.

## The typosquatted package

The package was published under the name `Newtonsoftt.Json.Net`, adding a second "t" to the standard library name. Between August and October 2025, seven versions appeared on the registry (11.0.4 through 11.0.11, omitting 11.0.6), accumulating roughly 1,200 downloads. Although the publisher, `MagicalPuff96`, later unlisted the package from NuGet search, the packages remained retrievable via direct API calls.

All published releases wrapped an identical modified version of Newtonsoft.Json 13.0. In every version, the package metadata leaked an internal repository path associated with gaming provider Digitain, indicating that the author possessed source code for the target game, FG-Crash. The dependency was built specifically for that backend.

## Selective trigger conditions

The payload avoided standard detection heuristics by running benign code on non-target systems:

```csharp
// standard initialization looks normal to consumer applications
var settings = new JsonSerializerSettings();
JsonConvert.DefaultSettings = () => settings;   // payload arms here
```

The rigging routine activates only when the application configures `JsonConvert.DefaultSettings`, checks that the running process exposes the target game's backend methods, and executes after a randomized delay. In non-target applications, the library serializes and deserializes JSON normally without triggering network traffic or unusual memory allocations.

## Development progression across versions

JFrog's analysis traced the package across three development stages:

- Initial versions implemented local game manipulation as a basic proof of concept.
- Middle releases added exfiltration routines protected by ConfuserEx and reflection.
- Version 11.0.11 shipped without obfuscation, possibly due to a compilation oversight, exposing the clear logic.

The manipulated game multipliers were transmitted to `185.126.237.64:5341` with an `X-Seq-ApiKey` header formatted to look like standard telemetry traffic.

## Defensive considerations

Highly targeted supply chain packages can evade automated sandbox analysis because the malicious branch remains dormant unless very specific environmental conditions are met. General reputation scores and basic execution tests do not reveal the payload.

To mitigate typosquatting risks:

Use package lockfiles (`packages.lock.json` in .NET) to ensure dependencies do not silently resolve to typosquatted alternatives during automated builds.

Restrict package additions through private registry mirrors or explicit dependency allowlists.

Audit dependency names in build scripts and project configurations to catch single-character typographical errors.
