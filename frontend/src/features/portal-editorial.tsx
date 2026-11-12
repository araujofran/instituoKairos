"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import { api, type Course, type CourseResourcesBundle } from "@/lib/api";
import { safeHttpsUrl } from "@/lib/bibliologia";

type DashboardSnapshot = {
  next_session: {
    id: string;
    title: string;
    course_title: string;
    starts_at: string;
    join_url: string | null;
  } | null;
  current_course: {
    id: string;
    title: string;
    cohort_title: string;
    completed_lessons: number;
    total_lessons: number;
    percent: number | null;
  } | null;
};

const TRACKS = [
  {
    level: "Nível Básico",
    stars: 1,
    subtitle: "Fundamentos bíblicos, panorama e doutrinas essenciais.",
  },
  {
    level: "Nível Médio / Bacharelado",
    stars: 2,
    subtitle: "Soteriologia, eclesiologia, línguas originais e exegese.",
  },
  {
    level: "Nível Avançado / Pós-Graduação",
    stars: 3,
    subtitle: "Debates patrísticos, tipologia messiânica e arqueologia.",
  },
  {
    level: "Mestrado em Teologia / Th.M.",
    stars: 4,
    subtitle: "Pesquisa teológica, crítica textual BHS/NA28 e dogmas.",
  },
  {
    level: "Imersões e Workshops",
    stars: 5,
    subtitle: "Módulos intensivos práticos para ministério e ensino.",
  },
];

export function PortalEditorial({
  token,
  courses = [],
  onOpenCourses,
  onOpenLevel,
  onOpenBibliologia,
  onOpenActivities,
  onOpenLive,
  onSwitchWorkspace,
}: {
  token?: string;
  courses?: Course[];
  onOpenCourses: () => void;
  onOpenLevel: (level: string) => void;
  onOpenBibliologia: (courseSlug?: string) => void;
  onOpenActivities: () => void;
  onOpenLive: () => void;
  onSwitchWorkspace: () => void;
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("bibliologia-critica-textual");
  const [bundle, setBundle] = useState<CourseResourcesBundle | null>(null);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || courses[0] || null,
    [courses, selectedSlug]
  );

  useEffect(() => {
    if (!activeCourse) {
      setBundle(null);
      return;
    }
    let active = true;
    void api<CourseResourcesBundle>(`/api/v1/courses/${activeCourse.id}/resources`, token)
      .then((res) => {
        if (active) setBundle(res);
      })
      .catch(() => {
        if (active) setBundle(null);
      });
    return () => {
      active = false;
    };
  }, [activeCourse, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api<DashboardSnapshot>("/api/v1/dashboard", token)
      .then((res) => {
        if (active) setSnapshot(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  const upcoming = snapshot?.next_session;
  const totalResources = bundle
    ? bundle.official.length +
      bundle.videos.length +
      bundle.playlists.reduce((acc, pl) => acc + pl.lessons.length, 0)
    : 0;

  return (
    <div className="editorial-portal">
      {/* Hero Section (#8CE0E3 -> #FAF7F0 + Fredoka Bold + Coral & Teal Pill CTAs + SVG Wave) */}
      <motion.section
        className="kairos-hero-light"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative z-10">
          <span className="ds-pill teal">
            <Sparkles size={12} /> INSTITUTO TEOLÓGICO KAIRÓS · {courses.length || 58} DISCIPLINAS
          </span>
          <h1>
            Aprofunde na <span className="hl-teal">Palavra</span>. Transforme{" "}
            <span className="hl-coral">Vidas</span>.
          </h1>
          <p>
            Formação bíblica, teológica e ministerial estruturada em trilhas do Nível Básico ao
            Mestrado, com vídeos curados, playlists e recursos de aula.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              type="button"
              className="btn-kairos-coral"
              onClick={() => onOpenBibliologia(activeCourse?.slug || selectedSlug)}
            >
              <Play size={14} fill="#ffffff" /> Começar Curso
            </button>
            <button type="button" className="btn-kairos-teal" onClick={onOpenCourses}>
              Explorar Grade <ArrowRight size={14} />
            </button>
          </div>

          {courses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-[#0b3954]">Curso em destaque:</span>
              <select
                aria-label="Selecionar curso em foco"
                value={activeCourse?.slug || ""}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="rounded-full border border-[#189ab4]/40 bg-white/95 px-4 py-1.5 text-[12px] font-bold text-[#0b3954] outline-none focus:border-[#189ab4]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.title} · {c.level || "Geral"}
                  </option>
                ))}
              </select>
              {totalResources > 0 && (
                <span className="ds-pill amber">{totalResources} aulas e fontes</span>
              )}
            </div>
          )}
        </div>

        <div className="kairos-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/editorial/hero-manuscrito.jpg"
            alt="Manuscrito bíblico iluminado do Instituto Teológico Kairós"
          />
        </div>

        <svg
          className="hero-wave-bottom"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,24 C240,54 480,0 720,24 C960,48 1200,6 1440,26 L1440,48 L0,48 Z"
            fill="#FAF7F0"
          />
        </svg>
      </motion.section>

      {/* Cards de Apoio Rápido */}
      <section className="editorial-side-row">
        <div className="editorial-meeting-card p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="ds-pill amber">SEU PRÓXIMO ENCONTRO</span>
              <h2 className="text-[22px] mt-2 leading-tight">
                {upcoming ? upcoming.title : "Agenda de Aulas ao Vivo"}
              </h2>
              <p className="text-[13px] text-[#5b7282] mt-1">
                {upcoming
                  ? new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(upcoming.starts_at))
                  : "Consulte os encontros síncronos e transmissões publicadas pela escola."}
              </p>
            </div>
            <span className="course-medallion">
              <CalendarDays size={20} />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-kairos-teal" onClick={onOpenLive}>
              Ver Agenda <ArrowRight size={13} />
            </button>
            {safeHttpsUrl(upcoming?.join_url) && (
              <a
                className="btn-kairos-coral"
                href={safeHttpsUrl(upcoming?.join_url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Entrar na Aula <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        <div className="editorial-step-card">
          <span
            className="w-12 h-12 rounded-full grid place-items-center shrink-0"
            style={{ background: "rgba(247, 181, 56, 0.2)", color: "#F7B538" }}
          >
            <BookOpen size={22} />
          </span>
          <div>
            <h3 className="text-[20px]">Um passo de cada vez</h3>
            <p className="text-[13px] text-[#cfeef2] mt-1 leading-relaxed">
              Navegue pelos cursos do Instituto, assista às aulas selecionadas e acompanhe seu
              crescimento teológico com clareza.
            </p>
          </div>
        </div>
      </section>

      {/* Explore sua formação */}
      <section aria-labelledby="explore-heading">
        <div className="flex flex-wrap items-baseline gap-3 mb-4">
          <h2 id="explore-heading" className="text-[28px]">
            Explore sua <span style={{ color: "var(--color-secondary-teal)" }}>formação</span>
          </h2>
          <span className="text-[13px] text-[#5b7282] font-semibold">
            Aprender, praticar e aprofundar
          </span>
        </div>

        <div className="explore-grid">
          <button type="button" className="explore-card" onClick={onOpenCourses}>
            <div className="explore-card-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/editorial/card-minhas-aulas.jpg" alt="Minhas aulas" />
              <div className="explore-play-badge">
                <span className="explore-play-circle">
                  <Play size={18} fill="#F26444" />
                </span>
              </div>
            </div>
            <div className="explore-card-body">
              <h3>Minhas aulas</h3>
              <p>Acesse as {courses.length || 58} disciplinas distribuídas por nível teológico.</p>
              <span className="btn-kairos-coral w-full">Explorar Grade</span>
            </div>
          </button>

          <button
            type="button"
            className="explore-card"
            onClick={() => onOpenBibliologia(activeCourse?.slug || selectedSlug)}
          >
            <div className="explore-card-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/editorial/card-biblioteca-viva.jpg" alt="Biblioteca viva" />
            </div>
            <div className="explore-card-body">
              <h3>Biblioteca viva</h3>
              <p>Fontes oficiais, playlists estruturadas e vídeos gerenciados por curso.</p>
              <span className="btn-kairos-teal w-full">Continuar Aula</span>
            </div>
          </button>

          <button type="button" className="explore-card" onClick={onOpenActivities}>
            <div className="explore-card-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/editorial/card-atividades.jpg" alt="Atividades" />
            </div>
            <div className="explore-card-body">
              <h3>Atividades</h3>
              <p>Exercite o que aprendeu e acompanhe avaliações e entregas da turma.</p>
              <span className="btn-kairos-glass w-full">Ver Atividades</span>
            </div>
          </button>

          <button type="button" className="explore-card" onClick={onSwitchWorkspace}>
            <div className="explore-card-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/editorial/card-meu-percurso.jpg" alt="Painel e Acervo" />
            </div>
            <div className="explore-card-body">
              <h3>Painel & Acervo</h3>
              <p>Alterne para a visão completa com indicadores, busca rápida e administração.</p>
              <span className="btn-kairos-navy w-full">Abrir Painel</span>
            </div>
          </button>
        </div>
      </section>

      {/* Seção Contrastante de Trilhas / Níveis (#0B3954 + #F7B538) */}
      <section className="tracks-navy-section" aria-labelledby="tracks-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="ds-pill amber">TRILHAS DE FORMAÇÃO TEOLÓGICA</span>
            <h2 id="tracks-heading" className="text-[30px] mt-2">
              Do Nível Básico ao Mestrado e Imersões
            </h2>
            <p className="text-[13px] text-[#bfe9ec] mt-1 max-w-[660px]">
              Clique em qualquer trilha abaixo para abrir imediatamente as disciplinas daquele
              nível.
            </p>
          </div>
          <button type="button" className="btn-kairos-coral" onClick={onOpenCourses}>
            <GraduationCap size={15} /> Ver Todos os Cursos ({courses.length || 58})
          </button>
        </div>

        <div className="tracks-grid">
          {TRACKS.map((track) => {
            const count = courses.filter((c) => (c.level || "Geral") === track.level).length;
            return (
              <button
                key={track.level}
                type="button"
                className="track-card"
                onClick={() => onOpenLevel(track.level)}
              >
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="track-stars" aria-label={`${track.stars} estrelas`}>
                      {Array.from({ length: track.stars }).map((_, idx) => (
                        <Star key={idx} size={14} fill="#F7B538" />
                      ))}
                    </span>
                    <span className="ds-pill amber">{count} cursos</span>
                  </div>
                  <h3 className="text-[18px] leading-snug">{track.level}</h3>
                  <p className="text-[12px] text-[#cde8ee] leading-relaxed">{track.subtitle}</p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#F7B538]">
                  Ver Ementa <ArrowRight size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
