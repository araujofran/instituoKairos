"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Compass,
  ExternalLink,
  Flame,
  GraduationCap,
  Hourglass,
  Languages,
  Play,
  ScrollText,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { api, type Course, type CourseResourcesBundle } from "@/lib/api";
import { safeHttpsUrl } from "@/lib/bibliologia";
import { QuizRelampagoDialog } from "@/features/storytelling-quiz";

type DashboardSnapshot = {
  next_session: {
    id: string;
    title: string;
    course_title: string;
    starts_at: string;
    join_url: string | null;
  } | null;
};

type ProgressSeals = {
  exploredSlugs: string[];
  quizPassed: boolean;
  openedPanel: boolean;
};

const TRACKS = [
  {
    step: 1,
    short: "Fundamentos",
    level: "Nível Básico",
    chapter: "CAPÍTULO 1 · A JORNADA DA PALAVRA",
    stars: 1,
    icon: ScrollText,
    subtitle: "Bibliologia, Panorama Bíblico e doutrinas essenciais.",
  },
  {
    step: 2,
    short: "Aprofundamento",
    level: "Nível Médio / Bacharelado",
    chapter: "CAPÍTULO 2 · DOUTRINA & LÍNGUAS ORIGINAIS",
    stars: 2,
    icon: Search,
    subtitle: "Soteriologia, Eclesiologia, Grego, Hebraico e Exegese.",
  },
  {
    step: 3,
    short: "Especialização",
    level: "Nível Avançado / Pós-Graduação",
    chapter: "CAPÍTULO 3 · TESOUROS PATRÍSTICOS & ARQUEOLOGIA",
    stars: 3,
    icon: Award,
    subtitle: "Cristologia conciliar, Tipologia messiânica e debates.",
  },
  {
    step: 4,
    short: "Pesquisa",
    level: "Mestrado em Teologia / Th.M.",
    chapter: "CAPÍTULO 4 · ALTA CRÍTICA & PESQUISA",
    stars: 4,
    icon: BookOpen,
    subtitle: "Metodologia, Crítica Textual BHS/NA28 e Dogmas.",
  },
  {
    step: 5,
    short: "Imersões Práticas",
    level: "Imersões e Workshops",
    chapter: "CAPÍTULO 5 · MINISTÉRIO EM AÇÃO",
    stars: 5,
    icon: Compass,
    subtitle: "Oficinas práticas de pregação, exegese e capelania.",
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
  const [quizOpen, setQuizOpen] = useState(false);
  const [seals, setSeals] = useState<ProgressSeals>({
    exploredSlugs: [],
    quizPassed: false,
    openedPanel: false,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("kairos_storytelling_seals");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProgressSeals>;
        setSeals({
          exploredSlugs: Array.isArray(parsed.exploredSlugs) ? parsed.exploredSlugs : [],
          quizPassed: Boolean(parsed.quizPassed),
          openedPanel: Boolean(parsed.openedPanel),
        });
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function persistSeals(next: ProgressSeals) {
    setSeals(next);
    try {
      window.localStorage.setItem("kairos_storytelling_seals", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || courses[0] || null,
    [courses, selectedSlug]
  );

  const activeTrack = useMemo(
    () => TRACKS.find((t) => t.level === activeCourse?.level) || TRACKS[0],
    [activeCourse?.level]
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

  function launchMission(slug: string) {
    if (!seals.exploredSlugs.includes(slug)) {
      const updated = {
        ...seals,
        exploredSlugs: [...seals.exploredSlugs, slug],
      };
      persistSeals(updated);
    }
    onOpenBibliologia(slug);
  }

  const missionProgress = Math.min(3, seals.exploredSlugs.length);
  const sealList = [
    {
      id: "pergaminho",
      title: "Primeiro Pergaminho",
      icon: ScrollText,
      unlocked: seals.exploredSlugs.length >= 1,
    },
    {
      id: "guardiao",
      title: "Guardião da Palavra",
      icon: Award,
      unlocked: seals.quizPassed,
    },
    {
      id: "explorador",
      title: "Explorador Kairós",
      icon: Languages,
      unlocked: seals.exploredSlugs.length >= 2,
    },
    {
      id: "expositor",
      title: "Expositor Kairós",
      icon: Hourglass,
      unlocked: seals.exploredSlugs.length >= 3 && seals.quizPassed,
    },
  ];

  return (
    <div className="editorial-portal">
      <QuizRelampagoDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        onCompleted={(score) => {
          if (score >= 2 && !seals.quizPassed) {
            persistSeals({ ...seals, quizPassed: true });
            toast.success("Selo 'Guardião da Palavra' desbloqueado!");
          }
        }}
      />

      {/* Hero Storytelling Banner (#8CE0E3 -> #FAF7F0 + Fredoka Bold + SVG Wave) */}
      <motion.section
        className="kairos-hero-light"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative z-10">
          <span className="ds-pill teal">
            <Sparkles size={12} /> {activeTrack.chapter}
          </span>
          <h1>
            De Pergaminho a Coração: Descubra a <span className="hl-teal">História</span> das{" "}
            <span className="hl-coral">Escrituras</span>
          </h1>
          <p>
            Explore as origens sagradas, avance pelas trilhas de formação do Instituto Teológico
            Kairós e viva uma jornada de estudo profunda e envolvente.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              type="button"
              className="btn-kairos-coral"
              onClick={() => launchMission(activeCourse?.slug || selectedSlug)}
            >
              <Play size={14} fill="#ffffff" /> Continuar Missão
            </button>
            <a href="#trilha-narrativa" className="btn-kairos-teal">
              Ver Mapa da Jornada <ArrowRight size={14} />
            </a>
          </div>

          {courses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-[#0b3954]">Capítulo / Curso:</span>
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
                <span className="ds-pill amber">{totalResources} recursos no acervo</span>
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

      {/* Sua Trilha Narrativa — Mapa dos 5 Níveis (#0B3954 + #F7B538) */}
      <section
        id="trilha-narrativa"
        className="tracks-navy-section"
        aria-labelledby="tracks-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="ds-pill amber">MAPA DA JORNADA TEOLÓGICA</span>
            <h2 id="tracks-heading" className="text-[28px] mt-2">
              Sua Trilha Narrativa (5 Níveis · {courses.length || 58} Cursos)
            </h2>
            <p className="text-[13px] text-[#bfe9ec] mt-1 max-w-[660px]">
              Siga os passos dos Fundamentos às Imersões Práticas. Clique em qualquer estação para
              explorar suas disciplinas.
            </p>
          </div>
          <button type="button" className="btn-kairos-coral" onClick={onOpenCourses}>
            <GraduationCap size={15} /> Explorar Grade Completa
          </button>
        </div>

        <div className="narrative-path-wrap">
          <div className="narrative-path-line" aria-hidden="true" />
          {TRACKS.map((track) => {
            const count = courses.filter((c) => (c.level || "Geral") === track.level).length;
            const Icon = track.icon;
            const isActive = activeTrack.step === track.step;
            return (
              <button
                key={track.level}
                type="button"
                className={`narrative-step ${isActive ? "active" : ""}`}
                onClick={() => onOpenLevel(track.level)}
              >
                <span className="narrative-medallion">
                  <Icon size={24} />
                </span>
                <div className="grid gap-1">
                  <span className="track-stars justify-center">
                    {Array.from({ length: track.stars }).map((_, idx) => (
                      <Star key={idx} size={12} fill="#F7B538" />
                    ))}
                  </span>
                  <h3 className="text-[16px]">
                    {track.step}. {track.short}
                  </h3>
                  <span className="text-[11px] text-[#f7b538] font-bold">
                    {count} disciplina(s)
                  </span>
                  <p className="text-[11.5px] text-[#cde8ee] leading-snug">{track.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Cards Lúdicos: Missão da Semana · Quiz Relâmpago · Galeria de Selos */}
      <section className="ludic-grid" aria-label="Missões, desafios e conquistas">
        <article className="ludic-card">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="ds-pill amber">
                <Target size={12} /> MISSÃO DA SEMANA
              </span>
              <span className="text-[12px] font-bold text-[#0b3954] tabular-nums">
                {missionProgress}/3 cursos
              </span>
            </div>
            <h3 className="text-[21px]">Explore as Fontes da Fé</h3>
            <p className="text-[13px] text-[#5b7282] leading-relaxed">
              Abra o acervo de <strong>{activeCourse?.title || "Bibliologia"}</strong> ou explore
              outras disciplinas para desbloquear novos selos.
            </p>
            <div className="w-full h-2.5 rounded-full bg-[#f0eadc] overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(12, Math.round((missionProgress / 3) * 100))}%`,
                  background: "linear-gradient(90deg, #F7B538, #F26444)",
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-kairos-coral w-full"
            onClick={() => launchMission(activeCourse?.slug || selectedSlug)}
          >
            Cumprir Missão <ArrowRight size={14} />
          </button>
        </article>

        <article className="ludic-card">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="ds-pill teal">
                <Flame size={12} /> DESAFIO RÁPIDO
              </span>
              <span className="text-[12px] font-bold text-[#189ab4]">3 perguntas</span>
            </div>
            <h3 className="text-[21px]">Quiz Relâmpago</h3>
            <p className="text-[13px] text-[#5b7282] leading-relaxed">
              Teste seus conhecimentos sobre Formação do Cânon e Crítica Textual em 1 minuto e
              conquiste o selo <em>Guardião da Palavra</em>.
            </p>
          </div>
          <button
            type="button"
            className="btn-kairos-teal w-full"
            onClick={() => setQuizOpen(true)}
          >
            Jogar Quiz <ArrowRight size={14} />
          </button>
        </article>

        <article className="ludic-card">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="ds-pill amber">
                <Trophy size={12} /> GALERIA DE SELOS
              </span>
              <span className="text-[12px] font-bold text-[#0b3954] tabular-nums">
                {sealList.filter((s) => s.unlocked).length}/{sealList.length}
              </span>
            </div>
            <h3 className="text-[21px]">Suas Conquistas</h3>
            <div className="seals-grid">
              {sealList.map((seal) => {
                const SealIcon = seal.icon;
                return (
                  <div
                    key={seal.id}
                    className={`seal-badge ${seal.unlocked ? "unlocked" : "locked"}`}
                  >
                    <span className="seal-circle">
                      <SealIcon size={20} />
                    </span>
                    <span>{seal.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      {/* Liderança e Corpo Docente (Dorival e Prof. Francisco sempre preservados!) */}
      <section aria-labelledby="leadership-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 id="leadership-heading" className="text-[24px]">
            Direção Acadêmica & <span style={{ color: "var(--color-secondary-teal)" }}>Docência</span>
          </h2>
          <span className="text-[12px] text-[#5b7282] font-semibold">
            Instituto Teológico Kairós
          </span>
        </div>

        <div className="leadership-strip">
          <article className="leadership-card">
            <div className="leadership-avatar">
              <Image
                src="/images/dorival-coordenador.png"
                alt="Dorival, Coordenador do Instituto Teológico Kairós"
                width={96}
                height={96}
              />
            </div>
            <div className="grid gap-1">
              <span className="ds-pill teal w-fit">COORDENAÇÃO</span>
              <h3 className="text-[20px]">Dorival</h3>
              <p className="text-[12.5px] text-[#5b7282]">
                Coordenador Acadêmico · Acompanhamento das trilhas de formação e turmas.
              </p>
            </div>
          </article>

          <article className="leadership-card">
            <div className="leadership-avatar">
              <Image
                src="/images/francisco-professor.png"
                alt="Prof. Francisco, Professor e Administrador do Instituto Teológico Kairós"
                width={96}
                height={96}
              />
            </div>
            <div className="grid gap-1">
              <span className="ds-pill amber w-fit">DOCÊNCIA & ADMINISTRAÇÃO</span>
              <h3 className="text-[20px]">Prof. Francisco</h3>
              <p className="text-[12.5px] text-[#5b7282]">
                Professor de Teologia e Administrador · Curadoria de aulas e mentoria bíblica.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Explore sua formação + Próximo encontro */}
      <section aria-labelledby="explore-heading">
        <div className="flex flex-wrap items-baseline gap-3 mb-4">
          <h2 id="explore-heading" className="text-[26px]">
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
            onClick={() => launchMission(activeCourse?.slug || selectedSlug)}
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

          <button
            type="button"
            className="explore-card"
            onClick={() => {
              persistSeals({ ...seals, openedPanel: true });
              onSwitchWorkspace();
            }}
          >
            <div className="explore-card-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/editorial/card-meu-percurso.jpg" alt="Painel e Acervo" />
            </div>
            <div className="explore-card-body">
              <h3>Painel & Acervo</h3>
              <p>Alterne para a visão completa com indicadores, busca e administração.</p>
              <span className="btn-kairos-navy w-full">Abrir Painel</span>
            </div>
          </button>
        </div>
      </section>

      <section className="editorial-meeting-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="course-medallion">
            <CalendarDays size={20} />
          </span>
          <div>
            <span className="ds-pill amber">SEU PRÓXIMO ENCONTRO</span>
            <h2 className="text-[20px] mt-1">
              {upcoming ? upcoming.title : "Agenda de Aulas ao Vivo"}
            </h2>
            <p className="text-[12.5px] text-[#5b7282]">
              {upcoming
                ? new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(upcoming.starts_at))
                : "Consulte os próximos encontros publicados pela escola."}
            </p>
          </div>
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
      </section>
    </div>
  );
}
