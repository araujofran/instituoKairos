# 0012 — Correção do perfil de Francisco e das proporções do painel

Data: 09/11/2026, America/Sao_Paulo. Complementa o registro 0011; nenhum documento ou imagem de evidência anterior foi sobrescrito.

## Correção solicitada

O usuário reiterou que deseja a composição do recorte fornecido, incluindo sua foto e identificação como Francisco. A entrega anterior havia condicionado essa apresentação institucional à existência de uma sessão autenticada, mostrando Visitante. Isso não atendia à identificação visual explicitamente solicitada.

A nova referência foi preservada em [referencias/0012_recorte_painel_francisco.png](referencias/0012_recorte_painel_francisco.png).

## Alterações

- Foto do arquivo fornecido `FranciscoProfessor.PNG`, já preservado no frontend como `/images/francisco-professor.png`, aparece no cabeçalho e acima do menu lateral.
- Identificação apresentada: **Prof. Francisco — Administrador**.
- Sem sessão, essa identificação é a apresentação institucional do administrador indicado pelo usuário. Clicar no perfil abre o login; a apresentação não autentica uma pessoa e não concede privilégios.
- Com sessão real, nome, foto e papel continuam vindo da identidade autenticada. Nenhuma autorização no backend foi alterada.
- Navegação lateral compactada e alinhada ao recorte: avatar acima do menu, item selecionado dourado e espaçamento reduzido.
- Cinco indicadores em uma linha, com altura próxima à referência.
- Linha central com proporção de sete colunas para Próxima Aula ao Vivo e cinco para Meu Curso em Andamento.
- Linha inferior com três painéis de quatro colunas cada, de mesma largura: Materiais, Atividades e Agenda.
- Estado sem dados da próxima aula conserva a posição do ícone, texto, imagem lateral e três ações, sem inventar título, horário ou inscritos. Adicionar à Agenda fica desabilitado quando não existe sessão.
- Estado sem matrícula conserva imagem à esquerda, texto à direita, trilho neutro sem percentual e ação Continuar Estudando, sem simular progresso.
- Corrigido contorno duplicado de botões: o nome de classe `outline` também ativa uma utility do Tailwind. O foco visível de teclado permanece explícito.
- Ajustes responsivos mantêm a foto no cabeçalho mobile e no menu quando aberto.

## Dados reais preservados

Indicadores e registros continuam no endpoint autenticado PostgreSQL/FastAPI criado na etapa anterior. Não foram inseridos os números ou conteúdos ilustrativos do recorte. Dados acadêmicos sem acesso não são expostos pela simples exibição do perfil institucional.

O retrato escolhido segue o mapeamento de arquivos fornecido pelo próprio usuário: FranciscoProfessor corresponde a Francisco; DorivalCoordenador corresponde a Dorival no banner. As imagens originais não foram editadas.

## Verificação

- TypeScript aprovado.
- Navegador confirmou as duas fotos com origem `/images/francisco-professor.png`, carregadas com largura natural válida.
- Desktop verificado visualmente e por geometria: dois painéis centrais na mesma linha, três inferiores com larguras iguais. Na medição intermediária em viewport de aproximadamente 1265 px, painéis centrais com cerca de 599/425 px e inferiores com cerca de 337 px cada.
- Mobile 390 px: clientWidth e scrollWidth iguais a 375 px; sem excesso horizontal.
- Capturas preservadas em [desktop](evidencias/0012_francisco_layout_desktop.jpg) e [mobile](evidencias/0012_francisco_layout_mobile.jpg).
- Alteração de interface de baixo impacto: não foram adicionados testes que apenas repetem CSS ou textos; utilizados tipos, build e inspeção de navegador. Nenhuma alteração de regras de negócio ou schema nesta etapa.

## Arquivos

- `frontend/src/app/page.tsx`: identificação e retratos.
- `frontend/src/features/dashboard.tsx`: composição dos estados sem dados.
- `frontend/src/app/reference-precision.css`: refinamento de proporções, perfil, botões e responsividade.
- `frontend/src/app/layout.tsx`: inclusão do refinamento de estilo.

O site continua destinado a acesso local em `http://192.168.0.233:3000`. Serviços mantidos ativos após validação, conforme solicitação anterior do usuário.
