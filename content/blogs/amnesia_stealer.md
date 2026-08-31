+++
title = "AmnesiaStealer: The macOS Stealer That Checks Your Password Before Using It"
date = "2026-08-13"
+++

# AmnesiaStealer: The macOS Stealer That Checks Your Password Before Using It

The August 13 analysis of a Rust-based macOS stealer, AmnesiaStealer, has one detail that puts it above the usual infostealer commodity pile: it validates the password you type before it exfiltrates. Native prompt, "installer" disguise, and your password gets checked against the local directory service with `dscl`. Wrong? "Incorrect password. Please try again," in a loop, until you type the right one. The malware QA's its own phishing.

## The chain

Delivery is a counterfeit GitHub download page with a ClickFix lure: copy this Base64 blob into Terminal. The chain runs three stages: a shell script that downloads and launches the payload, then deletes itself; the Rust stealer itself, harvesting Keychain, browsers, Apple Notes, and Telegram; and a `stream_module`, pulled on command, giving the operator interactive hidden control of the victim's browser.

The first stage is a password-protected ZIP (AV scanners hate this one trick). Inside, a Mach-O Rust binary with an encrypted configuration, modifiable at build time without code changes. The config holds the C2 endpoint, `debug.allllowef.space/send/`, and a `CLIPPER_ENABLED` toggle targeting Bitcoin, Ethereum, Monero, Solana, TRON, Ripple, Cosmos and the rest of the usual wallets.

## The password loop

```applescript
# conceptual reconstruction of the credential capture
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

Then the password goes to work, and this is where the design shows its intent: piped into `sudo -S` for privileged reads, passed to `security unlock-keychain -p` to open the login keychain, and written to disk in cleartext, once into the staging dir as `pwd` and once in the user's home as `~/.pwd`. A fallback path writes `/tmp/tempAppleScript.scpt` and runs `osascript` if the native alert fails, though on Jamf's host the native path won.

`~/.pwd` is a forensic gift, sitting right there on disk. It's also the victim's whole account, handed over voluntarily by the victim, checked twice for correctness by the malware. The same password-validation behavior shows up in ClickLock Stealer, so this isn't one author's flourish, it's a pattern propagating through the macOS stealers.

## What it does with the access

With the keychain open, the harvest list reads like a compliance nightmare:

- 16 Chromium-family browsers (Chrome, Brave, Arc, Edge...): Cookies, Login Data, Web Data, History, Bookmarks, Local State, and the Extensions directory
- Chrome Safe Storage read from the Keychain to decrypt the profile master keys
- Safari cookies via TCC bypass CVE-2020-9771 on Catalina; works on macOS 26 only with Full Disk Access, which the stealer doesn't have. Small mercies.
- Apple Notes, Telegram sessions, plus `.txt/.pdf/.rtf/.doc/.wallet/.key` files across Desktop, Documents, Downloads
- An AppleScript mutes system sound first, because nothing says "legitimate installer" like silent operation
- Persistence via a root LaunchDaemon impersonating Apple's crash reporter, which is a genuinely good hiding spot
- Staging under `/tmp` in a 25-random-alphanumeric directory, archived, exfiltrated

The `remote_stream` command triggers a second Rust binary that drives the browser over the Chrome DevTools Protocol, headless, across seven Chromium-family browsers, with a WebSocket relay for operator commands. CDP control is the part that should worry anyone who treats "cookies stolen" as the ceiling of stealer damage. With CDP, the operator *is* the browser, extensions, sessions, logged-in everything, from anywhere.

## My read

None of this is a vulnerability. The CVE-2020-9771 abuse aside (patched years ago, still working against Catalina, which tells you about long-tail fleet reality), the chain is: user pastes a command, user types their password, malware checks the password is right, user's data leaves. macOS's security model assumes the user is the root of trust, and this entire class of attack is what happens when that assumption is monetized.

Detection-wise, the disk artifacts are the cheap wins: `~/.pwd`, the `/tmp/tempAppleScript.scpt` fallback, a LaunchDaemon named like Apple's crash reporter that you didn't install, and Chromium processes launched headless by something that isn't Chrome's own updater. And `dscl` called from anything that isn't your MDM or directory tooling is worth a tripwire. The behavioral truth under it all: if your EDR can't tell you *why* a process read `~/Library/Keychains/` and then opened network connections to a `.space` domain, the Rust rewrite of the classic stealer playbook won't be the thing that tips you off. The tip-off will be the user saying the installer kept asking for their password. That's not a joke, it's the actual best detection signal this bug has: humans notice loops.
