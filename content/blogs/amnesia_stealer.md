+++
title = "AmnesiaStealer: The macOS Malware That Double-Checks Your Password Before Stealing It"
date = "2026-08-13"
+++

AmnesiaStealer is a Rust-based macOS stealer that verifies entered passwords before attempting to use them. The malware presents a native system prompt masquerading as an installer and tests user input against the local directory service using `dscl`. If the check fails, it loops and prompts again until it receives the valid password.

## Delivery mechanism

Initial access relies on a fake GitHub download page using a ClickFix lure that instructs users to paste a base64 command into Terminal. The execution chain consists of three components:

1. A shell stager that retrieves and launches the payload before deleting itself.
2. The core Mach-O Rust binary, which targets Keychain records, browser data, Apple Notes, and Telegram sessions.
3. A `stream_module` downloaded on demand to grant operators remote browser control.

The first stage is delivered in a password-protected ZIP archive to evade perimeter scanners. The extracted Mach-O binary contains an encrypted configuration storing the C2 URL (`debug.allllowef.space/send/`) and a `CLIPPER_ENABLED` flag for cryptocurrency wallet addresses, covering Bitcoin, Ethereum, Monero, Solana, TRON, and others.

## Password verification loop

Rather than accepting whatever string is typed into a dialog once, AmnesiaStealer confirms the password with the operating system:

```applescript
repeat
  set pwd to display dialog "Installer requires your password" default answer "" with hidden answer
  set pwdText to text returned of pwd
  do shell script "/usr/bin/dscl . -authcheck " & quoted form of (system attribute "USER") & " " & quoted form of pwdText
  if exit_code == 0 then
    exit repeat
  else
    display dialog "Incorrect password. Please try again"
  end if
end repeat
```

Once confirmed, the password is piped into `sudo -S` for privileged reads, passed to `security unlock-keychain -p` to decrypt the login keychain, and written to disk in plaintext at `~/.pwd` and in a temporary staging directory. A fallback script at `/tmp/tempAppleScript.scpt` handles the prompt if the native dialog fails. This same `dscl` verification loop has also been observed in ClickLock Stealer.

## Target data and capabilities

With Keychain access established, the stealer targets several local data stores:

- Data from 16 Chromium-based browsers, including Chrome, Brave, Arc, and Edge (Cookies, Login Data, Web Data, History, and Extensions).
- Chrome's Safe Storage key to decrypt profile master keys.
- Safari cookies, abusing CVE-2020-9771 on older macOS versions.
- Apple Notes, Telegram session files, and documents matching extensions like `.txt`, `.pdf`, `.wallet`, and `.key` across Desktop, Documents, and Downloads.
- An AppleScript command to mute system audio during installation.
- Persistence via a root LaunchDaemon masquerading as Apple's crash reporter.
- Data staging in randomized `/tmp/` subdirectories before archive exfiltration.

The stealer also supports a `remote_stream` directive that launches a secondary Rust binary. This tool interacts directly with Chromium browsers using the Chrome DevTools Protocol (CDP) over a WebSocket connection, giving the operator headless control over active authenticated sessions and extensions.

## Detection and response

Several reliable host-based indicators exist for detection:

- The cleartext password file written to `~/.pwd`.
- The fallback AppleScript file at `/tmp/tempAppleScript.scpt`.
- Unregistered LaunchDaemons mimicking Apple crash reporter binaries.
- Execution of `dscl . -authcheck` initiated by unsigned binaries or processes outside standard MDM agents.
- Unexpected processes reading from `~/Library/Keychains/` followed by outbound network traffic to newly registered domains.
