"use client";
import { useState } from "react";

export default function AudiencePicker({ audiences, brands, campaigns }: { audiences: [string, string][]; brands: { id: string; name: string }[]; campaigns: { id: string; name: string }[] }) {
  const [a, setA] = useState("base");
  return (<>
    <div className="field"><label htmlFor="av_a">Quem recebe</label><select className="input" id="av_a" name="audience" value={a} onChange={(e) => setA(e.target.value)}>{audiences.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    {a === "marca" ? <div className="field"><label htmlFor="av_m">Marca</label><select className="input" id="av_m" name="brand_id" required defaultValue=""><option value="" disabled>Escolha a marca</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div> : null}
    {a === "campanha" ? <div className="field"><label htmlFor="av_c">Campanha</label><select className="input" id="av_c" name="campaign_id" required defaultValue=""><option value="" disabled>Escolha a campanha</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div> : null}
  </>);
}
