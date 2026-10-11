# Backup e restauração

Execute `node scripts/backup.mjs` para gerar um dump PostgreSQL em `.local/backups`. Inclui dados da aplicação; execute separadamente para Keycloak antes de produção. Os volumes persistem após `docker compose down`; não use `down -v` se quiser preservar dados.

Restaure primeiro em banco separado com `pg_restore --no-owner --dbname=<URL-DE-TESTE> arquivo.dump`, valide migrations/contagens/login e só depois planeje troca de serviço. A restauração não foi automaticamente executada contra o banco ativo.

Agende o script externamente, criptografe e copie backups para armazenamento fora da máquina, defina retenção e teste restore periodicamente. Redis usa AOF; a outbox e efeitos dos jobs continuam no PostgreSQL. Perda de sessões exige novo login. RPO/RTO de produção ainda precisam de ensaio.
