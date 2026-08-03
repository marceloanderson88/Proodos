"use client";

import { useState } from "react";

import { Field, inputClassName } from "@/components/m6/form-controls";

export function ProgramTypeNameField() {
  const [preset, setPreset] = useState("pre_incubation");

  return (
    <div className="space-y-4">
      <Field label="Nome" name="preset">
        <select
          className={inputClassName}
          name="preset"
          value={preset}
          onChange={(event) => setPreset(event.target.value)}
        >
          <option value="pre_incubation">Pré-Incubação</option>
          <option value="incubation">Incubação</option>
          <option value="acceleration">Aceleração</option>
          <option value="bootcamp">Bootcamp</option>
          <option value="other">Outro</option>
        </select>
      </Field>

      {preset === "other" && (
        <Field
          label="Nome do outro tipo"
          name="customName"
          hint="Exemplo: Ideação, residência ou programa setorial."
        >
          <input
            className={inputClassName}
            name="customName"
            required
            maxLength={120}
            autoFocus
          />
        </Field>
      )}
    </div>
  );
}
