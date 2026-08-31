+++
title = "RedC2: A $99 C2 Framework Shipping Through npm"
date = "2026-08-21"
+++

# RedC2: A $99 C2 Framework Shipping Through npm

Trend Micro found 14 trojanized npm packages in August shipping a Linux backdoor for a commercial C2 framework called RedC2 4.0. The framework is sold openly for $99.99 on a website called Red Offsec, with a Terms of Service page banning unauthorized use. Somebody sell that ToS to the people it will actually be used on.

## The packages

The names are date-utility-flavored: `streak-metrics-math`, `kit-map-vim`, `streak-map-cache`, `streak-calc-metrics`, `streak-math-abz`, and cohorts. All at 1.0.0 or 1.0.1. The full list from Trend:

```text
streak-metrics-math@1.0.0, 1.0.1    kit-map-vim@1.0.0
streak-map-cache@1.0.0              streak-map-kit@1.0.0
map-streak-kit@1.0.0                streak-cache-map@1.0.0
streak-calc-metrics@1.0.0           streak-calc-math@1.0.0
streak-math-abz@1.0.0               streak-metricsaz@1.0.0
streak-math-metrics@1.0.0           streak-metricazbd@1.0.0
streak-metricsazb@1.0.0             streak-kit-map@1.0.0
```

The delivery mechanic is the sharpest part. The entry file `dist/index.mjs` re-exports the real date helpers and launches the bundled implant the moment the module loads. No install hook, no exported function to call, no postinstall script for the registry to flag. From Trend's report: "a single import anywhere in the dependency graph, even a transitive one, is enough to execute the payload."

Read that again with your dependency tree in mind. Not *your* import. Anyone's.

## The payload

The implant hides as a native math accelerator named `math-core.bin` or `math-calc.bin` or `calc-math.dat`, living in `dist/` or `dist/internal/`. It's the RedShell Linux beacon, introduced in RedC2 4.0. Once running:

```text
- interactive shell via /bin/sh
- SSH key + browser credential harvesting
- persistence, in-memory ELF execution
- SOCKS5 proxying, network pivoting
- check-in message → command loop via /bin/sh
```

The Windows beacon adds UAC bypass, AV/EDR tampering, and lateral movement. The macOS one does without those.

## The commercial context

This is the part of the story the technical writeups undersell. RedC2 is a product with a release cadence: version 2.0 in August 2025, 3.0 in January 2026, 4.0 advertised on Hack Forums by a seller calling himself MarlboroMan in early June 2026, "built for evasion." Feature list: terminal access, file transfer, staged delivery, multi-beacon operation, network visualization, host-to-host tunneling, in-memory execution of BOFs, .NET assemblies, and shellcode. There's also "Red Agent," an LLM-driven component that takes natural-language commands for recon and credential dumping.

The Red Offsec website describes it as "a multi-language, multi-OS command and control framework... built with evasion as a core principle," and the ToS prohibits "hacking without explicit permission." Cobalt Strike went down this exact road: legitimate red team tool, commercialized, then a decade of campaigns behind its beacon. Every one of those campaigns started with someone paying ninety-nine dollars, or not paying, because it leaked the way everything leaks.

## What to look for

```bash
# any of these in your node_modules is a bad Tuesday
ls -la node_modules/*/dist/*.bin
ls -la node_modules/*/dist/internal/
# entry files that spawn processes on import:
grep -l "spawn\|exec\|fork" node_modules/*/dist/index.mjs
# and the honest version: read the entry file of every
# package you can't justify by name alone
```

For detection teams: unexpected Linux binaries launching from package directories, `/bin/sh` children of Node processes, and hosts beaconing after a routine dependency bump are the behavioral anchors. The package names rotate faster than blocklists update.

The number that sticks with me is the price. A capable cross-platform C2 with an AI assistant costs less than a month of a streaming subscription. The commercialization of the offense stack isn't coming, it's fully shipped, versioned, and self-updating. The economics only work, though, if the delivery keeps working. Fourteen typosquatted date libraries is the same old delivery problem wearing a newer price tag. The defense is still reading your dependency tree like someone hostile might have written part of it.
