+++
title = "Reading Binaries the Way Attackers Do: What Reverse Engineering Taught Me About Defense"
date = "2026-09-13"
+++

# Reading Binaries the Way Attackers Do: What Reverse Engineering Taught Me About Defense

One of the most shared reverse engineering walkthroughs of the past year opens with a question every security person should be able to answer but most cannot: what does a program actually do when you cannot see its source code? The demo is a small crackme, a program that asks for a name and a key, and the whole lesson fits in a paragraph. Run `strings`, see the imports and the "wrong key" message, load the binary into a decompiler, read the control flow graph, and work out the comparison the program performs on your input. Sum the bytes of the name, XOR with the first character times three, shift left by the length of the program name. Compute it by hand, feed it back, and the binary says "good job."

That is reverse engineering in miniature, and it is the same skill that scales up to malware analysis, exploit development, and firmware teardowns. I came into defense from the offensive side, and I keep coming back to how much of my detection work is downstream of one idea: if you can read what the binary does, you stop guessing about what the attack does.

## Why Offense People Read Binaries

A binary is a closed box only if you accept it as one. A compiler turns human intent into machine code, and the transformation is mostly lossy labels, not lossy logic. Disassembly reverses the labels. When you internalize that a program cannot hide its own behavior, only obscure it, a lot of security mystique falls away.

The walkthroughs make this concrete. One cracks a keygen by following data flow until the check falls out of the arithmetic. Another, a HackTheBox casino challenge, starts from the import table alone: `srand` showing up in a betting game tells you the randomness is seedable, and if you can recover or predict the seed, the game is over before you place a bet. No zero-day, no memory corruption, just reading what the program told you about itself and doing arithmetic.

The same literacy is what separates a real router teardown from a network scan. The researchers who found the backdoor accounts in consumer routers did not exploit anything exotic. They pulled the firmware, binwalked the squashfs out of the image, opened the web-serving binary in Ghidra, and looked for the string comparison that decides who gets in. That is the keygen lesson applied to shipping products. The difference between the two is a plane ticket, not a different skill.

## What It Does for a Defender

The defensive payoff is not "I can crack keygens." It is what knowing the offensive process does to how you build detections.

You learn what noise actually looks like. Once you have written an exploit, you know exactly which calls it makes, in what order, against which APIs. When a detection rule fires on some API sequence, you can read the rule and know whether it would catch your own attack, and if it would not catch you, it will not catch anyone competent. That single test, would my own tradecraft trip this, kills more weak rules than any workshop.

You learn where the brittle assumptions live. Detections built on path names, parent-child process relations, and command-line flags fall over because attackers read those rules and route around them. The behavior that actually survives is deeper: allocation patterns, timing, the specific syscalls a technique cannot avoid. You only know which parts are unavoidable if you have sat on the attacker's side of the tool.

And you learn to read malware reports critically. Every IR team consumes third-party malware analysis. If you have reversed even a few binaries yourself, you can read a report and immediately tell whether the analyst found the real code path or pattern-matched a string and guessed. That matters when the report drives your hunting priorities.

## How to Actually Get Started

The barrier is lower than people think, and the path is well marked.

Start with crackmes and CTF reversing challenges. They are purpose-built for learning, no legal ambiguity, immediate feedback. Work keygen-style challenges until following a control flow graph feels boring, because boring means fluent. The moment a comparison table stops being intimidating, you have the core skill.

Learn your tool on training material first. Ghidra is free and industry standard. IDA has a free tier. Binary Ninja has a student license. Pick one, learn its decompiler view, and stop switching tools long enough to get fluent in the workflow itself.

Then read real malware. Old samples, documented ones, in a VM with no network. Take a known family, read the public report first, then try to find the described behavior in the binary yourself. The gap between the report and what you find is the lesson.

Finally, close the loop on the job. Take one detection your team runs, assume you are the adversary, and try to write the smallest tool that evades it. If you succeed in an afternoon, so does everyone attacking you for real. That exercise, run honestly, is the fastest argument for behavior-based content I know.

## The Honest End of It

Every capability I relied on as an attacker, reading binaries, predicting seeds, walking firmware, now shows up in my defensive work as intuition about what an attacker can and cannot do. The asymmetry defenders always complain about is real, but it is partly self-inflicted: blue teams that never sit on the offensive side of a binary keep writing detections against the version of attacks they read about instead of the version that gets run.

Reverse engineering is the cheapest way I know to close that gap. It costs a free tool, a VM, and some evenings, and it returns the ability to test every assumption you defend. The binary cannot lie to you about what it does. It just waits for someone to ask.