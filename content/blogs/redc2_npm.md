+++
title = "RedC2 4.0: A Commercial C2 Framework Hiding in npm Date Utilities"
date = "2026-09-20"
+++

# RedC2 4.0: A Commercial C2 Framework Hiding in npm Date Utilities

Trend Micro found 14 trojanized npm packages in August 2026 that masquerade as calendar and streak utilities. They are functional, they offer the promised date math, and beneath that working surface they drop a Linux backdoor called RedShell, the beacon for a commercial C2 framework called RedC2 4.0.

## The Loader Trick

The packages have names like `streak-metrics-math`, `kit-map-vim`, `streak-map-cache`, and `streak-calc-metrics`. The delivery mechanism is the interesting part: no install hook, no exported function required. The package entry file, `dist/index.mjs`, acts as a trojan loader. It re-exports the date helpers and launches the bundled implant as soon as the module loads. A single import anywhere in the dependency graph, even a transitive one, is enough to execute the payload.

The bundled binary is framed as a native math accelerator. The filename varies across packages, `math-core.bin`, `math-calc.bin`, `calc-math.dat`, `calc-cache.bin`, `calc.bin`, `calc-mapping.bin`, and it lives either directly in `dist/` or under `dist/internal/`. Whatever the name, it is the same RedShell Linux beacon for RedC2 4.0, communicating with a remote Windows or Linux server for post-exploitation.

## The Framework

RedC2 4.0 is marketed on cybercrime forums as a cross-platform toolkit for Windows, macOS, and Linux. The version was advertised by a threat actor named MarlboroMan on Hack Forums in early June 2026, described as a C2 framework "built for evasion." Version 3.0 was sold in January 2026, version 2.0 in August 2025. The framework has been under active development for at least a year, and the RedShell Linux beacon is new in 4.0.

The feature list reads like a commercial product spec: terminal access, file transfer, staged payload delivery, data collection, multi-beacon operation, network visualization, host-to-host tunneling, and in-memory execution of Beacon Object Files, .NET assemblies, and shellcode.

## Why This Matters

The commercial C2 market is the part of cybercrime that does not get enough attention. Ransomware groups buy access, loaders, and now C2 frameworks, from vendors who advertise on forums like any SaaS company. RedC2 is a product with version numbers, release cadence, and a changelog. The people selling it are not hackers, they are software vendors with a different customer base.

The npm delivery is the other half of the story. The packages are functional, which defeats the "does it work" check. The payload launches on import, which defeats the "did it run" check, because any dependency import triggers it. And the binary is framed as a math accelerator, which is exactly the kind of file a developer would not think twice about.

## The Blue Team Read

For defenders, the signals are:

- npm packages with date-utility names shipping native binaries in `dist/`
- Entry files that launch background processes on import
- New packages with plausible names and low download counts appearing in the dependency graph
- Linux hosts with unexpected background processes named after math or cache operations

The deeper lesson is about the dependency graph itself. A transitive dependency can execute code on import. That is not a bug in npm, it is how the platform works, and it is exactly what the attackers are exploiting. The question for every team is whether they know what is in their dependency graph, and whether anyone has actually read the entry files of the packages that matter.