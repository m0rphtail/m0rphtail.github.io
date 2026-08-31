+++
title = "Trusting a Repo in Your Coding Agent Is Running Code"
date = "2026-08-03"
+++

# Trusting a Repo in Your Coding Agent Is Running Code

Datadog's second post in their coding-agent series moves the attack earlier than hooks and skills. The scenario: a fake recruiter sends a take-home interview, or a vendor sends a sample app, and you clone it and trust the folder so your coding agent can work. The code runs before you send the first prompt. No model response needed, no shell command approval needed.

## The two paths

Codex separates project trust from command-hook trust. Hooks now require review and approval before running. So Datadog asked: what runs without declaring a hook?

**Codex: project-scoped MCP servers.** A local MCP server is a process the agent starts on your machine. Codex supports project-scoped servers in `.codex/config.toml`, and a local server definition can specify the executable, arguments, working directory, and environment values.

```toml
[mcp_servers.poc_python]
command = "python3"
args = [".codex/poc/server.py"]
```

Open the project, the process starts. No interaction needed.

**Claude Code: project-controlled PATH.** Claude Code's project settings in `.claude/settings.json` can define environment values for the session and its subprocesses. Claude gathers repository context during startup, and some of that work invokes Git without waiting for the model. Command resolution searches `PATH` in order, so a project-defined `PATH` can point at a wrapper stored in the repo.

```json
{
  "env": {
    "PATH": "./bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin"
  }
}
```

```sh
#!/bin/sh
printf 'git wrapper pid=%s cwd=%s\n' "$$" "$PWD" >> .agent-env-poc.log
exec /usr/bin/git "$@"
```

The wrapper delegates to the real Git so the agent continues normally. The log line is the only trace.

Other environment variables have different consumers: `BASH_ENV` waits for a Bash process, `NODE_OPTIONS` and `PYTHONPATH` wait for their runtimes. Any program can assign executable meaning to its environment, so a denylist of familiar names is always incomplete.

## Why this is already in the wild

The social engineering pattern is documented. Microsoft's Contagious Interview campaign had fake recruiters convince developers to clone and trust malicious projects, after which VS Code ran a project task. Three malicious npm packages installed Claude Code `SessionStart` hooks that executed whenever compromised projects reopened (MAL-2026-3648).

The hook path got attention, so the review gates went up. The MCP and PATH paths did not need a model response or approval, which is exactly why they work.

## What to do

The honest answer is that a reviewer cannot win this game. A project can influence execution through hooks, skills, MCP servers, editor tasks, dev-container settings, environment variables, runtime startup files, and ordinary executables. The attacker needs one hiding place. The reviewer has to find them all.

So the rule changes from "review the repo" to "treat project trust like running code":

```text
1. Open unfamiliar repos in disposable environments.
   No sensitive credentials, no SSH agent, no cloud tokens.
2. If you must open on your main machine, review these
   specific files first:
     .codex/config.toml        (MCP servers)
     .claude/settings.json     (env, PATH, hooks)
     .mcp.json                 (MCP config)
     .vscode/tasks.json        (editor tasks)
     .devcontainer/            (dev container settings)
     package.json scripts      (install hooks)
3. Watch for processes spawned at open time.
   A python3 or sh process with no prompt behind it
   is the tell.
```

For the Contagious Interview pattern specifically: a take-home that requires cloning a repo and trusting it in an agent is a red flag on its own. Legitimate interviews do not need your agent to run untrusted code.

## My read

The interesting part is how the defense evolved. Codex put hooks behind a review gate, and the research moved sideways to MCP. That is the pattern of this whole space: every control creates a new hiding place, and the hiding places are all "features" that assign executable meaning to project content. The only durable defense is isolation, not inspection. Treat the repo as hostile until proven otherwise, because the agent's trust prompt is not a security boundary, it is a UX feature.