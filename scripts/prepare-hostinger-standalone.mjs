import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const frontendRoot = resolve(projectRoot, 'frontend');
const nextRoot = resolve(frontendRoot, '.next');
const standaloneRoot = resolve(nextRoot, 'standalone');
const nestedAppRoot = resolve(standaloneRoot, 'frontend');

const nestedServer = resolve(nestedAppRoot, 'server.js');
const nestedNext = resolve(nestedAppRoot, '.next');

if (!existsSync(nestedServer) || !existsSync(nestedNext)) {
  throw new Error('Next.js no generó el servidor standalone esperado para frontend.');
}

// Hostinger publishes the configured output directory as the Node.js runtime
// root. Flatten the monorepo-style Next.js bundle so server.js can resolve the
// traced node_modules and its .next directory from that same runtime root.
cpSync(nestedServer, resolve(standaloneRoot, 'server.js'));
cpSync(nestedNext, resolve(standaloneRoot, '.next'), { recursive: true });
cpSync(resolve(nextRoot, 'static'), resolve(standaloneRoot, '.next/static'), { recursive: true });
cpSync(resolve(frontendRoot, 'public'), resolve(standaloneRoot, 'public'), { recursive: true });

console.log('Hostinger standalone preparado en frontend/.next/standalone');
