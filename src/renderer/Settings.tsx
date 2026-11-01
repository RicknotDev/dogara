import { useEffect, useId, useState, type FormEvent } from 'react';
import type { ModuleView, NumberListField } from '../shared/modules';
import { parseListValue, toNumberList } from './numberList';

function NumberListEditor({
  field,
  value,
  onChange,
}: {
  field: NumberListField;
  value: unknown;
  onChange: (next: number[]) => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const items = toNumberList(value);
  const suffix = field.suffix ?? '';

  const add = (event: FormEvent): void => {
    event.preventDefault();
    const result = parseListValue(draft, field, items);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    onChange([...items, result.value]);
    setDraft('');
    setError(null);
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {field.label}
      </label>
      {field.help && <p className="field-help">{field.help}</p>}
      <ul className="chips">
        {field.fixedValues?.map((item) => (
          <li className="chip chip-fixed" key={item}>
            {item}
            {suffix}
          </li>
        ))}
        {items.map((item) => (
          <li className="chip" key={item}>
            {item}
            {suffix}
            <button
              type="button"
              aria-label={`Quitar ${item}${suffix}`}
              onClick={() => onChange(items.filter((other) => other !== item))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="add-row" onSubmit={add}>
        <input
          id={inputId}
          inputMode="decimal"
          placeholder={`Entre ${field.min} y ${field.max}`}
          value={draft}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Agregar</button>
      </form>
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ModuleCard({ module }: { module: ModuleView }) {
  const switchId = useId();

  return (
    <section className="module">
      <div className="module-header">
        <div>
          <label className="module-name" htmlFor={switchId}>
            {module.name}
          </label>
          <p className="module-description">{module.description}</p>
        </div>
        <input
          id={switchId}
          className="switch"
          type="checkbox"
          role="switch"
          checked={module.enabled}
          onChange={(event) => void window.dogara.setEnabled(module.id, event.target.checked)}
        />
      </div>
      {module.enabled &&
        module.fields?.map((field) => (
          <NumberListEditor
            key={field.key}
            field={field}
            value={module.settings[field.key]}
            onChange={(next) => void window.dogara.updateSettings(module.id, { [field.key]: next })}
          />
        ))}
    </section>
  );
}

export function Settings() {
  const [modules, setModules] = useState<ModuleView[] | null>(null);

  useEffect(() => {
    window.dogara.onChanged(setModules);
    void window.dogara.getModules().then(setModules);
  }, []);

  return (
    <main className="settings">
      <h1>Ajustes</h1>
      {modules?.length ? (
        modules.map((module) => <ModuleCard key={module.id} module={module} />)
      ) : (
        <p className="field-help">Cargando módulos…</p>
      )}
    </main>
  );
}
