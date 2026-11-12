# 0018 — Integração efetiva do acervo à biblioteca

Data: 11/11/2026. Complementa 0017; não o substitui.

## Solicitação
Após esclarecer que a entrega anterior era documental, o usuário solicitou a integração ao sistema. Mantido o limite de não alterar código da aplicação.

## Operação realizada
Cinco documentos do acervo v01 foram exportados como TXT UTF-8 e cadastrados pelo serviço existente `upload_content`, vinculado à conta administrativa ativa e ao curso Bibliologia e Crítica Textual. Foram preservados os originais Markdown. O serviço aplicou validação de formato, armazenamento privado, hash SHA-256, cota e registro de auditoria `content.uploaded`.

Arquivos: livros gratuitos/amostras; bibliografia comercial; artigos/manuscritos; links de vídeos e verificação; roteiro complementar/atividades propostas. A identificação de fontes pendentes no documento audiovisual foi preservada. Os documentos são guias de referências, não arquivos de vídeo, livros completos ou transcrições.

## Estado e visibilidade
Os cinco registros estão com status published e vinculados ao curso ae3ecc7d-496c-4df5-a01d-161bafe1b810. O curso permanece draft, portanto o administrador pode consultar os arquivos na Biblioteca Digital ou Conteúdos e Uploads, mas isso não libera o curso para alunos. Não houve publicação do curso, alteração de matrícula ou mudança de permissões.

A interface existente oferece download dos guias TXT; não foi acrescentada visualização de links diretamente na página nem reprodução de vídeos externos. A importação não deve ser confundida com essas funcionalidades.

## Verificação
Cada registro foi localizado por `list_content` para o administrador. `download_content` retornou o caminho do arquivo e seu conteúdo foi comparado byte a byte com o original. Cinco arquivos verificados. Não houve teste visual autenticado nem solicitação HTTP de login nesta etapa. Nenhuma credencial foi usada no script ou gravada neste histórico.

Manifesto com IDs, tamanhos e hashes: `enriquecimento_cursos/bibliologia-critica-textual/2026-11-11_v01/arquivos_para_biblioteca/manifesto_importacao_2026-11-11.json`.

Não foram alterados arquivos de código frontend/backend; não houve download ou transcrição de vídeos. Nenhum teste da aplicação foi repetido porque não houve alteração de implementação. Histórico preservado em novo documento.
