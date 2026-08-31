+++
title = "WindRelay: Turning a Victim's Phone Into a Payment Card Proxy"
date = "2026-09-23"
+++

# WindRelay: Turning a Victim's Phone Into a Payment Card Proxy

Group-IB documented a new Android malware family called WindRelay that does something I have not seen done this cleanly: it turns the victim's phone into a live bridge for contactless payment fraud. The victim taps their physical payment card against their own infected phone, and the card data streams in real time to a fraudster's device somewhere else, which then emulates the card at a payment terminal.

## The Two Components

WindRelay is built as a pair. A reader component installs on the victim's device and interfaces with the physical payment card via NFC. An emulator component installs on the threat actor's device and emulates the card at a payment terminal. The two components communicate through shared C2 infrastructure over WebSocket, relaying EMV APDU commands and responses between the terminal and the victim's card in real time.

The architecture is the same as Ghost Tap, the technique that lets cybercriminals stay anonymous and perform cashouts at scale. Capturing NFC data from a banking card is one thing. Relaying it live through a WebSocket to an emulator at a terminal is another, and it is the relay that makes the fraud work without the attacker ever touching the physical card.

## The Infection Chain

WindRelay is deployed in conjunction with SpyNote, a known Android RAT. The attack starts with phishing, smishing, or vishing, luring the target into sideloading a malicious app. Once installed, SpyNote's Accessibility Service access lets the fraudster sideload and activate the NFC app silently, with no screen sharing ever triggered.

The delivery is personalized. The APK distributed during the phone call is tailored with the victim's name, which points to a pre-call reconnaissance phase where the attacker harvests the victim's name and phone number to make the social engineering more persuasive.

Then comes the social engineering payoff: the victim is convinced to tap their physical payment card against their own infected phone, under the pretext of identity verification, changing their PIN, or verifying their banking card after a purported account compromise. The victim's device becomes a payment proxy without their awareness.

## The Scale

NFC relay malware targeting Android has proliferated, expanding beyond the Czech Republic to Brazil, Poland, and Slovakia over the past year. WindRelay was first detected in the wild in late August 2025.

The primary advantage of the technique is anonymity. The fraudster never touches the card, never appears at the terminal, and the cashout can happen at scale. The victim's card is the one being read, but the transaction happens somewhere else entirely.

## The Blue Team Read

For fraud and security teams, the signals are:

- Android devices with NFC enabled that suddenly have new accessibility services
- SpyNote or similar RAT indicators on mobile devices
- WebSocket connections from mobile devices to unknown C2 infrastructure
- Users reporting calls about "account compromise" that ask them to verify their card by tapping it

The human element is the hardest part to defend. The technical chain, RAT plus NFC relay plus WebSocket, is sophisticated, but the entry point is a phone call that sounds plausible. The victim is not being hacked, they are being talked into tapping their own card on their own phone.

The lesson for anyone reading this: no legitimate bank will ever ask you to tap your card against your phone to verify your identity. That request, from anyone, is the attack. The technology behind it is impressive. The defense is a single sentence of user education.