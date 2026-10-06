"use client";
export default function PrintButton({ label = "Baixar / imprimir" }: { label?: string }) {
  return <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>{label}</button>;
}
