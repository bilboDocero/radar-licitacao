# Execução e futura implantação

`docker compose --profile full up -d --build` executa toda a plataforma local. O serviço migrate deve concluir antes da API. O Dockerfile instala o lockfile e usa os scripts dev para facilitar inspeção local; não é uma imagem de produção endurecida.

Para produção, criar estágios de build/runtime não-root, usar secrets externos, TLS, hostnames reais, Keycloak em modo production, Redis protegido, PostgreSQL gerenciado ou operação com backups/restore, healthchecks e limites de recursos. Executar migrations como job controlado antes de promover a versão. CI valida build, contratos e testes; não publica automaticamente em infraestrutura sem configuração.
