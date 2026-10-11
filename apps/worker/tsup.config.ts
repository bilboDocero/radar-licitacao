import { defineConfig } from 'tsup';
import { nodeBuild } from '../../scripts/lib/node-build.mjs';
export default defineConfig(nodeBuild());
