for (let attempt = 0; attempt < 90; attempt++) {
  try {
    const responses = await Promise.all(
      [
        'http://localhost:3000',
        'http://localhost:4000/api/v1/health',
        'http://localhost:8080/realms/radar/.well-known/openid-configuration',
      ].map((url) => fetch(url, { signal: AbortSignal.timeout(2000) })),
    );
    if (responses.every((r) => r.ok)) process.exit(0);
  } catch {
    /* Wait for service startup. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error('Os serviços não ficaram prontos no prazo.');
