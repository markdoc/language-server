import {context, build} from 'esbuild';

const config = {
  bundle: true,
  entryPoints: ['client/index.ts', 'server/index.ts', 'server/wrapper.ts', 'client/server.ts'],
  outdir: 'dist',
  sourcemap: 'linked',
  external: ['vscode'],
  platform: 'node',
  format: 'cjs',
  banner: { js: '#!/usr/bin/env node' },
};

if (process.argv.includes('--watch')) {
  const ctx = await context(config);
  await ctx.watch();
} else build(config);
