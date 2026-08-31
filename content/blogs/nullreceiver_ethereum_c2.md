+++
title = "NullReceiver: A C2 Address Hidden in a made-up Ethereum Address"
date = "2026-08-05"
+++

# NullReceiver: A C2 Address Hidden in a made-up Ethereum Address

EtherHiding was already a good trick: put your C2 payload inside a smart contract on a public blockchain and the takedown playbook dies, because nobody can delete a blockchain. North Korean groups adopted it for Contagious Interview, their long-running fake-recruiter campaign, and defenders adapted by tracking the fixed destination contract addresses the technique required. OpenSourceMalware's Paul McCarty documented the next iteration in August, codenamed NullReceiver, which deletes the fixed address. The C2 IP now hides inside the bytes of a made-up recipient address on an ordinary-looking transfer.

## The mechanic

A zero-value, zero-data Ethereum transfer has a recipient address that must be 20 bytes. Nobody checks that the address is real. You can't. The malware does this:

```text
1. look up a hard-coded attacker wallet:
   0xa322e5f3d311d3080e6f0121063e9adc2490ef1a
2. find its most recent outbound transaction
3. read that transaction's destination ("To") address
4. take the first 4 bytes, hex → decimal:
   0xa6 0x58 0x86 0x3e  →  166.88.134.62
5. connect to that IP
```

No smart contract call. No calldata. The transaction looks like a wallet moving dust to another wallet, which is what wallets do all day, because they do. The address `0xa658863ea658863e68656c6c6f6970626f742121` that carried `166.88.134.62` decodes further: trailing bytes `68656c6c6f6970626f742121` spell ASCII "helloipbot!!". Whoever built this left a signature joke inside the fake address. The bot waves back.

Every lookup reads a brand-new throwaway destination, so there's no fixed, watchable endpoint. That's the delta against classic EtherHiding, where defenders could watch the known payload-carrying contract for new transactions. NullReceiver never reuses a destination. Sixty-eight transactions had run since July 27, 2026, the day before the two npm packages went live.

## The delivery

Two npm packages, `bianira-ui` (109 downloads, "npmuser1101") and `fluid-type-ui` (587, "npmuser3002"), published July 28, 2026, pulled from npm but still counted in the stats. They embed the wallet lookup and connect to the decoded IP. They don't call any contract and don't touch calldata. The JavaScript library that quietly does an ETH RPC query at runtime is the detection anchor, not the chain.

## Trade-offs worth naming

NullReceiver buys stealth by shrinking capacity. EtherHiding smuggles a full URL or script in contract storage; NullReceiver encodes four bytes per transaction. Four bytes is an IPv4 address and nothing else. The operators accepted that limit, presumably because the IP is all they need to hand off to a redirector they rotate cheaply. Each transaction costs gas, but tiny value transfers are cheap, cheaper than the earlier approach, per McCarty.

The attribution chain is the usual one: Guardio Labs documented EtherHiding in October 2023; GTIG tied its use by DPRK groups to Contagious Interview, the campaign that approaches security and crypto people on LinkedIn with job offers and "assessment" coding tasks that deploy malware. The victims of this delivery mechanism are exactly the people reading this blog post, which is why I bother writing it.

## What I take from it

Blockchain-backed C2 removes "seize the server" from the playbook permanently. What's left is at the endpoint: why is a UI package resolving ENS or hitting Ethereum RPC? That's a behavior question, and it's answerable with dependency review and egress monitoring rather than indicators, because the infrastructure is infinite and fresh.

And the recruitment-lure angle stays the one that matters. If a "hiring assessment" asks you to run a codebase, and the dependencies include packages with two-digit download counts and wallet lookups in the bundle, that's not a coding test, it's the operation. The fake address on the blockchain says "helloipbot!!" to whoever decodes it. Don't be the person who runs it just to see.