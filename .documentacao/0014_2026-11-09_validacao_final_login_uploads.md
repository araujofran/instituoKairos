# 0014 — Validação final e serviços ativos

Data: 09/11/2026. Complementa a entrega 0013, sem substituir seu conteúdo.

## Resultados finais

- **28 testes aprovados** no PostgreSQL exclusivo de teste, após as alterações finais de autenticação, hash, limitação concorrente e autorização de upload antes da análise do corpo.
- Ruff e mypy estrito aprovados; pip check sem dependências quebradas.
- Alembic check sem novas operações detectadas.
- Build estático Next.js aprovado com as rotas `/` e `/login`; TypeScript aprovado.
- Frontend reiniciado em `0.0.0.0:3000` com API configurada para o IP local.
- Backend ativo em `0.0.0.0:8000`; banco exclusivo continua somente em loopback.
- `http://192.168.0.233:3000/login` retornou HTTP 200; readiness da API confirmou ready.

## Dados reais após QA

Consulta ao banco de desenvolvimento confirmou duas contas provisionadas, duas senhas armazenadas como hashes, uma conta exigindo credenciais definitivas e nenhum arquivo demonstrativo no acervo. O teste do coordenador apenas verificou o alerta e encerrou a sessão, preservando sua necessidade de regularização.

Verificação nos arquivos de fonte e documentação não encontrou a senha administrativa em texto simples. O bootstrap recebe credenciais no terminal, com senhas sem eco, e não as fixa no código.

## Complementos operacionais

O README recebeu uma seção acrescentada ao final, sem apagar o texto da fundação, apontando para o estado atual e os novos guias. Os registros 0001–0013 e as referências/evidências foram preservados.

Dockerfile preparado para uploads em `/data/uploads`, com diretório gravável pelo usuário sem privilégios. O build Docker continua não executado nesta máquina porque o daemon não está disponível; publicar requer volume persistente ou armazenamento externo e homologação própria.

O ambiente local permanece ativo conforme solicitado. Não houve deploy na internet, alteração de firewall, commit ou push. Google e YouTube continuam sem configuração de login; o acesso real disponível nesta entrega é por e-mail e senha.
