+++
title = "The npm Worm That Used GitHub as Its C2"
date = "2025-11-27"
+++

The shhallucinate npm worm stands out mainly for its C2 design: it ran its command channel directly through GitHub Actions discussions. Because the malicious infrastructure was just a public GitHub repository, standard domain reputation feeds and IP blocklists were useless against it.

## How the worm operated

The worm spread via typical npm supply chain tactics: typosquatting plausible package names and delivering working code to avoid early suspicion. Instead of relying on a dedicated server or hardcoded domain that could be sinkholed, it polled discussion threads in a public GitHub repository for instructions.

The loop was straightforward:

```text
1. Worm runs on infected host
2. Reads GitHub Actions discussions from a specific repo
3. Parses the latest comment as a command
4. Executes the command and exfiltrates results
5. Waits for the next comment
```

GitHub Actions discussions look like ordinary developer conversation. Traffic to `github.com` looks identical to legitimate developer activity or tooling polling for notifications, hiding the traffic within standard TLS egress.

## Detection challenges

Traditional network detections look for suspicious domains, newly registered IPs, fixed beacon intervals, or distinct TLS fingerprints. Using GitHub for C2 bypasses those checks: `github.com` is almost universally allowlisted, traffic terminates at GitHub CDNs, and polling intervals follow whenever the operator posts a new comment. Inspecting the actual API response body is usually the only way to spot the command payload on the wire.

The packages also functioned as advertised. By delivering expected utility alongside the backdoor, the author kept automated sandboxes from flagging the installation immediately.

## Supply chain attack patterns

This worm fits a broader trend targeting developer infrastructure. Attackers increasingly focus on CI/CD pipelines and package registries where permissions are high and automated trust is assumed. Malicious pull requests with hidden hooks run in runner environments, poisoned dependencies compromise downstream builds, and legitimate developer platforms serve as communication channels.

The runner architecture is particularly exposed. Self-hosted runners often run as local services with direct network access to internal build environments, source repositories, and deployment secrets. If a workflow runs attacker-influenced code, any accessible credentials in the runner environment can be harvested.

## Practical defenses

Defending against this pattern requires focusing on process behavior and egress controls:

Monitor process-level network activity. A build tool or random dependency should not make outbound API calls to GitHub discussion endpoints. Hunting for unexpected processes making calls to `api.github.com` from CI runners provides high-fidelity alerts.

Enforce strict egress filtering. Since blocking `github.com` globally is impractical, restrict which service accounts and processes can initiate outbound connections to code hosting platforms.

Pin dependencies and audit new packages. Lockfiles prevent unexpected version updates, but newly introduced packages still need manual review. Packages that appear completely functional can still hide malicious lifecycle scripts or remote command execution.
