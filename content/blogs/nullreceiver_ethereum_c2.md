+++
title = "NullReceiver: Hiding a C2 IP Inside an Empty Ethereum Transfer"
date = "2026-09-21"
+++

# NullReceiver: Hiding a C2 IP Inside an Empty Ethereum Transfer

EtherHiding was already clever. Embed malicious code in a smart contract on a public blockchain, and your C2 infrastructure becomes takedown-proof, because nobody can delete a blockchain. North Korean groups adopted it, and defenders learned to watch the fixed destination addresses the technique requires. The new variant, documented by OpenSourceMalware and linked to North Korea, removes even that anchor.

## The Technique

NullReceiver encodes the C2 IP address directly in the bytes of the recipient address of a zero-value, zero-data Ethereum transfer. No smart contract, no payload field, no calldata. The malware looks up the attacker's wallet, reads the destination address of its most recent outbound transaction, and decodes a C2 IP straight from those address bytes.

The name comes from the design: the destination address does not exist. It is a made-up address that exists only to carry the encoded IP. That is the improvement over EtherHiding, which requires a fixed, publicly known destination address that defenders can track as new transactions occur. NullReceiver has no fixed, watchable destination, because every transfer can use a different made-up address.

The technique was observed in two trojanized npm packages, `bianira-ui` and `fluid-type-ui`, published July 28, 2026. They are no longer available from npm, but statistics show a few hundred downloads: 109 for `bianira-ui` from an account named `npmuser1101`, 587 for `fluid-type-ui` from `npmuser3002`.

## The Attribution Thread

EtherHiding was first publicly documented by Guardio Labs in October 2023, described as the "next level of bulletproof hosting." Google Threat Intelligence Group linked its use by North Korean groups to Contagious Interview, the long-running campaign that approaches targets on LinkedIn with fake job opportunities and assessment tasks that lead to malware deployment.

The NullReceiver evolution fits the pattern: the actors keep refining the technique to make defender tracking harder. The fixed destination address was the weak point, so they removed it.

## Why This Is Hard to Defend

Blockchain-based C2 breaks the standard takedown playbook. You cannot sinkhole a smart contract, you cannot seize a wallet, and you cannot block a blockchain. The best you can do is track the wallets and watch for the pattern.

NullReceiver makes even that harder. The wallet lookup is the only constant, and wallets are cheap to rotate. The C2 IP itself is hidden in a transaction that looks like nothing, a zero-value transfer to a random address, which is exactly what a normal wallet does all day.

For detection, the signal is not the blockchain, it is the malware that reads it. The huntable behavior is the npm package that queries Ethereum RPC services or reads wallet transactions at runtime. That is not normal behavior for a UI library, and it is the kind of thing that stands out once you know to look.

## The CTI Read

The North Korea attribution matters for threat modeling. Contagious Interview targets people in the security and crypto industries with job lures. The assessment tasks are real-looking coding challenges that end in malware. The NullReceiver packages are the delivery mechanism for that campaign's next phase.

For anyone in security or crypto who gets approached with a job assessment, the operational advice is unchanged and worth repeating: verify the company, verify the recruiter, and never run code from an assessment on a machine that matters. The people building these campaigns are now using blockchain dead drops to make their infrastructure impossible to take down. The defense has to happen before the code runs, because after it runs, the C2 will still be there.