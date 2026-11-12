# 0009 — Identidade do Instituto Kairós e imagens institucionais

Data: 09/11/2026, America/Sao_Paulo. Registro progressivo; documentos e evidências anteriores preservados.

## Solicitação

O usuário solicitou enriquecer a interface com quatro imagens da pasta `.imagens` e definiu suas associações:

- `DorivalCoordenador.PNG`: Dorival, coordenador do Instituto Kairós.
- `FranciscoProfessor.PNG`: Francisco, professor e administrador do site.
- `LogoInstituto.PNG`: logotipo do Instituto Kairós.
- `BibliaAmpuleta.PNG`: imagem a posicionar à direita do logotipo.

Essa indicação fornece a identidade institucional para a interface, antes provisória. O texto e as imagens de referências anteriores não substituem o mapeamento agora informado pelo usuário.

## Alterações realizadas

- Cabeçalho, navegação lateral, rodapé e metadados atualizados para Instituto Teológico Kairós, conforme grafia no logotipo recebido.
- Banner institucional com logo à esquerda e Bíblia/ampulheta à direita no desktop. No celular, os elementos se empilham para manter a legibilidade.
- Composição com fundo marfim, detalhes dourados e transição suave entre o logotipo e a fotografia.
- Ajuste do enquadramento CSS da fotografia para preservar a ampulheta à direita.
- Seção de equipe com retratos, nomes e funções de Dorival e Francisco.
- Removida a ilustração SVG de livro anteriormente usada no banner; substituída pelas imagens fornecidas.
- Arquivos originais preservados, copiados sem edição para `frontend/public/images` com nomes de URL em minúsculas.
- Imagens integradas com Next Image em modo compatível com exportação estática, dimensões declaradas e textos alternativos.

As apresentações são conteúdo institucional. Não foi criada uma conta para Dorival ou Francisco nem concedida permissão de administrador a uma identidade não verificada. Login e autorização permanecem os da fundação anterior.

## Arquivos de aplicação afetados

- `frontend/src/app/page.tsx`.
- `frontend/src/app/globals.css`.
- `frontend/src/app/layout.tsx`.
- Quatro cópias em `frontend/public/images`.

Nenhuma mudança no backend, banco de dados ou regras acadêmicas.

## Verificações

- TypeScript: checagem aprovada.
- Build estático Next.js: aprovado, inclusive após o ajuste final de enquadramento.
- Navegador: quatro imagens carregadas, verificadas por `complete` e largura natural maior que zero.
- Desktop: logotipo, fotografia, nomes, funções e retratos inspecionados visualmente.
- Mobile em 390 × 844: banner empilhado, cards adaptados e conteúdo sem excesso horizontal; clientWidth/scrollWidth iguais a 375 px na verificação.
- Cópias comparadas por SHA-256 com os originais; nenhuma edição de imagem executada.
- Nenhuma nova dependência instalada nesta etapa. Não foram adicionados testes para esta alteração visual de baixo impacto; utilizados build, tipos e inspeção no navegador.
- Servidor estático temporário de QA encerrado. Nenhuma publicação externa realizada.

## Evidências preservadas

- [Desktop final](evidencias/0009_kairos_desktop_final.jpg).
- [Mobile final](evidencias/0009_kairos_mobile_final.jpg).
- Capturas intermediárias também preservadas em `evidencias/0009_kairos_desktop.jpg` e `evidencias/0009_kairos_mobile.jpg`.

Os documentos antigos continuam descrevendo as decisões vigentes nas suas respectivas datas/etapas. Este registro formaliza a evolução da identificação provisória Teologando Fácil para a apresentação atual do Instituto Kairós, sem apagar o histórico.
