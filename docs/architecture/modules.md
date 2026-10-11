# Módulos e responsabilidades

| Módulo              | Responsabilidade implementada                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| identity            | Verificar assinatura, emissor, audiência, expiração e e-mail confirmado; sincronizar identidade |
| tenancy             | Validar associação e papel para a empresa selecionada                                           |
| organizations       | Criar empresa, proprietário, avaliação e auditoria em uma transação                             |
| partners            | Cadastrar parceiro, convidar e aceitar vínculo comercial, consultar carteira restrita           |
| commercial-profiles | Validar perfil, cobertura e limites; registrar evento de matching                               |
| geography           | Referência inicial IBGE para cinco municípios e todas as UFs                                    |
| sources             | Catálogo, execuções recentes e sugestões sem acesso à URL sugerida                              |
| procurements        | Pesquisa paginada, detalhe, rastreabilidade e favoritos isolados                                |
| matching            | Consulta de correspondências atuais; processamento no worker                                    |
| alerts              | Preferência de notificações                                                                     |
| notifications       | Caixa de avisos e marcação de leitura                                                           |
| subscriptions       | Avaliação de 14 dias e direitos centralizados por plano                                         |
| billing             | Contrato de PSP e estado explícito de não configuração                                          |
| audit               | Registro de operações e consulta administrativa                                                 |

Procurements possui application/presentation reais; seu modelo canônico está no pacote contracts e a persistência em database. Os demais módulos pequenos mantêm serviço e controller juntos até que a complexidade justifique separação. Não há pastas vazias para simular Clean Architecture. Controllers de mutações com regras delegam aos serviços; consultas simples permanecem diretas dentro do domínio proprietário.

Consolidações: tenant = organization; memberships = organization_members; palavras-chave, categorias e cobertura são estruturas tipadas do perfil; entitlements são valores JSONB do plano. Tabelas de itens, documentos, pagamentos e entregas externas não existem enquanto não houver uma operação que as utilize. `procurement_versions` referencia o registro bruto e substitui uma ocorrência redundante no escopo de fonte única.
