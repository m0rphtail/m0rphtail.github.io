+++
title = "NullReceiver: Hiding a C2 IP in a Fake Ethereum Address"
date = "2026-08-05"
+++

Earlier blockchain C2 techniques, commonly grouped under EtherHiding, stored payload strings inside smart contracts on public ledgers. While this prevented defenders from seizing or taking down the hosting infrastructure, monitoring teams could still track the fixed contract address. A newer variant codenamed NullReceiver avoids fixed contract endpoints by embedding the C2 IP directly inside the recipient address bytes of standard Ethereum transfers.

## Address decoding mechanism

An Ethereum transfer requires a 20-byte destination address. The network does not validate whether a destination address corresponds to an active account or private key. NullReceiver takes advantage of this property:

```text
1. Query transaction history for a monitored attacker wallet:
   0xa322e5f3d311d3080e6f0121063e9adc2490ef1a
2. Identify the most recent outbound transaction
3. Inspect the destination ("To") address
4. Convert the first 4 bytes from hex to decimal:
   0xa6 0x58 0x86 0x3e -> 166.88.134.62
5. Initiate outbound connection to that IP address
```

The transfer does not invoke a contract or attach arbitrary calldata. In one observed sample, the address `0xa658863ea658863e68656c6c6f6970626f742121` encoded `166.88.134.62` in its first four bytes, while the remaining bytes (`68656c6c6f6970626f742121`) decoded to ASCII `"helloipbot!!"`.

Because the attacker can send dust transfers to a new generated recipient address whenever they rotate C2 hosts, there is no static destination contract for defenders to monitor. By the time the packages were reported, the wallet had completed 68 outbound transactions.

## Distribution via npm packages

The loader was distributed through two npm packages, `bianira-ui` (published by "npmuser1101") and `fluid-type-ui` (published by "npmuser3002"). Both packages performed public Ethereum RPC lookups at runtime to retrieve transaction logs for the monitored wallet and decode the destination IP.

## Operational trade-offs

NullReceiver trades data capacity for evasion. While classic EtherHiding contracts can store entire scripts or second-stage URLs, encoding the IP in the recipient address limits payload capacity to four bytes per transaction. The operators use the decoded IPv4 address solely as a redirector to stage subsequent downloads.

Security teams have linked this campaign to DPRK-affiliated clusters known for running the "Contagious Interview" campaign, where attackers approach developers on professional platforms with fake technical assessments designed to deliver malware.

## Detection opportunities

Because blockchain infrastructure cannot be sinkholed, detection must focus on endpoint behavior and dependency governance:

Inspect package network dependencies. Web front-end or UI libraries have no standard reason to query Ethereum JSON-RPC endpoints. Egress monitoring that flags unexpected JSON-RPC queries from developer machines provides clear signal.

Scrutinize coding assessment projects. Projects requesting developers to install obscure packages with low download counts or unverified maintainers should be audited or executed within isolated, disposable environments.
