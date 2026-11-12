"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Award, CheckCircle2, Sparkles, X, XCircle } from "lucide-react";

type Question = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  {
    prompt: "O que significa 'Bibliologia' dentro da Teologia Sistemática?",
    options: [
      "O estudo exclusivo da história da igreja medieval.",
      "A doutrina das Escrituras Sagradas: revelação, inspiração, cânon e transmissão.",
      "A análise comparada apenas das cartas paulinas.",
    ],
    correctIndex: 1,
    explanation:
      "Bibliologia é o fundamento da Teologia Sistemática e estuda como Deus se revelou e preservou Sua Palavra.",
  },
  {
    prompt: "Na formação do cânon bíblico, o que indica a palavra 'cânon'?",
    options: [
      "Uma vara de medir ou padrão oficial pelo qual os livros inspirados foram reconhecidos.",
      "Um decreto moderno do século XIX.",
      "Uma lista opcional de comentários devocionais.",
    ],
    correctIndex: 0,
    explanation:
      "Cânon vem do grego kanón (régua/padrão) e designa o conjunto de livros reconhecidos como inspirados por Deus.",
  },
  {
    prompt: "Qual é o objetivo principal da Crítica Textual Bíblica?",
    options: [
      "Substituir a fé bíblica por opiniões filosóficas.",
      "Comparar manuscritos antigos para confirmar com precisão o texto original inspirado.",
      "Reduzir o número de capítulos dos Evangelhos.",
    ],
    correctIndex: 1,
    explanation:
      "A Crítica Textual analisa códices, papiros e versões antigas para atestar a fidelidade da transmissão bíblica.",
  },
];

export function QuizRelampagoDialog({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (score: number, total: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  function reset() {
    setStep(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === QUESTIONS[step].correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (step + 1 < QUESTIONS.length) {
      setStep((s) => s + 1);
      setSelected(null);
    } else {
      const finalScore = score;
      setFinished(true);
      onCompleted(finalScore, QUESTIONS.length);
    }
  }

  const current = QUESTIONS[step];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="cmdk-backdrop" style={{ alignItems: "center", paddingTop: 24 }} />
        <Dialog.Content
          className="transcript-dialog"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 100,
            width: 580,
          }}
        >
          <div className="transcript-dialog-header">
            <div>
              <span className="ds-pill amber">DESAFIO TEOLÓGICO · QUIZ RELÂMPAGO</span>
              <Dialog.Title className="text-[24px] mt-1">
                {finished ? "Desafio Concluído!" : `Pergunta ${step + 1} de ${QUESTIONS.length}`}
              </Dialog.Title>
              <Dialog.Description className="text-[12px] text-[#5b7282]">
                Pratique conceitos fundamentais de Bibliologia de forma leve.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="icon-button" aria-label="Fechar quiz">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 grid gap-4">
            {finished ? (
              <div className="text-center grid gap-3 py-4">
                <span className="w-16 h-16 mx-auto rounded-full bg-[#fef3d6] border-2 border-[#f7b538] text-[#0b3954] grid place-items-center">
                  <Award size={30} />
                </span>
                <h3 className="text-[24px]">
                  Você acertou {score} de {QUESTIONS.length}!
                </h3>
                <p className="text-[13px] text-[#5b7282] max-w-[420px] mx-auto">
                  {score >= 2
                    ? "Excelente! Você desbloqueou o selo 'Guardião da Palavra' na sua galeria de conquistas."
                    : "Bom começo! Explore o módulo de Bibliologia e tente novamente quando quiser."}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button type="button" className="btn-kairos-teal" onClick={reset}>
                    Jogar Novamente
                  </button>
                  <button
                    type="button"
                    className="btn-kairos-coral"
                    onClick={() => {
                      reset();
                      onOpenChange(false);
                    }}
                  >
                    Voltar ao Portal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] leading-snug">{current.prompt}</h3>
                <div className="grid gap-2.5">
                  {current.options.map((opt, idx) => {
                    const isPicked = selected === idx;
                    const isRight = idx === current.correctIndex;
                    let borderColor = "rgba(11, 57, 84, 0.14)";
                    let bg = "#ffffff";
                    if (selected !== null) {
                      if (isRight) {
                        borderColor = "#189ab4";
                        bg = "#e6f7f5";
                      } else if (isPicked) {
                        borderColor = "#f26444";
                        bg = "#fff0ec";
                      }
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={selected !== null}
                        onClick={() => handleAnswer(idx)}
                        className="text-left px-4 py-3 rounded-2xl border-2 text-[13.5px] font-semibold text-[#0b3954] flex items-center justify-between gap-3 transition-all"
                        style={{ borderColor, background: bg }}
                      >
                        <span>{opt}</span>
                        {selected !== null && isRight && (
                          <CheckCircle2 size={18} className="text-[#189ab4] shrink-0" />
                        )}
                        {selected !== null && isPicked && !isRight && (
                          <XCircle size={18} className="text-[#f26444] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selected !== null && (
                  <div className="rounded-2xl bg-[#faf7f0] border border-[#e6dcc6] p-3.5 text-[12.5px] text-[#244356] flex items-start gap-2.5">
                    <Sparkles size={16} className="text-[#f7b538] shrink-0 mt-0.5" />
                    <span>{current.explanation}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={selected === null}
                    className="btn-kairos-coral"
                    onClick={handleNext}
                  >
                    {step + 1 < QUESTIONS.length ? "Próxima Pergunta" : "Ver Resultado"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
