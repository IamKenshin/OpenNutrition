// Launches Jest via module resolution (works whether jest is hoisted to the workspace root or not).
// Run with `node --experimental-vm-modules` so CommonJS test files can load the ESM-only NestJS 12 packages.
import { run } from 'jest';

await run(process.argv.slice(2));
