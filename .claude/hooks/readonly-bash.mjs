#!/usr/bin/env node
// PreToolUse hook for the read-only subagents (.claude/agents/*.md).
//
// Usage (in agent frontmatter):
//   node "$CLAUDE_PROJECT_DIR/.claude/hooks/readonly-bash.mjs" <profile> || exit 2
//
// Reads the hook payload as JSON on stdin and allows the Bash call only if its command is on the
// profile's allowlist. Anything else (unknown command or flag, shell syntax, bad input, or an
// internal error) exits 2, which blocks the call and shows the stderr message to the agent. The
// `|| exit 2` in the frontmatter turns any other failure (node missing, script not found) into a
// block too, so the hook fails closed.
//
// Everything is an allowlist on purpose. A denylist of dangerous git flags is bypassable: the shell
// rewrites quoted or escaped text (`--out"put"=x` becomes `--output=x`), and git accepts any
// unambiguous prefix of a long option (`--outp=x`).

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

// The only characters a command may contain. This excludes every shell metacharacter that could
// chain, redirect, substitute, expand, glob or quote: ; & | < > ` $ ( ) { } [ ] * ? ! # " ' \ and
// newlines. Without quotes or escapes, splitting on spaces gives exactly the words the shell sees.
const SAFE_CHARS = /^[A-Za-z0-9 ._/:=@^,+%~-]+$/;

// git flags the agents may pass, matched against the whole word. Anything else starting with `-`
// is blocked. Words not starting with `-` are revisions or paths, which git only reads.
const SAFE_GIT_FLAGS = [
  /^--$/,
  /^--(staged|cached|merge-base|stat|numstat|shortstat|name-only|name-status|patch|no-patch)$/,
  /^--(oneline|graph|decorate|reverse|follow|no-color|full-name|porcelain|short|branch)$/,
  /^--(ignore-all-space|find-renames|no-renames)$/,
  /^-[pswMrbun]$/,
  /^--untracked-files=(all|normal|no)$/,
  /^--color=never$/,
  /^--diff-filter=[ACDMRTUXB]+$/i,
  /^(-n|--max-count=)\d+$/,
  /^-\d+$/,
  /^(-U|--unified=)\d+$/,
  /^--(format|pretty)=[A-Za-z0-9%:,._-]*$/,
];

function block(reason) {
  process.stderr.write(
    `Blocked by read-only hook: ${reason}\n` +
      'Run one allowlisted command per Bash call, from the repo root (no cd, pipes, chaining, ' +
      'redirection, quotes or globs).\n',
  );
  process.exit(2);
}

function isAllowed(profile, command) {
  const tokens = command.split(' ').filter(Boolean);
  const normalized = tokens.join(' ');

  if (normalized === 'git fetch origin main') return true;

  if (tokens[0] === 'git') {
    const [, sub, ...args] = tokens;
    if (sub === undefined || !GIT_SUBCOMMANDS[profile].includes(sub)) return false;
    // Flags must be allowlisted. Other words are revisions or paths; a leading ~ would be expanded
    // by the shell, so reject it.
    return args.every((arg) =>
      arg.startsWith('-') ? SAFE_GIT_FLAGS.some((re) => re.test(arg)) : !arg.startsWith('~'),
    );
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

  if (!SAFE_CHARS.test(command)) block(`command contains disallowed characters: ${command}`);
  if (!isAllowed(profile, command.trim())) block(`not on the ${profile} allowlist: ${command}`);

  process.exit(0);
}

try {
  await main();
} catch (err) {
  block(`internal hook error: ${err instanceof Error ? err.message : String(err)}`);
}
