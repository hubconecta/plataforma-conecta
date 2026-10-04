// Exclusão em duas etapas: abre o aviso e só apaga ao confirmar.
export default function ConfirmDelete({ action, fields, label = "Excluir", warning }: { action: any; fields: Record<string, string>; label?: string; warning: string }) {
  return (
    <details className="confirm-del">
      <summary className="btn btn-bad btn-sm">{label}</summary>
      <form action={action} className="confirm-box">
        {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <p className="small">{warning}</p>
        <button className="btn btn-bad btn-sm">Sim, excluir definitivamente</button>
      </form>
    </details>
  );
}
