import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const roleLabel = (role) => role === "ADMIN" ? "Administrador" : role === "INTERNO" ? "Atendimento interno" : "Operacional de campo";
const duplicateCode = (value) => /already been registered|already registered|email_exists|email already/i.test(String(value || ""));

async function errorMessage(error, data, fallback) {
  if (duplicateCode(data?.error) || duplicateCode(error?.message)) return "Este código de usuário já está em uso.";
  if (data?.error) return data.error;
  try {
    const payload = await error?.context?.clone?.().json();
    if (duplicateCode(payload?.error)) return "Este código de usuário já está em uso.";
    if (payload?.error) return payload.error;
  } catch { /* A resposta pode não ter JSON. */ }
  return error?.message || fallback;
}

function Field({ label, value, onChange, type = "text", required }) {
  return <div className="source-field"><label>{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>;
}

export default function UserDirectoryWithRoles() {
  const empty = { name: "", pin: "", password: "", role: "OPERACIONAL" };
  const [users, setUsers] = useState([]);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(empty);
  const [target, setTarget] = useState(null);
  const [editName, setEditName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => { const { data, error } = await supabase.from("profiles").select("id, full_name, login_pin, role").order("login_pin"); if (error) return setNotice("Não foi possível carregar os usuários."); setUsers(data || []); };
  useEffect(() => { load(); const interval = window.setInterval(load, 15000); return () => window.clearInterval(interval); }, []);
  const submitCreate = async (event) => { event.preventDefault(); setSaving(true); const { data, error } = await supabase.functions.invoke("admin-create-user", { body: create }); setSaving(false); if (error || data?.error) return setNotice(await errorMessage(error, data, "Não foi possível criar o usuário.")); setNotice("Usuário criado com sucesso. A senha deverá ser alterada no primeiro acesso."); setCreate(empty); setCreateOpen(false); load(); };
  const submitEdit = async (event) => { event.preventDefault(); if (password && password.length < 6) return setNotice("A senha deve ter ao menos 6 caracteres."); if (password !== confirmation) return setNotice("As senhas não coincidem."); setSaving(true); const { data, error } = await supabase.functions.invoke("admin-update-user", { body: { userId: target.id, name: editName, password } }); setSaving(false); if (error || data?.error) return setNotice(await errorMessage(error, data, "Não foi possível atualizar o usuário.")); setNotice(`Usuário ${editName} atualizado com sucesso.`); setTarget(null); setPassword(""); setConfirmation(""); load(); };
  const remove = async (item) => { if (!window.confirm(`Excluir o usuário ${item.full_name}? Esta ação não pode ser desfeita.`)) return; setSaving(true); const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: item.id } }); setSaving(false); if (error || data?.error) return setNotice(await errorMessage(error, data, "Não foi possível excluir o usuário.")); setNotice(`Usuário ${item.full_name} excluído com sucesso.`); load(); };
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const matching = users.filter((item) => `${item.full_name} ${item.login_pin} ${roleLabel(item.role)}`.toLocaleLowerCase("pt-BR").includes(query));
  return <div className="content"><section className="toolbar"><button className="primary" onClick={() => { setCreateOpen(!createOpen); setTarget(null); }}>Novo usuário</button><label className="search source-user-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuários" aria-label="Buscar usuários" /></label></section>{notice && <div className="source-notice">{notice}</div>}{createOpen && <form className="form-card inline-form" onSubmit={submitCreate}><h3>Novo usuário</h3><Field label="Nome" required value={create.name} onChange={(name) => setCreate({ ...create, name })} /><Field label="PIN" required value={create.pin} onChange={(pin) => setCreate({ ...create, pin: pin.replace(/\D/g, "").slice(0, 6) })} /><Field label="Senha temporária" type="password" required value={create.password} onChange={(passwordValue) => setCreate({ ...create, password: passwordValue })} /><label>Perfil</label><select value={create.role} onChange={(event) => setCreate({ ...create, role: event.target.value })}><option value="OPERACIONAL">Operacional de campo</option><option value="INTERNO">Atendimento interno</option><option value="ADMIN">Administrador dos dois ambientes</option></select><div className="row-actions"><button type="button" className="ghost small-action" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</button></div></form>}{target && <form className="form-card inline-form source-user-edit" onSubmit={submitEdit}><h3>Editar usuário — {target.full_name}</h3><Field label="Nome" required value={editName} onChange={setEditName} /><Field label="Nova senha (opcional)" type="password" value={password} onChange={setPassword} /><Field label="Confirme a nova senha" type="password" value={confirmation} onChange={setConfirmation} /><div className="row-actions"><button type="button" className="ghost small-action" onClick={() => setTarget(null)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div></form>}<section className="panel"><h3>Usuários cadastrados</h3>{matching.length ? matching.map((item) => <article className="row-card" key={item.id}><div><strong>{item.full_name}</strong><span>PIN {item.login_pin || "não definido"} · {roleLabel(item.role)}</span></div>{item.role !== "ADMIN" && <div className="row-actions"><button className="ghost small-action" onClick={() => { setTarget(item); setEditName(item.full_name); setPassword(""); setConfirmation(""); setCreateOpen(false); setNotice(""); }}>Editar</button><button type="button" className="icon-btn danger" title={`Excluir ${item.full_name}`} aria-label={`Excluir ${item.full_name}`} onClick={() => remove(item)} disabled={saving}>×</button></div>}</article>) : <div className="empty"><p>{search ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}</p></div>}</section></div>;
}
