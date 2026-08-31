+++
title = "WindRelay: The Phone Call That Turns Your Card Into Someone Else's Card"
date = "2026-08-13"
+++

# WindRelay: The Phone Call That Turns Your Card Into Someone Else's Card

Group-IB documented a new Android malware family, WindRelay, in August, and the architecture is so clean it reads like a product spec. One component installs on the victim's phone and reads their physical card over NFC. Another installs on the fraudster's phone and emulates the card at a payment terminal. A WebSocket relay stitches them together in real time, ferrying EMV APDU commands and responses between a terminal somewhere and the card in the victim's pocket. The victim taps their own card against their own phone to "verify their identity," and somewhere across town (or across a border), a fraudster emulates that card at a checkout.

## The chain

The intrusion path is social engineering all the way down. A vishing call, backed by SpyNote, the commodity Android RAT, gives the fraudster remote access through Accessibility Services. Group-IB's researchers note the NFC app gets sideloaded and activated silently, with no screen sharing triggered, which keeps the victim unaware the whole time.

The delivery is personalized: the APK is named for the victim. That means pre-call recon, name and number harvested first, to make the pretext land. Then comes the ask, dressed as identity verification, a PIN change, or "confirming" the card after a fictional account compromise. The victim physically taps their card against the infected phone. That tap is the entire heist.

From there:

```text
victim phone (reader)                fraudster phone (emulator)
  NFC field → read card APDUs  ──C2/WebSocket──►  receive APDUs
  relay terminal commands      ◄──────────────►   emulate card at POS
  ~ real-time EMV session, end to end ~
```

It's Ghost Tap's architecture with fresh packaging. The advantage is unchanged from ESET's writeup of the technique last year: the person at the terminal never owns the card, the transaction looks card-present, and the fraud scales. ESET's line about "farms of Android phones loaded with compromised card data making automated fraudulent transactions" was a warning last year. Group-IB's 23 WindRelay samples on VirusTotal between November 2025 and July 2026, impersonating banks in Czechia, Slovakia, and Slovenia, say the farm is running.

## The dual monetization

What makes this campaign evolution rather than repetition is the pairing. Group-IB's phrasing: RAT-driven remote access takes out a digital loan, while the NFC malware enables physical, card-present purchases. Same session, two payout channels, before the bank or the victim reacts. Their summary holds: "modern fraud rarely relies on one technique." One phone call, a personalized RAT, an NFC relay, and a digital loan plus a shopping trip, all before lunch.

The spread map, Czech Republic into Brazil, Poland, and Slovakia over the past year, tells you this isn't one crew anymore. NFC relay is becoming a product category.

## My read

The technical chain deserves the writeups it's getting. But the security control that actually stops this is one sentence: no bank will ever ask you to tap your card against your phone. Not to verify identity, not to change a PIN, not ever. Every fraud team in Europe is about to relearn how hard one sentence is to deliver at scale.

For the fraud side, the hunt is in the device telemetry: Accessibility Service grants immediately preceding new package installs, WebSocket flows from mobile devices to non-bank infrastructure, SpyNote's indicators, and banks should be correlating "customer called about account compromise" followed within a day by card-present activity in a place the customer isn't. The EMV protocol was never built for a relay with better latency than the card holder's commute. Nobody designing payment rails asked "what if the card and the terminal are on different continents, connected by a chat app," and the answer is now 23 samples and counting.