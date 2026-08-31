+++
title = "Reverse Engineering Is a Reading Skill, and Security Teams Treat It Like Magic"
date = "2026-09-13"
+++

# Reverse Engineering Is a Reading Skill, and Security Teams Treat It Like Magic

Somewhere between the crackme videos and the exploit teardowns, I've noticed a pattern in how security teams treat reverse engineering: as a specialist's tool that other people use, like soldering. Ed's videos, especially the one walking through how crackers defeat software protection and the ones reversing real malware, keep making the opposite case, and the case sticks with me: RE is closer to literacy than to surgery. You learn to read binaries the way you learned to read logs, and the payoff isn't writing exploits, it's being unable to be fooled by one.

## What the crackme scene actually teaches

The cracking walkthrough content covers the standard ladder, and it's worth spelling out why each rung matters to someone who never wants to crack anything:

```text
1. static analysis first
   strings, imports, section flags → what does this binary claim to be?
2. find the check
   x64dbg/Ghidra: locate the failure path, work backwards to the compare
3. patch vs. keygen
   patching (jump flip) proves you found the gate.
   keygenning (reimplementing the check) proves you UNDERSTOOD it.
   keygenning is the actual skill.
4. break the protection scheme, not the binary
   understanding the algorithm → reimplementing it → no binary needed
```

That ladder is identical to the one malware analysts climb, and identical to the one a defender auditing a vendor binary climbs. The crackme is just honest about being a puzzle.

One aside from the video that stuck: the "ASan" search result moment, where googling the sanitizer acronym surfaces the Autistic Self Advocacy Network first. Trivial, but it captures why RE documentation is impenetrable to newcomers: the terminology is a maze of collisions, and most security writing about tooling is written by people who forgot what it was like not to know.

## Why this matters on the blue side

The strongest argument for RE literacy in a SOC is this: you cannot triage what you cannot read, and increasingly, the things that matter are binaries and scripts that no vendor will explain to you.

Concrete cases where reading beats asking:

```text
- a vendor "agent" ships you a .msi and won't document what
  its service does → strings + Ghidra answers in an afternoon
- an EDR alert on malware.staging.exe → is the shellcode doing
  what the report says, or are you executing someone's test?
- a JS "assessment task" from a job recruiter → 20 minutes of
  static RE tells you if it phones home before you run it
- a patch diff → "what did they actually fix?" is a diff
  question, not a release-notes question
```

That fourth one is the skill I'd pay for most. Reading patch diffs is reverse engineering with the answer key attached, and it's how you catch the vendor who "fixed" a vulnerability by renaming the function.

The npm/PyPI wave made this concrete: the malicious packages that mattered, the ones that survived review, were the ones where nobody read the entry file. `dist/index.mjs` spawning a process on import is visible to anyone who opens the file. Nobody opened the file. The skill gap wasn't Ghidra, it was the habit of looking.

## The workflow that actually builds the muscle

What the RE-from-SOC material keeps showing, and what finally made it click for me:

1. **Start with answers attached.** Crackmes with published writeups, malware with existing analyses. The skill is building your own path to a known answer, then comparing.
2. **Strings and imports before decompilers.** Most triage questions are answered by `strings` and knowing what normal looks like. Ghidra is for the questions strings can't answer.
3. **Dynamic always confirms static.** The Temu router break in the previous posts is the model: strings found `upload.cgi`, dynamic testing confirmed what it trusted. Neither alone is enough.
4. **Write as you read.** The analysts whose work I trust all annotate in real time. The dump-then-study-later approach produces notes nobody can use, including you.

## The uncomfortable summary

Most security teams' actual exposure to RE is forwarding samples to someone else. That's a reasonable division of labor at scale, and I'm not saying every analyst needs to write a keygen. But the floor is lower than people think and the ceiling is higher: the floor is reading a binary's own strings and forming a hypothesis you can defend, and almost nobody on a typical team does even that, because the tools were dressed up as specialist equipment. The gap isn't talent. It's that nobody scheduled the four hours.

The teams that do it well don't treat RE as a dark art. They treat it as the price of admission for trusting anyone else's code, which, if the last year of supply chain news is the guide, is exactly what it is.