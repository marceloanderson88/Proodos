"use client";

import { Plus, Scale, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  defaultSelectionCriteria,
  defaultSelectionQuestions,
} from "@/lib/selection/schemas";

type Question = ReturnType<typeof defaultSelectionQuestions>[number];
type Criterion = ReturnType<typeof defaultSelectionCriteria>[number];

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--wine-950)] outline-none transition focus:border-[var(--wine-500)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--wine-700)_9%,transparent)]";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SelectionCallBuilder({
  action,
  programs,
}: {
  action: (formData: FormData) => void | Promise<void>;
  programs: Array<{
    id: string;
    name: string;
    cohorts: Array<{ id: string; name: string; code: string }>;
  }>;
}) {
  const [questions, setQuestions] = useState<Question[]>(
    defaultSelectionQuestions(),
  );
  const [criteria, setCriteria] = useState<Criterion[]>(
    defaultSelectionCriteria(),
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      <input type="hidden" name="criteria" value={JSON.stringify(criteria)} />

      <section className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="eyebrow">Turma de destino</span>
          <select
            name="cohortId"
            required
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>
              Selecione programa e turma
            </option>
            {programs.flatMap((program) =>
              program.cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {program.name} · {cohort.name} ({cohort.code})
                </option>
              )),
            )}
          </select>
        </label>
        <label className="space-y-2">
          <span className="eyebrow">Código da chamada</span>
          <input
            className={inputClass}
            name="code"
            required
            placeholder="EDITAL-2026-01"
          />
        </label>
        <label className="space-y-2">
          <span className="eyebrow">Endereço público</span>
          <input
            className={inputClass}
            name="slug"
            required
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            placeholder="incubacao-2026-1"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="eyebrow">Título</span>
          <input
            className={inputClass}
            name="title"
            required
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug) setSlug(slugify(event.target.value));
            }}
            placeholder="Chamada pública para seleção de startups"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="eyebrow">Apresentação</span>
          <textarea
            className={`${inputClass} min-h-28`}
            name="summary"
            placeholder="Objetivo, público e contexto da chamada."
          />
        </label>
      </section>

      <section className="rounded-2xl border border-[#d97918]/20 bg-[#fff8e9] p-5">
        <p className="eyebrow text-[#8a4c08]">Cronograma</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["applicationsOpenAt", "Abertura das inscrições", true],
            ["applicationsCloseAt", "Encerramento das inscrições", true],
            ["evaluationsOpenAt", "Início das avaliações", false],
            ["evaluationsCloseAt", "Fim das avaliações", false],
            ["appealsOpenAt", "Início dos recursos", false],
            ["appealsCloseAt", "Fim dos recursos", false],
          ].map(([name, label, required]) => (
            <label className="space-y-2" key={String(name)}>
              <span className="text-xs font-extrabold text-[#714315]">
                {String(label)}
              </span>
              <input
                className={inputClass}
                type="datetime-local"
                name={String(name)}
                required={Boolean(required)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["totalVacancies", "Vagas", 10],
          ["waitlistSize", "Suplentes", 5],
          ["reviewersPerApplication", "Avaliações por proposta", 2],
          ["divergenceThreshold", "Divergência para revisão (%)", 30],
        ].map(([name, label, initial]) => (
          <label className="space-y-2" key={String(name)}>
            <span className="eyebrow">{String(label)}</span>
            <input
              className={inputClass}
              type="number"
              min={name === "waitlistSize" ? 0 : 1}
              name={String(name)}
              defaultValue={Number(initial)}
              required
            />
          </label>
        ))}
      </section>

      <section className="rounded-2xl border border-[#751118]/10 bg-[#fbf5ef] p-5">
        <p className="eyebrow">Política territorial opcional</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[12rem_1fr_12rem]">
          <select className={inputClass} name="quotaField" defaultValue="">
            <option value="">Sem reserva</option>
            <option value="state">Por estado</option>
            <option value="city">Por cidade</option>
          </select>
          <input
            className={inputClass}
            name="quotaValues"
            placeholder="Valores elegíveis separados por vírgula: PE, BA"
          />
          <input
            className={inputClass}
            name="quotaPercentage"
            type="number"
            min="0"
            max="100"
            placeholder="Percentual mínimo"
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          A reserva seleciona as propostas territoriais mais bem classificadas e
          completa as vagas pela ordem geral.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Formulário versionado</p>
            <h3 className="mt-1 text-xl font-black text-[var(--wine-950)]">
              Perguntas da inscrição
            </h3>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setQuestions((items) => [
                ...items,
                {
                  code: `question_${items.length + 1}`,
                  label: "Nova pergunta",
                  helpText: "",
                  kind: "long_text",
                  required: true,
                  options: [],
                },
              ])
            }
          >
            <Plus className="size-4" /> Pergunta
          </Button>
        </div>
        <div className="space-y-3">
          {questions.map((question, index) => (
            <article
              key={`${question.code}-${index}`}
              className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 md:grid-cols-[10rem_1fr_10rem_auto]"
            >
              <input
                className={inputClass}
                aria-label="Código"
                value={question.code}
                onChange={(event) =>
                  setQuestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            code: slugify(event.target.value).replaceAll(
                              "-",
                              "_",
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
              <input
                className={inputClass}
                aria-label="Pergunta"
                value={question.label}
                onChange={(event) =>
                  setQuestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <select
                className={inputClass}
                aria-label="Tipo"
                value={question.kind}
                onChange={(event) =>
                  setQuestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            kind: event.target.value as Question["kind"],
                          }
                        : item,
                    ),
                  )
                }
              >
                <option value="short_text">Texto curto</option>
                <option value="long_text">Texto longo</option>
                <option value="number">Número</option>
                <option value="url">URL</option>
                <option value="date">Data</option>
                <option value="boolean">Sim/Não</option>
              </select>
              <button
                type="button"
                aria-label="Remover pergunta"
                className="grid size-11 place-items-center rounded-xl text-[var(--danger)] hover:bg-[#fff0f0]"
                onClick={() =>
                  setQuestions((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Rubrica configurável</p>
            <h3 className="mt-1 flex items-center gap-2 text-xl font-black text-[var(--wine-950)]">
              <Scale className="size-5 text-[#d97918]" /> Critérios e pesos
            </h3>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setCriteria((items) => [
                ...items,
                {
                  code: `criterion_${items.length + 1}`,
                  name: "Novo critério",
                  description: "",
                  weight: 10,
                  minScore: 1,
                  maxScore: 5,
                },
              ])
            }
          >
            <Plus className="size-4" /> Critério
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {criteria.map((criterion, index) => (
            <article
              key={`${criterion.code}-${index}`}
              className="rounded-2xl border border-[var(--border)] bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem_5rem_5rem_auto]">
                <input
                  className={inputClass}
                  aria-label="Nome do critério"
                  value={criterion.name}
                  onChange={(event) =>
                    setCriteria((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              name: event.target.value,
                              code: slugify(event.target.value).replaceAll(
                                "-",
                                "_",
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  className={inputClass}
                  aria-label="Peso"
                  type="number"
                  min="0.001"
                  value={criterion.weight}
                  onChange={(event) =>
                    setCriteria((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, weight: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  className={inputClass}
                  aria-label="Nota mínima"
                  type="number"
                  value={criterion.minScore}
                  onChange={(event) =>
                    setCriteria((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, minScore: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  className={inputClass}
                  aria-label="Nota máxima"
                  type="number"
                  value={criterion.maxScore}
                  onChange={(event) =>
                    setCriteria((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, maxScore: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Remover critério"
                  className="grid size-11 place-items-center rounded-xl text-[var(--danger)] hover:bg-[#fff0f0]"
                  onClick={() =>
                    setCriteria((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <textarea
                className={`${inputClass} mt-3 min-h-20`}
                aria-label="Descrição do critério"
                value={criterion.description}
                onChange={(event) =>
                  setCriteria((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </article>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <Button type="submit" className="min-w-56">
          Salvar chamada em rascunho
        </Button>
      </div>
    </form>
  );
}
