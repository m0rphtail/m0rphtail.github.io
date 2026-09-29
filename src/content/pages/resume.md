---
title: "Resume"
description: "Incident response and SOC analyst with 4-5 years across security operations, threat detection, and penetration testing."
---

## Contents

- [Summary](#summary)
- [Skills](#skills)
- [Work Experience](#work-experience)
- [Projects](#projects)
- [Education](#education)
- [Certifications](#certifications)
- [Awards & Honors](#awards--honors)

## Summary

Incident response and SOC analyst with 4-5 years across security operations, threat detection, and penetration testing. Most recently at TD Bank, a top-10 North American bank: triaged 20-25 alerts daily across Microsoft Sentinel, Splunk, Defender, and CrowdStrike, correlating endpoint, network, identity, DLP, and UEBA telemetry, and cut false positives **30%** by tuning SIEM detections and EDR policies. Before that, built custom detections from threat feeds at FileHive and spent two years in offensive security finding **200+** vulnerabilities.

---

## Skills

- **Languages & Scripting:** Python, Bash, PowerShell, SQL, Go, C, C++, Rust
- **Security Operations:** SOC, Incident Response, Log Analysis, IOC Analysis, Phishing Analysis, Vulnerability Management, Network Security, DLP, UEBA
- **SIEM & Detection:** Splunk, Microsoft Sentinel, Sigma, KQL, YARA, Detection-as-Code
- **EDR & SOAR:** CrowdStrike Falcon, Microsoft Defender, SentinelOne, XDR, MDR, XSOAR, SOAR, Threat Hunting
- **Cloud & Identity:** AWS, GCP, Azure, Kubernetes, Docker, Active Directory, Entra ID, Okta, IAM, Cloud Security, Zero Trust
- **Threat Intelligence & Frameworks:** MITRE ATT&CK, Cyber Kill Chain, Diamond Model, NIST CSF, ISO 27001, OWASP Top 10, TTP Analysis, CTI, VirusTotal
- **AI Security:** MITRE ATLAS, NIST AI RMF, OWASP Top 10 for LLM Applications, OWASP MCP Top 10, AI Kill Chain
- **DFIR & Malware Analysis:** Digital Forensics, Memory Forensics, Volatility, Velociraptor, Malware Analysis, Reverse Engineering, YARA
- **Analysis & Offensive Tools:** Ghidra, IDA, Frida, JADX, Burp Suite, Metasploit, Nessus, Wireshark
- **Automation & Infrastructure:** Terraform, Ansible, GitHub Actions, CI/CD, Git, GitHub, Linux, Windows, ServiceNow

---

## Work Experience

### Information Security Analyst — TD Bank <span style="float:right">12/2024 – 05/2026</span>

- Triaged 20-25 alerts daily across Microsoft Sentinel, Splunk, Defender, and CrowdStrike, correlating endpoint, network, identity, DLP, and UEBA telemetry to identify true positives, contain threats, and drive root-cause analysis inside a top-10 North American bank.
- Tuned SIEM detections and EDR policies to cut false positives by **30%** and improve MTTD/MTTR, with SOAR (XSOAR) playbooks automating alert enrichment and containment.
- Standardized incident handling across the SOC with automated XSOAR IR playbooks.
- Conducted phishing triage via PhishLabs, analyzing headers, URLs, and attachments to disposition suspected malicious email.
- Enriched IOCs (domains, IPs, hashes, paths) and mapped activity to MITRE ATT&CK, feeding vetted indicators into threat intel and detection pipelines.
- Developed Splunk dashboards that let L1/L2 analysts work alert queues faster.
- Wrote Python and Bash automation for IOC handling and recurring triage workflows.

### Threat Detection Analyst — FileHive.io <span style="float:right">05/2023 – 08/2023</span>

- Built custom detection rules from threat feed sources as detection-as-code with Git and GitHub Actions, so every rule had a version history and a repeatable deploy path.
- Collected live adversary telemetry from T-Pot and RDP honeypots, and validated detections by replaying Atomic Red Team's mapped, pre-deployed attack tests.
- Provisioned the detection environment with Terraform and Ansible so the full ELK detection pipeline could be rebuilt identically on demand.

### Penetration Tester — Newton's Apple Security Solutions <span style="float:right">02/2020 – 08/2022</span>

- Identified and resolved **200+** vulnerabilities across micro-services, web applications, and IoT devices for multinational clients. That hands-on knowledge of how attacks chain now informs detection and response work.
- Executed penetration tests on critical infrastructure for multinational corporations across diverse technologies.
- Built automated tooling that saved **500 hours** annually and cut operational effort by **30%**.

---

## Projects

### triagedy — Jev-Powered Alert Triage

- Rust CLI that turns JSONL security alerts into typed, calibrated decision records via TypeSafe's Jev (System One) decision API. **Under 100ms per alert** (64 alerts in 6 seconds)
- Benchmarked at **8/8 exact dispositions** on a labeled corpus. On 1,185 real Sysmon events from an attack capture, it ranked the single genuine attack **#1 of 64** by severity and closed all 63 benign alerts
- Ingests Elastic ECS, CrowdStrike FDR, and Sysmon XML natively. Output order always matches input order, one bad record never kills the batch, and routing stays deterministic in unit-tested code

### Agentic Memory Forensics Tool

- LLM-orchestrated memory forensics agent: sequences Volatility 3 plugins (pslist, malfind, netscan, dlllist) from dump artifacts
- Correlates output into ATT&CK-mapped findings (injected code, beaconing, persistence), emitting analyst-reviewable reports with confidence levels
- Runs locally via Ollama on a Raspberry Pi 5; evaluated against known-malicious dumps for ground-truth accuracy and false positives

### STIX/TAXII Threat-Intel Pipeline

- Self-hosted MISP and OpenCTI wired as TAXII 2.1 clients, pulling structured STIX 2.1 intel from abuse.ch, AlienVault OTX, and CISA on a schedule
- Indicators pass a quality gate before anything moves: deduplication, confidence scoring, and indicator-type filtering weed out noise feeds
- High-confidence indicators flow straight into SIEM detection rules automatically, so fresh intel reaches detections without an analyst retyping IOCs

### Poseidon — Automated Subdomain Recon Tool

- Custom automated subdomain recon tool, tested against **50,000+** subdomains
- Enumerates subdomains and identifies open ports; reconnaissance-phase time dropped **50%** in penetration testing
- Asset-identification efficiency rose **40%**

### Android Malware Analysis Framework

- Static analysis framework for Android samples: automated WebView and FileProvider exposure checks
- Permission and component auditing (broadcast receivers, services)
- Signature generation for common malware patterns and intent-based attacks

### Firmware Dumping — UART Extraction

- Extracted live firmware from 10+ consumer devices (routers and similar) over the UART interface
- Reverse-engineered extracted images with real-time system analysis
- Found **6** critical firmware vulnerabilities and potential exploits, cutting potential exploit risk by **30%**

---

## Education

### Master of Science, Cybersecurity — Stevens Institute of Technology <span style="float:right">09/2022 – 05/2024</span>

### Bachelor of Engineering, Information Technology — Pune University <span style="float:right">08/2018 – 06/2022</span>

---

## Certifications

- CompTIA Security+ <span style="float:right">**07/2024**</span>
- Fortinet Certified Associate in Cybersecurity <span style="float:right">**06/2024**</span>
- Google Cybersecurity <span style="float:right">**09/2023**</span>
- IBM Cybersecurity Analyst <span style="float:right">**06/2023**</span>

---

## Awards & Honors

- Top global ranking on **CTFTime** <span style="float:right">**2020 - 2022**</span>
- Runner up prize, **Cytaka New York CTF** <span style="float:right">**2022**</span>
- Top 14.8% solo rank, **DownUnderCTF** <span style="float:right">**2021**</span>
- Top 11.6% rank, **H@ctivityCon CTF** <span style="float:right">**2021**</span>
- Volunteer, **BSides NYC** <span style="float:right">**2023, 2024, 2025**</span>
