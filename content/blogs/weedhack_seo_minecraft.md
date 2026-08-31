+++
title = "Weedhack: SEO Poisoning the Minecraft Client Scene"
date = "2026-08-24"
+++

The Weedhack analysis from August documents malicious clones of Minecraft client download sites outranking the real projects on Google, Bing, Brave, and DuckDuckGo. Both the Xenon Client and Nova Client spoofs sat at the top of results across multiple engines. The legitimate clients, which live on GitHub and Modrinth, ranked below them. The kids downloading cheats are the detection canary for everyone else. When the first result for a tool is the attacker, the trust model of the entire search web has a bug.

## The setup

The fake sites clone the real ones completely: branding, feature lists, FAQs, installation guides, developer credits, and links to the genuine GitHub repos. That last part is a nice touch. Linking the real repo makes the clone more legitimate-looking than a bare phishing page. The download button is the only thing that lies. One of the fake sites was built with Lovable, the AI website builder. That tells you how low the production cost has dropped. A convincing multi-page clone with consistent branding is now a prompt away.

The domains follow the near-miss pattern that has worked since the dial-up era:

```text
glazed-client[.]com      ≈ glazedclient[.]com      (open source, free)
radium-client[.]com      ≈ radiumclient[.]com      (paid)
seedcrackerx.github[.]io ≈ seedcrackerx[.]com      (seed cracker)
meteorclients[.]com      ≈ meteorclient[.]com      (open source)
nova-client[.]com        ≈ (open source client)
xenoclient[.]lol + xenonclient[.]com ≈ Xenon client
kryptonclientcrack.lovable[.]app    ≈ kryptonclient[.]org
cheatlib[.]xyz           "modern Minecraft mod library,
                          1.6M+ downloads" (invented)
```

`cheatlib[.]xyz` is the one that made me laugh. The tool doesn't exist at all, and the page copy still claims "1.6 million downloads". The lie is load-bearing marketing.

## The distribution math

McAfee's numbers on where the malicious URLs actually lived: 49.6% Discord links, 23.4% MediaFire, 8.2% GitHub. Then the twist: JAR files hosted on Planet Minecart and EndMods, both legitimate Minecraft content sites. The platforms kids already trust and already visit are the CDN. Discord being half the distribution is a generational marker. The support community IS the delivery mechanism. The links arrive in servers the users already belong to, often shared by accounts that got hacked the same way. It's a worm with a referral program.

## The payload

First documented by McAfee in June after SEO poisoning and YouTube traffic funnels, Weedhack's multi-stage sequence ends in Java payloads that collect system info, set Microsoft Defender exclusions, and steal data. The Defender exclusion step is the tell about the operational maturity here. It's not smash-and-grab, it's settle-in.

The fix advice from McAfee is the standard trio (patch, trusted sources, scan) plus the one that matters: be suspicious of any mod asking you to disable protections to install. That prompt is the attack. No legitimate mod needs Defender off.

## Why this campaign is the canary

Two reasons I think this story matters beyond gamers.

First, the search engines lost. This wasn't a user typing a wrong URL from memory. The spoofed sites outranked the official ones on four engines simultaneously. SEO poisoning has always existed, but AI-built clone sites at scale make the attack surface continuous. Whatever your users type into a search box, assume the first result is contested space. For orgs: your software's legitimate download URLs belong in a documented, bookmarked, verified list for every tool your teams install. Search-is-the-download-path died with this campaign and nobody noticed.

Second, Check Point's June campaign shows the same TDS pattern hitting open-source and freeware broadly, dropping Remus Stealer, AnimateClipper, and SessionGate. Weedhack is the gaming-industry instance of a general method: find where non-technical users get software, buy or SEO your way above the real source, ship a loader. The Minecraft kids are just the population with the least organizational defense. Everyone's mother downloading "PDF converter free" is the same target with different lures.

The JAR angle also survives. Java still ships with a permissive "run this downloaded file?" flow. Schools and gaming PCs have it everywhere. Defenders under-prioritize Java on endpoints precisely because it feels like 2011. The attackers don't care what year it feels like.
