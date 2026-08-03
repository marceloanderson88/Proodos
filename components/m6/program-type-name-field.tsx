"use client";

import { useState } from "react";

import { Field, inputClassName } from "@/components/m6/form-controls";

function initialPreset(currentName?: string) {
  if (currentName === "Pré-Incubação") return "pre_incubation";
  if (currentName === "Incubação") return "incubation";
  if (currentName === "Aceleração") return "acceleration";
  return currentName ? "other" : "pre_incubation";
}

export function ProgramTypeNameField({
  currentName,
  idSuffix = "new",
}: {
  currentName?: string;
  idSuffix?: string;
}) {
  const [preset, setPreset] = useState(initialPreset(currentName));

  return (
    <div className="space-y-4">
      <Field label="Tipo" name={`preset-${idSuffix}`}>
        <select
          className={inputClassName}
          name="preset"
          value={preset}
          onChange={(event) => setPreset(event.target.value)}
        >
          <option value="pre_incubation">Pré-Incubação</option>
          <option value="incubation">Incubação</option>
          <option value="acceleration">Aceleração</option>
          <option value="other">Outro</option>
        </select>
      </Field>

      {preset === "other" && (
        <Field
          label="Nome do outro tipo"
          name={`customName-${idSuffix}`}
          hint="Exemplo: Ideação, residência ou programa setorial."
        >
          <input
            className={inputClassName}
            name="customName"
            required
            maxLength={120}
            defaultValue={preset === "other" ? currentName : ""}
            autoFocus
          />
        </Field>
      )}
    </div>
  );
}
