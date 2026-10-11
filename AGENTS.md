# Radar de Licitações — guia de trabalho

## Projeto e escopo

SaaS B2B2C para fornecedores de compras públicas e parceiros comerciais. O estágio atual é o esqueleto funcional do MVP, com fluxo vertical real e pendências comerciais. Consulte `docs/CURRENT_STATE.md` antes de estimar o que está concluído.

## Fontes e preparação

1. Leia este arquivo, `docs/CURRENT_STATE.md` e a documentação do domínio afetado.
2. Consulte `docs/roadmap/mvp.md`, `intermediate.md` e `mature.md`. Não existem arquivos raiz MATURITY_MODEL.md ou ROADMAP.md nesta entrega.
3. Inspecione código, migrations e testes relacionados. Eles comprovam implementação; ADRs registram decisões e roadmap descreve intenção.
4. Consulte o board quando houver acesso e um board identificado. Atualmente nenhum board foi identificado/verificado. Não invente IDs, prioridades, responsáveis ou sincronização.
5. Em divergências entre código e documentação, registre a diferença e determine o comportamento pretendido pelo pedido atual. Preserve alterações do usuário.

## Arquitetura existente

- `apps/web`: Nuxt 4/Vue 3/Nuxt UI/Tailwind; BFF OIDC com openid-client, cookie selado e tokens Redis.
- `apps/api`: NestJS, API `/api/v1`, monólito modular e autorização por associação/papel.
- `apps/collector`: TypeScript, PNCP via HTTP oficial; Crawlee/Cheerio/Playwright instalados para conectores futuros homologados.
- `apps/worker`: BullMQ, outbox, matching e notificações internas.
- `packages/contracts`: schemas Zod, schemas OpenAPI e regra determinística pura; `database`: Drizzle/PostgreSQL; `events`: contratos de jobs; `source-sdk`: conectores; `config`: ambiente/logs/OTel.
- Dependências vão de aplicações para pacotes. Não importe aplicações em pacotes nem crie ciclos. Use imports de workspace; imports relativos TypeScript de servidor usam extensão `.js`.
- Clean Architecture pragmática: crie camadas/interfaces quando houver fronteira real. Não adicione arquivos vazios, serviços remotos ou abstrações especulativas.

## Regras de implementação

- Escolha a menor alteração que resolva o pedido. Não duplique módulos ou reescreva recursos funcionais sem justificativa.
- Regras com estado/transações pertencem a serviços, não componentes Vue. Contratos mudam explicitamente, com validação e documentação.
- Organization é o tenant. Header/cookie de organização nunca concede acesso; valide associação e use predicados de tenant em todos os recursos privados. Parceiro comercial não é membro.
- Licitações são globais. Colete uma vez, normalize/versione e distribua matches por organização. Nunca invente registros que pareçam oficiais.
- Sugestões de fontes são dados, não URLs para execução. Novos conectores exigem homologação, origem fixa, SSRF controlado e respeito a limites de acesso.
- Assinatura trial não é pagamento. PSP e webhooks ainda não foram implementados. Não ativar cobrança fictícia.
- Use migrations versionadas e preserve dados. Migrations destrutivas exigem autorização específica. Testes de integração usam banco temporário criado pelo runner, nunca o banco ativo.
- Novas dependências ou mudanças arquiteturais precisam de motivo real; registre ADR quando alterar fronteiras. Python, IA, OCR e white label estão fora do núcleo atual.
- Preserve UTF-8 nos arquivos criados. Não aplique formatação em anexos `estrategia.md` e `memoria.md`; mantenha os anexos fora de formatadores globais.

## Verificação e encerramento

Use `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm build` e E2E aplicável. No Windows, `pnpm.cmd` evita restrições de PowerShell. Servidores devem estar prontos antes de E2E. Confira `pnpm health` após mudanças de inicialização. Nunca anuncie resultado que não executou.

Atualize as seções afetadas de `docs/CURRENT_STATE.md` quando mudar capacidade, critério de aceite, schema, contratos, integração, infraestrutura, riscos ou marco de maturidade. Não reescreva tudo para uma mudança cosmética. Preserve evidências válidas e registre pendências sem marcá-las como concluídas. Relacione a entrega a tarefas reais quando identificadas; não altere status do board sem autorização.

O estado verificado é uma síntese técnica, não outro backlog. Código/testes, ADRs, roadmap e board têm responsabilidades distintas. Instruções de ferramentas específicas devem referenciar esta base, sem presumir que todas a carregam automaticamente.
