import { Field, inputClassName } from "@/components/m6/form-controls";

type StartupDefaults = {
  name?: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  businessModel?: string;
  stage?: string;
  status?: string;
  city?: string;
  state?: string;
  websiteUrl?: string;
};

export function StartupFormFields({
  defaults = {},
  includeStatus = false,
}: {
  defaults?: StartupDefaults;
  includeStatus?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nome da startup" name="name">
        <input
          className={inputClassName}
          name="name"
          required
          defaultValue={defaults.name}
        />
      </Field>
      <Field label="Razão social" name="legalName">
        <input
          className={inputClassName}
          name="legalName"
          defaultValue={defaults.legalName}
        />
      </Field>
      <Field label="CNPJ ou registro" name="taxId">
        <input
          className={inputClassName}
          name="taxId"
          defaultValue={defaults.taxId}
        />
      </Field>
      <Field label="Setor" name="sector">
        <input
          className={inputClassName}
          name="sector"
          defaultValue={defaults.sector}
          placeholder="Agtech, saúde, educação..."
        />
      </Field>
      <Field label="Estágio" name="stage">
        <select
          className={inputClassName}
          name="stage"
          defaultValue={defaults.stage ?? "idea"}
        >
          <option value="idea">Ideia</option>
          <option value="validation">Validação</option>
          <option value="operation">Operação</option>
          <option value="traction">Tração</option>
          <option value="scale">Escala</option>
          <option value="graduated">Graduada</option>
        </select>
      </Field>
      {includeStatus ? (
        <Field label="Situação" name="status">
          <select
            className={inputClassName}
            name="status"
            defaultValue={defaults.status ?? "active"}
          >
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
            <option value="graduated">Graduada</option>
            <option value="withdrawn">Desligada</option>
            <option value="archived">Arquivada</option>
          </select>
        </Field>
      ) : null}
      <Field label="Cidade" name="city">
        <input
          className={inputClassName}
          name="city"
          defaultValue={defaults.city}
        />
      </Field>
      <Field label="Estado" name="state">
        <input
          className={inputClassName}
          name="state"
          defaultValue={defaults.state}
        />
      </Field>
      <Field label="Site" name="websiteUrl" className="sm:col-span-2">
        <input
          className={inputClassName}
          name="websiteUrl"
          type="url"
          placeholder="https://"
          defaultValue={defaults.websiteUrl}
        />
      </Field>
      <Field
        label="Modelo de negócio"
        name="businessModel"
        className="sm:col-span-2"
      >
        <textarea
          className={inputClassName}
          name="businessModel"
          rows={5}
          defaultValue={defaults.businessModel}
        />
      </Field>
    </div>
  );
}
