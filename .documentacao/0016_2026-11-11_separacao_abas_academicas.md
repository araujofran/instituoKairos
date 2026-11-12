# 0016 — Separação de Painel Inicial, Aulas ao Vivo e Relatórios

Data: 11/11/2026.

## Problema identificado
As abas Aulas ao Vivo e Relatórios recebiam a mesma opção `all` do componente HomeDashboard utilizado no Painel Inicial. Isso repetia todos os blocos, alterando apenas o título da página.

## Alterações
- Painel Inicial mantém a visão geral completa.
- Aulas ao Vivo renderiza somente a próxima aula e a agenda da semana, com links e calendário quando publicados.
- Relatórios renderiza somente os indicadores acadêmicos disponíveis e explica o alcance atual. Não oferece exportações, notas ou frequência ainda não implementadas.
- Atividades mantém somente seu bloco específico.
- Os blocos não relacionados deixam de ser renderizados no DOM; a separação não depende apenas de ocultar elementos com CSS.
- Mantidos os dados reais da API FastAPI, a atualização periódica e as permissões existentes. Nenhum número de demonstração foi inserido.

## Validação
`npm.cmd --prefix frontend run typecheck`: passou. Não houve alteração no backend nem reinício dos servidores. Verificação visual autenticada não realizada nesta etapa.

## Acesso
http://192.168.0.233:3000/

Histórico registrado em novo arquivo, preservando os anteriores. Credenciais não são armazenadas neste documento.
