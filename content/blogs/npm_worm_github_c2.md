+++
title = "The npm Worm and GitHub as C2: Reading Supply Chain Attacks Like a Threat Intel Analyst"
date = "2026-09-06"
+++

# The npm Worm and GitHub as C2: Reading Supply Chain Attacks Like a Threat Intel Analyst

The shhallucinate npm worm crossed my desk as a set of IOCs to triage, and the more I dug, the more I appreciated it as an adversary tradecraft study. This is not a smash-and-grab. It is one of the cleanest supply chain designs I have read in a while, and if you work detection or CTI, there are lessons in it that generalize well past JavaScript.

## What the Worm Did

The compromise chain is recursive. Somewhere there is a patient zero nobody has publicly identified. A maintainer with publish rights to an npm package got compromised, and their package gained a malicious post-install script. When other maintainers pulled that package, the script looked around the local environment for cloud credentials, Google Cloud, AWS, Azure, grabbed what it could find, and then asked the interesting question: does this developer have the ability to publish npm packages? If yes, it injected the same post-install script into their packages and pushed. Hundreds of packages ended up infected, and the number kept climbing while the campaign ran.

Worm propagation through package maintainers is clever. The exfiltration channel is what made me sit up.

## GitHub as Command and Control

The malware needs somewhere to send stolen credentials. The obvious answer is a rented server, which is also the obvious thing for defenders to watch: odd egress to a fresh VPS, strange domains, unknown ASNs.

Instead, the worm created a new GitHub repository on the developer's own account and pushed the stolen credentials there. Then it registered the developer's machine as a GitHub Actions self-hosted runner and wired up a malicious workflow. The workflow watched repository discussions, and when a discussion item landed, the workflow's job was to run the discussion body as a command.

That is a full C2 loop built entirely out of legitimate GitHub traffic. The exfil point is the victim's own authenticated GitHub session. The command channel is the same webhook infrastructure every engineering org already allows through the firewall. From a network standpoint, nothing about this looks like an intrusion. It looks like a developer pushing code.

## Why That Ruins Traditional Detection

Most SOC detection content for supply chain assumes the malware needs to touch attacker infrastructure at some point. New domain registrations, low-reputation IPs, unusual countries, beacons on odd ports. The entire framework collapses when the adversary infrastructure is GitHub itself, a service your organization almost certainly allows, whitelists, and trusts with developer credentials.

The detection surface moves to behavior, and it is a harder surface:

- A developer machine self-hosting a runner when the org standard is GitHub-hosted runners
- Newly created repos receiving pushes with no review activity, from identities that historically only committed to team projects
- Workflow definitions that invoke `sh -c` style execution on discussion or issue content
- npm post-install scripts reaching for environment variables in bulk
- Tokens with repo scope created without a corresponding ticket or owner

None of those rules are exotic. The hard part is that they all require baseline context, and most SOCs do not have a baseline for developer tooling. You cannot know that a runner registration is abnormal if you have no inventory of where runners are supposed to live.

## The CI/CD Pattern Behind the Whole Year

This worm did not come out of nowhere. The same quarter had the GitHub Actions compromise wave: the Trivy action repository compromised through an Aquabot issue, downstream compromises through KICS, the Accurics workflow hitting Checkmarx under the hood. One threat actor, TeamPCP in the public reporting, chained a string of CI/CD footholds into the light-llm and related package compromises. The Wiz GitHub research in the middle of the year was the same lesson from the research side: push options unsanitized into an internal HTTP header gave arbitrary header injection into GitHub's own backend RPC flow, from a single `git push`.

The industry spent a decade hardening production and left the pipeline that ships to production running on trust. CI/CD is a room full of service principals with secrets in environment variables, executing untrusted input, on machines we monitor less than webservers. Attackers noticed.

## What I Took From It

As a defender, the response I settled on is unglamorous. Inventory your runners and know where they should be. Treat workflow files as production code, because they are production code with tokens attached. Assume the package ecosystem is hostile and get comfortable with the idea that your next incident starts with a legitimate commit from a legitimate identity. And when you build detection for developer tooling, baseline first. The signal is not "GitHub traffic from a workstation." That is every developer, all day. The signal is deviation from each team's normal, which means you need to know the normal.

The uncomfortable summary: we built our supply chains on trust, and the current adversary generation has learned to commute to work inside them. Detection has to move from watching the perimeter to watching the workflow, or it will keep watching an empty road while the goods leave through the loading dock.