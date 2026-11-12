#!/usr/bin/env python3
"""
Processador de curadoria audiovisual — Módulo 1: Bibliologia (Instituto Teológico Kairós).

Valida disponibilidade e extrai metadados reais de vídeos avulsos e playlists do YouTube
via yt-dlp (--flat-playlist + skip_download), consolidando data/bibliologia/catalogo_videos.json
e o espelho estático em frontend/public/data/bibliologia/catalogo_videos.json.
"""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import yt_dlp

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "bibliologia"
PUBLIC_MIRROR_DIR = ROOT / "frontend" / "public" / "data" / "bibliologia"

FONTES_OFICIAIS = [
    {
        "id": "oficial-bibleproject-colecao",
        "titulo_informado": "Como ler a Bíblia — coleção BibleProject em português",
        "canal": "BibleProject Português",
        "tipo": "colecao_web",
        "url_direta": "https://bibleproject.com/pt-br/videos/collections/como-ler-a-biblia/",
        "descricao": "Série introdutória com panorama bíblico, história da formação e gêneros literários.",
    },
    {
        "id": "oficial-bibleproject-o-que-e-biblia",
        "titulo_informado": "O que é a Bíblia? — BibleProject Português",
        "canal": "BibleProject Português",
        "tipo": "youtube_video",
        "url_direta": "https://www.youtube.com/watch?v=C4ESqtwjqQo",
        "descricao": "Visão geral sobre a origem, biblioteca de livros e unidade narrativa das Escrituras.",
    },
    {
        "id": "oficial-vida-nova-podcast-06",
        "titulo_informado": "Introdução geral à Bíblia — Podcast Vida Nova nº 6",
        "canal": "Edições Vida Nova",
        "tipo": "audio_referencia",
        "url_direta": "https://www.vidanova.com.br/loja/noticia.php?id=154&loja=803335",
        "descricao": "Episódio oficial da editora apresentando temas introdutórios e bibliografia de Bibliologia.",
    },
]

VIDEOS_AVULSOS = [
    ("Bibliologia — Doutrina das Escrituras: O que é", "https://www.youtube.com/watch?v=IjrgzScEC1Q"),
    ("Bibliologia, Aula 1 — Teologia para Todos", "https://www.youtube.com/watch?v=l8XzznelqlA"),
    ("Bibliologia, Aula 1 — Básico ao Avançado", "https://www.youtube.com/watch?v=kH2B82N1H-g"),
    ("Lição 1 — A importância das Escrituras", "https://www.youtube.com/watch?v=dA-aizw_OYs"),
    ("Introdução Bíblica — Aula 01", "https://www.youtube.com/watch?v=KbFU0lU_4DM"),
    ("Curso Básico — Preachers Academy", "https://www.youtube.com/watch?v=VMAmWwsoa_8"),
    ("Como o cânon bíblico foi formado? — Tiago Abdalla", "https://www.youtube.com/watch?v=9V_zAkkjbbE"),
    ("A História do Cânon Bíblico", "https://www.youtube.com/watch?v=R9oX4VqVr7k"),
    ("Aula 2 — O Cânon da Bíblia", "https://www.youtube.com/watch?v=17l5Mt7yH4c"),
    ("Bibliologia I — Aula 2", "https://www.youtube.com/watch?v=3nd5WR8Jzqw"),
]


@dataclass(frozen=True)
class PlaylistConfig:
    id: str
    slug: str
    titulo_informado: str
    atribuicao: str
    url: str
    filtrar_bibliologia: bool = False


PLAYLISTS_CANDIDATAS = [
    PlaylistConfig(
        id="playlist-canon-formacao",
        slug="canon_formacao_biblia",
        titulo_informado="Cânon e formação da Bíblia",
        atribuicao="Dois Dedos de Teologia",
        url="https://www.youtube.com/playlist?list=PLRPNvughqc8RMSvK-55793t7xTf2YjN23",
    ),
    PlaylistConfig(
        id="playlist-bibliologia-i",
        slug="bibliologia_i_tudo_sobre_biblia",
        titulo_informado="Bibliologia I — Tudo sobre a Bíblia Sagrada",
        atribuicao="A confirmar via YouTube",
        url="https://www.youtube.com/playlist?list=PLOQk3W9V5NFynfmNV9IbjrQnSQBTU-Pex",
    ),
    PlaylistConfig(
        id="playlist-teologia-sistematica",
        slug="curso_teologia_sistematica",
        titulo_informado="Curso de Teologia Sistemática (Aulas de Bibliologia)",
        atribuicao="A confirmar via YouTube",
        url="https://www.youtube.com/playlist?list=PLp5NR13WIfQlTmES2cfkcHBLOve3dmO6Y",
        filtrar_bibliologia=True,
    ),
]

BIBLIOLOGIA_KEYWORDS = (
    "bibliologia",
    "bibliology",
    "bíblia",
    "biblia",
    "escritura",
    "cânon",
    "canon",
    "inspiração",
    "inerrância",
    "manuscrito",
)


def extract_youtube_id(url: str) -> str | None:
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()
    if host not in {"www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"}:
        return None
    if host == "youtu.be":
        vid = parsed.path.strip("/").split("/")[0]
        return vid or None
    if parsed.path == "/watch":
        return parse_qs(parsed.query).get("v", [None])[0]
    if parsed.path.startswith("/shorts/"):
        parts = parsed.path.strip("/").split("/")
        return parts[1] if len(parts) > 1 else None
    return None


def slugify(value: str, max_len: int = 64) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", value.lower(), flags=re.UNICODE)
    cleaned = re.sub(r"[-\s]+", "_", cleaned).strip("_")
    return (cleaned or "video")[:max_len]


def format_duration(seconds: int | float | None) -> str:
    if not seconds or seconds <= 0:
        return "Duração não informada"
    total = int(seconds)
    hours, rem = divmod(total, 3600)
    minutes, secs = divmod(rem, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def is_bibliologia_topic(title: str) -> bool:
    lower = title.lower()
    return any(kw in lower for kw in BIBLIOLOGIA_KEYWORDS)


def ydl_base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "http_headers": {"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.5"},
        "extractor_args": {"youtube": {"lang": ["pt"]}},
    }


def fetch_video_metadata(url: str) -> tuple[dict[str, Any] | None, str | None]:
    opts = {**ydl_base_opts(), "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return None, "Metadados vazios retornados pelo YouTube."
            return info, None
    except yt_dlp.utils.DownloadError as exc:
        msg = str(exc)
        if any(
            tok in msg.lower()
            for tok in ("unavailable", "private", "removed", "terminated", "does not exist")
        ):
            return None, f"indisponivel: {msg.splitlines()[0]}"
        return None, f"erro_acesso: {msg.splitlines()[0]}"
    except Exception as exc:  # noqa: BLE001
        return None, f"erro_acesso: {exc}"


def process_single_video(
    *,
    url: str,
    titulo_informado: str,
    playlist_origem: str | None,
) -> dict[str, Any]:
    video_id = extract_youtube_id(url)
    if not video_id:
        return {
            "id": slugify(titulo_informado),
            "titulo_informado": titulo_informado,
            "titulo_original": titulo_informado,
            "canal": "Desconhecido",
            "duracao": "—",
            "duracao_segundos": None,
            "url_direta": url,
            "playlist_origem": playlist_origem,
            "status": "erro_acesso",
            "motivo_erro": "URL do YouTube inválida ou sem identificador.",
        }

    info, meta_err = fetch_video_metadata(url)
    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    if meta_err or info is None:
        status = "indisponivel" if (meta_err or "").startswith("indisponivel:") else "erro_acesso"
        return {
            "id": video_id,
            "titulo_informado": titulo_informado,
            "titulo_original": titulo_informado,
            "canal": "Não confirmado",
            "duracao": "—",
            "duracao_segundos": None,
            "url_direta": canonical_url,
            "playlist_origem": playlist_origem,
            "status": status,
            "motivo_erro": meta_err,
        }

    titulo_original = (info.get("title") or titulo_informado).strip()
    canal = (info.get("channel") or info.get("uploader") or "Canal não identificado").strip()
    duration_sec = info.get("duration")
    duracao = format_duration(duration_sec)

    return {
        "id": video_id,
        "titulo_informado": titulo_informado,
        "titulo_original": titulo_original,
        "canal": canal,
        "duracao": duracao,
        "duracao_segundos": duration_sec,
        "url_direta": canonical_url,
        "playlist_origem": playlist_origem,
        "status": "disponivel",
    }


def process_playlist(cfg: PlaylistConfig) -> dict[str, Any]:
    opts = {**ydl_base_opts(), "extract_flat": True, "ignoreerrors": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(cfg.url, download=False)
    except Exception as exc:  # noqa: BLE001
        return {
            "id": cfg.id,
            "slug": cfg.slug,
            "titulo_informado": cfg.titulo_informado,
            "titulo_original": cfg.titulo_informado,
            "canal": cfg.atribuicao,
            "url_playlist": cfg.url,
            "status": "erro_acesso",
            "motivo_erro": str(exc),
            "total_itens_playlist": 0,
            "aulas": [],
        }

    if not info:
        return {
            "id": cfg.id,
            "slug": cfg.slug,
            "titulo_informado": cfg.titulo_informado,
            "titulo_original": cfg.titulo_informado,
            "canal": cfg.atribuicao,
            "url_playlist": cfg.url,
            "status": "indisponivel",
            "motivo_erro": "Playlist não retornou dados.",
            "total_itens_playlist": 0,
            "aulas": [],
        }

    raw_entries = [e for e in (info.get("entries") or []) if e and e.get("id")]
    playlist_title = (info.get("title") or cfg.titulo_informado).strip()
    playlist_channel = (info.get("uploader") or info.get("channel") or cfg.atribuicao).strip()

    aulas: list[dict[str, Any]] = []
    ignoradas_outro_modulo = 0
    for idx, entry in enumerate(raw_entries, 1):
        vid = entry["id"]
        entry_title = (entry.get("title") or f"Aula {idx:02d}").strip()
        if cfg.filtrar_bibliologia and not is_bibliologia_topic(entry_title):
            ignoradas_outro_modulo += 1
            continue

        video_url = f"https://www.youtube.com/watch?v={vid}"
        duration_sec = entry.get("duration")
        if duration_sec:
            result = {
                "id": vid,
                "ordem": idx,
                "titulo_informado": entry_title,
                "titulo_original": entry_title,
                "canal": (entry.get("channel") or entry.get("uploader") or playlist_channel).strip(),
                "duracao": format_duration(duration_sec),
                "duracao_segundos": duration_sec,
                "url_direta": video_url,
                "playlist_origem": playlist_title,
                "status": "disponivel",
            }
        else:
            result = process_single_video(
                url=video_url,
                titulo_informado=entry_title,
                playlist_origem=playlist_title,
            )
            result["ordem"] = idx
        aulas.append(result)

    return {
        "id": cfg.id,
        "slug": cfg.slug,
        "titulo_informado": cfg.titulo_informado,
        "titulo_original": playlist_title,
        "canal": playlist_channel,
        "url_playlist": cfg.url,
        "status": "disponivel",
        "total_itens_playlist": len(raw_entries),
        "itens_bibliologia": len(aulas),
        "itens_filtrados_outros_modulos": ignoradas_outro_modulo,
        "aulas": aulas,
    }


def sync_public_mirror(catalog_path: Path) -> None:
    PUBLIC_MIRROR_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(catalog_path, PUBLIC_MIRROR_DIR / "catalogo_videos.json")


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/3] Validando fontes oficiais confirmadas...")
    fontes_processadas: list[dict[str, Any]] = []
    for fonte in FONTES_OFICIAIS:
        item = dict(fonte)
        if fonte["tipo"] == "youtube_video":
            video_data = process_single_video(
                url=fonte["url_direta"],
                titulo_informado=fonte["titulo_informado"],
                playlist_origem="Fonte Oficial Confirmada",
            )
            item.update(video_data)
            item["tipo"] = "youtube_video"
            item["descricao"] = fonte["descricao"]
        else:
            item["titulo_original"] = fonte["titulo_informado"]
            item["status"] = "confirmado_externo"
            item["duracao"] = "Coleção / Podcast"
        fontes_processadas.append(item)

    print("[2/3] Validando vídeos individuais candidatos...")
    avulsos_processados: list[dict[str, Any]] = []
    for idx, (titulo, url) in enumerate(VIDEOS_AVULSOS, 1):
        print(f"  -> ({idx}/{len(VIDEOS_AVULSOS)}) {titulo}")
        avulsos_processados.append(
            process_single_video(
                url=url,
                titulo_informado=titulo,
                playlist_origem=None,
            )
        )

    print("[3/3] Expandindo playlists...")
    playlists_processadas: list[dict[str, Any]] = []
    for cfg in PLAYLISTS_CANDIDATAS:
        print(f"  -> Playlist: {cfg.titulo_informado}")
        playlists_processadas.append(process_playlist(cfg))

    pendencias = [
        {
            "id": "pendencia-sbb",
            "titulo_informado": "Bibliologia — atribuição à SBB",
            "canal": "Sociedade Bíblica do Brasil (SBB)",
            "status": "pendente_url",
            "observacao": "URL oficial não fornecida na curadoria inicial; aguardando localização de fonte oficial.",
        }
    ]

    all_videos = (
        [f for f in fontes_processadas if f.get("tipo") == "youtube_video"]
        + avulsos_processados
        + [aula for pl in playlists_processadas for aula in pl["aulas"]]
    )
    disponiveis = [v for v in all_videos if v.get("status") == "disponivel"]
    falhas = [v for v in all_videos if v.get("status") in {"indisponivel", "erro_acesso"}]

    catalogo = {
        "modulo": "Módulo 1 — Bibliologia (Doutrina das Escrituras)",
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "resumo": {
            "total_videos_processados": len(all_videos),
            "disponiveis": len(disponiveis),
            "indisponiveis_ou_erro": len(falhas),
            "total_playlists": len(playlists_processadas),
            "total_fontes_oficiais": len(fontes_processadas),
            "pendencias": len(pendencias),
        },
        "fontes_oficiais": fontes_processadas,
        "playlists": playlists_processadas,
        "avulsos": avulsos_processados,
        "pendencias": pendencias,
    }

    catalog_path = DATA_DIR / "catalogo_videos.json"
    catalog_path.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2), encoding="utf-8")
    sync_public_mirror(catalog_path)

    print("\n=== RELATÓRIO FINAL ===")
    print(f"Total de vídeos avaliados: {len(all_videos)}")
    print(f"Disponíveis e validados:   {len(disponiveis)}")
    print(f"Falhas / Indisponíveis:    {len(falhas)}")
    for pl in playlists_processadas:
        print(
            f"  - Playlist '{pl['titulo_original']}': {len(pl['aulas'])} aulas do módulo "
            f"(de {pl['total_itens_playlist']} itens na playlist)"
        )
    if falhas:
        print("URLs com falha:")
        for item in falhas:
            print(f"  * {item['url_direta']} -> {item['status']} ({item.get('motivo_erro')})")


if __name__ == "__main__":
    main()
