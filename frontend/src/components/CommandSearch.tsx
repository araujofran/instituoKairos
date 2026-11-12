"use client";

import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Home,
  ListVideo,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import type { Course } from "@/lib/api";
import {
  fetchBibliologiaCatalogo,
  safeHttpsUrl,
  type BibliologiaCatalogo,
} from "@/lib/bibliologia";

export function CommandSearch({
  open,
  onOpenChange,
  courses,
  onNavigateView,
  onOpenAcervo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onNavigateView: (view: string, label?: string) => void;
  onOpenAcervo: (courseSlug?: string) => void;
}) {
  const [catalogo, setCatalogo] = useState<BibliologiaCatalogo | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || catalogo) return;
    void fetchBibliologiaCatalogo()
      .then(setCatalogo)
      .catch(() => {});
  }, [open, catalogo]);

  const allVideos = useMemo(() => {
    if (!catalogo) return [];
    return [
      ...catalogo.fontes_oficiais,
      ...catalogo.avulsos,
      ...catalogo.playlists.flatMap((pl) => pl.aulas),
    ];
  }, [catalogo]);

  if (!open) return null;

  return (
    <div
      className="cmdk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida da escola"
      onClick={() => onOpenChange(false)}
    >
      <div className="cmdk-dialog" onClick={(e) => e.stopPropagation()}>
        <Command label="Busca rápida Instituto Kairós">
          <div className="cmdk-input-wrap">
            <Search size={17} className="text-[#8a7b64]" />
            <Command.Input
              autoFocus
              placeholder="Buscar cursos, aulas, vídeos ou playlists…"
            />
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar busca"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} />
            </button>
          </div>

          <Command.List className="cmdk-list">
            <Command.Empty className="py-8 text-center text-[13px] text-[#6e777c]">
              Nenhum resultado encontrado para sua pesquisa.
            </Command.Empty>

            <Command.Group heading="Navegação">
              <Command.Item
                className="cmdk-item"
                onSelect={() => {
                  onNavigateView("home");
                  onOpenChange(false);
                }}
              >
                <Home size={15} /> Painel Inicial
              </Command.Item>
              <Command.Item
                className="cmdk-item"
                onSelect={() => {
                  onOpenAcervo("bibliologia-critica-textual");
                  onOpenChange(false);
                }}
              >
                <Sparkles size={15} className="text-[#c88a1e]" /> Biblioteca Digital · Acervo por Curso
              </Command.Item>
              <Command.Item
                className="cmdk-item"
                onSelect={() => {
                  onNavigateView("courses");
                  onOpenChange(false);
                }}
              >
                <GraduationCap size={15} /> Catálogo de Cursos
              </Command.Item>
              <Command.Item
                className="cmdk-item"
                onSelect={() => {
                  onNavigateView("live", "Aulas ao Vivo");
                  onOpenChange(false);
                }}
              >
                <BookOpen size={15} /> Aulas ao Vivo & Agenda
              </Command.Item>
            </Command.Group>

            {courses.length > 0 && (
              <Command.Group heading="Cursos Cadastrados">
                {courses.map((course) => (
                  <Command.Item
                    key={course.id}
                    className="cmdk-item"
                    onSelect={() => {
                      onOpenAcervo(course.slug);
                      onOpenChange(false);
                    }}
                  >
                    <GraduationCap size={15} />
                    <span>{course.title}</span>
                    <span className="cmdk-item-meta">Abrir acervo</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {catalogo && (
              <Command.Group heading="Playlists de Bibliologia">
                {catalogo.playlists.map((pl) => (
                  <Command.Item
                    key={pl.id}
                    className="cmdk-item"
                    onSelect={() => {
                      onOpenAcervo("bibliologia-critica-textual");
                      onOpenChange(false);
                    }}
                  >
                    <ListVideo size={15} className="text-[#1d63b8]" />
                    <span>{pl.titulo_original}</span>
                    <span className="cmdk-item-meta">{pl.aulas.length} aulas</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {allVideos.length > 0 && (
              <Command.Group heading="Vídeos & Fontes de Bibliologia">
                {allVideos.slice(0, 36).map((video, idx) => {
                  const href = safeHttpsUrl(video.url_direta);
                  return (
                    <Command.Item
                      key={`${video.id}-${idx}`}
                      value={`${video.titulo_original} ${video.canal} ${video.playlist_origem || ""}`}
                      className="cmdk-item"
                      onSelect={() => {
                        if (href) {
                          window.open(href, "_blank", "noopener,noreferrer");
                        }
                        onOpenChange(false);
                      }}
                    >
                      <Video size={15} className="text-[#1d63b8]" />
                      <span className="truncate">{video.titulo_original}</span>
                      <span className="cmdk-item-meta inline-flex items-center gap-1">
                        {video.duracao}
                        <ExternalLink size={11} />
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
