"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  autosaveDiagnosticResponseAction,
  type DiagnosticAutosaveResult,
  type DiagnosticIndicatorSaveResult,
  saveDiagnosticIndicatorValueAction,
} from "@/app/(private)/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos/actions";
import { Field, inputClassName } from "@/components/m6/form-controls";
import type { Json } from "@/lib/supabase/database.types";

type AutosaveContextValue = {
  enqueue: (formData: FormData) => Promise<DiagnosticAutosaveResult>;
  enqueueIndicator: (
    formData: FormData,
  ) => Promise<DiagnosticIndicatorSaveResult>;
};

const AutosaveContext = createContext<AutosaveContextValue | null>(null);

export function DiagnosticAutosaveProvider({
  organizationSlug,
  incubatorSlug,
  initialLockVersion,
  children,
}: {
  organizationSlug: string;
  incubatorSlug: string;
  initialLockVersion: number;
  children: ReactNode;
}) {
  const lockVersion = useRef(initialLockVersion);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    lockVersion.current = Math.max(lockVersion.current, initialLockVersion);
  }, [initialLockVersion]);

  const enqueue = useCallback(
    (formData: FormData) => {
      const operation = queue.current.then(async () => {
        formData.set("lockVersion", String(lockVersion.current));
        const result = await autosaveDiagnosticResponseAction(
          organizationSlug,
          incubatorSlug,
          formData,
        );
        if (result.ok) lockVersion.current = result.lockVersion;
        return result;
      });
      queue.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [incubatorSlug, organizationSlug],
  );

  const enqueueIndicator = useCallback(
    (formData: FormData) => {
      const operation = queue.current.then(async () => {
        formData.set("lockVersion", String(lockVersion.current));
        const result = await saveDiagnosticIndicatorValueAction(
          organizationSlug,
          incubatorSlug,
          formData,
        );
        if (result.ok) lockVersion.current = result.lockVersion;
        return result;
      });
      queue.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [incubatorSlug, organizationSlug],
  );

  return (
    <AutosaveContext.Provider value={{ enqueue, enqueueIndicator }}>
      {children}
    </AutosaveContext.Provider>
  );
}

export function DiagnosticIndicatorForm({
  assessmentId,
  definition,
  indicatorValue,
  canRespond,
}: {
  assessmentId: string;
  definition: {
    id: string;
    name: string;
    unit: string;
    valueType: string;
    evidenceHint: string;
  };
  indicatorValue: {
    numericValue: number | null;
    targetValue: number | null;
    isNotApplicable: boolean;
    notApplicableJustification: string | null;
    evidenceNotes: string;
  } | null;
  canRespond: boolean;
}) {
  const context = useContext(AutosaveContext);
  if (!context) throw new Error("DiagnosticAutosaveProvider ausente");
  const autosave = context;
  const router = useRouter();
  const [isNotApplicable, setIsNotApplicable] = useState(
    indicatorValue?.isNotApplicable ?? false,
  );
  const [state, setState] = useState<SaveState>({
    kind: "idle",
    message: canRespond
      ? "Salve após revisar o valor e a evidência."
      : "Indicador bloqueado neste estado.",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRespond || state.kind === "saving") return;
    if (!navigator.onLine) {
      setState({ kind: "offline", message: "Sem conexão. Nada foi enviado." });
      return;
    }
    setState({ kind: "saving", message: "Salvando indicador…" });
    const result = await autosave.enqueueIndicator(
      new FormData(event.currentTarget),
    );
    if (result.ok) {
      setState({
        kind: "saved",
        message: `Salvo às ${new Date(result.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
      });
      router.refresh();
      return;
    }
    setState({
      kind: result.kind === "conflict" ? "conflict" : "error",
      message: result.message,
    });
  }

  const StateIcon =
    state.kind === "saving"
      ? LoaderCircle
      : state.kind === "saved"
        ? CheckCircle2
        : state.kind === "offline"
          ? CloudOff
          : state.kind === "conflict" || state.kind === "error"
            ? AlertTriangle
            : Save;

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[#751118]/8 bg-white p-4"
    >
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="indicatorDefinitionId" value={definition.id} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-[#481014]">{definition.name}</h4>
          <p className="mt-1 text-xs text-[#806f6b]">
            Unidade: {definition.unit} · {definition.valueType}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-[#665653]">
          <input
            type="checkbox"
            name="isNotApplicable"
            defaultChecked={indicatorValue?.isNotApplicable}
            disabled={!canRespond}
            onChange={(event) =>
              setIsNotApplicable(event.currentTarget.checked)
            }
          />
          Não se aplica
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Valor atual" name={`indicator-${definition.id}`}>
          <input
            className={inputClassName}
            name="numericValue"
            inputMode="decimal"
            defaultValue={indicatorValue?.numericValue ?? ""}
            required={!isNotApplicable}
            disabled={!canRespond || isNotApplicable}
          />
        </Field>
        <Field label="Meta (opcional)" name={`target-${definition.id}`}>
          <input
            className={inputClassName}
            name="targetValue"
            inputMode="decimal"
            defaultValue={indicatorValue?.targetValue ?? ""}
            disabled={!canRespond || isNotApplicable}
          />
        </Field>
      </div>
      {isNotApplicable && (
        <Field label="Justificativa para N/A" name={`na-${definition.id}`}>
          <input
            className={inputClassName}
            name="notApplicableJustification"
            defaultValue={indicatorValue?.notApplicableJustification ?? ""}
            required
            disabled={!canRespond}
          />
        </Field>
      )}
      {!isNotApplicable && (
        <input type="hidden" name="notApplicableJustification" value="" />
      )}
      <div className="mt-3">
        <Field
          label="Referência da evidência"
          name={`indicator-evidence-${definition.id}`}
        >
          <input
            className={inputClassName}
            name="evidenceNotes"
            defaultValue={indicatorValue?.evidenceNotes ?? ""}
            placeholder={definition.evidenceHint || "Informe a fonte do valor"}
            disabled={!canRespond}
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#751118]/8 pt-3">
        <p
          aria-live="polite"
          className={`inline-flex items-center gap-2 text-xs font-bold ${state.kind === "saved" ? "text-[#28713c]" : state.kind === "conflict" || state.kind === "error" ? "text-[#a12930]" : "text-[#756562]"}`}
        >
          <StateIcon
            className={`size-4 ${state.kind === "saving" ? "animate-spin" : ""}`}
          />
          {state.message}
        </p>
        <div className="flex gap-2">
          {state.kind === "conflict" && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#8b161d]/20 bg-white px-3 text-xs font-black text-[#7b161c]"
            >
              <RefreshCw className="size-3.5" /> Recarregar
            </button>
          )}
          <button
            type="submit"
            disabled={!canRespond || state.kind === "saving"}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#86151c] px-4 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-3.5" /> Salvar indicador
          </button>
        </div>
      </div>
    </form>
  );
}

type SaveState =
  | { kind: "idle"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "saved"; message: string }
  | { kind: "offline" | "conflict" | "error"; message: string };

function scalar(value: Json | null) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function DiagnosticResponseAutosaveForm({
  assessmentId,
  criterion,
  levels,
  response,
  canRespond,
}: {
  assessmentId: string;
  criterion: {
    id: string;
    responseType: string;
    allowsNotApplicable: boolean;
    requiresNaJustification: boolean;
  };
  levels: { id: string; score: number; label: string; description: string }[];
  response: {
    selfValue: Json | null;
    isNotApplicable: boolean;
    notApplicableJustification: string | null;
    selfComment: string;
    evidenceNotes: string;
  } | null;
  canRespond: boolean;
}) {
  const context = useContext(AutosaveContext);
  if (!context) throw new Error("DiagnosticAutosaveProvider ausente");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const dirty = useRef(false);
  const [isNotApplicable, setIsNotApplicable] = useState(
    response?.isNotApplicable ?? false,
  );
  const [state, setState] = useState<SaveState>({
    kind: "idle",
    message: canRespond
      ? "As alterações serão salvas automaticamente."
      : "Resposta bloqueada neste estado.",
  });

  const save = useCallback(async () => {
    if (!canRespond || !dirty.current || !formRef.current) return;
    if (!navigator.onLine) {
      setState({
        kind: "offline",
        message: "Sem conexão. As alterações ainda não foram enviadas.",
      });
      return;
    }
    const formData = new FormData(formRef.current);
    if (!formData.get("isNotApplicable") && !formData.get("value")) {
      setState({ kind: "idle", message: "Selecione ou informe uma resposta." });
      return;
    }
    const currentSequence = ++sequence.current;
    setState({ kind: "saving", message: "Salvando…" });
    try {
      const result = await context.enqueue(formData);
      if (currentSequence !== sequence.current) return;
      if (result.ok) {
        dirty.current = false;
        setState({
          kind: "saved",
          message: `Salvo às ${new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(result.savedAt))}.`,
        });
        router.refresh();
        return;
      }
      setState({
        kind: result.kind === "conflict" ? "conflict" : "error",
        message: result.message,
      });
    } catch {
      if (currentSequence === sequence.current) {
        setState({
          kind: "error",
          message: "Falha de conexão ao salvar. Tente novamente.",
        });
      }
    }
  }, [canRespond, context, router]);

  const scheduleSave = useCallback(() => {
    if (!canRespond) return;
    dirty.current = true;
    setState({ kind: "idle", message: "Alterações ainda não salvas." });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 900);
  }, [canRespond, save]);

  useEffect(() => {
    const retryWhenOnline = () => {
      if (dirty.current) void save();
    };
    window.addEventListener("online", retryWhenOnline);
    return () => {
      window.removeEventListener("online", retryWhenOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [save]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    void save();
  };

  const StateIcon =
    state.kind === "saving"
      ? LoaderCircle
      : state.kind === "saved"
        ? CheckCircle2
        : state.kind === "offline"
          ? CloudOff
          : state.kind === "conflict" || state.kind === "error"
            ? AlertTriangle
            : Save;

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onChange={scheduleSave}
      className="space-y-4"
    >
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="criterionId" value={criterion.id} />
      <input type="hidden" name="responseType" value={criterion.responseType} />
      <fieldset disabled={!canRespond}>
        <legend className="text-sm font-black text-[#4b1719]">
          Autoavaliação
        </legend>
        {levels.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {levels.map((level) => (
              <label
                key={level.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#751118]/8 bg-white p-3 transition has-[:checked]:border-[#8b161d] has-[:checked]:bg-[#fff4ef]"
              >
                <input
                  className="mt-1 accent-[#811219]"
                  type="radio"
                  name="value"
                  value={level.score}
                  defaultChecked={
                    scalar(response?.selfValue ?? null) === String(level.score)
                  }
                  required={!isNotApplicable}
                />
                <span>
                  <strong className="text-sm text-[#481014]">
                    {level.score} · {level.label}
                  </strong>
                  <span className="mt-0.5 block text-xs leading-5 text-[#7a6965]">
                    {level.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <input
            className={`${inputClassName} mt-3`}
            name="value"
            defaultValue={scalar(response?.selfValue ?? null)}
            required={!isNotApplicable}
          />
        )}
      </fieldset>

      {criterion.allowsNotApplicable && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-[#594745]">
            <input
              type="checkbox"
              name="isNotApplicable"
              defaultChecked={response?.isNotApplicable}
              disabled={!canRespond}
              onChange={(event) =>
                setIsNotApplicable(event.currentTarget.checked)
              }
            />
            Não se aplica
          </label>
          <input
            className={inputClassName}
            name="notApplicableJustification"
            defaultValue={response?.notApplicableJustification ?? ""}
            placeholder="Justificativa para N/A"
            required={isNotApplicable && criterion.requiresNaJustification}
            disabled={!canRespond}
          />
        </div>
      )}

      <Field
        label="Justificativa / comentário"
        name={`comment-${criterion.id}`}
      >
        <textarea
          className={`${inputClassName} min-h-20`}
          name="comment"
          defaultValue={response?.selfComment ?? ""}
          disabled={!canRespond}
        />
      </Field>
      <Field label="Referência da evidência" name={`evidence-${criterion.id}`}>
        <input
          className={inputClassName}
          name="evidenceNotes"
          defaultValue={response?.evidenceNotes ?? ""}
          placeholder="Descreva o documento ou registro comprobatório"
          disabled={!canRespond}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#751118]/8 pt-3">
        <p
          aria-live="polite"
          className={`inline-flex items-center gap-2 text-xs font-bold ${
            state.kind === "saved"
              ? "text-[#28713c]"
              : state.kind === "conflict" || state.kind === "error"
                ? "text-[#a12930]"
                : "text-[#756562]"
          }`}
        >
          <StateIcon
            className={`size-4 ${state.kind === "saving" ? "animate-spin" : ""}`}
          />
          {state.message}
        </p>
        <div className="flex gap-2">
          {state.kind === "conflict" && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#8b161d]/20 bg-white px-3 text-xs font-black text-[#7b161c]"
            >
              <RefreshCw className="size-3.5" /> Recarregar
            </button>
          )}
          <button
            type="submit"
            disabled={!canRespond || state.kind === "saving"}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#86151c] px-4 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-3.5" /> Salvar agora
          </button>
        </div>
      </div>
    </form>
  );
}
