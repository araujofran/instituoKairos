"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Toaster } from "sonner";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  ClipboardList,
  Clock,
  FolderOpen,
  GraduationCap,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  PencilLine,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
  Hourglass,
} from "lucide-react";
import { api, type Actor, type Course } from "@/lib/api";
import { auth } from "@/lib/auth";
import { HomeDashboard } from "@/features/dashboard";
import { LoginScreen, MandatoryCredentials } from "@/features/login";
import { GovernancePanel } from "@/features/governance";
import { ContentStudio } from "@/features/studio";
import { BibliologiaAcervo } from "@/features/bibliologia";
import { PortalEditorial } from "@/features/portal-editorial";
import { CommandSearch } from "@/components/CommandSearch";

type View = "home" | "courses" | "library" | "guide" | "admin" | "module" | "studio";
type UiMode = "editorial" | "workspace";

const COURSE_LEVELS = [
  "Todos",
  "Nível Básico",
  "Nível Médio / Bacharelado",
  "Nível Avançado / Pós-Graduação",
  "Mestrado em Teologia / Th.M.",
  "Imersões e Workshops",
];

const navigation = [
  { id: "home", label: "Painel Inicial", icon: Home },
  { id: "courses", label: "Meus Cursos", icon: GraduationCap },
  { id: "live", label: "Aulas ao Vivo", icon: Radio },
  { id: "library", label: "Biblioteca Digital", icon: BookOpen },
  { id: "whiteboard", label: "Lousa Virtual", icon: PencilLine },
  { id: "assessments", label: "Avaliações e Provas", icon: ClipboardList },
  { id: "attendance", label: "Frequência (Chamada)", icon: Clock },
  { id: "certificates", label: "Certificados", icon: Award },
  { id: "students", label: "Alunos e Turmas", icon: Users },
  { id: "reports", label: "Relatórios", icon: ChartNoAxesColumnIncreasing },
  { id: "settings", label: "Configurações", icon: Settings },
];

export default function School() {
  const [uiMode, setUiMode] = useState<UiMode>("editorial");
  const [libraryTab, setLibraryTab] = useState<"acervo" | "arquivos">("acervo");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState("bibliologia-critica-textual");
  const [courseLevelFilter, setCourseLevelFilter] = useState("Todos");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  const [view, setView] = useState<View>("home");
  const [section, setSection] = useState("");
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState<{ title: string; text: string } | null>(null);
  const [mobile, setMobile] = useState(false);
  const [login, setLogin] = useState(true);
  const [restoringSession, setRestoringSession] = useState(true);
  const [token, setToken] = useState<string>();
  const [actor, setActor] = useState<Actor | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [adminCatalog, setAdminCatalog] = useState<Course[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [outline, setOutline] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("kairos_ui_mode");
      if (saved === "editorial" || saved === "workspace") {
        setUiMode(saved);
      }
      const params = new URLSearchParams(window.location.search);
      const cursoParam = params.get("curso");
      if (cursoParam) {
        setSelectedCourseSlug(cursoParam);
        setUiMode("workspace");
        setView("library");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function switchUiMode(next: UiMode) {
    setUiMode(next);
    try {
      window.localStorage.setItem("kairos_ui_mode", next);
    } catch {
      // ignore
    }
    if (next === "editorial") {
      setView("home");
    }
  }

  useEffect(() => {
    if (!outline && !selected && !info) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOutline(false);
        setSelected(null);
        setInfo(null);
      }
      if (event.key === "Tab") {
        const dialog = document.querySelector('[role="dialog"]');
        const nodes = dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input, select, textarea"
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [outline, selected, info]);

  async function loadCatalog() {
    setLoading(true);
    setCatalogError("");
    try {
      setCatalog(await api<Course[]>("/api/v1/courses?limit=200"));
    } catch (error) {
      setCatalogError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    let active = true;
    api<Actor>("/api/v1/auth/me")
      .then((user) => {
        if (active) {
          setActor(user);
          setToken("cookie-session");
          setLogin(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRestoringSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!auth) return;
    const { data } = auth.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token);
      setActor(null);
      setSessionError("");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (token)
      api<Actor>(token === "cookie-session" ? "/api/v1/auth/me" : "/api/v1/me", token)
        .then((user) => {
          if (active) setActor(user);
        })
        .catch((error) => {
          if (active) setSessionError(error.message);
        });
    return () => {
      active = false;
    };
  }, [token]);

  const isAdmin = actor?.roles.includes("admin");
  const canUpload = Boolean(actor?.roles.some((role) => role === "admin" || role === "coordinator"));

  useEffect(() => {
    if (!canUpload || !token) {
      setAdminCatalog([]);
      return;
    }
    let active = true;
    void api<Course[]>("/api/v1/admin/courses?limit=200", token)
      .then((rows) => {
        if (active) setAdminCatalog(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [canUpload, token]);

  const allKnownCourses = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of catalog) map.set(c.slug, c);
    for (const c of adminCatalog) map.set(c.slug, c);
    return Array.from(map.values());
  }, [catalog, adminCatalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((course) => {
      if (courseLevelFilter !== "Todos" && (course.level || "Geral") !== courseLevelFilter) {
        return false;
      }
      if (!query.trim()) return true;
      return `${course.title} ${course.description} ${course.level || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR"));
    });
  }, [catalog, courseLevelFilter, query]);

  function navigate(next: View) {
    setView(next);
    setMobile(false);
  }

  function openSection(id: string, label: string) {
    if (["home", "courses", "library", "guide", "admin", "studio"].includes(id)) {
      navigate(id as View);
    } else {
      setSection(label);
      navigate("module");
    }
  }

  function syncCourseUrl(slug: string) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("curso", slug);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }

  function openCourseAcervo(courseSlug?: string) {
    setUiMode("workspace");
    if (courseSlug) {
      setSelectedCourseSlug(courseSlug);
      syncCourseUrl(courseSlug);
    }
    setLibraryTab("acervo");
    navigate("library");
  }

  async function signOut() {
    try {
      await api("/api/v1/auth/logout", undefined, { method: "POST" });
      await auth?.auth.signOut();
    } catch (e) {
      setSessionError((e as Error).message);
      return;
    }
    setToken(undefined);
    setActor(null);
    setAdminCatalog([]);
    setSessionError("");
    setView("home");
    setLogin(true);
  }

  const profileName = actor?.display_name || "Prof. Francisco";
  const profileRole = actor
    ? actor.roles.includes("admin")
      ? "Administrador"
      : actor.roles.includes("coordinator")
      ? "Coordenador"
      : actor.roles.includes("teacher")
      ? "Professor"
      : "Aluno"
    : "Administrador";
  const profilePhoto = actor ? actor.avatar_url : "/images/francisco-professor.png";

  if (restoringSession) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fbf9f5",
          color: "#795b28",
        }}
      >
        Abrindo Instituto Kairós…
      </div>
    );
  }

  if (actor && (actor.must_change_credentials || actor.account_status === "pending")) {
    return <MandatoryCredentials user={actor} onUpdated={setActor} onLogout={() => void signOut()} />;
  }

  if (login) {
    return (
      <LoginScreen
        onClose={() => setLogin(false)}
        onAuthenticated={(user) => {
          setActor(user);
          setToken("cookie-session");
          setLogin(false);
          setView("home");
          setSessionError("");
        }}
      />
    );
  }

  const showEditorialPortal = uiMode === "editorial" && view === "home";
  const showReferenceHero = !showEditorialPortal && view === "home";

  return (
    <>
      <Toaster position="bottom-right" richColors theme="light" />
      <CommandSearch
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        courses={allKnownCourses}
        onNavigateView={(nextView, label) => {
          setUiMode("workspace");
          if (label) {
            setSection(label);
            navigate("module");
          } else {
            navigate(nextView as View);
          }
        }}
        onOpenAcervo={(slug) => openCourseAcervo(slug)}
      />

      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>

      <header className="topbar">
        {!showEditorialPortal && (
          <button
            className="icon-button mobile-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
        )}

        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Instituto Teológico Kairós, início"
        >
          <span className="kairos-symbol">
            <Hourglass size={32} />
            <BookOpen size={43} />
          </span>
          <span>
            <small>INSTITUTO TEOLÓGICO</small>
            <strong>KAIRÓS</strong>
          </span>
        </button>

        <nav className="topnav" aria-label="Menu principal">
          <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>
            {uiMode === "editorial" ? "Meu aprendizado" : "Início"}
          </button>
          <button
            className={view === "courses" ? "active" : ""}
            onClick={() => {
              setUiMode("workspace");
              navigate("courses");
            }}
          >
            Cursos
          </button>
          <button
            onClick={() => {
              setUiMode("workspace");
              openSection("live", "Aulas ao Vivo");
            }}
          >
            Aulas ao Vivo
          </button>
          <button
            className={view === "library" ? "active" : ""}
            onClick={() => openCourseAcervo(selectedCourseSlug)}
          >
            Biblioteca
          </button>
          <button
            onClick={() => {
              setUiMode("workspace");
              openSection("community", "Comunidade");
            }}
          >
            Comunidade
          </button>
        </nav>

        <div className="account">
          <div className="mode-switcher" role="group" aria-label="Alternar modo de interface">
            <button
              type="button"
              className={uiMode === "editorial" ? "active" : ""}
              onClick={() => switchUiMode("editorial")}
              title="Visão imersiva focada em estudo"
            >
              <Sparkles size={13} />
              <span>Meu Aprendizado</span>
            </button>
            <button
              type="button"
              className={uiMode === "workspace" ? "active" : ""}
              onClick={() => switchUiMode("workspace")}
              title="Visão acadêmica completa com sidebar e acervo"
            >
              <LayoutGrid size={13} />
              <span>Painel & Acervo</span>
            </button>
          </div>

          <button
            className="icon-button"
            aria-label="Busca rápida (Ctrl+K)"
            onClick={() => setCmdkOpen(true)}
          >
            <Search size={21} />
          </button>
          <button
            className="icon-button"
            aria-label="Notificações"
            onClick={() =>
              setInfo({
                title: "Notificações",
                text: actor
                  ? "O serviço de notificações ainda não está disponível nesta versão."
                  : "Entre na escola para acessar suas notificações quando o serviço estiver disponível.",
              })
            }
          >
            <Bell size={21} />
          </button>
          <button
            className="icon-button help-top"
            aria-label="Como estudar na escola"
            onClick={() => {
              setUiMode("workspace");
              navigate("guide");
            }}
          >
            <CircleHelp size={20} />
          </button>
          <button
            className="profile-account"
            onClick={() =>
              actor
                ? setInfo({
                    title: profileName,
                    text: `${profileRole} · Instituto Teológico Kairós`,
                  })
                : setLogin(true)
            }
            aria-label={`${profileName}, ${actor ? "abrir perfil" : "acessar conta"}`}
          >
            <span className="avatar">
              {profilePhoto ? (
                <Image src={profilePhoto} alt={profileName} width={38} height={38} />
              ) : (
                profileName.slice(0, 1)
              )}
            </span>
            <span className="account-name">{profileName}</span>
            <ChevronRight size={13} className="profile-chevron" />
          </button>
          {actor && (
            <button className="icon-button" aria-label="Sair" onClick={() => void signOut()}>
              <LogOut size={17} />
            </button>
          )}
        </div>
      </header>

      {showEditorialPortal ? (
        <main id="conteudo" style={{ width: "100%", padding: 0, maxWidth: "none" }}>
          {sessionError && (
            <div className="notice mx-7 mt-4" role="alert">
              {sessionError} <button onClick={() => void signOut()}>Encerrar sessão</button>
            </div>
          )}
          <PortalEditorial
            token={token}
            courses={allKnownCourses}
            onOpenCourses={() => {
              setCourseLevelFilter("Todos");
              setUiMode("workspace");
              navigate("courses");
            }}
            onOpenLevel={(lvl) => {
              setCourseLevelFilter(lvl);
              setUiMode("workspace");
              navigate("courses");
            }}
            onOpenBibliologia={(slug) => openCourseAcervo(slug)}
            onOpenActivities={() => {
              setUiMode("workspace");
              openSection("assessments", "Atividades e Avaliações");
            }}
            onOpenLive={() => {
              setUiMode("workspace");
              openSection("live", "Aulas ao Vivo");
            }}
            onSwitchWorkspace={() => switchUiMode("workspace")}
          />
          <footer className="max-w-[1440px] mx-auto px-7">
            <span>
              <BookOpen size={15} /> Instituto Teológico Kairós
            </span>
            <p>Formação bíblica. Conhecimento compartilhado.</p>
            <span className="footer-note">Escola Digital de Teologia</span>
          </footer>
        </main>
      ) : (
        <>
          {showReferenceHero && (
            <section className="reference-hero" aria-label="Instituto Teológico Kairós">
              <div className="hero-coordinator">
                <Image
                  src="/images/dorival-coordenador.png"
                  alt="Dorival, coordenador do Instituto Kairós"
                  width={576}
                  height={642}
                  preload
                />
              </div>
              <div className="hero-institute">
                <Image
                  src="/images/logo-instituto.png"
                  alt="Instituto Teológico Kairós — Formação Bíblica, Teológica e Ministerial com profundidade, relevância e aplicação."
                  width={344}
                  height={148}
                  preload
                />
                <div className="hero-actions">
                  <button className="btn-kairos-coral" onClick={() => navigate("courses")}>
                    Conheça os Cursos <ArrowRight size={14} />
                  </button>
                  <button
                    className="btn-kairos-teal"
                    onClick={() => openCourseAcervo(selectedCourseSlug)}
                  >
                    <CirclePlay size={16} /> Biblioteca & Acervo
                  </button>
                </div>
              </div>
              <div className="hero-scriptures">
                <Image
                  src="/images/biblia-ampulheta.png"
                  alt="Bíblia aberta, coroa de espinhos e ampulheta"
                  width={492}
                  height={196}
                  preload
                />
              </div>
            </section>
          )}

          <div className="workspace">
            {mobile && (
              <button
                className="scrim"
                aria-label="Fechar menu"
                onClick={() => setMobile(false)}
              />
            )}

            <aside className={`sidebar ${mobile ? "opened" : ""}`}>
              <div className="sidebar-profile">
                {profilePhoto ? (
                  <Image src={profilePhoto} width={48} height={48} alt={profileName} />
                ) : (
                  <span className="profile-initial">{profileName.slice(0, 1)}</span>
                )}
                <div>
                  <strong>{profileName}</strong>
                  <span>{profileRole}</span>
                </div>
              </div>

              <button
                type="button"
                className="cmdk-trigger"
                onClick={() => setCmdkOpen(true)}
              >
                <Search size={13} />
                <span>Buscar aulas…</span>
                <kbd>Ctrl+K</kbd>
              </button>

              <nav aria-label="Ambiente da escola">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    className={`side-item ${
                      view === item.id || (view === "module" && section === item.label) ? "active" : ""
                    }`}
                    onClick={() => openSection(item.id, item.label)}
                  >
                    <item.icon size={20} />
                    {item.label}
                    {view === item.id && <ChevronRight size={15} />}
                  </button>
                ))}
                {canUpload && (
                  <button
                    className={`side-item ${view === "admin" ? "active" : ""}`}
                    onClick={() => navigate("admin")}
                  >
                    <ShieldCheck size={20} /> Administrar cursos
                  </button>
                )}
                {canUpload && (
                  <button
                    className={`side-item ${view === "studio" ? "active" : ""}`}
                    onClick={() => navigate("studio")}
                  >
                    <Plus size={20} /> Conteúdos e Uploads
                  </button>
                )}
              </nav>
            </aside>

            <main id="conteudo">
              {sessionError && (
                <div className="notice" role="alert">
                  {sessionError} <button onClick={() => void signOut()}>Encerrar sessão</button>
                </div>
              )}

              {view === "home" && (
                <HomeDashboard
                  key={token || "guest"}
                  token={token}
                  onLogin={() => setLogin(true)}
                  onCourses={() => navigate("courses")}
                  onMaterials={() => openCourseAcervo(selectedCourseSlug)}
                  onActivities={() => openSection("assessments", "Atividades e Avaliações")}
                />
              )}

              {view === "studio" && actor && <ContentStudio canUpload={canUpload} />}

              {view === "module" && section === "Alunos e Turmas" && isAdmin && actor && (
                <GovernancePanel actor={actor} />
              )}

              {view === "module" && !(section === "Alunos e Turmas" && isAdmin) && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">INSTITUTO KAIRÓS</span>
                      <h1>{section}</h1>
                    </div>
                  </div>
                  {section === "Aulas ao Vivo" ||
                  section === "Relatórios" ||
                  section === "Atividades e Avaliações" ||
                  section === "Avaliações e Provas" ? (
                    <HomeDashboard
                      key={`${token || "guest"}-${section}`}
                      token={token}
                      section={
                        section === "Aulas ao Vivo"
                          ? "live"
                          : section === "Relatórios"
                          ? "reports"
                          : "activities"
                      }
                      onLogin={() => setLogin(true)}
                      onCourses={() => navigate("courses")}
                      onMaterials={() => openCourseAcervo(selectedCourseSlug)}
                      onActivities={() => openSection("assessments", "Atividades e Avaliações")}
                    />
                  ) : (
                    <section className="panel module-state">
                      <h2>{section}</h2>
                      <p>
                        {actor
                          ? "Este módulo ainda está em implantação. Nenhum registro ou operação é simulado."
                          : "Entre com sua conta para acessar os recursos acadêmicos conforme suas permissões."}
                      </p>
                      <button
                        className="btn-kairos-glass"
                        onClick={() => (actor ? navigate("home") : setLogin(true))}
                      >
                        {actor ? "Voltar ao painel" : "Acessar escola"}
                      </button>
                    </section>
                  )}
                </>
              )}

              {view === "courses" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">FORMAÇÃO TEOLÓGICA</span>
                      <h1>Uma jornada de conhecimento.</h1>
                      <p>
                        Explore os {catalog.length} cursos publicados por nível e acesse o acervo
                        direto de cada disciplina.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-kairos-coral"
                      onClick={() => openCourseAcervo(selectedCourseSlug)}
                    >
                      <Sparkles size={14} /> Abrir Biblioteca Digital
                    </button>
                  </div>

                  <section className="card grid gap-4">
                    <div className="section-heading" style={{ marginBottom: 0 }}>
                      <h2>
                        <GraduationCap size={21} /> Catálogo de cursos ({filteredCatalog.length})
                      </h2>
                      <button
                        className="icon-button"
                        aria-label="Atualizar catálogo"
                        onClick={() => void loadCatalog()}
                      >
                        <RefreshCw size={17} />
                      </button>
                    </div>

                    <div className="filter-pills">
                      {COURSE_LEVELS.map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`filter-pill ${courseLevelFilter === lvl ? "active" : ""}`}
                          onClick={() => setCourseLevelFilter(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    <label className="catalog-search" style={{ marginBottom: 0 }}>
                      <Search size={17} />
                      <input
                        aria-label="Pesquisar curso por título"
                        placeholder="Pesquisar cursos por título ou tema…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>

                    {loading ? (
                      <p role="status">Carregando cursos…</p>
                    ) : catalogError ? (
                      <div className="notice" role="alert">
                        <p>{catalogError}</p>
                        <button className="text-link" onClick={() => void loadCatalog()}>
                          Tentar novamente <RefreshCw size={15} />
                        </button>
                      </div>
                    ) : filteredCatalog.length === 0 ? (
                      <div className="empty-state">
                        <BookOpen size={40} />
                        <h3>Nenhum curso encontrado neste filtro.</h3>
                        <p>Tente outro nível ou limpe o campo de busca.</p>
                      </div>
                    ) : (
                      <div className="course-grid">
                        {filteredCatalog.map((course) => (
                          <div
                            className="catalog-course flex flex-col justify-between gap-4"
                            key={course.id}
                          >
                            <div className="grid gap-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="course-medallion">
                                  <BookOpen size={21} />
                                </span>
                                {course.level && (
                                  <span className="ds-pill teal">{course.level}</span>
                                )}
                              </div>
                              <h3>{course.title}</h3>
                              <p style={{ marginBottom: 0 }}>
                                {course.description || "Conheça a proposta deste curso."}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <button
                                type="button"
                                className="btn-kairos-coral"
                                onClick={() => openCourseAcervo(course.slug)}
                              >
                                <Video size={13} /> Abrir Acervo
                              </button>
                              <button
                                type="button"
                                className="btn-kairos-teal"
                                onClick={() => setSelected(course)}
                              >
                                Ver Ementa <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {view === "library" && (
                <Tabs.Root
                  value={libraryTab}
                  onValueChange={(val) => setLibraryTab(val as "acervo" | "arquivos")}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Tabs.List className="kairos-tabs-list" aria-label="Seções da Biblioteca Digital">
                      <Tabs.Trigger value="acervo" className="kairos-tabs-trigger">
                        <Sparkles size={14} /> Acervo por Curso (Vídeos & Playlists)
                      </Tabs.Trigger>
                      <Tabs.Trigger value="arquivos" className="kairos-tabs-trigger">
                        <FolderOpen size={14} /> Arquivos & Uploads da Escola
                      </Tabs.Trigger>
                    </Tabs.List>
                  </div>

                  <Tabs.Content value="acervo">
                    <BibliologiaAcervo
                      courses={allKnownCourses}
                      token={token}
                      canManage={canUpload}
                      selectedCourseSlug={selectedCourseSlug}
                      onSelectCourseSlug={(slug) => {
                        setSelectedCourseSlug(slug);
                        syncCourseUrl(slug);
                      }}
                      onOpenUploads={() => setLibraryTab("arquivos")}
                    />
                  </Tabs.Content>

                  <Tabs.Content value="arquivos">
                    {actor ? (
                      <ContentStudio canUpload={canUpload} />
                    ) : (
                      <section className="panel module-state">
                        <h2>Arquivos e Materiais da Turma</h2>
                        <p>Entre para consultar e baixar os arquivos publicados para os seus cursos.</p>
                        <button className="btn-kairos-sapphire" onClick={() => setLogin(true)}>
                          Acessar escola
                        </button>
                      </section>
                    )}
                  </Tabs.Content>
                </Tabs.Root>
              )}

              {view === "guide" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">COMO FUNCIONA</span>
                      <h1>Estudar é caminhar junto.</h1>
                      <p>Conheça a proposta da nossa escola digital.</p>
                    </div>
                  </div>
                  <div className="guide-grid">
                    {[
                      {
                        icon: BookOpen,
                        title: "Conheça a formação",
                        text: "O catálogo apresenta os cursos organizados por nível teológico, do Básico ao Mestrado e Imersões.",
                      },
                      {
                        icon: LogIn,
                        title: "Acesse sua conta",
                        text: "O acesso será vinculado à sua identidade e à matrícula na turma. Se sua conta ainda não estiver habilitada, aguarde a orientação da escola.",
                      },
                      {
                        icon: MessageCircle,
                        title: "Participe das aulas",
                        text: "Perguntas ao professor, debates e atividades fazem parte da proposta. As ferramentas de participação estão previstas nas próximas etapas.",
                      },
                      {
                        icon: ShieldCheck,
                        title: "Acompanhe sua jornada",
                        text: "Frequência, avaliações e certificados serão disponibilizados após a implantação dos respectivos módulos. A presença terá confirmação explícita.",
                      },
                    ].map((item) => (
                      <section className="card guide-card" key={item.title}>
                        <item.icon size={29} />
                        <h2>{item.title}</h2>
                        <p>{item.text}</p>
                      </section>
                    ))}
                  </div>
                  <p className="release-note">
                    Escola em implantação. Nesta versão estão disponíveis a navegação institucional e
                    o catálogo conectado à API, quando configurada.
                  </p>
                </>
              )}

              {view === "admin" && canUpload && token && (
                <AdminCourses
                  token={token}
                  onManageVideos={(slug) => openCourseAcervo(slug)}
                  onPublished={() => {
                    void loadCatalog();
                    void api<Course[]>("/api/v1/admin/courses?limit=200", token)
                      .then(setAdminCatalog)
                      .catch(() => {});
                  }}
                />
              )}

              <footer>
                <span>
                  <BookOpen size={15} /> Instituto Teológico Kairós
                </span>
                <p>Formação bíblica. Conhecimento compartilhado.</p>
                <span className="footer-note">Escola Digital de Teologia</span>
              </footer>
            </main>
          </div>
        </>
      )}

      {info && (
        <div className="modal-backdrop" onClick={() => setInfo(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button close"
              aria-label="Fechar"
              onClick={() => setInfo(null)}
            >
              <X />
            </button>
            <h2 id="info-title">{info.title}</h2>
            <p>{info.text}</p>
            <button className="btn-kairos-glass" onClick={() => setInfo(null)}>
              Voltar
            </button>
          </section>
        </div>
      )}

      {(outline || selected) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setOutline(false);
            setSelected(null);
          }}
        >
          <section
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button close"
              aria-label="Fechar"
              onClick={() => {
                setOutline(false);
                setSelected(null);
              }}
            >
              <X />
            </button>
            <span className="eyebrow">
              {selected?.level || (selected ? "FORMAÇÃO TEOLÓGICA" : "PROPOSTA CURRICULAR INICIAL")}
            </span>
            <h2 id="course-title">{selected?.title || "Bibliologia e Crítica Textual"}</h2>
            <p>
              {selected?.description ||
                "Um percurso de estudo sobre a origem, a transmissão e a interpretação das Escrituras."}
            </p>
            <p className="muted">
              {selected
                ? "Acesse os vídeos, playlists e fontes deste curso clicando abaixo."
                : "Programa preliminar. Datas, carga horária e abertura de matrículas ainda não foram publicadas."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="btn-kairos-coral"
                onClick={() => {
                  const targetSlug = selected?.slug || selectedCourseSlug;
                  setOutline(false);
                  setSelected(null);
                  openCourseAcervo(targetSlug);
                }}
              >
                <Sparkles size={14} /> Abrir Acervo deste Curso
              </button>
              <button
                className="btn-kairos-glass"
                onClick={() => {
                  setOutline(false);
                  setSelected(null);
                }}
              >
                Voltar à escola <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function AdminCourses({
  token,
  onPublished,
  onManageVideos,
}: {
  token: string;
  onPublished: () => void;
  onManageVideos: (slug: string) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    level: "Nível Básico",
    status: "published",
  });

  async function load() {
    try {
      setCourses(await api<Course[]>("/api/v1/admin/courses?limit=200", token));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        level: form.level,
        status: form.status,
      };
      await api<Course>(`/api/v1/admin/courses${editing ? `/${editing.id}` : ""}`, token, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setSuccess("Curso salvo com sucesso.");
      setEditing(null);
      setForm({
        title: "",
        slug: "",
        description: "",
        level: "Nível Básico",
        status: "published",
      });
      await load();
      onPublished();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO ACADÊMICA</span>
          <h1>Cursos da escola ({courses.length}).</h1>
          <p>Crie, edite, publique cursos e gerencie vídeos/playlists de cada disciplina.</p>
        </div>
      </div>
      <div className="admin-grid">
        <section className="card">
          <h2>{editing ? "Editar curso" : "Novo curso"}</h2>
          <form onSubmit={submit} className="course-form">
            <label>
              Título
              <input
                required
                minLength={3}
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Identificador
              <input
                required
                minLength={3}
                maxLength={220}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="introducao-a-bibliologia"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label>
              Nível / Trilha
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option value="Nível Básico">Nível Básico</option>
                <option value="Nível Médio / Bacharelado">Nível Médio / Bacharelado</option>
                <option value="Nível Avançado / Pós-Graduação">
                  Nível Avançado / Pós-Graduação
                </option>
                <option value="Mestrado em Teologia / Th.M.">Mestrado em Teologia / Th.M.</option>
                <option value="Imersões e Workshops">Imersões e Workshops</option>
                <option value="Geral">Geral</option>
              </select>
            </label>
            <label>
              Descrição
              <textarea
                rows={4}
                maxLength={10000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              Publicação
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="success" role="status">
                <Check size={18} />
                {success}
              </p>
            )}
            <button disabled={busy} className="btn-kairos-coral" type="submit">
              <Plus size={16} />
              {busy ? "Salvando…" : "Salvar curso"}
            </button>
            {editing && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setEditing(null);
                  setForm({
                    title: "",
                    slug: "",
                    description: "",
                    level: "Nível Básico",
                    status: "published",
                  });
                }}
              >
                Cancelar edição
              </button>
            )}
          </form>
        </section>
        <section className="card">
          <h2>Cursos cadastrados</h2>
          {courses.length === 0 ? (
            <p className="muted">Nenhum curso carregado.</p>
          ) : (
            <div className="max-h-[620px] overflow-y-auto pr-1">
              {courses.map((course) => (
                <div className="admin-course" key={course.id}>
                  <div>
                    <h3>{course.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="tag">
                        {
                          { draft: "Rascunho", published: "Publicado", archived: "Arquivado" }[
                            course.status
                          ]
                        }
                      </span>
                      {course.level && <span className="tag">{course.level}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onManageVideos(course.slug)}
                    >
                      Vídeos <Video size={14} />
                    </button>
                    <button
                      className="text-link"
                      onClick={() => {
                        setEditing(course);
                        setForm({
                          title: course.title,
                          slug: course.slug,
                          description: course.description,
                          level: course.level || "Geral",
                          status: course.status,
                        });
                        setSuccess("");
                      }}
                    >
                      Editar <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
