+++
title = "RedC2: A $99 C2 Framework Shipping Through npm"
date = "2026-08-21"
+++

Trend Micro identified 14 trojanized npm packages delivering a Linux implant for RedC2 4.0, a commercial command-and-control framework sold openly on the web for $99.99 under the name Red Offsec.

## Targeted packages

The packages mimicked date and math utility libraries, versioned at 1.0.0 or 1.0.1:

```text
streak-metrics-math@1.0.0, 1.0.1    kit-map-vim@1.0.0
streak-map-cache@1.0.0              streak-map-kit@1.0.0
map-streak-kit@1.0.0                streak-cache-map@1.0.0
streak-calc-metrics@1.0.0           streak-calc-math@1.0.0
streak-math-abz@1.0.0               streak-metricsaz@1.0.0
streak-math-metrics@1.0.0           streak-metricazbd@1.0.0
streak-metricsazb@1.0.0             streak-kit-map@1.0.0
```

The delivery mechanism avoids lifecycle install scripts. Instead, the entry module `dist/index.mjs` re-exports valid date functions while spawning the bundled implant as soon as the module is imported. Any application or transitive dependency importing the package triggers execution immediately during Node initialization.

## The RedShell implant

The binary payload is named to look like a native calculation module (`math-core.bin`, `math-calc.bin`, or `calc-math.dat`) inside `dist/` or `dist/internal/`. This binary is the RedShell Linux beacon introduced in RedC2 4.0, which provides:

- An interactive shell via `/bin/sh`.
- Harvesting of SSH keys and local browser credentials.
- In-memory ELF execution for persistence.
- SOCKS5 proxying and internal network pivoting.
- Periodic check-in polling to receive operator tasks.

Windows builds of the framework include UAC bypass and driver-assisted defense evasion modules, while macOS builds share the core credential-gathering capabilities.

## Commercial tooling background

RedC2 follows the commercial tooling model seen with other post-exploitation frameworks. The developer ("MarlboroMan") advertised version 4.0 on underground forums in June 2026 with features for staged execution, network mapping, and in-memory execution of BOFs and .NET assemblies. It also includes "Red Agent," an LLM-assisted module designed to translate natural-language instructions into reconnaissance and credential-dumping commands.

## Threat hunting and detection

Organizations can inspect dependency trees and process telemetry for signs of compromise:

```bash
# locate unexpected ELF binaries within node_modules
find node_modules/ -path "*/dist/*.bin" -o -path "*/dist/internal/*" 2>/dev/null

# identify packages spawning subshells directly in entry scripts
grep -lE "child_process|spawn|execFile" node_modules/*/dist/*.mjs
```

Key behavioral indicators include:

- Node.js processes spawning `/bin/sh` or unexpected ELF binaries from package directories.
- Hosts establishing new outbound network connections shortly after automated dependency installations or build jobs.
- Sudden network beaconing from developer workstations or CI runners.
