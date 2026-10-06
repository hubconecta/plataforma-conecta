import FileUpload from "@/components/FileUpload";
import { MOD_STATUS } from "@/lib/consts";
import { saveProduct } from "./actions";

export default function ProductForm({ p }: { p?: any }) {
  return (
    <form action={saveProduct} className="form-grid">{p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="field"><label>Nome do produto</label><input className="input" name="title" required defaultValue={p?.title || ""} placeholder="Ex.: Presets" /></div>
      <div className="field"><label>Status na vitrine</label><select className="input" name="status" defaultValue={p?.status || "Rascunho"}>{MOD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field full"><label>Frase curta (aparece no card)</label><input className="input" name="tagline" defaultValue={p?.tagline || ""} /></div>
      <div className="field full"><label>Descrição da página de venda</label><textarea className="input" name="description" defaultValue={p?.description || ""} /></div>
      <div className="field full"><label>Link do checkout da B4YOU (botão QUERO ACESSAR)</label><input className="input" name="checkout_url" type="url" placeholder="https://" defaultValue={p?.checkout_url || ""} /></div>
      <div className="field"><label>Preço exibido (R$)</label><input placeholder="0,00" className="input" type="text" inputMode="decimal" name="price" defaultValue={p?.price ?? ""} /></div>
      <div className="field"><label>ID ou nome do produto na B4YOU</label><input className="input" name="b4you_product" defaultValue={p?.b4you_product || ""} placeholder="para liberar sozinho pelo webhook" /></div>
      <FileUpload name="cover_path" bucket="metodo" folder="capas" accept="image/*" current={p?.cover_path} label="Capa (vertical 3:4, estilo pôster)" />
      <div className="field"><label>Cor (se não tiver capa)</label><input className="input" type="color" name="color" defaultValue={p?.color || "#E6007E"} /></div>
      {p ? <div className="field"><label>Endereço</label><input className="input" name="slug" defaultValue={p.slug} /></div> : null}
      <div><button className="btn btn-primary btn-sm">{p ? "Salvar produto" : "Criar produto"}</button></div>
    </form>
  );
}
