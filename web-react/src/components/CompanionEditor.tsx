type CompanionEditorProps = {
  limit: number;
  names: string[];
  onChange: (nextNames: string[]) => void;
  disabled?: boolean;
};

export default function CompanionEditor({ limit, names, onChange, disabled = false }: CompanionEditorProps) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const companionNames = Array.isArray(names) ? names : [];

  function updateName(index: number, value: string) {
    const nextNames = [...companionNames];
    nextNames[index] = value;
    onChange(nextNames);
  }

  function removeName(index: number) {
    onChange(companionNames.filter((_, currentIndex) => currentIndex !== index));
  }

  function addName() {
    if (companionNames.length >= safeLimit) return;
    onChange([...companionNames, '']);
  }

  return (
    <div className="companion-editor">
      <div className="panel-heading compact-heading">
        <div>
          <span className="section-label">Acompanhantes</span>
          <h3>{`${companionNames.length} de ${safeLimit}`}</h3>
        </div>
      </div>

      {safeLimit === 0 ? (
        <p className="muted">Este convidado não pode levar acompanhantes.</p>
      ) : (
        <>
          {companionNames.map((name, index) => (
            <div className="companion-row" key={`companion-${index}`}>
              <input
                aria-label={`Acompanhante ${index + 1}`}
                value={name}
                disabled={disabled}
                placeholder={`Acompanhante ${index + 1}`}
                onChange={(event) => updateName(index, event.target.value)}
              />
              <button type="button" className="text-action" disabled={disabled} onClick={() => removeName(index)}>
                Remover
              </button>
            </div>
          ))}

          {companionNames.length < safeLimit && (
            <button type="button" className="secondary-button compact-button" disabled={disabled} onClick={addName}>
              Adicionar acompanhante
            </button>
          )}
        </>
      )}
    </div>
  );
}
