# MISSÃO — IMPLEMENTAR E MANTER A MEMÓRIA TÉCNICA DO RADAR DE LICITAÇÕES

Atue como um **Principal Software Architect, Tech Lead e especialista em governança de desenvolvimento assistido por IA**.

Sua missão ü inspecionar o estado real do projeto Radar de Licitações Públicas e criar, completar ou atualizar os arquivos:

- `AGENTS.md`

- `docs/CURRENT_STATE.md`

Esses arquivos constituirão a memória técnica persistente do projeto, permitindo que diferentes agentes de IA continuem o desenvolvimento sem depender do histórico de conversas anteriores.

**Não quero arquivos genéricos preenchidos com suposições. Quero documentação fiel ao código, aos testes, às decisões arquiteturais e ao board de desenvolvimento.**

## 1. Inspeção obrigatória

Antes de alterar qualquer arquivo:

1. Examine a estrutura completa do repositório.

2. Leia o `README.md` e toda documentação arquitetural existente.

3. Identifique a stack efetivamente instalada.

4. Inspecione o `package.json`, workspaces, configurações, migrations e aplicações existentes.

5. Identifique os módulos implementados no front-end, API, workers e coletores.

6. Examine os testes existentes e os fluxos funcionais disponíveis.

7. Consulte o histórico Git, branches, commits e PRs relevantes, quando disponíveis.

8. Verifique se existe integração com GitHub Projects, Jira ou outro board.

9. Identifique o estágio de maturidade atual do projeto.

10. Localize funcionalidades completas, parciais, ausentes ou com falhas conhecidas.

Não confunda a existência de um diretório, interface, controller ou endpoint com uma funcionalidade concluída.

**Nunca presuma que algo está implementado apenas porque foi mencionado em documentação ou em conversas anteriores.**

Se não tiver acesso ao board, registre essa limitação. Não invente tarefas, responsáveis, identificadores ou status.

## 2. Criar ou atualizar AGENTS.md

O `AGENTS.md`, localizado na raiz do repositório, deverá funcionar como manual operacional permanente dos agentes de programação.

Deve conter:

### Identidade do projeto

- Nome e propósito do produto.

- Público-alvo e modelo SaaS B2B2C.

- Estágio atual de desenvolvimento.

- Objetivo principal do MVP.

### Stack e arquitetura

Registrar somente as tecnologias confirmadas no repositório, distinguindo decisões aprovadas de implementações já existentes.

Arquitetura de referência:

- Nuxt 4 + Vue 3 + TypeScript.

- NestJS.

- PostgreSQL + Drizzle ORM.

- Redis + BullMQ.

- Crawlee, Cheerio e Playwright.

- Monólito modular de negócio.

- Workers independentes.

- Multi-tenancy.

- Coleta compartilhada.

- Python futuramente, quando houver necessidade técnica demonstrada.

Caso a implementação real divirja dessa arquitetura, não a substitua silenciosamente. Registre a divergência e consulte as decisões arquiteturais.

### Organização do código

Documentar:

- Responsabilidades de cada aplicação.

- Módulos e domínios existentes.

- Padrões de pastas.

- Fluxo de dependências.

- Convenções de imports.

- Localização de contratos compartilhados.

- Regras para adicionar novas funcionalidades.

### Regras obrigatórias dos agentes

Antes de implementar:

1. Ler `AGENTS.md`.

2. Ler `docs/CURRENT_STATE.md`.

3. Consultar `MATURITY_MODEL.md` e `ROADMAP.md`, quando existirem.

4. Consultar o board de desenvolvimento, quando acessível.

5. Localizar o módulo responsável pela alteração.

6. Inspecionar implementações relacionadas.

7. Identificar impactos arquiteturais.

8. Escolher a menor alteração necessária.

Durante a implementação:

- Não reescrever funcionalidades existentes sem justificativa.

- Não duplicar componentes, serviços ou entidades.

- Não alterar contratos silenciosamente.

- Não adicionar dependências sem necessidade.

- Não introduzir microsserviços prematuros.

- Não executar migrations destrutivas sem autorização.

- Não alterar decisões arquiteturais aprovadas sem registrar uma nova decisão.

- Não inventar endpoints, tabelas ou comportamentos.

- Não considerar mocks como funcionalidades reais.

- Preservar o isolamento multi-tenant.

- Manter regras de negócio separadas de controllers e interfaces.

- Respeitar os limites do MVP.

Depois da implementação:

1. Executar testes relevantes.

2. Executar lint, typecheck e build aplicáveis.

3. Verificar alterações no banco e contratos.

4. Registrar problemas encontrados.

5. Atualizar `CURRENT_STATE.md` quando o estado real mudar.

6. Registrar decisões arquiteturais relevantes.

7. Relacionar a entrega ü tarefa do board, quando possível.

8. Não declarar sucesso sem evidências.

### Hierarquia de fontes de verdade

Adotar a seguinte organização:

- Código, migrations e testes: implementação real.

- ADRs aprovadas: decisões arquiteturais.

- `MATURITY_MODEL.md`: critérios de maturidade.

- `ROADMAP.md`: evolução planejada.

- Board: tarefas, prioridades e status de execução.

- `CURRENT_STATE.md`: resumo verificado da situação atual.

- `AGENTS.md`: instruções para atuação dos agentes.

Em caso de conflito entre documentação e código, identificar e reportar a divergência. Não presumir automaticamente que a documentação ou o código está correto quanto ao comportamento desejado.

O `AGENTS.md` deve ser conciso, objetivo e estável. Evite duplicar documentação detalhada de outros arquivos.

## 3. Criar ou atualizar CURRENT_STATE.md

O arquivo `docs/CURRENT_STATE.md` deve representar uma fotografia fiel e verificável do desenvolvimento.

Organizar com as seguintes seções:

### Identificação

- Projeto.

- Data da Última revisão.

- Branch e commit analisados.

- Estágio de maturidade.

- Fontes consultadas.

- Limitações da verificação.

### Resumo executivo

Descrever brevemente o estado atual do sistema e o que impede a conclusão do estágio vigente.

### Estado por domínio

Utilizar uma tabela:

| Domínio | Estado | Evidência | Pendência | Próxima ação |

|---|---|---|---|---|

| Fundação | ... | ... | ... | ... |

| Autenticação | ... | ... | ... | ... |

| Multi-tenancy | ... | ... | ... | ... |

| Organizações | ... | ... | ... | ... |

| Parceiros | ... | ... | ... | ... |

| Fontes e coleta | ... | ... | ... | ... |

| Licitações | ... | ... | ... | ... |

| Matching | ... | ... | ... | ... |

| Geografia | ... | ... | ... | ... |

| Alertas | ... | ... | ... | ... |

| Assinaturas | ... | ... | ... | ... |

| Administração | ... | ... | ... | ... |

| Site público e FAQ | ... | ... | ... | ... |

| Segurança | ... | ... | ... | ... |

| Observabilidade | ... | ... | ... | ... |

| Testes e CI/CD | ... | ... | ... | ... |

Utilizar somente os seguintes estados:

- `NOT_STARTED`: não iniciado.

- `IN_PROGRESS`: implementação parcial.

- `IMPLEMENTED`: implementação encontrada, mas ainda sem validação suficiente.

- `VALIDATED`: implementação e critérios de aceite verificados.

- `BLOCKED`: impedimento concreto identificado.

- `UNKNOWN`: evidências insuficientes para determinar o estado.

Não utilizar `VALIDATED` sem evidência objetiva.

### Maturidade atual

Registrar separadamente:

**MVP**

- Capacidades concluídas.

- Capacidades pendentes.

- Critérios de aceite ainda não atendidos.

- Principais bloqueios para lançamento.

**Maturidade intermediária**

- Capacidades previstas.

- Dependências arquiteturais.

- Funcionalidades eventualmente antecipadas.

**Maturidade final**

- Capacidades previstas.

- Requisitos de escala e governança.

- Critérios operacionais que definirão a conclusão.

Não atribuir uma porcentagem arbitrária de maturidade.

Se houver indicadores quantitativos, documentar sua metodologia e evidências.

### Estado técnico

Registrar:

- Aplicações existentes.

- Banco de dados e migrations.

- Integrações externas.

- Infraestrutura.

- Comandos disponíveis.

- Resultado dos últimos testes executados nesta verificação.

- Problemas conhecidos.

- Dúvidas técnicas relevantes.

Para cada validação, indicar resultado, comando e contexto.

Não reutilizar resultados antigos como se fossem testes recém-executados.

### Próximas prioridades

Relacionar as próximas entregas usando as seguintes informações:

- ID da tarefa, quando disponível.

- Descrição objetiva.

- Domínio.

- Prioridade registrada no board.

- Dependências.

- Critérios de aceite relevantes.

Não inventar IDs de tarefas nem alterar prioridades definidas pelo responsável do projeto.

### Histórico resumido de alterações

Registrar mudanças arquiteturais ou funcionais relevantes sem transformar o arquivo em um log extenso de commits.

O histórico completo permanece no Git.

## 4. Integração com o board de desenvolvimento

Quando houver acesso ao board:

1. Consultar épicos, histórias, bugs e tarefas relacionadas.

2. Relacionar entregas de código aos respectivos itens.

3. Identificar divergências entre status do board e implementação real.

4. Atualizar `CURRENT_STATE.md` com referências às tarefas.

5. Identificar tarefas que bloqueiam os critérios de maturidade.

**Não alterar automaticamente o status das tarefas no board sem autorização ou política previamente estabelecida.**

O board permanece como fonte principal de status, prioridades e responsáveis.

O `CURRENT_STATE.md` ü um resumo consolidado do estado técnico, não um segundo backlog que precisa competir com o board.

## 5. Protocolo permanente de atualização

Estabeleça no `AGENTS.md` a obrigação de revisar `CURRENT_STATE.md` sempre que uma entrega relevante modificar:

- O estado de uma funcionalidade.

- O resultado de critérios de aceite.

- A estrutura arquitetural.

- Os contratos entre módulos.

- O schema do banco.

- As integrações externas.

- A infraestrutura.

- Os riscos e bloqueios conhecidos.

- A conclusão de um marco de maturidade.

Não atualizar o arquivo apenas por mudanças cosméticas ou pequenas alterações que não afetem o estado consolidado.

Evitar reescrever o documento inteiro a cada tarefa. Preservar informações verificadas que continuam válidas e modificar somente as seções afetadas.

Ao encerrar uma sessão com alterações de código, verificar se a documentação de estado precisa de atualização.

Se a tarefa ainda estiver incompleta, registrar seu estado real, sem marcá-la como concluída.

## 6. Proteção contra documentação incorreta

São proibidos:

- Inventar módulos implementados.

- Inventar cobertura de testes.

- Declarar integrações externas funcionais sem validação.

- Supor que o board está sincronizado.

- Registrar planos futuros como funcionalidades existentes.

- Apagar pendências sem evidência.

- Substituir decisões aprovadas silenciosamente.

- Criar relatórios de maturidade baseados apenas na quantidade de arquivos.

- Declarar o MVP concluído porque as páginas estão visualmente prontas.

Toda informação importante deve ser rastreável até código, teste, documentação aprovada, commit, PR ou tarefa real.

Quando não houver evidências suficientes, utilizar `UNKNOWN` e explicar o que falta verificar.

## 7. Compatibilidade entre agentes

O `AGENTS.md` será a principal referência compartilhada.

Caso existam instruções específicas de Cursor, Claude Code, Codex ou outras ferramentas:

- Verificar se são compatíveis com o `AGENTS.md`.

- Evitar duplicar regras extensas.

- Preferir referências ü documentação central.

- Registrar instruções específicas apenas quando necessárias.

- Não apagar configurações existentes sem justificativa.

Não presumir que todas as ferramentas leem automaticamente o mesmo arquivo.

## 8. Execução desta tarefa

Execute agora:

**Etapa A — Auditoria**

Inspecione o repositório, documentações e board acessível.

**Etapa B — Atualização do AGENTS.md**

Crie o arquivo, se não existir, ou atualize cuidadosamente sua versão atual, preservando regras válidas.

**Etapa C — Atualização do CURRENT_STATE.md**

Preencha com o estado real encontrado. Não use conteúdo fictício.

**Etapa D — Verificação de consistência**

Confirme que os documentos não contradizem o código, decisões aprovadas ou critérios de maturidade conhecidos. Registre divergências não resolvidas.

**Etapa E — Validação**

Verifique que todos os caminhos citados existem ou estão claramente identificados como planejados.

Confirme que os arquivos não contém credenciais, tokens ou dados sensíveis.

**Etapa F — Relatório de conclusão**

Apresente resumidamente:

1. Arquivos criados ou atualizados.

2. Arquitetura identificada.

3. Estágio atual de maturidade.

4. Funcionalidades verificadas.

5. Principais pendências.

6. Divergências entre código, documentação e board.

7. Próxima entrega recomendada, respeitando as prioridades existentes.

## 9. Resultado esperado

Ao concluir, uma nova sessão de IA deverá conseguir:

- Entender imediatamente o propósito do Radar de Licitações.

- Identificar a arquitetura aprovada e a realmente implementada.

- Conhecer os módulos e suas responsabilidades.

- Saber o que já foi entregue e validado.

- Conhecer as pendências atuais do MVP.

- Identificar as tarefas relacionadas no board.

- Respeitar o roadmap de maturidade.

- Continuar o desenvolvimento sem duplicar funcionalidades.

- Atualizar a documentação conforme o projeto evolui.

**IMPORTANTE: esta tarefa ü de governança e documentação. Não refatore, reestruture ou reescreva o código da aplicação durante sua execução.**

Comece pela auditoria do repositório e atualize os dois arquivos com base em evidências reais.
