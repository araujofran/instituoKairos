# ruff: noqa: E501
"""Seed completo dos cursos do Instituto Teológico Kairós e acervo de Bibliologia no PostgreSQL."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.modules.academic.models import Course, CourseResource

ROOT = Path(__file__).resolve().parents[2]
CATALOGO_BIBLIOLOGIA_PATH = ROOT / "data" / "bibliologia" / "catalogo_videos.json"

GRADE_CURSOS: list[tuple[str, str, str, str]] = [
    # Nível Básico (10 solicitados + 3 complementares clássicos)
    (
        "Bibliologia e Crítica Textual",
        "bibliologia-critica-textual",
        "Nível Básico",
        "Revelação, inspiração, inerrância, formação do cânon e transmissão dos manuscritos bíblicos.",
    ),
    (
        "Panorama do Antigo Testamento",
        "panorama-antigo-testamento",
        "Nível Básico",
        "Visão histórica, literária e teológica de Gênesis a Malaquias.",
    ),
    (
        "Panorama do Novo Testamento",
        "panorama-novo-testamento",
        "Nível Básico",
        "Contexto judaico e greco-romano, Evangelhos, Atos, Epístolas e Apocalipse.",
    ),
    (
        "Teontologia",
        "teontologia",
        "Nível Básico",
        "A Doutrina de Deus: existência, atributos comunicáveis e incomunicáveis, nomes, Trindade e decretos.",
    ),
    (
        "Cristologia",
        "cristologia",
        "Nível Básico",
        "A Pessoa e a Obra de Cristo: encarnação, duas naturezas, humilhação, exaltação e ofícios.",
    ),
    (
        "Pneumatologia",
        "pneumatologia",
        "Nível Básico",
        "A Pessoa e a Obra do Espírito Santo: regeneração, habitação, dons espirituais, fruto e batismo.",
    ),
    (
        "Antropologia Bíblica",
        "antropologia-biblica",
        "Nível Básico",
        "A Doutrina do Homem: criação, imagem de Deus (Imago Dei), constituição humana e vocação.",
    ),
    (
        "Hamartiologia",
        "hamartiologia",
        "Nível Básico",
        "A Doutrina do Pecado: origem, queda, natureza pecaminosa, depravação total e iniquidade.",
    ),
    (
        "Hermenêutica Bíblica I",
        "hermeneutica-biblica-i",
        "Nível Básico",
        "Regras fundamentais de interpretação bíblica, contexto histórico-gramatical e gêneros literários.",
    ),
    (
        "Homilética I",
        "homiletica-i",
        "Nível Básico",
        "Fundamentos da pregação bíblica, proposição central e estruturação clara de sermões.",
    ),
    (
        "Ética Cristã e Vida Devocional",
        "etica-crista-vida-devocional",
        "Nível Básico",
        "Caráter cristão, disciplinas espirituais, mordomia e tomada de decisão à luz das Escrituras.",
    ),
    (
        "Geografia e Contexto Bíblico",
        "geografia-contexto-biblico",
        "Nível Básico",
        "Mapas, regiões do Crescente Fértil, costumes bíblicos e cronologia de Israel.",
    ),
    (
        "Liturgia e Culto Bíblico",
        "liturgia-culto-biblico",
        "Nível Básico",
        "Teologia da adoração, elementos do culto público e prática reverente na igreja local.",
    ),
    # Nível Médio / Bacharelado (13 solicitados + 3 complementares)
    (
        "Soteriologia",
        "soteriologia",
        "Nível Médio / Bacharelado",
        "A Doutrina da Salvação: eleição, chamado eficaz, regeneração, fé, justificação, santificação e glorificação.",
    ),
    (
        "Eclesiologia",
        "eclesiologia",
        "Nível Médio / Bacharelado",
        "A Doutrina da Igreja: natureza, marcas da igreja verdadeira, governo eclesiástico, ordenanças e missão.",
    ),
    (
        "Angelologia",
        "angelologia",
        "Nível Médio / Bacharelado",
        "A Doutrina dos Anjos: anjos eleitos, querubins, serafins, Satanás, demonologia e batalha espiritual.",
    ),
    (
        "Escatologia",
        "escatologia",
        "Nível Médio / Bacharelado",
        "A Doutrina das Últimas Coisas: morte física, estado intermediário, segunda vinda, ressurreição, juízo e eternidade.",
    ),
    (
        "Tipologia Bíblica",
        "tipologia-biblica",
        "Nível Médio / Bacharelado",
        "Tipos, antítipos, sombras e figuras de Cristo e da Igreja revelados no Antigo Testamento.",
    ),
    (
        "Hermenêutica Bíblica II",
        "hermeneutica-biblica-ii",
        "Nível Médio / Bacharelado",
        "Figuras de linguagem, alegoria, simbolismo profético e o uso do Antigo Testamento no Novo Testamento.",
    ),
    (
        "Grego Koiné I e II",
        "grego-koine-i-e-ii",
        "Nível Médio / Bacharelado",
        "Alfabeto, morfologia nominal e verbal, sintaxe e leitura direta do Novo Testamento Grego.",
    ),
    (
        "Hebraico Bíblico I e II",
        "hebraico-biblico-i-e-ii",
        "Nível Médio / Bacharelado",
        "Consoantes, massoréticos, sistema verbal (Qal e troncos derivados) e leitura do Antigo Testamento.",
    ),
    (
        "Exegese do Antigo e Novo Testamento",
        "exegese-antigo-e-novo-testamento",
        "Nível Médio / Bacharelado",
        "Método exegético passo a passo aplicando línguas originais, sintaxe e análise textual.",
    ),
    (
        "História da Igreja",
        "historia-da-igreja",
        "Nível Médio / Bacharelado",
        "Da Igreja Primitiva e Patrística à Idade Média, Reforma Protestante e Era Moderna.",
    ),
    (
        "Apologética Cristã",
        "apologetica-crista",
        "Nível Médio / Bacharelado",
        "Defesa racional e bíblica da fé cristã, cosmovisão teísta e diálogo com objeções contemporâneas.",
    ),
    (
        "Poimênica e Aconselhamento Bíblico",
        "poimenica-aconselhamento-biblico",
        "Nível Médio / Bacharelado",
        "Cuidado pastoral integral, discipulado e aconselhamento fundamentado nas Escrituras.",
    ),
    (
        "Missiologia",
        "missiologia",
        "Nível Médio / Bacharelado",
        "Teologia bíblica da missão (Missio Dei), evangelismo transcultural e plantação de igrejas.",
    ),
    (
        "Teologia Bíblica do Antigo Testamento",
        "teologia-biblica-antigo-testamento",
        "Nível Médio / Bacharelado",
        "Desenvolvimento progressivo da revelação, alianças e promessas messiânicas no AT.",
    ),
    (
        "Teologia Bíblica do Novo Testamento",
        "teologia-biblica-novo-testamento",
        "Nível Médio / Bacharelado",
        "Reino de Deus, teologia paulina, joanina e escritos gerais em perspectiva redentiva.",
    ),
    (
        "Liderança Cristã e Administração Eclesiástica",
        "lideranca-crista-administracao",
        "Nível Médio / Bacharelado",
        "Liderança servidora, formação de equipes ministeriais e gestão saudável da igreja local.",
    ),
    # Nível Avançado / Pós-Graduação (8 solicitados + 3 complementares)
    (
        "Hamartiologia Avançada e Teologia da Graça",
        "hamartiologia-avancada-teologia-da-graca",
        "Nível Avançado / Pós-Graduação",
        "Análise lexical de chattath/hamartia vs. 'avon/anomia, Agostinho vs. Pelágio, Calvinismo vs. Arminianismo.",
    ),
    (
        "Cristologia Patrística e Conciliar",
        "cristologia-patristica-e-conciliar",
        "Nível Avançado / Pós-Graduação",
        "Os grandes debates cristológicos dos séculos IV e V, de Niceia (325) a Calcedônia (451).",
    ),
    (
        "Tipologia Messiânica e Tabernáculo",
        "tipologia-messianica-e-tabernaculo",
        "Nível Avançado / Pós-Graduação",
        "Estudo aprofundado das festas judaicas, sacrifícios levíticos e mobiliário do Tabernáculo.",
    ),
    (
        "Escatologia Comparada e Literatura Apocalíptica",
        "escatologia-comparada-apocaliptica",
        "Nível Avançado / Pós-Graduação",
        "Análise comparada das escolas milenistas e estudo exegético de Daniel, Ezequiel, Zacarias e Apocalipse.",
    ),
    (
        "Teologia da Aliança vs. Dispensacionalismo",
        "teologia-da-alianca-vs-dispensacionalismo",
        "Nível Avançado / Pós-Graduação",
        "Sistemas hermenêuticos de interpretação da continuidade bíblica entre Israel e a Igreja.",
    ),
    (
        "Teologia Contemporânea e Pós-Modernidade",
        "teologia-contemporanea-pos-modernidade",
        "Nível Avançado / Pós-Graduação",
        "Movimentos teológicos dos séculos XIX ao XXI, teologia pública e desafios culturais.",
    ),
    (
        "Arqueologia Bíblica e Geografia Histórica",
        "arqueologia-biblica-geografia-historica",
        "Nível Avançado / Pós-Graduação",
        "Evidências epigráficas, escavações no Oriente Próximo Antigo e confirmação de contextos bíblicos.",
    ),
    (
        "Religiões Comparadas e Seitas",
        "religioes-comparadas-e-seitas",
        "Nível Avançado / Pós-Graduação",
        "Análise doutrinária e apologética das grandes religiões mundiais e movimentos paracristãos.",
    ),
    (
        "Teologia Reformada e Confessionalidade",
        "teologia-reformada-confessionalidade",
        "Nível Avançado / Pós-Graduação",
        "As cinco Solas, confissões históricas (Westminster, Dort, Heidelberg) e herança reformada.",
    ),
    (
        "Patrística e Teologia Medieval",
        "patristica-e-teologia-medieval",
        "Nível Avançado / Pós-Graduação",
        "Pais Apostólicos, Agostinho, Anselmo, Tomás de Aquino e os precursores da Reforma.",
    ),
    (
        "Educação Cristã e Pedagogia Bíblica",
        "educacao-crista-pedagogia-biblica",
        "Nível Avançado / Pós-Graduação",
        "Didática para escola bíblica, currículo discipulador e ensino teológico transformador.",
    ),
    # Mestrado em Teologia / Th.M. (7 solicitados + 2 complementares)
    (
        "Metodologia da Pesquisa Teológica",
        "metodologia-pesquisa-teologica",
        "Mestrado em Teologia / Th.M.",
        "Desenho de pesquisa acadêmica, revisão bibliográfica, normas científicas e escrita de artigos.",
    ),
    (
        "Crítica Textual do Antigo e Novo Testamento",
        "critica-textual-at-e-nt",
        "Mestrado em Teologia / Th.M.",
        "Leitura e avaliação de variantes nos aparatos críticos BHS e Nestle-Aland (NA28).",
    ),
    (
        "História dos Dogmas",
        "historia-dos-dogmas",
        "Mestrado em Teologia / Th.M.",
        "Formação, formulação e desenvolvimento histórico das doutrinas cristãs fundamentais.",
    ),
    (
        "Seminário de Exegese Semítica e Clássica",
        "seminario-exegese-semitica-classica",
        "Mestrado em Teologia / Th.M.",
        "Estudo avançado de porções em aramaico bíblico (Daniel/Esdras) e grego clássico/helênico.",
    ),
    (
        "Filosofia da Religião e Epistemologia Teológica",
        "filosofia-religiao-epistemologia",
        "Mestrado em Teologia / Th.M.",
        "Epistemologia reformada, linguagem religiosa, razão, revelação e argumentos filosóficos.",
    ),
    (
        "Teologia Política e Ética Social",
        "teologia-politica-etica-social",
        "Mestrado em Teologia / Th.M.",
        "Justiça bíblica, esferas de soberania, igreja e Estado na tradição teológica clássica.",
    ),
    (
        "Seminário de Dissertação",
        "seminario-de-dissertacao",
        "Mestrado em Teologia / Th.M.",
        "Orientação metodológica, qualificação de projeto e defesa de dissertação em Th.M.",
    ),
    (
        "Hermenêutica Filosófica e Teológica",
        "hermeneutica-filosofica-e-teologica",
        "Mestrado em Teologia / Th.M.",
        "Diálogo crítico entre tradição hermenêutica moderna, intenção autoral e cânon bíblico.",
    ),
    (
        "Teologia Sistemática Comparada Avançada",
        "teologia-sistematica-comparada-avancada",
        "Mestrado em Teologia / Th.M.",
        "Síntese crítica comparando grandes teólogos sistemáticos clássicos e contemporâneos.",
    ),
    # Imersões e Workshops (7 solicitados + 2 complementares)
    (
        "Imersão em Tipologia do Tabernáculo e Sacrifícios",
        "imersao-tipologia-tabernaculo",
        "Imersões e Workshops",
        "Cristo revelado no livro de Levítico, nas ofertas e na arquitetura do santuário.",
    ),
    (
        "Imersão em Batalha Espiritual e Angelologia Bíblica",
        "imersao-batalha-espiritual",
        "Imersões e Workshops",
        "Separando mitos populares da sólida teologia bíblica sobre o mundo invisível.",
    ),
    (
        "Workshop de Ferramentas Digitais para Exegese",
        "workshop-ferramentas-digitais-exegese",
        "Imersões e Workshops",
        "Uso prático de léxicos, concordâncias, morfologia grega/hebraica e softwares bíblicos.",
    ),
    (
        "Imersão em Pregação Expositiva na Prática",
        "imersao-pregacao-expositiva",
        "Imersões e Workshops",
        "Oficina intensiva do texto bíblico à entrega do sermão expositivo fiel e relevante.",
    ),
    (
        "Imersão em Escatologia: Desvendando o Apocalipse",
        "imersao-escatologia-apocalipse",
        "Imersões e Workshops",
        "Chaves literárias, estrutura simbólica e mensagem pastoral do livro de Apocalipse.",
    ),
    (
        "Workshop de História dos Manuscritos e Traduções da Bíblia",
        "workshop-manuscritos-traducoes",
        "Imersões e Workshops",
        "Dos rolos do Mar Morto e códices unciais às traduções modernas em língua portuguesa.",
    ),
    (
        "Imersão em Capelania e Aconselhamento em Crises",
        "imersao-capelania-crises",
        "Imersões e Workshops",
        "Escuta acolhedora, presença pastoral e consolo bíblico em contextos de luto e emergência.",
    ),
    (
        "Imersão em Parábolas e Sermão do Monte",
        "imersao-parabolas-sermao-monte",
        "Imersões e Workshops",
        "Leitura transformadora dos ensinamentos éticos e parabólicos de Jesus nos Evangelhos.",
    ),
    (
        "Workshop de Discipulado e Pequenos Grupos",
        "workshop-discipulado-pequenos-grupos",
        "Imersões e Workshops",
        "Estratégias bíblicas para multiplicação de grupos pequenos e mentoria cristã.",
    ),
]


def seed_courses_and_bibliologia(session: Session) -> dict[str, int]:
    created_courses = 0
    updated_courses = 0

    for title, slug, level, description in GRADE_CURSOS:
        existing = session.scalar(select(Course).where(Course.slug == slug))
        if existing is None:
            session.add(
                Course(
                    title=title,
                    slug=slug,
                    level=level,
                    description=description,
                    status="published",
                )
            )
            created_courses += 1
        else:
            changed = False
            if existing.level == "Geral":
                existing.level = level
                changed = True
            if existing.status == "draft" and slug == "bibliologia-critica-textual":
                existing.status = "published"
                changed = True
            if changed:
                updated_courses += 1

    session.commit()

    biblio = session.scalar(select(Course).where(Course.slug == "bibliologia-critica-textual"))
    created_resources = 0
    if biblio is not None:
        existing_count = (
            session.scalar(
                select(func.count())
                .select_from(CourseResource)
                .where(CourseResource.course_id == biblio.id)
            )
            or 0
        )
        if existing_count == 0 and CATALOGO_BIBLIOLOGIA_PATH.exists():
            data: dict[str, Any] = json.loads(CATALOGO_BIBLIOLOGIA_PATH.read_text(encoding="utf-8"))
            pos = 1
            for item in data.get("fontes_oficiais", []):
                session.add(
                    CourseResource(
                        course_id=biblio.id,
                        section="official",
                        title=item.get("titulo_original")
                        or item.get("titulo_informado")
                        or "Fonte",
                        channel=item.get("canal") or "",
                        duration=item.get("duracao") or "",
                        url=item.get("url_direta"),
                        description=item.get("descricao") or "",
                        position=pos,
                        status="published",
                    )
                )
                pos += 1
                created_resources += 1

            for pl in data.get("playlists", []):
                pl_row = CourseResource(
                    course_id=biblio.id,
                    section="playlist",
                    title=pl.get("titulo_original") or pl.get("titulo_informado") or "Playlist",
                    channel=pl.get("canal") or "",
                    duration=f"{len(pl.get('aulas', []))} aulas",
                    url=pl.get("url_playlist"),
                    description="",
                    position=pos,
                    status="published",
                )
                session.add(pl_row)
                session.flush()
                pos += 1
                created_resources += 1
                for idx, aula in enumerate(pl.get("aulas", []), 1):
                    session.add(
                        CourseResource(
                            course_id=biblio.id,
                            playlist_id=pl_row.id,
                            section="video",
                            title=aula.get("titulo_original")
                            or aula.get("titulo_informado")
                            or f"Aula {idx}",
                            channel=aula.get("canal") or pl_row.channel,
                            duration=aula.get("duracao") or "",
                            url=aula.get("url_direta"),
                            description="",
                            position=aula.get("ordem") or idx,
                            status="published"
                            if aula.get("status") == "disponivel"
                            else "unavailable",
                        )
                    )
                    created_resources += 1

            for idx, vid in enumerate(data.get("avulsos", []), 1):
                session.add(
                    CourseResource(
                        course_id=biblio.id,
                        section="video",
                        title=vid.get("titulo_original")
                        or vid.get("titulo_informado")
                        or f"Vídeo {idx}",
                        channel=vid.get("canal") or "",
                        duration=vid.get("duracao") or "",
                        url=vid.get("url_direta"),
                        description="",
                        position=idx,
                        status="published" if vid.get("status") == "disponivel" else "unavailable",
                    )
                )
                created_resources += 1

            for idx, pend in enumerate(data.get("pendencias", []), 1):
                session.add(
                    CourseResource(
                        course_id=biblio.id,
                        section="pending",
                        title=pend.get("titulo_informado") or "Pendência",
                        channel=pend.get("canal") or "",
                        duration="",
                        url=None,
                        description=pend.get("observacao") or "",
                        position=idx,
                        status="pending_url",
                    )
                )
                created_resources += 1
            session.commit()

    return {
        "created_courses": created_courses,
        "updated_courses": updated_courses,
        "created_resources": created_resources,
    }


def main() -> None:
    with Session(get_engine()) as session:
        result = seed_courses_and_bibliologia(session)
    print(f"Seed concluído: {result}")


if __name__ == "__main__":
    main()
