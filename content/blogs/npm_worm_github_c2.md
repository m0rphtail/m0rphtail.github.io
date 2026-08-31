+++
title = "The npm Worm That Used GitHub as Its C2"
date = "2025-11-27"
+++

# The npm Worm That Used GitHub as Its C2

I spent an evening going down the rabbit hole of the shhallucinate npm worm, and the part that kept me up wasn't the malware itself. It was the C2 design. The worm used GitHub Actions discussions as its command channel, which means the "malicious infrastructure" was a public repository that looked like a normal open-source project. Blocklists don't work against that. Reputation filters don't work against that. The only thing that works is understanding what the code actually does.

## What the worm did

The worm spread through npm packages, the standard supply chain move: publish a package with a plausible name, get it installed, harvest what you can. The interesting part was the persistence and the C2. Instead of a hardcoded IP or domain that defenders could sinkhole, the worm checked GitHub Actions discussions for instructions. A public repo, normal-looking, with the operator posting commands as discussion comments.

The mechanics, as far as the analysis showed:

```text
1. worm runs on infected host
2. reads GitHub Actions discussions from a specific repo
3. parses the latest comment as a command
4. executes it, exfiltrates results
5. waits for the next comment
```

GitHub Actions discussions are a legitimate feature. They're indexed, they're public, they look like a maintainer talking to contributors. The traffic to github.com is indistinguishable from a developer checking their notifications. That's the whole point.

## Why that ruins traditional detection

Every detection model I was taught assumes C2 has a shape: a domain, an IP, a beacon interval, a JA3 fingerprint. GitHub as C2 has none of those. The domain is github.com, which is allowlisted in every environment on earth. The traffic is TLS to a CDN. The beacon interval is "whenever the operator posts." The only signal is the content of the discussion, which requires reading the actual API responses.

The worm also did the classic npm tricks: typosquatting, dependency confusion, and the "works as advertised" camouflage where the package functions normally so sandbox analysis sees nothing wrong. The combination, functional package plus GitHub C2, is the pattern I now look for first in any supply chain investigation.

## The CI/CD pattern behind the whole year

What made this worm worth studying is that it's not alone. The year's supply chain attacks keep landing on the same architectural truth: CI/CD pipelines are the new perimeter. The Gemini CLI incident showed a malicious PR with a settings.json hook running arbitrary commands in a CI runner. The TeamPCP campaigns compromised GitHub Actions repositories to poison downstream builds. The npm worm used GitHub's own infrastructure as C2. The pattern is consistent: attackers are not breaking into networks anymore, they're breaking into the build and release process, because that's where the trust is.

The runner model matters here. GitHub-hosted runners are ephemeral and isolated. Self-hosted runners are a local binary on your infrastructure pulling and running workflows, and the threat model is "code in runners is trusted." When a workflow runs attacker-influenced code, the runner's environment variables, DB credentials, API keys, everything the build touches, is exposed. The worm's GitHub C2 is the same idea at a different layer: use the platform's own features as the command channel, and the platform's reputation becomes your cover.

## What I took from it

Three things, in the order I learned them:

First, when you see a package that works but does something weird with GitHub's API, that's not a bug, it's a C2. The behavior to hunt is API calls to github.com from processes that have no business talking to GitHub, especially from build servers and CI runners.

Second, the fix for the C2 problem is egress policy, not blocklists. You can't block github.com. You can restrict which processes and which service accounts are allowed to reach it, and you can monitor the API calls they make. The question isn't "is this host talking to GitHub," it's "why is this process talking to GitHub."

Third, the supply chain lesson generalizes: the packages that matter are the ones that look normal. The worm's camouflage, functional code, plausible name, normal-looking C2, is the baseline now. The defense is reading the code, not scanning the hashes. I keep coming back to that because it's the one thing that doesn't change no matter how the infrastructure evolves: someone has to actually read what the code does before it runs.
