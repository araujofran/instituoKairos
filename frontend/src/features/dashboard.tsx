"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckSquare,
  CirclePlay,
  FileText,
  Folder,
  GraduationCap,
  Monitor,
  Radio,
  RefreshCw,
  Square,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { downloadAsset } from "@/features/studio";

type SessionInfo = {
  id: string;
  title: string;
  description: string;
  course_title: string;
  starts_at: string;
  duration_minutes: number;
  join_url: string | null;
  enrolled_students: number;
};
type MaterialInfo = {
  id: string;
  title: string;
  kind: string;
  size_bytes: number | null;
  external_url: string | null;
  download_id?: string | null;
};
type AssignmentInfo = { id: string; title: string; due_at: string | null; submitted: boolean };
type CourseProgress = {
  id: string;
  title: string;
  cohort_title: string;
  completed_lessons: number;
  total_lessons: number;
  percent: number | null;
};
type Dashboard = {
  metrics: {
    students: number;
    courses: number;
    recordings: number;
    live_sessions: number;
    completion_rate: number | null;
  };
  next_session: SessionInfo | null;
  current_course: CourseProgress | null;
  materials: MaterialInfo[];
  assignments: AssignmentInfo[];
  agenda: SessionInfo[];
  updated_at: string;
};

function safeUrl(url: string | null): string | undefined {
  if (!url) return;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return;
  }
}

function date(value: string, short = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...(short
      ? { day: "2-digit", month: "short" }
      : { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  }).format(new Date(value));
}

function addCalendar(session: SessionInfo) {
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Instituto Kairos//Escola//PT-BR",
    "BEGIN:VEVENT",
    `UID:${session.id}@instituto-kairos`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(session.starts_at))}`,
    `DTEND:${stamp(new Date(new Date(session.starts_at).getTime() + session.duration_minutes * 60000))}`,
    `SUMMARY:${escape(session.title)}`,
    `DESCRIPTION:${escape(session.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aula-kairos.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RadialProgress({ percent }: { percent: number | null }) {
  const safeVal = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (safeVal / 100) * circ;
  return (
    <div
      className="relative w-[70px] h-[70px] shrink-0 grid place-items-center"
      role="progressbar"
      aria-valuenow={percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso no curso"
    >
      <svg width="70" height="70" viewBox="0 0 70 70" className="-rotate-90">
        <circle cx="35" cy="35" r={r} fill="none" stroke="#eee5d6" strokeWidth="6" />
        <circle
          cx="35"
          cy="35"
          r={r}
          fill="none"
          stroke="url(#kairosGoldGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="kairosGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#189AB4" />
            <stop offset="100%" stopColor="#F26444" />
          </linearGradient>
        </defs>
      </svg>
      <strong className="absolute text-[13px] font-bold text-[#16324f] tabular-nums">
        {percent === null ? "—" : `${percent}%`}
      </strong>
    </div>
  );
}

export function HomeDashboard({
  token,
  onLogin,
  onCourses,
  onMaterials,
  onActivities,
  section = "all",
}: {
  token?: string;
  onLogin: () => void;
  onCourses: () => void;
  onMaterials: () => void;
  onActivities: () => void;
  section?: "all" | "materials" | "activities" | "live" | "reports";
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function refresh() {
      setLoading(true);
      try {
        const result = await api<Dashboard>("/api/v1/dashboard", token);
        if (active) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, revision]);

  const validData = error ? null : data;
  const metrics = validData?.metrics;
  const upcoming = validData?.next_session;
  const progress = validData?.current_course;
  const cards = [
    { label: "Alunos", icon: Users, value: metrics?.students, spark: "M2 14 Q14 8 26 11 T52 4" },
    { label: "Cursos", icon: GraduationCap, value: metrics?.courses, spark: "M2 12 Q16 14 28 7 T52 5" },
    { label: "Aulas Gravadas", icon: CirclePlay, value: metrics?.recordings, spark: "M2 15 Q16 10 30 9 T52 3" },
    { label: "Aulas ao Vivo", icon: CalendarDays, value: metrics?.live_sessions, spark: "M2 11 Q18 14 30 6 T52 7" },
    {
      label: "Taxa de Conclusão",
      icon: ChartNoAxesColumnIncreasing,
      value: metrics?.completion_rate,
      suffix: "%",
      spark: "M2 15 Q16 12 30 7 T52 2",
    },
  ];
  const empty = loading
    ? "Carregando dados…"
    : !token
    ? "Entre para consultar os dados da sua escola."
    : error
    ? "Dados indisponíveis no momento."
    : "Nenhum registro disponível.";

  return (
    <div className={`dashboard-view dashboard-${section}`}>
      {(section === "all" || section === "reports") && (
        <div className="metric-row">
          {cards.map((card, i) => (
            <motion.section
              className="metric-card"
              key={card.label}
              aria-label={card.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.04 }}
            >
              <card.icon size={35} />
              <div className="flex-1 min-w-0">
                <span>{card.label}</span>
                <strong>
                  {card.value === null || card.value === undefined
                    ? "—"
                    : `${card.value.toLocaleString("pt-BR")}${card.suffix || ""}`}
                </strong>
              </div>
              <svg width="44" height="18" viewBox="0 0 54 18" aria-hidden="true" className="opacity-75 shrink-0">
                <path d={card.spark} fill="none" stroke="#189AB4" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </motion.section>
          ))}
        </div>
      )}

      <div className="dashboard-status" role="status">
        {!token ? (
          <button onClick={onLogin}>Entre para acessar seu painel acadêmico.</button>
        ) : error ? (
          <span role="alert">{error}</span>
        ) : data ? (
          <span>
            Atualizado às{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "America/Sao_Paulo",
            }).format(new Date(data.updated_at))}{" "}
            · Dados do seu acesso
          </span>
        ) : (
          <span>Carregando painel…</span>
        )}
        {token && (
          <button
            aria-label="Atualizar painel"
            onClick={() => setRevision((r) => r + 1)}
            disabled={loading}
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {section === "reports" && (
        <section className="panel module-state">
          <h2>Indicadores acadêmicos</h2>
          <p>
            Totais reais de alunos, cursos, gravações, aulas ao vivo e conclusão, conforme as
            permissões da sua conta.
          </p>
          <p>
            Quando não há dados suficientes para calcular a conclusão, o indicador exibe “—”.
            Relatórios detalhados de frequência, notas e exportações ainda não estão disponíveis.
          </p>
        </section>
      )}

      <div className="reference-dashboard">
        {(section === "all" || section === "live") && (
          <section className="panel live-panel">
            <h2>
              <UserRound /> Próxima Aula ao Vivo
            </h2>
            {upcoming ? (
              <>
                <div className="live-body">
                  <span className="calendar-tile">
                    <CalendarDays size={39} />
                  </span>
                  <div className="live-details">
                    <span className="live-badge">
                      ● {new Date(upcoming.starts_at) <= new Date() ? "AO VIVO" : "AO VIVO EM BREVE"}
                    </span>
                    <h3>{upcoming.title}</h3>
                    <p>{upcoming.description || upcoming.course_title}</p>
                    <div className="live-meta">
                      <span>
                        <CalendarDays size={14} />
                        {date(upcoming.starts_at)}
                      </span>
                      <span>
                        <UserRound size={14} />
                        {upcoming.enrolled_students} inscritos
                      </span>
                    </div>
                  </div>
                  <Image
                    src="/images/biblia-ampulheta.png"
                    alt=""
                    width={180}
                    height={98}
                    className="lesson-thumbnail"
                  />
                </div>
                <div className="panel-actions">
                  {safeUrl(upcoming.join_url) ? (
                    <a
                      className="btn-kairos-coral"
                      href={safeUrl(upcoming.join_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Monitor size={14} /> Entrar na Aula
                    </a>
                  ) : (
                    <span className="small-empty">Link da transmissão ainda não publicado.</span>
                  )}
                  <button className="btn-kairos-glass" onClick={onMaterials}>
                    <Folder size={14} /> Ver Materiais
                  </button>
                  <button className="btn-kairos-glass" onClick={() => addCalendar(upcoming)}>
                    <CalendarDays size={14} /> Adicionar à Agenda
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="live-body live-body-empty">
                  <span className="calendar-tile">
                    <CalendarDays size={39} />
                  </span>
                  <div className="live-details">
                    <span className="live-badge pending-badge">
                      {loading ? "CONSULTANDO AGENDA" : token ? "SEM AULA PUBLICADA" : "ACESSO À AGENDA"}
                    </span>
                    <h3>{token ? "Nenhuma aula agendada" : "Próxima aula da sua turma"}</h3>
                    <p>{empty}</p>
                    <div className="live-meta">
                      <span>
                        <CalendarDays size={14} />
                        Data não disponível
                      </span>
                    </div>
                  </div>
                  <Image
                    src="/images/biblia-ampulheta.png"
                    alt=""
                    width={180}
                    height={98}
                    className="lesson-thumbnail"
                  />
                </div>
                <div className="panel-actions">
                  <button
                    className="btn-kairos-navy"
                    onClick={onLogin}
                    disabled={Boolean(token)}
                  >
                    <Monitor size={14} /> Entrar na Aula
                  </button>
                  <button className="btn-kairos-glass" onClick={onMaterials}>
                    <Folder size={14} /> Ver Materiais
                  </button>
                  <button
                    className="btn-kairos-glass"
                    disabled
                    title="Disponível quando houver uma aula agendada"
                  >
                    <CalendarDays size={14} /> Adicionar à Agenda
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {section === "all" && (
          <section className="panel progress-panel">
            <h2>
              <BookOpen /> Meu Curso em Andamento
            </h2>
            {progress ? (
              <>
                <div className="progress-body">
                  <RadialProgress percent={progress.percent} />
                  <div>
                    <h3>{progress.title}</h3>
                    <p>{progress.cohort_title}</p>
                    <small>
                      {progress.completed_lessons} de {progress.total_lessons} aulas concluídas
                    </small>
                  </div>
                </div>
                <button className="text-link" onClick={onCourses}>
                  Continuar Estudando <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="progress-body">
                  <RadialProgress percent={null} />
                  <div>
                    <h3>{token ? "Nenhum curso em andamento" : "Sua formação teológica"}</h3>
                    <p>{token ? "Matrícula ativa não encontrada." : "Acesse sua matrícula para continuar."}</p>
                    <small>Progresso disponível após acesso à matrícula</small>
                  </div>
                </div>
                <button className="text-link" onClick={token ? onCourses : onLogin}>
                  Continuar Estudando <ArrowRight size={16} />
                </button>
              </>
            )}
          </section>
        )}

        {(section === "all" || section === "materials") && (
          <section className="panel materials-panel">
            <h2>
              <Folder /> Materiais da Aula
            </h2>
            {validData?.materials.length ? (
              <div className="panel-list">
                {validData.materials.map((material) => (
                  <div className="material-row" key={material.id}>
                    <span className={`file-icon ${material.kind}`}>
                      <FileText size={23} />
                    </span>
                    <div>
                      <h3>{material.title}</h3>
                      <small>
                        {material.kind.toUpperCase()}
                        {material.size_bytes !== null
                          ? ` · ${(material.size_bytes / 1024 / 1024).toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })} MB`
                          : ""}
                      </small>
                    </div>
                    {material.download_id ? (
                      <button
                        className="icon-button"
                        aria-label={`Baixar ${material.title}`}
                        onClick={() =>
                          void downloadAsset(material.download_id!, material.title).catch((e) =>
                            setError(e.message)
                          )
                        }
                      >
                        <ArrowDownToLine size={20} />
                      </button>
                    ) : safeUrl(material.external_url) ? (
                      <a
                        href={safeUrl(material.external_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir ${material.title}`}
                      >
                        <ArrowDownToLine size={20} />
                      </a>
                    ) : (
                      <span title="Arquivo ainda não publicado">
                        <Folder size={18} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty">
                <Folder size={34} />
                <p>{token ? "Nenhum material publicado para suas turmas." : empty}</p>
              </div>
            )}
          </section>
        )}

        {(section === "all" || section === "activities") && (
          <section className="panel assignments-panel">
            <h2>
              <CheckSquare /> Atividades e Avaliações
            </h2>
            {validData?.assignments.length ? (
              <>
                <div className="panel-list">
                  {validData.assignments.map((assignment) => (
                    <div className="assignment-row" key={assignment.id}>
                      {assignment.submitted ? (
                        <CheckSquare size={19} className="submitted" />
                      ) : (
                        <Square size={19} />
                      )}
                      <span>{assignment.title}</span>
                      {assignment.due_at && (
                        <small>
                          <CalendarDays size={13} />
                          Até {date(assignment.due_at, true)}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
                <button className="text-link" onClick={onActivities}>
                  Ver Todas as Atividades <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <div className="panel-empty">
                <CheckSquare size={34} />
                <p>{token ? "Nenhuma atividade publicada para suas turmas." : empty}</p>
              </div>
            )}
          </section>
        )}

        {(section === "all" || section === "live") && (
          <section className="panel agenda-panel">
            <h2>
              <CalendarDays /> Agenda da Semana
            </h2>
            {validData?.agenda.length ? (
              <div className="panel-list">
                {validData.agenda.map((event) => (
                  <div className="agenda-event" key={event.id}>
                    <Radio size={24} />
                    <div>
                      <h3>{date(event.starts_at)}</h3>
                      <p>{event.title}</p>
                    </div>
                    <button
                      aria-label={`Adicionar ${event.title} à agenda`}
                      onClick={() => addCalendar(event)}
                    >
                      <CalendarDays size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty">
                <CalendarDays size={34} />
                <p>{token ? "Nenhum encontro publicado nos próximos sete dias." : empty}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
