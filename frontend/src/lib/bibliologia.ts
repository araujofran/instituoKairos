export type BibliologiaVideoItem = {
  id: string;
  ordem?: number;
  titulo_informado: string;
  titulo_original: string;
  canal: string;
  duracao: string;
  duracao_segundos?: number | null;
  url_direta: string;
  playlist_origem?: string | null;
  status: string;
  motivo_erro?: string | null;
  tipo?: string;
  descricao?: string;
};

export type BibliologiaPlaylist = {
  id: string;
  slug: string;
  titulo_informado: string;
  titulo_original: string;
  canal: string;
  url_playlist: string;
  status: string;
  motivo_erro?: string | null;
  total_itens_playlist: number;
  itens_bibliologia?: number;
  itens_filtrados_outros_modulos?: number;
  aulas: BibliologiaVideoItem[];
};

export type BibliologiaPendencia = {
  id: string;
  titulo_informado: string;
  canal: string;
  status: string;
  observacao: string;
};

export type BibliologiaCatalogo = {
  modulo: string;
  gerado_em: string;
  resumo: {
    total_videos_processados: number;
    disponiveis?: number;
    transcritos_com_sucesso?: number;
    indisponiveis_ou_erro: number;
    total_playlists: number;
    total_fontes_oficiais: number;
    pendencias: number;
  };
  fontes_oficiais: BibliologiaVideoItem[];
  playlists: BibliologiaPlaylist[];
  avulsos: BibliologiaVideoItem[];
  pendencias: BibliologiaPendencia[];
};

export type AcervoIndexEntry = {
  slug: string;
  titulo: string;
  modulo: string;
  catalogo_url: string;
};

export function safeHttpsUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export function extractYoutubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const id = urlOrId.startsWith("http") ? extractYoutubeVideoId(urlOrId) : urlOrId;
  if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export async function fetchAcervosIndex(): Promise<AcervoIndexEntry[]> {
  try {
    const res = await fetch("/data/acervos/index.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { cursos?: AcervoIndexEntry[] };
    return data.cursos || [];
  } catch {
    return [];
  }
}

export async function fetchCourseCatalogo(
  slug = "bibliologia-critica-textual",
  customUrl?: string
): Promise<BibliologiaCatalogo | null> {
  const candidates = [
    customUrl,
    `/data/${slug}/catalogo_videos.json`,
    slug === "bibliologia-critica-textual" ? "/data/bibliologia/catalogo_videos.json" : undefined,
  ].filter((u): u is string => Boolean(u));

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return (await response.json()) as BibliologiaCatalogo;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function fetchBibliologiaCatalogo(): Promise<BibliologiaCatalogo> {
  const result = await fetchCourseCatalogo("bibliologia-critica-textual");
  if (!result) {
    throw new Error("Catálogo de Bibliologia ainda não disponível.");
  }
  return result;
}
