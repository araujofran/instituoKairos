"use client";

import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FolderPlus,
  GraduationCap,
  ListVideo,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  api,
  type Course,
  type CourseResource,
  type CourseResourceInput,
  type CourseResourcesBundle,
} from "@/lib/api";
import { safeHttpsUrl, youtubeThumbnailUrl } from "@/lib/bibliologia";

type FilterKind = "all" | "official" | "playlists" | "avulsos";

type EditorState = {
  mode: "create" | "edit";
  resourceId?: string;
  section: "official" | "playlist" | "video" | "pending";
  playlist_id: string | null;
  title: string;
  channel: string;
  duration: string;
  url: string;
  description: string;
  position: number;
  status: "published" | "draft" | "pending_url" | "unavailable";
};

const LEVELS = [
  "Todos",
  "Nível Básico",
  "Nível Médio / Bacharelado",
  "Nível Avançado / Pós-Graduação",
  "Mestrado em Teologia / Th.M.",
  "Imersões e Workshops",
];

export function BibliologiaAcervo({
  courses = [],
  token,
  canManage = false,
  selectedCourseSlug,
  onSelectCourseSlug,
  onOpenUploads,
}: {
  courses?: Course[];
  token?: string;
  canManage?: boolean;
  selectedCourseSlug?: string;
  onSelectCourseSlug?: (slug: string) => void;
  onOpenUploads?: () => void;
}) {
  const [internalSlug, setInternalSlug] = useState("bibliologia-critica-textual");
  const activeSlug = selectedCourseSlug || internalSlug;
  const [levelFilter, setLevelFilter] = useState("Todos");

  const [bundle, setBundle] = useState<CourseResourcesBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleCourses = useMemo(() => {
    if (levelFilter === "Todos") return courses;
    return courses.filter((c) => (c.level || "Geral") === levelFilter);
  }, [courses, levelFilter]);

  const activeCourse = useMemo(() => {
    const exact = courses.find((c) => c.slug === activeSlug);
    if (exact) return exact;
    return visibleCourses[0] || courses[0] || null;
  }, [courses, visibleCourses, activeSlug]);

  useEffect(() => {
    if (activeCourse?.level && levelFilter !== "Todos" && activeCourse.level !== levelFilter) {
      setLevelFilter(activeCourse.level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse?.slug]);

  async function loadResources(courseId: string) {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        canManage && token
          ? `/api/v1/admin/courses/${courseId}/resources`
          : `/api/v1/courses/${courseId}/resources`;
      const res = await api<CourseResourcesBundle>(endpoint, token);
      setBundle(res);
    } catch (e) {
      setError((e as Error).message);
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeCourse) {
      setLoading(false);
      setBundle(null);
      return;
    }
    setFilter("all");
    setQuery("");
    void loadResources(activeCourse.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse?.id, canManage, token]);

  function handleSelectSlug(slug: string) {
    if (onSelectCourseSlug) onSelectCourseSlug(slug);
    else setInternalSlug(slug);
  }

  function openCreate(
    section: EditorState["section"],
    playlistId: string | null = null,
    nextPos = 1
  ) {
    setEditor({
      mode: "create",
      section,
      playlist_id: playlistId,
      title: "",
      channel: "",
      duration: "",
      url: "",
      description: "",
      position: nextPos,
      status: section === "pending" ? "pending_url" : "published",
    });
  }

  function openEdit(item: CourseResource) {
    setEditor({
      mode: "edit",
      resourceId: item.id,
      section: item.section,
      playlist_id: item.playlist_id,
      title: item.title,
      channel: item.channel,
      duration: item.duration,
      url: item.url || "",
      description: item.description,
      position: item.position,
      status: item.status,
    });
  }

  async function submitEditor(e: FormEvent) {
    e.preventDefault();
    if (!editor || !activeCourse) return;
    setSaving(true);
    try {
      const payload: CourseResourceInput = {
        section: editor.section,
        playlist_id: editor.playlist_id,
        title: editor.title,
        channel: editor.channel,
        duration: editor.duration,
        url: editor.url.trim() ? editor.url.trim() : null,
        description: editor.description,
        position: Math.max(1, Number(editor.position) || 1),
        status: editor.status,
      };
      if (editor.mode === "create") {
        await api(`/api/v1/admin/courses/${activeCourse.id}/resources`, token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Recurso adicionado ao curso no banco de dados!");
      } else if (editor.resourceId) {
        await api(`/api/v1/admin/resources/${editor.resourceId}`, token, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Recurso atualizado com sucesso!");
      }
      setEditor(null);
      await loadResources(activeCourse.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeResource(item: CourseResource) {
    if (!activeCourse) return;
    if (!window.confirm(`Remover "${item.title}" deste curso?`)) return;
    try {
      await api(`/api/v1/admin/resources/${item.id}`, token, { method: "DELETE" });
      toast.success("Recurso removido do curso.");
      await loadResources(activeCourse.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

  const filteredOfficial = useMemo(() => {
    if (!bundle) return [];
    return bundle.official.filter((item) => {
      if (!normalizedQuery) return true;
      return `${item.title} ${item.channel}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    });
  }, [bundle, normalizedQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!bundle) return [];
    return bundle.playlists
      .map((pl) => {
        const lessons = pl.lessons.filter((aula) => {
          if (!normalizedQuery) return true;
          return `${aula.title} ${aula.channel} ${pl.title}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedQuery);
        });
        return { ...pl, lessons };
      })
      .filter((pl) => pl.lessons.length > 0 || !normalizedQuery);
  }, [bundle, normalizedQuery]);

  const filteredVideos = useMemo(() => {
    if (!bundle) return [];
    return bundle.videos.filter((item) => {
      if (!normalizedQuery) return true;
      return `${item.title} ${item.channel}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    });
  }, [bundle, normalizedQuery]);

  const totalCount = bundle
    ? bundle.official.length +
      bundle.videos.length +
      bundle.playlists.reduce((acc, pl) => acc + pl.lessons.length, 0)
    : 0;

  return (
    <div className="bibliologia-shell acervo-theme">
      {/* Filtro por Nível + Seletor Dinâmico de Curso */}
      <div className="course-selector-bar grid gap-3" role="region" aria-label="Filtrar e selecionar curso">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0e5f6e] mr-1">
            <Sparkles size={14} className="text-[#e8644b]" /> Nível:
          </span>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`filter-pill ${levelFilter === lvl ? "active" : ""}`}
              onClick={() => {
                setLevelFilter(lvl);
                const first =
                  lvl === "Todos"
                    ? courses[0]
                    : courses.find((c) => (c.level || "Geral") === lvl);
                if (first) handleSelectSlug(first.slug);
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#efe4d2]">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0e5f6e] mr-1">
            <GraduationCap size={15} className="text-[#0f7687]" /> Curso ({visibleCourses.length}):
          </span>
          <select
            aria-label="Escolher curso do acervo"
            value={activeCourse?.slug || ""}
            onChange={(e) => handleSelectSlug(e.target.value)}
            className="min-w-[280px] max-w-full rounded-full border border-[#bce4ea] bg-[#f4fbfc] px-4 py-2 text-[13px] font-semibold text-[#0d4d59] outline-none focus:border-[#0f7687]"
          >
            {visibleCourses.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.title} · {c.level || "Geral"} {c.status === "draft" ? "(Rascunho)" : ""}
              </option>
            ))}
          </select>
          {activeCourse?.level && (
            <span className="ds-pill sky">{activeCourse.level}</span>
          )}
        </div>
      </div>

      {activeCourse && (
        <motion.section
          className="acervo-hero"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#c7f2f8]">
              ACERVO DINÂMICO · {activeCourse.level || "FORMAÇÃO TEOLÓGICA"}
            </span>
            <h2>{activeCourse.title}</h2>
            <p>
              {activeCourse.description ||
                "Fontes oficiais, playlists estruturadas e vídeos do curso gerenciados diretamente no banco de dados."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="ds-pill sage">
              <CheckCircle2 size={13} /> {totalCount} recursos
            </span>
            <span className="ds-pill sky">
              <ListVideo size={13} /> {bundle?.playlists.length ?? 0} playlists
            </span>
          </div>
        </motion.section>
      )}

      {canManage && activeCourse && (
        <div className="acervo-admin-bar" role="region" aria-label="Controles do Administrador">
          <div className="flex items-center gap-2.5">
            <span className="acervo-medallion">
              <Plus size={18} />
            </span>
            <div>
              <strong className="text-[13px] text-[#0d5461] block">
                Painel do Administrador — Gerenciar Acervo deste Curso
              </strong>
              <span className="text-[11px] text-[#5e7178]">
                Adicione novos vídeos, troque links existentes, crie playlists ou remova itens em tempo real.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-acervo-coral"
              onClick={() => openCreate("video", null, (bundle?.videos.length || 0) + 1)}
            >
              <Plus size={14} /> Novo Vídeo / Link
            </button>
            <button
              type="button"
              className="btn-acervo-teal"
              onClick={() => openCreate("playlist", null, (bundle?.playlists.length || 0) + 1)}
            >
              <ListVideo size={14} /> Nova Playlist
            </button>
            <button
              type="button"
              className="btn-acervo-soft"
              onClick={() => openCreate("official", null, (bundle?.official.length || 0) + 1)}
            >
              <Sparkles size={13} /> Fonte Oficial
            </button>
            <button
              type="button"
              className="btn-acervo-soft"
              onClick={() => openCreate("pending", null, (bundle?.pending.length || 0) + 1)}
            >
              <AlertCircle size={13} /> Pendência
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <section className="panel module-state" role="status">
          <h2>Carregando acervo de {activeCourse?.title || "cursos"}…</h2>
          <p>Buscando playlists, vídeos e fontes oficiais diretamente do PostgreSQL.</p>
        </section>
      ) : error ? (
        <section className="panel module-state" role="alert">
          <h2>Não foi possível carregar o acervo</h2>
          <p>{error}</p>
        </section>
      ) : !activeCourse || !bundle ? (
        <section className="panel module-state">
          <h2>Nenhum curso selecionado</h2>
          <p>Cadastre ou selecione um curso para visualizar e gerenciar os recursos.</p>
        </section>
      ) : totalCount === 0 && bundle.pending.length === 0 ? (
        <section className="panel module-state">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2 max-w-[640px]">
              <span className="eyebrow">CURSO PRONTO PARA POPULAR</span>
              <h2 className="text-[28px] font-semibold text-[#0d5461] m-0">
                {activeCourse.title}
              </h2>
              <p className="m-0">
                Este curso ainda não possui vídeos ou playlists cadastrados.{" "}
                {canManage
                  ? "Use os botões acima (+ Novo Vídeo / Link, + Nova Playlist, + Fonte Oficial) para começar a montar este módulo agora."
                  : "Os recursos audiovisuais aparecerão aqui assim que forem publicados pela coordenação."}
              </p>
            </div>
            <BookOpen size={42} className="text-[#12899b] opacity-80" />
          </div>
          {onOpenUploads && (
            <div className="mt-4">
              <button type="button" className="btn-acervo-soft" onClick={onOpenUploads}>
                <FolderPlus size={14} /> Ver Arquivos & Uploads da Escola
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="filter-pills" role="tablist" aria-label="Filtrar recursos do curso">
              {(
                [
                  ["all", `Todos (${totalCount})`],
                  ["official", `Fontes Oficiais (${bundle.official.length})`],
                  ["playlists", `Playlists (${bundle.playlists.length})`],
                  ["avulsos", `Vídeos Avulsos (${bundle.videos.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={`filter-pill ${filter === key ? "active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="catalog-search" style={{ marginBottom: 0, minWidth: 260, background: "#fff" }}>
              <Search size={16} />
              <input
                aria-label="Filtrar aulas e vídeos"
                placeholder="Pesquisar neste curso…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          {(filter === "all" || filter === "official") && filteredOfficial.length > 0 && (
            <section aria-labelledby="sec-oficiais">
              <div className="section-heading" style={{ marginBottom: 12 }}>
                <h2 id="sec-oficiais" className="flex items-center gap-2.5 text-[#0d5461]">
                  <span className="acervo-medallion" style={{ width: 34, height: 34 }}>
                    <Sparkles size={16} />
                  </span>
                  Fontes Oficiais Confirmadas
                </h2>
              </div>
              <div className="official-grid">
                {filteredOfficial.map((item) => {
                  const href = safeHttpsUrl(item.url);
                  return (
                    <motion.article
                      key={item.id}
                      className="official-card"
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="ds-pill sky">
                            {item.duration?.toLowerCase().includes("podcast") ? (
                              <Radio size={12} />
                            ) : (
                              <BookOpenCheck size={12} />
                            )}
                            Fonte Oficial
                          </span>
                          {item.status === "draft" && <span className="ds-pill gold">Rascunho</span>}
                        </div>
                        <h3 className="text-[#0d5461]">{item.title}</h3>
                        <div className="lesson-meta">
                          {item.channel && (
                            <span className="inline-flex items-center gap-1">
                              <UserRound size={12} /> {item.channel}
                            </span>
                          )}
                          {item.duration && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock size={12} /> {item.duration}
                            </span>
                          )}
                        </div>
                        {item.description && <p>{item.description}</p>}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {href && (
                          <a
                            className="btn-acervo-coral"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir Fonte <ExternalLink size={13} />
                          </a>
                        )}
                        {canManage && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="btn-acervo-soft"
                              onClick={() => openEdit(item)}
                              title="Editar ou trocar link"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              type="button"
                              className="icon-button text-[#b83e2b]"
                              onClick={() => void removeResource(item)}
                              aria-label={`Remover ${item.title}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          )}

          {(filter === "all" || filter === "playlists") && filteredPlaylists.length > 0 && (
            <section aria-labelledby="sec-playlists">
              <div className="section-heading" style={{ marginBottom: 12 }}>
                <h2 id="sec-playlists" className="flex items-center gap-2.5 text-[#0d5461]">
                  <span className="acervo-medallion" style={{ width: 34, height: 34 }}>
                    <ListVideo size={16} />
                  </span>
                  Playlists Estruturadas
                </h2>
              </div>

              <Accordion.Root
                type="multiple"
                defaultValue={[filteredPlaylists[0]?.id || ""]}
                className="playlist-accordion-list"
              >
                {filteredPlaylists.map((playlist) => {
                  const playlistHref = safeHttpsUrl(playlist.url);
                  return (
                    <Accordion.Item
                      key={playlist.id}
                      value={playlist.id}
                      className="playlist-accordion-item"
                    >
                      <div className="playlist-trigger-row">
                        <Accordion.Header asChild>
                          <div className="flex flex-1 items-center gap-3 min-w-[240px]">
                            <Accordion.Trigger className="playlist-trigger-btn">
                              <span className="playlist-chevron" aria-hidden="true">
                                <ChevronDown size={16} />
                              </span>
                              <div>
                                <h3 className="text-[16px] font-bold text-[#0d5461] m-0">
                                  {playlist.title}
                                </h3>
                                <div className="lesson-meta mt-1">
                                  <span>{playlist.channel || "Canal não informado"}</span>
                                  <span>·</span>
                                  <span>{playlist.lessons.length} aula(s)</span>
                                </div>
                              </div>
                            </Accordion.Trigger>
                          </div>
                        </Accordion.Header>

                        <div className="flex flex-wrap items-center gap-2">
                          {playlistHref && (
                            <a
                              className="btn-acervo-teal"
                              href={playlistHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir Playlist <ExternalLink size={13} />
                            </a>
                          )}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="btn-acervo-soft"
                                onClick={() =>
                                  openCreate("video", playlist.id, playlist.lessons.length + 1)
                                }
                              >
                                <Plus size={12} /> Aula
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => openEdit(playlist)}
                                aria-label={`Editar playlist ${playlist.title}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-button text-[#b83e2b]"
                                onClick={() => void removeResource(playlist)}
                                aria-label={`Remover playlist ${playlist.title}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <Accordion.Content className="playlist-lessons">
                        {playlist.lessons.map((aula, idx) => {
                          const videoHref = safeHttpsUrl(aula.url);
                          const isOk = aula.status === "published";
                          return (
                            <div className="lesson-row" key={aula.id}>
                              <span className="lesson-num">
                                {String(aula.position || idx + 1).padStart(2, "0")}
                              </span>
                              <div className="lesson-info">
                                <h4>{aula.title}</h4>
                                <div className="lesson-meta">
                                  {aula.channel && (
                                    <span className="inline-flex items-center gap-1">
                                      <UserRound size={12} /> {aula.channel}
                                    </span>
                                  )}
                                  {aula.duration && (
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                      <Clock size={12} /> {aula.duration}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="lesson-actions">
                                {isOk ? (
                                  <span className="ds-pill sage">
                                    <CheckCircle2 size={12} /> Disponível
                                  </span>
                                ) : (
                                  <span className="ds-pill gold">{aula.status}</span>
                                )}

                                {videoHref && (
                                  <a
                                    className="btn-acervo-coral"
                                    href={videoHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Play size={12} /> Assistir Aula
                                    <ExternalLink size={12} />
                                  </a>
                                )}

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      className="icon-button"
                                      onClick={() => openEdit(aula)}
                                      aria-label={`Editar ${aula.title}`}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-button text-[#b83e2b]"
                                      onClick={() => void removeResource(aula)}
                                      aria-label={`Remover ${aula.title}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </section>
          )}

          {bundle.pending.length > 0 && (filter === "all" || filter === "playlists") && (
            <div className="grid gap-2">
              {bundle.pending.map((pend) => (
                <div
                  key={pend.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eed8ad] bg-[#fffcf4] px-5 py-3.5"
                >
                  <div>
                    <strong className="text-[13px] text-[#0d5461]">{pend.title}</strong>
                    <p className="text-[11px] text-[#6d6659] mt-0.5">
                      {pend.channel} · {pend.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="ds-pill gold">Status: {pend.status}</span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="btn-acervo-soft"
                          onClick={() => openEdit(pend)}
                        >
                          <Pencil size={12} /> Definir URL
                        </button>
                        <button
                          type="button"
                          className="icon-button text-[#b83e2b]"
                          onClick={() => void removeResource(pend)}
                          aria-label={`Remover ${pend.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(filter === "all" || filter === "avulsos") && filteredVideos.length > 0 && (
            <section aria-labelledby="sec-avulsos">
              <div className="section-heading" style={{ marginBottom: 12 }}>
                <h2 id="sec-avulsos" className="flex items-center gap-2.5 text-[#0d5461]">
                  <span className="acervo-medallion" style={{ width: 34, height: 34 }}>
                    <Video size={16} />
                  </span>
                  Vídeos Avulsos
                </h2>
              </div>

              <div className="avulsos-grid">
                {filteredVideos.map((video) => {
                  const videoHref = safeHttpsUrl(video.url);
                  const thumb = youtubeThumbnailUrl(video.url);
                  const available = video.status === "published";
                  return (
                    <article className="video-card" key={video.id}>
                      <div className="grid gap-3">
                        {thumb && (
                          <a
                            href={videoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="video-thumb-wrap block"
                            aria-label={`Assistir ${video.title} no YouTube`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumb} alt={video.title} loading="lazy" />
                            <div className="video-thumb-play">
                              <span>
                                <Play size={18} fill="#0e5f6e" />
                              </span>
                            </div>
                            <div className="video-thumb-bottom">
                              <span className={`ds-pill ${available ? "sage" : "warn"}`}>
                                <CheckCircle2 size={11} />{" "}
                                {available ? "Validado ✓" : video.status}
                              </span>
                              {video.duration && (
                                <span className="video-duration-pill">{video.duration}</span>
                              )}
                            </div>
                          </a>
                        )}

                        <div className="grid gap-1">
                          <h3 className="text-[16px] font-bold text-[#0d5461] leading-snug">
                            {video.title}
                          </h3>
                          <div className="lesson-meta">
                            {video.channel && (
                              <span className="inline-flex items-center gap-1">
                                <UserRound size={12} /> {video.channel}
                              </span>
                            )}
                            {video.duration && (
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock size={12} /> {video.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {videoHref && (
                          <a
                            className="btn-acervo-coral flex-1"
                            href={videoHref}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Play size={12} /> Assistir Aula
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn-acervo-soft"
                              onClick={() => openEdit(video)}
                            >
                              <Pencil size={12} /> Trocar / Editar
                            </button>
                            <button
                              type="button"
                              className="icon-button text-[#b83e2b]"
                              onClick={() => void removeResource(video)}
                              aria-label={`Remover ${video.title}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal Admin: Adicionar ou Editar / Trocar Vídeo, Playlist ou Fonte */}
      <Dialog.Root
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            className="cmdk-backdrop"
            style={{ alignItems: "center", paddingTop: 24 }}
          />
          <Dialog.Content
            className="transcript-dialog"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              width: 560,
            }}
          >
            <div className="transcript-dialog-header">
              <div>
                <span className="eyebrow">ADMINISTRAÇÃO DO ACERVO</span>
                <Dialog.Title className="text-[22px] font-semibold text-[#0d5461]">
                  {editor?.mode === "create"
                    ? "Adicionar recurso ao curso"
                    : "Editar / Trocar recurso"}
                </Dialog.Title>
                <Dialog.Description className="text-[12px] text-[#646f78]">
                  Curso: {activeCourse?.title}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="icon-button" aria-label="Fechar">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {editor && (
              <form onSubmit={submitEditor} className="p-6 grid gap-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461]">
                    Tipo
                    <select
                      value={editor.section}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          section: e.target.value as EditorState["section"],
                        })
                      }
                      className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                    >
                      <option value="video">Vídeo / Aula</option>
                      <option value="playlist">Playlist</option>
                      <option value="official">Fonte Oficial</option>
                      <option value="pending">Pendência</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461]">
                    Status
                    <select
                      value={editor.status}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          status: e.target.value as EditorState["status"],
                        })
                      }
                      className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                    >
                      <option value="published">Publicado</option>
                      <option value="draft">Rascunho (só equipe)</option>
                      <option value="pending_url">Pendente de URL</option>
                      <option value="unavailable">Indisponível</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461]">
                  Título
                  <input
                    required
                    minLength={2}
                    maxLength={300}
                    value={editor.title}
                    onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                    className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                    placeholder="Ex.: Aula 01 — Introdução à Teontologia"
                  />
                </label>

                <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461]">
                  URL (https://...)
                  <input
                    type="url"
                    required={editor.section !== "pending"}
                    value={editor.url}
                    onChange={(e) => setEditor({ ...editor, url: e.target.value })}
                    className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461] col-span-1">
                    Duração
                    <input
                      value={editor.duration}
                      onChange={(e) => setEditor({ ...editor, duration: e.target.value })}
                      className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                      placeholder="18:40"
                    />
                  </label>
                  <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461] col-span-1">
                    Ordem
                    <input
                      type="number"
                      min={1}
                      value={editor.position}
                      onChange={(e) =>
                        setEditor({ ...editor, position: Number(e.target.value) || 1 })
                      }
                      className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461] col-span-1">
                    Canal / Autor
                    <input
                      value={editor.channel}
                      onChange={(e) => setEditor({ ...editor, channel: e.target.value })}
                      className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                      placeholder="Canal"
                    />
                  </label>
                </div>

                <label className="grid gap-1 text-[12px] font-semibold text-[#0d5461]">
                  Descrição / Observação
                  <textarea
                    rows={3}
                    value={editor.description}
                    onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                    className="rounded-xl border border-[#d6e4e7] px-3 py-2 bg-white font-normal"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-acervo-soft"
                    onClick={() => setEditor(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="btn-acervo-coral">
                    {saving ? "Salvando…" : "Salvar no Banco"}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
