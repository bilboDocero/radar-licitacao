import { createDatabase, plans, dataSources, municipalities } from './index.js';
const { db, pool } = createDatabase();
try {
  await db
    .insert(plans)
    .values([
      {
        id: 'local',
        name: 'Local',
        description: 'Uma cidade para começar.',
        entitlements: {
          'coverage.max_municipalities': 1,
          'coverage.max_states': 0,
          'coverage.national': false,
          'commercial_profiles.max_count': 1,
          'alerts.enabled': true,
          'alerts.frequency': 'daily',
          'documents.analysis.enabled': false,
          'partner.branding.enabled': false,
        },
      },
      {
        id: 'regional',
        name: 'Regional',
        description: 'Oportunidades em até três estados.',
        entitlements: {
          'coverage.max_municipalities': 30,
          'coverage.max_states': 3,
          'coverage.national': false,
          'commercial_profiles.max_count': 3,
          'alerts.enabled': true,
          'alerts.frequency': 'daily',
          'documents.analysis.enabled': false,
          'partner.branding.enabled': false,
        },
      },
      {
        id: 'nacional',
        name: 'Nacional',
        description: 'Área comercial em todo o Brasil, nas fontes monitoradas.',
        entitlements: {
          'coverage.max_municipalities': 100,
          'coverage.max_states': 27,
          'coverage.national': true,
          'commercial_profiles.max_count': 10,
          'alerts.enabled': true,
          'alerts.frequency': 'daily',
          'documents.analysis.enabled': false,
          'partner.branding.enabled': false,
        },
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(dataSources)
    .values({
      id: 'pncp',
      name: 'Portal Nacional de Contratações Públicas',
      baseUrl: 'https://pncp.gov.br/api/consulta',
      coverageNote:
        'Escopo inicial: pregão eletrônico e dispensa, a partir da janela inicial de coleta. Não representa cobertura completa do PNCP ou de todos os portais brasileiros.',
    })
    .onConflictDoNothing();
  await db
    .insert(municipalities)
    .values([
      { code: '3550308', name: 'São Paulo', state: 'SP' },
      { code: '3304557', name: 'Rio de Janeiro', state: 'RJ' },
      { code: '5300108', name: 'Brasília', state: 'DF' },
      { code: '3106200', name: 'Belo Horizonte', state: 'MG' },
      { code: '4106902', name: 'Curitiba', state: 'PR' },
    ])
    .onConflictDoNothing();
  console.log('Referências e planos cadastrados. Nenhuma licitação fictícia inserida.');
} finally {
  await pool.end();
}
