# 0019 — Visualização de materiais dentro da biblioteca

Data: 11/11/2026. Solicitação do usuário: aluno clicar para abrir uma tela estilizada com as informações. Essa solicitação autoriza a alteração de interface necessária, após o escopo anterior de organização sem mudanças de código.

## Implementação
- Botão Visualizar em cada material da Biblioteca Digital e da Central de conteúdos.
- Tela de leitura com azul profundo, dourado e fundo claro, nome do material, identificação do curso quando disponível, tamanho e tipo de arquivo.
- Guias TXT cadastrados passam a ser formatados com títulos, listas, negrito, sumário e tabelas transformadas em cartões.
- Links HTTPS são clicáveis e abrem em nova aba com proteção de referência/opener. Conteúdo é renderizado como elementos React, sem injeção de HTML recebido.
- PDF e imagens suportadas recebem visualização no navegador; vídeos/áudios enviados usam reprodução autenticada. Formatos sem prévia mantêm download e orientação.
- Limite de visualização: texto até 2 MB, PDFs/imagens até 30 MB; arquivos maiores continuam disponíveis para baixar.
- Escape fecha, foco retorna ao botão de origem, navegação Tab fica na tela de leitura e rolagem do fundo é bloqueada durante a visualização.
- CSS adaptado para telas menores, sumário horizontal e disposição em uma coluna. Layout móvel não foi verificado visualmente nesta etapa.

## Arquivos
`frontend/src/features/material-reader.tsx`, `material-reader.css` e integração em `studio.tsx`. Não houve mudança no backend, banco ou regras de autorização.

## Validação
TypeScript aprovado. Build Next.js aprovado. Após o build houve somente ajuste de contraste CSS conferido no navegador. Acesso administrativo real, abertura do guia Livros gratuitos e amostras oficiais, cinco referências clicáveis, sumário e retorno por Escape verificados no navegador. Ajustado contraste do título após inspeção visual. Evidência: `evidencias/0019_leitura_biblioteca.jpg`.

A visualização reutiliza o endpoint autenticado de download. Não foi criado endpoint público. Não houve login de aluno ou teste ponta a ponta com matrícula nesta etapa: o curso continua em rascunho e a liberação exige curso publicado e matrícula autorizada conforme regra existente. Nenhuma publicação ou matrícula foi criada para teste.

## Limites
Links para vídeos externos abrem no site de origem; não houve download ou transcrição, nem inclusão de player YouTube embutido. A opção de visualização não implica que livros completos estejam armazenados no sistema.

Históricos anteriores preservados e nova evidência salva. Servidores locais mantidos ativos para o usuário.
