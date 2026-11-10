#!/usr/bin/env node
// PreToolUse hook for the read-only subagents (.claude/agents/*.md).
//
// Usage (in agent frontmatter): node "$CLAUDE_PROJECT_DIR/.claude/hooks/readonly-bash.mjs" <profile>
//
// Reads the hook payload as JSON on stdin and allows the Bash call only if its command is on the
// profile's allowlist. Anything else (unknown command, shell chaining, redirection, bad input)
// exits 2, which blocks the call and shows the stderr message to the agent. Fails closed.

const GIT_SUBCOMMANDS = {
  reviewer: ['status', 'diff', 'log'],
  'migration-guard': ['status', 'diff', 'log', 'show', 'ls-tree'],
};

const NPM_COMMANDS = {
  reviewer: [
    'npm run lint',
    'npm run typecheck',
    'npm run format:check',
    'npm test',
    'npm run test',
    'npm run test:e2e',
  ],
  'migration-guard': ['npm run migration:show -w backend'],
};

// Shell features that could chain, redirect, substitute or background a second command.
const SHELL_METACHARS = /[;&|<>`$\n\r]/;

// git flags that write files or run arbitrary programs.
const UNSAFE_GIT_ARGS =
  /^(--output(=|$)|--ext-diff$|--textconv$|-c$|--exec-path|--upload-pack|--config)/;

function block(reason) {
  process.stderr.write(
    `Blocked by read-only hook: ${reason}\n` +
      'Run one allowlisted command per Bash call, from the repo root (no cd, pipes, chaining or redirection).\n',
  );
  process.exit(2);
}

/** Splits on whitespace, honouring simple single and double quotes (no escapes). */
function tokenize(command) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function isAllowed(profile, command) {
  const tokens = tokenize(command);
  const normalized = tokens.join(' ');

  if (normalized === 'git fetch origin main') return true;

  if (tokens[0] === 'git') {
    const [, sub, ...args] = tokens;
    if (!GIT_SUBCOMMANDS[profile].includes(sub)) return false;
    return !args.some((arg) => UNSAFE_GIT_ARGS.test(arg));
  }

  return NPM_COMMANDS[profile].includes(normalized);
}

async function main() {
  const profile = process.argv[2];
  if (!profile || !(profile in GIT_SUBCOMMANDS)) block(`unknown profile "${profile}"`);

  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let command;
  try {
    command = JSON.parse(input)?.tool_input?.command;
  } catch {
    block('could not parse hook input');
  }
  if (typeof command !== 'string' || command.trim() === '') block('no command given');

  if (SHELL_METACHARS.test(command)) block(`shell operators are not allowed: ${command}`);
  if (!isAllowed(profile, command.trim())) block(`not on the ${profile} allowlist: ${command}`);

  process.exit(0);
}

await main();
