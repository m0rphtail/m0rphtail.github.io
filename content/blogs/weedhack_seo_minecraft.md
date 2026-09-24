+++
title = "Weedhack: SEO Poisoning the Minecraft Client Scene"
date = "2026-08-24"
+++

A campaign documented by McAfee shows how attackers use search engine optimization (SEO) poisoning to outrank legitimate open-source utility websites across Google, Bing, Brave, and DuckDuckGo. In this campaign, fraudulent download portals for Minecraft clients like Xenon and Nova ranked above the official repositories hosted on GitHub and Modrinth.

## Web cloning and domain spoofing

The malicious domains cloned legitimate project sites, mirroring branding, FAQs, installation steps, and links to official developer repositories. Only the download button pointed to attacker-controlled files. Several sites were assembled using automated website generation platforms, making it trivial to generate dozens of convincing multi-page clones.

Domains used typosquatting and near-miss variants:

```text
glazed-client[.]com      vs  glazedclient[.]com      (open source client)
radium-client[.]com      vs  radiumclient[.]com      (paid client)
seedcrackerx.github[.]io vs  seedcrackerx[.]com      (utility tool)
meteorclients[.]com      vs  meteorclient[.]com      (open source client)
nova-client[.]com        vs  official client repository
xenoclient[.]lol         vs  Xenon client
kryptonclientcrack[.]lovable[.]app vs kryptonclient[.]org
cheatlib[.]xyz           fictitious library site
```

## Distribution channels

McAfee's analysis broke down the distribution sources delivering malicious URLs:

- 49.6% Discord invite and chat links
- 23.4% MediaFire file hosts
- 8.2% GitHub repositories
- The remaining share hosted as malicious JAR files directly on community content platforms like Planet Minecraft and EndMods.

Infected user accounts often distribute download links automatically to shared Discord channels, accelerating propagation across active gaming communities.

## Payload capabilities

Weedhack distributes multi-stage Java payloads designed to gather host information, establish Microsoft Defender exclusions, and exfiltrate browser credentials and system data. 

Legitimate software mods do not require users to disable endpoint protections or add global Defender exclusions. When an installer requests turning off antivirus protections, that prompt serves as a primary indicator of compromise.

## Broader implications for software distribution

The methods used in Weedhack mirror traffic distribution system (TDS) campaigns observed across open-source and freeware ecosystems delivering stealers such as Remus Stealer, AnimateClipper, and SessionGate:

Search results cannot be treated as verified software sources. Organizations should maintain internal package mirrors or curated lists of verified download repositories rather than relying on search engines to find utility installers.

Java runtime environments (`.jar` files) remain an active vector for delivering commodity malware, particularly on endpoints where endpoint controls on Java process execution are relaxed. Monitoring Java child processes and unusual network sockets provides reliable detection across both developer and desktop machines.
