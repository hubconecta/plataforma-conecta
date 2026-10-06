"use client";
// Marca/desmarca todas as inscrições da tabela.
export default function BulkSelect() {
  return <input type="checkbox" aria-label="Selecionar todas" onChange={(e) => document.querySelectorAll<HTMLInputElement>("input.bulk-ck").forEach((x) => (x.checked = e.target.checked))} />;
}
