+++
title = "AmnesiaStealer: The macOS Malware That Double-Checks Your Password Before Stealing It"
date = "2026-08-13"
+++

An analysis published August 13 on a Rust-based macOS stealer, AmnesiaStealer, surfaced one detail that sets it apart from the usual infostealer commodity churn: it validates your password before it does anything with it. You get a native system prompt, dressed up as an installer, and whatever you type gets checked against the local directory service with `dscl`. Get it wrong, and you're told "Incorrect password. Please try again," on a loop, until you finally get it right. The malware is running QA on its own phishing.

## How it gets in

The delivery mechanism is a fake GitHub download page running a ClickFix-style lure: paste this Base64 blob into Terminal, it says. From there the chain runs three stages: a shell script that pulls down and launches the actual payload before deleting itself, the Rust stealer proper, which goes after Keychain data, browsers, Apple Notes, and Telegram, and a `stream_module` that gets pulled down on command and hands the operator interactive, hidden control of the victim's browser.

Stage one arrives as a password-protected ZIP, a cheap way to dodge AV scanners that won't peek inside. Inside sits a Mach-O Rust binary with an encrypted config that can be swapped out at build time without touching the code itself. That config holds the C2 endpoint (`debug.allllowef.space/send/`) and a `CLIPPER_ENABLED` flag aimed at Bitcoin, Ethereum, Monero, Solana, TRON, Ripple, Cosmos, and the rest of the usual wallet lineup.

## The part where it checks your work

```applescript
repeat
  set pwd to display dialog "Installer requires your password" ─→ text returned
  do shell script "/usr/bin/dscl . -authcheck " & quoted form of pwd
  if exit_code == 0 then
    exit repeat
  else
    display dialog "Incorrect password. Please try again"
  end if
end repeat
-- password now validated against the LOCAL DIRECTORY SERVICE
```

Most stealers prompt once and take whatever lands in the dialog. This one won't let you out of the loop until `dscl` confirms the password is correct.

Once it has a password it knows is correct, the design shows its hand. The password gets piped into `sudo -S` for privileged file reads, handed to `security unlock-keychain -p` to pop open the login keychain, and, remarkably, written to disk in plaintext, twice over: once as `pwd` in the staging directory, and once as `~/.pwd` sitting in the user's home folder. There's a fallback path too, writing out `/tmp/tempAppleScript.scpt` and invoking `osascript` if the native dialog fails for some reason, though in the sample Jamf observed, the native path is what actually ran.

`~/.pwd` sitting on disk in cleartext is about as generous a gift to a forensic investigator as you'll find. It's also, functionally, the victim's entire account, handed over willingly, verified twice for accuracy by the malware itself. This same password-validation trick turns up in ClickLock Stealer too, which suggests it isn't one developer's clever idea so much as a pattern that's starting to spread across the macOS stealer ecosystem.

## What it actually does with all that access

Once the keychain is open, the harvest list reads like something out of a compliance auditor's nightmare:

- 16 Chromium-family browsers (Chrome, Brave, Arc, Edge, and others): Cookies, Login Data, Web Data, History, Bookmarks, Local State, and the whole Extensions directory
- Chrome's Safe Storage key, pulled from the Keychain to decrypt each profile's master key
- Safari cookies, via a TCC bypass (CVE-2020-9771) that still works on Catalina but needs Full Disk Access on macOS 26, access the stealer doesn't have, so at least there's that
- Apple Notes, Telegram session data, and any `.txt`, `.pdf`, `.rtf`, `.doc`, `.wallet`, or `.key` files sitting in Desktop, Documents, or Downloads
- A quiet AppleScript call that mutes the system volume first, because nothing screams "legitimate installer" like total silence
- Persistence through a root LaunchDaemon disguised as Apple's own crash reporter, a genuinely well-chosen hiding spot
- Everything staged in a `/tmp` directory with a 25-character random alphanumeric name, then archived and shipped out

There's also a `remote_stream` command that spins up a second Rust binary, one that drives the browser directly over the Chrome DevTools Protocol, headless, across seven different Chromium-family browsers, relayed to the operator over a WebSocket. This is the part that should actually worry anyone who thinks "stolen cookies" is as bad as a stealer gets. With CDP access, the operator effectively becomes the browser itself: every extension, every open session, everything you're logged into, controllable from anywhere.

## Where this leaves defenders

None of this hinges on a vulnerability in the traditional sense. Set aside the CVE-2020-9771 reuse (patched years ago, and the fact that it still works against Catalina says more about how long old macOS versions linger in real fleets than anything about the flaw itself). The actual chain here is: the user pastes a command, the user types their own password, the malware confirms the password is correct, and the user's data walks out the door. macOS's whole security model treats the user as the root of trust, and this entire category of attack is what happens once someone figures out how to monetize that assumption.

For detection, the disk artifacts are the easy wins: `~/.pwd` sitting in plaintext, the `/tmp/tempAppleScript.scpt` fallback file, a LaunchDaemon wearing Apple's crash-reporter name that nobody actually installed, and headless Chromium processes launched by something that clearly isn't Chrome's own updater. Any `dscl` invocation coming from a process that isn't your MDM or directory tooling deserves a tripwire too. But the deeper truth here is that if your EDR can't explain why a process just read from `~/Library/Keychains/` and then immediately opened a connection to some `.space` domain, a Rust rewrite of an old stealer playbook isn't going to be what tips you off. What tips you off, in practice, is a user mentioning that the installer kept asking for their password over and over. That's not a throwaway line. It's genuinely the best detection signal this whole bug produces: people notice when something loops.
