const checks = [
  ['Web', 'http://localhost:3000'],
  ['API / PostgreSQL / Redis', 'http://localhost:4000/api/v1/health'],
  ['OIDC', 'http://localhost:8080/realms/radar/.well-known/openid-configuration'],
  ['Mailpit', 'http://localhost:8025/livez'],
];
let failed = false;
for (const [name, url] of checks) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log(`${response.ok ? 'OK' : 'FAIL'} ${name}: ${response.status}`);
    if (!response.ok) failed = true;
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
