+++
title = "Windows Hello Without the PIN: Abusing the Session You're Already In"
date = "2026-08-07"
+++

# Windows Hello Without the PIN: Abusing the Session You're Already In

Dirk-jan Mollema published new Entra ID research in August that changes where I'd draw the line on endpoint compromise. Malware inside a signed-in session can make the victim's Windows Hello for Business key sign authentication data and walk away with a Primary Refresh Token. No key extraction, no PIN capture, no biometric prompt. The private key never leaves the TPM, exactly as the marketing says, and the attacker authenticates as the user anyway.

## The mechanics

Windows Hello keeps private-key operations available while the user is interactively signed in. That's how the feature works: the PIN and biometrics gate the user, but after sign-in, code running as the user can ask Windows to perform the signing. Mollema's DEF CON 32 work in 2024 could already produce a signed PRT assertion, but it needed access to an Entra-registered device.

The new technique removes that by treating the WHfB key as a FIDO2 passkey through WebAuthn. The load-bearing discovery: the five-minute Entra ID challenge isn't bound to a session, user, or tenant. So the flow becomes:

```text
1. obtain code execution in victim's signed-in session (no admin needed)
2. attacker host: request a WebAuthn challenge from Entra ID (any tenant)
3. compromised endpoint: WHfB key signs the challenge as if the user logged in
4. exchange the signed assertion for tokens / browser session via ROADtools
5. the token carries NO device ID claim →
6. register a NEW device → request a PRT for it → 90 days, auto-renewed
7. where policy allows: add new passkeys/WHfB keys to the attacker's device
```

Step 5 is the whole ballgame. No device binding means the assertion from a machine the tenant never saw is accepted as genuine. The WebAuthn sign-in also satisfies Conditional Access policies requiring phishing-resistant authentication strength, and counts as fresh MFA, which unlocks adding further credentials on the attacker's registered device.

The caveats are real, and Mollema states them: it needs user-session code execution, separate device-state or compliance policies can break the persistence chain, no in-the-wild exploitation is reported, and Microsoft has issued no CVE or advisory. This is documented behavior, left as-is.

## The artifacts

He shipped PowerShell PoCs in the ROADtools repo (`fido_assertion.ps1`, `hellopoc.ps1`) and gave the detection guidance you'd expect: hunt for Windows Hello for Business sign-ins with an empty device ID. He's honest about the false-positive rate too; legitimate incognito or non-SSO browser sessions produce the same pattern. That makes it a hunt, not a rule, and it belongs in your identity team's quarterly queries, not your alert pipeline.

## Why this lands hard for me

I've spent years treating "phishing-resistant" as the top of the auth pyramid. This research redraws the boundary, and the redraw is simple: phishing-resistant authentication protects the login prompt. It does nothing about a session that's already open. Once attacker code runs as the user, the honest model is that the attacker *has* the user's authentication capabilities, hardware-bound or not. The TPM stops copying, not invocation.

That's not a reason to abandon WHfB. It's still the right default over passwords and OTP. But the identity teams who treat "we enabled passkeys" as the end of the auth roadmap are missing the second half: monitor what those credentials *do*. Unexpected device registrations in Entra audit logs are the tell here, and they're cheap to watch. Registrations from new geos, odd hours, or accounts that never register devices.

The most disquieting part is how mundane the root cause is. Entra's own docs describe the ticketing behavior. Nothing was bypassed. The challenge simply doesn't bind to anything, which presumably made implementation easier at some point in 2019. Mollema describes it as "left as-is." The gap between "Microsoft documents this" and "your SOC watches for it" is where this technique lives.