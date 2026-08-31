+++
title = "Windows Hello for Business as an Attacker Tool: The PRT Problem"
date = "2026-09-18"
+++

# Windows Hello for Business as an Attacker Tool: The PRT Problem

Entra ID researcher Dirk-jan Mollema demonstrated something that should make every identity team uncomfortable: malware already running in a signed-in Windows session can silently use the victim's Windows Hello for Business key to authenticate to Microsoft Entra ID. No PIN extraction, no biometric prompt, no private key theft. The attacker gets a Primary Refresh Token, registers a device it controls, and can add further authentication methods where tenant policies allow.

## How It Works

The key insight is how Windows Hello for Business actually operates. On TPM-backed systems, the private key never leaves the TPM. But Windows ticketing keeps private-key operations available while the user is interactively signed in. Code running as the user can ask Windows to sign authentication data. That is by design, and it is the whole problem.

Mollema's earlier work, presented at DEF CON 32 in 2024, could produce a signed assertion for a PRT but required access to an Entra-registered or joined device. The new work removes that requirement by treating the Windows Hello for Business key as a FIDO2 passkey through WebAuthn.

The critical finding: the five-minute Entra ID challenge is not bound to a session, user, or tenant. An attacker can request the challenge on another host and have the compromised endpoint produce the signed assertion. ROADtools, the open-source framework Mollema maintains, can use the assertion to request tokens or open a browser session as the victim.

The token carries no device ID claim. Without device binding, the attacker can register a new device, request a PRT for it, and reach Microsoft cloud services. A PRT remains valid for 90 days and is continuously renewed while the device is actively used.

## Why This Breaks the Phishing-Resistant Promise

The finding exposes a limit of phishing-resistant authentication. The credential can remain hardware-bound and unexported, exactly what the marketing promises, while malware inside the signed-in endpoint session invokes it for the attacker. The hardware does not help when the attacker is already running as the user.

The WebAuthn sign-in can satisfy Conditional Access policies requiring Microsoft's phishing-resistant authentication strength. It also counts as fresh multi-factor authentication, which means the attacker can add passkeys or Windows Hello for Business keys on the new device where policies allow.

The caveats matter. Administrator privileges are not required, but the technique does require code execution in the victim's signed-in session. Separate device-state or compliance policies can interrupt the chain, so the complete persistence route will not work in every deployment. The disclosure does not report active exploitation or victims, and Microsoft has not issued a CVE or advisory for the behavior.

## The Blue Team Read

Mollema describes the behavior as a consequence of how Windows Hello for Business works, left as-is. That means the fix is not a patch, it is monitoring and policy.

The primary detection signal is unexpected device registrations. An attacker who registers a new device and requests a PRT leaves an Entra ID audit trail. Device registration events from accounts that do not normally register devices, or registrations that appear outside normal business hours, are the hunt.

The deeper lesson is about what phishing-resistant authentication actually protects. It stops credential theft at the login prompt. It does not stop a compromised session from using the credentials that are already there. The distinction between "the attacker cannot steal the key" and "the attacker cannot use the key" is the entire gap this technique exploits.

For identity teams, the practical response is to treat Windows Hello for Business as a powerful session credential, not a silver bullet. Monitor device registrations, enforce device compliance policies that can interrupt the chain, and assume that code execution in a signed-in session is equivalent to holding the user's authentication capabilities, because it is.