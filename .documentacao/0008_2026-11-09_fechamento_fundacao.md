# 0008 — Fechamento da verificação da fundação

Data: 09/11/2026. Complementa o registro 0007 sem alterá-lo.

- Verificados 14 arquivos Markdown então existentes: nenhum link local quebrado.
- Artefato `frontend/out/index.html` presente após o build final.
- Sete registros históricos anteriores preservados.
- Servidores Next.js e Uvicorn usados para QA encerrados ao final; a URL local não fica ativa após esta entrega.
- Instância PostgreSQL exclusiva em `.local/postgres-test` encerrada com sucesso. O primeiro sinal de parada foi bloqueado pelo sandbox; repetido com aprovação, confirmou `server stopped`.
- O PostgreSQL instalado como serviço do usuário não foi alterado ou parado.
- Dados de teste e desenvolvimento permanecem no diretório local ignorado, sem exclusão de arquivos.
- Nenhum commit, push, publicação ou configuração de conta externa realizado.

## Retomar com a instância local criada nesta etapa

Alternativa ao Docker indisponível nesta máquina. Na raiz, para o cluster já criado:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D '.local\postgres-test' -l '.local\postgres-test.log' -o '-p 55432 -h 127.0.0.1' -w start
Set-Location backend
$env:SCHOOL_DATABASE_URL='postgresql+psycopg://school_test@127.0.0.1:55432/school_development'
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Em outro terminal, executar `npm.cmd run dev` dentro de `frontend`. Para testes, usar `school_foundation_test` como banco exclusivo; nunca redirecionar testes para banco escolar real. O cluster usa trust apenas para desenvolvimento em loopback e não é configuração publicável.

As instruções gerais, caminho Docker e configuração de autenticação estão em [README](../README.md). A próxima etapa continua sendo gestão de currículo e turmas, conforme o plano 0004 e as limitações do registro 0007.
