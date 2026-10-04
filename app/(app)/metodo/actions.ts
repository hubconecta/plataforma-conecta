"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, orNull, num, back, notifyProfiles } from "@/lib/act";
import { COLORS } from "@/lib/metodo";

const ADM = "/metodo/admin";

async function paidStudents(supabase: any) {
  const { data } = await supabase.from("method_purchases").select("creator_id").eq("status", "Pago");
  return [...new Set((data || []).map((p: any) => p.creator_id))] as string[];
}
async function notifyStudents(supabase: any, text: string, link: string) {
  const ids = await paidStudents(supabase);
  if (!ids.length) return 0;
  const { data: ps } = await supabase.from("profiles").select("id").eq("role", "creator").eq("status", "ativo").in("creator_id", ids);
  await notifyProfiles(supabase, { ids: (ps || []).map((p: any) => p.id) }, text, link);
  return ps?.length || 0;
}

export async function saveModule(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id");
  const row: any = { title: g(fd, "title"), description: orNull(g(fd, "description")), status: g(fd, "status") || "Rascunho", cover_path: orNull(g(fd, "cover_path")), color: g(fd, "color") || null };
  if (!row.title) back(ADM, "Dê um nome ao módulo.", false);
  let prev: any = null;
  if (id) { const { data } = await supabase.from("method_modules").select("status").eq("id", id).single(); prev = data; }
  else { const { count } = await supabase.from("method_modules").select("id", { count: "exact", head: true }); row.position = count || 0; row.color = row.color || COLORS[(count || 0) % COLORS.length]; }
  const { error } = id ? await supabase.from("method_modules").update(row).eq("id", id) : await supabase.from("method_modules").insert(row);
  if (error) back(ADM, error.message, false);
  if (row.status === "Publicado" && prev?.status !== "Publicado") await notifyStudents(supabase, `🆕 Novo módulo liberado no Método: ${row.title}`, "/metodo");
  await logAction(supabase, profile, `${id ? "editou" : "criou"} o módulo ${row.title} do Método (${row.status})`, "Método", id || null);
  revalidatePath("/metodo");
  back(ADM, id ? "Módulo atualizado." : "Módulo criado.");
}

export async function deleteModule(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id");
  const { data: m } = await supabase.from("method_modules").select("title").eq("id", id).single();
  await supabase.from("method_modules").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu o módulo ${m?.title || ""} do Método`, "Método", null);
  back(ADM, "Módulo excluído.");
}

export async function saveLesson(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id");
  const row: any = { module_id: g(fd, "module_id"), title: g(fd, "title"), type: g(fd, "type") || "Vídeo", status: g(fd, "status") || "Rascunho", duration: orNull(g(fd, "duration")), description: orNull(g(fd, "description")), video_url: orNull(g(fd, "video_url")), video_path: orNull(g(fd, "video_path")), pdf_path: orNull(g(fd, "pdf_path")), thumb_path: orNull(g(fd, "thumb_path")), exercise: orNull(g(fd, "exercise")) };
  if (!row.title || !row.module_id) back(ADM, "Informe o título e o módulo da aula.", false);
  let prev: any = null;
  if (id) { const { data } = await supabase.from("method_lessons").select("status").eq("id", id).single(); prev = data; delete row.module_id; }
  else { const { count } = await supabase.from("method_lessons").select("id", { count: "exact", head: true }).eq("module_id", row.module_id); row.position = count || 0; }
  const { data: saved, error } = id ? await supabase.from("method_lessons").update(row).eq("id", id).select("id").single() : await supabase.from("method_lessons").insert(row).select("id").single();
  if (error) back(ADM, error.message, false);
  if (row.status === "Publicada" && prev?.status !== "Publicada") await notifyStudents(supabase, `📚 Nova aula disponível: ${row.title}`, `/metodo/aula/${saved.id}`);
  await logAction(supabase, profile, `${id ? "editou" : "criou"} a aula ${row.title} (${row.status})`, "Método", saved.id);
  revalidatePath("/metodo");
  back(`${ADM}#m-${g(fd, "module_id") || ""}`, id ? "Aula atualizada." : "Aula criada.");
}

export async function deleteLesson(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id");
  const { data: l } = await supabase.from("method_lessons").select("title").eq("id", id).single();
  await supabase.from("method_lessons").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu a aula ${l?.title || ""}`, "Método", null);
  back(ADM, "Aula excluída.");
}

// Sobe ou desce um módulo/aula na ordem
export async function reorder(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const table = g(fd, "kind") === "module" ? "method_modules" : "method_lessons";
  const id = g(fd, "id"), dir = Number(g(fd, "dir")) || 0;
  const { data: cur } = await supabase.from(table).select("*").eq("id", id).single();
  let q = supabase.from(table).select("id,position").order("position").order("created_at");
  if (table === "method_lessons") q = q.eq("module_id", cur.module_id);
  const { data: list } = await q;
  const arr = (list || []).map((x: any) => x.id);
  const i = arr.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) back(ADM, "Já está no limite.", false);
  [arr[i], arr[j]] = [arr[j], arr[i]];
  for (let k = 0; k < arr.length; k++) await supabase.from(table).update({ position: k }).eq("id", arr[k]);
  await logAction(supabase, profile, `reorganizou ${table === "method_modules" ? "os módulos" : "as aulas"} do Método`, "Método", id);
  back(ADM, "Ordem atualizada.");
}

export async function notifyAll(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const kind = g(fd, "kind"), extra = g(fd, "extra");
  const n = await notifyStudents(supabase, `${kind}${extra ? `: ${extra}` : ""}`, "/metodo");
  await logAction(supabase, profile, `avisou as alunas do Método: ${kind}`, "Método", null);
  back(`${ADM}?tab=alunas`, `Aviso enviado para ${n} aluna(s).`);
}

// Libera o acesso (pagamento conferido na B4YOU ou cortesia). Nunca é liberado só pelo clique no checkout.
export async function confirmPurchase(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = orNull(g(fd, "id")), creator = orNull(g(fd, "creator_id")), source = g(fd, "source") || "Confirmação manual";
  let cid = creator;
  if (id) {
    const { data: p } = await supabase.from("method_purchases").update({ status: "Pago", paid_at: new Date().toISOString(), confirmed_by: profile.id, source }).eq("id", id).select("creator_id").single();
    cid = p?.creator_id || null;
  } else if (creator) {
    await supabase.from("method_purchases").insert({ creator_id: creator, status: "Pago", source, paid_at: new Date().toISOString(), confirmed_by: profile.id, value: num(fd, "value") });
  }
  if (!cid) back(`${ADM}?tab=alunas`, "Escolha a creator.", false);
  await notifyProfiles(supabase, { creator_id: cid }, "🎉 Pagamento confirmado! Seu acesso ao Método Criadora Expert foi liberado.", "/metodo");
  const { data: c } = await supabase.from("creators").select("name").eq("id", cid).single();
  await logAction(supabase, profile, `liberou o acesso ao Método para ${c?.name || "creator"} (${source})`, "Método", cid, true);
  revalidatePath("/metodo");
  back(`${ADM}?tab=alunas`, `Acesso liberado para ${c?.name || "a creator"}.`);
}

export async function revokePurchase(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), status = g(fd, "status") === "Reembolsado" ? "Reembolsado" : "Cancelado";
  const { data: p } = await supabase.from("method_purchases").update({ status }).eq("id", id).select("creators(name)").single();
  await logAction(supabase, profile, `marcou a compra do Método de ${(p as any)?.creators?.name || ""} como ${status}`, "Método", id, true);
  back(`${ADM}?tab=alunas`, `Compra marcada como ${status}. O acesso foi retirado.`);
}

export async function saveMetodoSettings(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back(`${ADM}?tab=vendas`, "Só a CEO altera o checkout e a integração.", false);
  const admin = createAdminClient();
  await admin.from("settings").upsert({ key: "metodo", value: { checkout: g(fd, "checkout"), price: Number(g(fd, "price")) || 0 }, updated_at: new Date().toISOString() });
  const { data: cur } = await admin.from("settings").select("value").eq("key", "b4you").maybeSingle();
  let token = cur?.value?.token || "";
  if (!token || fd.get("new_token")) token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  await admin.from("settings").upsert({ key: "b4you", value: { token, metodo_product: g(fd, "metodo_product") }, updated_at: new Date().toISOString() });
  await logAction(s.supabase, s.profile!, "atualizou o checkout do Método e a integração B4YOU", "Integrações", null, true);
  back(`${ADM}?tab=vendas`, "Configurações salvas.");
}

export async function resolveEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), creator = g(fd, "creator_id"), action = g(fd, "do");
  if (action === "ignorar") { await supabase.from("b4_events").update({ status: "Ignorado" }).eq("id", id); back(`${ADM}?tab=vendas`, "Evento ignorado."); }
  const { data: ev } = await supabase.from("b4_events").select("*").eq("id", id).single();
  if (!ev || !creator) back(`${ADM}?tab=vendas`, "Escolha a creator.", false);
  await supabase.from("method_purchases").insert({ creator_id: creator, status: "Pago", source: "B4YOU (webhook)", order_code: ev.order_code, value: ev.value, email: ev.email, paid_at: new Date().toISOString(), confirmed_by: profile.id });
  await supabase.from("b4_events").update({ status: "Processado", creator_id: creator, note: `Conferido por ${profile.name}` }).eq("id", id);
  await notifyProfiles(supabase, { creator_id: creator }, "🎉 Pagamento confirmado! Seu acesso ao Método Criadora Expert foi liberado.", "/metodo");
  await logAction(supabase, profile, "liberou o Método a partir de um evento da B4YOU", "Integrações", creator, true);
  back(`${ADM}?tab=vendas`, "Acesso liberado.");
}

/* ----- Creator ----- */
export async function startCheckout() {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const { data: cfg } = await s.supabase.from("settings").select("value").eq("key", "metodo").maybeSingle();
  const url = cfg?.value?.checkout;
  const { data: open } = await s.supabase.from("method_purchases").select("id").eq("creator_id", s.profile.creator_id).eq("status", "Aguardando pagamento").limit(1);
  if (!open?.length) await s.supabase.from("method_purchases").insert({ creator_id: s.profile.creator_id, status: "Aguardando pagamento", source: "Checkout B4YOU", email: s.profile.email });
  await logAction(s.supabase, s.profile, "iniciou o checkout do Método", "Método", null);
  if (!url) back("/metodo", "O checkout ainda não está disponível. A equipe Conecta foi avisada do seu interesse.", false);
  redirect(url);
}

export async function toggleLesson(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id"), done = g(fd, "done") === "1", next = g(fd, "next");
  if (done) await s.supabase.from("method_progress").delete().eq("creator_id", s.profile.creator_id).eq("lesson_id", id);
  else await s.supabase.from("method_progress").insert({ creator_id: s.profile.creator_id, lesson_id: id });
  revalidatePath("/metodo");
  redirect(!done && next ? `/metodo/aula/${next}` : `/metodo/aula/${id}`);
}
