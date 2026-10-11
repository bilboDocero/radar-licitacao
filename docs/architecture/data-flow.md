# Fluxos de dados

1. OIDC Authorization Code + PKCE + state + nonce autentica o usuário. O BFF recebe tokens no servidor, consulta a API para validar o acesso e grava tokens no Redis. O cookie selado HttpOnly contém apenas identidade, id opaco de sessão e, durante login, estado efêmero.
2. O onboarding cria empresa, associação owner, assinatura trial e preferência de alertas na mesma transação.
3. O perfil valida o limite sob bloqueio da linha da organização. Perfil e evento outbox são gravados na mesma transação.
4. O collector lê a API oficial, guarda payload bruto e normaliza. Lock transacional por fonte/id evita gravações concorrentes do mesmo registro. Alterações criam versão e evento outbox atomicamente.
5. O worker publica eventos no BullMQ usando o UUID da outbox como jobId. Só depois marca despacho; reenvios são seguros. O consumidor verifica o contrato do evento, calcula correspondências e grava matches/avisos com restrições únicas.
6. O painel consulta exclusivamente registros privados da organização validada. O detalhe remete ao edital oficial; não há download ou análise documental neste estágio.

Semântica: entrega pelo menos uma vez com efeitos idempotentes. Jobs concluídos retidos por sete dias; eventos despachados ficam no banco para operação/auditoria. Reexecução após retenção continua protegida por unicidade no banco.
