# Plug Cloudflare — Instituto Teológico Kairós

O projeto está preparado para funcionar com **Cloudflare** de duas formas gratuitas e seguras:

## Opção 1: Compartilhar direto do seu computador (Cloudflare Tunnel, sem expor seu IP)
1. Garanta que o backend (`127.0.0.1:8000`) e o frontend (`127.0.0.1:3000`) estejam rodando.
2. Execute:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/tunel_cloudflare.ps1
   ```
3. Para uso externo completo (outro computador acessando também login, cursos e CRUD no PostgreSQL), rode um segundo túnel para `http://127.0.0.1:8000`, defina `SCHOOL_CORS_ORIGINS` com a URL HTTPS do frontend e compile o frontend com `NEXT_PUBLIC_API_URL=<URL_TUNEL_API>`.

## Opção 2: Cloudflare Pages (conectado ao GitHub)
1. Acesse o painel **Cloudflare Pages → Create application → Connect to Git**.
2. Selecione o repositório `araujofran/instituoKairos`.
3. Configure:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Environment variable**: `NEXT_PUBLIC_API_URL` apontando para a URL HTTPS da API FastAPI (ex.: Render Free ou túnel/VPS).
4. Os arquivos [wrangler.jsonc](../frontend/wrangler.jsonc) e [\_headers](../frontend/public/_headers) já estão configurados no projeto.
