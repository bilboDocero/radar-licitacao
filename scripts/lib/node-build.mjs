import { readFileSync } from 'node:fs';
/** Bundle workspace sources; keep npm packages native to avoid bundling CJS runtimes. */
export function nodeBuild() {
  const packageNames = ['config','contracts','database','events','source-sdk'];
  const external = [...new Set(packageNames.flatMap(name => Object.keys(JSON.parse(readFileSync(new URL(`../../packages/${name}/package.json`,import.meta.url),'utf8')).dependencies || {})))].filter(name => !name.startsWith('@radar/'));
  return { noExternal: [/^@radar\//], external, clean: true };
}
