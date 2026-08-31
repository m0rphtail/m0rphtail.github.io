+++
title = "AmnesiaStealer: A Rust Stealer That Steals the Password to Steal More"
date = "2026-09-24"
+++

# AmnesiaStealer: A Rust Stealer That Steals the Password to Steal More

Jamf Threat Labs documented a macOS stealer in August 2026 that is worth reading for one detail alone: it validates the password it captures before exfiltrating it. AmnesiaStealer, a Rust-based infostealer, displays a native prompt to capture the system password under the guise of an installer, then checks the entered password against the local directory service with `dscl` to make sure it is correct. If the check fails, it loops the dialog with "Incorrect password. Please try again." until the victim gets it right.

## The Chain

The stealer spreads via a counterfeit GitHub download page titled "Download for macOS" that claims to be from a verified publisher. The page uses a ClickFix-style lure, instructing users to copy and paste a Base64-encoded command into the macOS Terminal app.

The attack chain runs in three stages:

1. A shell script downloads and launches the payload
2. A Rust infostealer harvests the Keychain, browsers, Apple Notes, and Telegram
3. A `stream_module`, fetched on command, gives the operator hidden, interactive control of the victim's browser

The script retrieves a password-protected ZIP archive and deletes itself. Extracted from the archive is the first-stage Mach-O binary, a Rust stealer with an embedded encrypted configuration that can be modified at build level without code changes.

## The Configuration

The embedded config includes the C2 endpoints, `debug.allllowef[.]space/send/`, and a toggle for a clipboard-hijacking module targeting cryptocurrencies: Bitcoin, Bitcoin Cash, Ethereum, TRON, Litecoin, Monero, Solana, Ripple, and Cosmos.

The Rust payload also performs host reconnaissance and geolocation profiling. Then comes the password capture.

## The Password Capture

The stealer displays a native prompt to capture the system password under the guise of an installer. The entered password is validated against the local directory service via `dscl`, ensuring only the correct password is exfiltrated. If the check fails, it triggers a dialog loop until the correct password is entered.

A fallback path writes `/tmp/tempAppleScript.scpt` and invokes `osascript` if the native alert fails. The captured password is then reused throughout the chain: piped into `sudo -S` for privileged reads, passed to `security unlock-keychain -p`, and written to disk in cleartext, both in the staging directory as `pwd` and in the user's home directory as `~/.pwd`.

The same behavior has been observed in another macOS stealer family called ClickLock Stealer, which suggests the pattern is spreading.

## Why This Matters

The password validation is the detail that separates this from a typical stealer. Most stealers grab whatever the victim types and hope it is right. AmnesiaStealer refuses to exfiltrate a wrong password, which means the attacker gets a working credential every time, and the victim gets a dialog loop that makes them think the installer is broken.

The cleartext password storage is the other notable detail. The password ends up in `~/.pwd` on disk. For forensics, that is a gift: the artifact is sitting right there. For the victim, it is the full compromise of their macOS account, because the attacker now has the password that unlocks the Keychain, sudo, and everything else.

## The Blue Team Read

For macOS defenders, the signals are:

- Fake GitHub download pages for macOS software
- ClickFix-style instructions to paste Base64 commands into Terminal
- Native password prompts from unsigned installers
- `~/.pwd` or `/tmp/tempAppleScript.scpt` artifacts
- `dscl` validation calls from unexpected processes
- Rust binaries with embedded encrypted configs connecting to unknown C2

The deeper lesson is about the macOS trust model. The attack does not exploit a vulnerability. It asks the user to paste a command into Terminal, then asks for the password, then validates it. Every step is something the user does willingly. The defense is the same as it has always been: do not paste commands from web pages, do not enter your password into prompts you did not initiate, and do not download software from GitHub pages that are not the real project.