import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../assets/index-RIowIKSc.css";
import "../../assets/agroverde-theme.css";
import "./source-app.css";
import logoAgroVerde from "../../assets/therapeutica-logo-CzbDnZIh.png";

const STORAGE_KEY = "agroverde-visitas-v2";
const LEGACY_KEY = "therapeutica-visitas-demo-v1";
const emptyData = { clients: [], farms: [], visits: [] };
const productLines = ["Insumos", "Nutrição vegetal", "Sementes", "Fertilizantes", "Defensivos", "Irrigação", "Pecuária", "Outros"];

function safeText(value, limit = 180) {
  return String(value ?? "").trim().slice(0, limit);
}

function nextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function normalizeData(raw) {
  const source = raw && typeof raw === "object" ? raw : emptyData;
  const clients = Array.isArray(source.clients) ? source.clients : [];
  const farms = Array.isArray(source.farms) ? source.farms : [];
  const visits = Array.isArray(source.visits) ? source.visits : [];
  return {
    clients: clients.map((item, index) => ({
      id: Number(item.id) || index + 1,
      name: safeText(item.name), phone: safeText(item.phone, 40), whatsapp: safeText(item.whatsapp, 40),
      city: safeText(item.city, 80), state: safeText(item.state, 2).toUpperCase(),
      mainActivity: safeText(item.mainActivity, 100), notes: safeText(item.notes, 2000), createdAt: item.createdAt || new Date().toISOString(),
    })).filter((item) => item.name),
    farms: farms.map((item, index) => ({
      id: Number(item.id) || index + 1, name: safeText(item.name), clientId: Number(item.clientId) || null,
      city: safeText(item.city, 80), state: safeText(item.state, 2).toUpperCase(),
      mainActivity: safeText(item.mainActivity, 100), notes: safeText(item.notes, 2000), createdAt: item.createdAt || new Date().toISOString(),
    })).filter((item) => item.name),
    visits: visits.map((item, index) => ({
      id: Number(item.id) || index + 1, clientId: Number(item.clientId) || null, farmId: Number(item.farmId) || null,
      visitedAt: item.visitedAt || new Date().toISOString(), objective: safeText(item.objective, 500),
      productLine: safeText(item.productLine, 100), result: safeText(item.result, 2000), nextAction: safeText(item.nextAction, 500),
      returnDate: safeText(item.returnDate, 20), createdAt: item.createdAt || new Date().toISOString(),
    })),
  };
}

function migrateLegacy() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (!legacy || typeof legacy !== "object") return emptyData;
    const clients = (legacy.doctors || []).map((item) => ({ id: item.id, name: item.name || item.fullName, phone: item.phone, whatsapp: item.whatsapp, city: item.city, state: item.state, mainActivity: item.specialty, notes: item.notes, createdAt: item.createdAt }));
    const farms = (legacy.clinics || []).map((item) => ({ id: item.id, name: item.name, city: item.city, state: item.state, mainActivity: Array.isArray(item.specialties) ? item.specialties.join(", ") : item.specialties, notes: item.notes, createdAt: item.createdAt }));
    const visits = (legacy.visits || []).map((item) => ({ id: item.id, clientId: item.doctorId, farmId: item.clinicId, visitedAt: item.visitedAt, objective: item.objective, productLine: Array.isArray(item.productLines) ? item.productLines.join(", ") : item.relatedLine, result: item.result, nextAction: item.nextAction, returnDate: item.returnDate, createdAt: item.createdAt }));
    return normalizeData({ clients, farms, visits });
  } catch {
    return emptyData;
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeData(JSON.parse(saved)) : migrateLegacy();
  } catch {
    return emptyData;
  }
}

function Icon({ name }) {
  const icons = { dashboard: "▦", visit: "↗", clients: "◉", farms: "⌂", history: "↺" };
  return <span className="source-icon" aria-hidden="true">{icons[name] || "•"}</span>;
}

function Metric({ label, value, detail }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><em>{detail}</em></article>;
}

function Empty({ text }) {
  return <div className="empty"><p>{text}</p></div>;
}

function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState("dashboard");
  const [notice, setNotice] = useState("");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 3500); return () => window.clearTimeout(timer); }, [notice]);

  const clientsById = useMemo(() => new Map(data.clients.map((item) => [item.id, item])), [data.clients]);
  const farmsById = useMemo(() => new Map(data.farms.map((item) => [item.id, item])), [data.farms]);
  const today = new Date().toISOString().slice(0, 10);
  const visitsToday = data.visits.filter((visit) => String(visit.visitedAt).slice(0, 10) === today).length;

  function addClient(form) {
    const client = { id: nextId(data.clients), ...form, createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, clients: [...current.clients, client] }));
    setNotice("Cliente cadastrado com sucesso.");
    setView("clients");
  }

  function addFarm(form) {
    const farm = { id: nextId(data.farms), ...form, createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, farms: [...current.farms, farm] }));
    setNotice("Fazenda cadastrada com sucesso.");
    setView("farms");
  }

  function addVisit(form) {
    const visit = { id: nextId(data.visits), ...form, createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, visits: [visit, ...current.visits] }));
    setNotice("Visita registrada com sucesso.");
    setView("history");
  }

  const nav = [["dashboard", "dashboard", "Início"], ["newVisit", "visit", "Nova visita"], ["clients", "clients", "Clientes"], ["farms", "farms", "Fazendas"], ["history", "history", "Histórico"]];
  return <div className="app-shell source-app">
    <aside className="sidebar"><div className="sidebar-head"><div className="brand-mark small">A</div><strong>AgroVerde</strong></div>
      <nav>{nav.map(([id, icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon name={icon} />{label}</button>)}</nav>
    </aside>
    <main className="main"><header className="topbar"><div><span>AGROVERDE</span><h2>{nav.find(([id]) => id === view)?.[2] || "Gestão de visitas"}</h2></div></header>
      {notice && <div className="source-notice">{notice}</div>}
      {view === "dashboard" && <Dashboard clients={data.clients} farms={data.farms} visits={data.visits} visitsToday={visitsToday} clientsById={clientsById} farmsById={farmsById} onView={setView} />}
      {view === "clients" && <Clients clients={data.clients} onAdd={addClient} />}
      {view === "farms" && <Farms farms={data.farms} clientsById={clientsById} onAdd={addFarm} clients={data.clients} />}
      {view === "newVisit" && <VisitForm clients={data.clients} farms={data.farms} onSave={addVisit} />}
      {view === "history" && <History visits={data.visits} clientsById={clientsById} farmsById={farmsById} />}
    </main>
  </div>;
}

function Dashboard({ clients, farms, visits, visitsToday, clientsById, farmsById, onView }) {
  return <div className="content"><section className="source-hero"><img src={logoAgroVerde} alt="AgroVerde" /><div><span>Gestão em campo</span><h1>Visitas a fazendas com registro simples e organizado.</h1><button className="primary" onClick={() => onView("newVisit")}>Registrar visita</button></div></section>
    <section className="metrics"><Metric label="Clientes" value={clients.length} detail="cadastrados" /><Metric label="Fazendas" value={farms.length} detail="na base" /><Metric label="Visitas hoje" value={visitsToday} detail="realizadas" /><Metric label="Visitas" value={visits.length} detail="registradas" /></section>
    <section className="panel"><h3>Visitas recentes</h3>{visits.length ? visits.slice(0, 5).map((visit) => <article className="row-card" key={visit.id}><div><strong>{clientsById.get(visit.clientId)?.name || "Cliente não informado"}</strong><span>{farmsById.get(visit.farmId)?.name || "Fazenda não informada"} · {formatDate(visit.visitedAt)}</span></div><small className="pill">{visit.productLine || "Visita"}</small></article>) : <Empty text="Nenhuma visita registrada ainda." />}</section>
  </div>;
}

function Clients({ clients, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", city: "", state: "MT", mainActivity: "", notes: "" });
  function submit(event) { event.preventDefault(); if (!safeText(form.name)) return; onAdd({ ...form, name: safeText(form.name), phone: safeText(form.phone), whatsapp: safeText(form.whatsapp), city: safeText(form.city), state: safeText(form.state, 2), mainActivity: safeText(form.mainActivity), notes: safeText(form.notes, 2000) }); }
  return <div className="content"><section className="toolbar"><div className="search"><input placeholder="Buscar cliente" aria-label="Buscar cliente" /></div><button className="primary" onClick={() => setOpen(!open)}>Novo cliente</button></section>
    {open && <form className="form-card inline-form" onSubmit={submit}><h3>Novo cliente</h3><Field label="Nome ou razão social" value={form.name} onChange={(name) => setForm({ ...form, name })} required /><div className="source-grid"><Field label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /><Field label="WhatsApp" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} /></div><div className="source-grid"><Field label="Cidade" value={form.city} onChange={(city) => setForm({ ...form, city })} /><Field label="UF" value={form.state} onChange={(state) => setForm({ ...form, state })} maxLength={2} /></div><Field label="Atividade principal" value={form.mainActivity} onChange={(mainActivity) => setForm({ ...form, mainActivity })} placeholder="Ex.: soja, milho, pecuária" /><TextField label="Observações" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /><button className="primary" type="submit">Salvar cliente</button></form>}
    <section className="panel"><h3>Clientes</h3>{clients.length ? clients.map((client) => <article className="row-card" key={client.id}><div><strong>{client.name}</strong><span>{[client.mainActivity, client.city, client.state].filter(Boolean).join(" · ") || "Sem dados complementares"}</span></div><small className="pill">ativo</small></article>) : <Empty text="Nenhum cliente cadastrado ainda." />}</section>
  </div>;
}

function Farms({ farms, clients, clientsById, onAdd }) {
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ name: "", clientId: "", city: "", state: "MT", mainActivity: "", notes: "" });
  function submit(event) { event.preventDefault(); if (!safeText(form.name)) return; onAdd({ ...form, name: safeText(form.name), clientId: Number(form.clientId) || null, city: safeText(form.city), state: safeText(form.state, 2), mainActivity: safeText(form.mainActivity), notes: safeText(form.notes, 2000) }); }
  return <div className="content"><section className="toolbar"><div className="search"><input placeholder="Buscar fazenda" aria-label="Buscar fazenda" /></div><button className="primary" onClick={() => setOpen(!open)}>Nova fazenda</button></section>
    {open && <form className="form-card inline-form" onSubmit={submit}><h3>Nova fazenda</h3><Field label="Nome da fazenda" value={form.name} onChange={(name) => setForm({ ...form, name })} required /><label>Cliente responsável</label><select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Não vincular agora</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select><div className="source-grid"><Field label="Cidade" value={form.city} onChange={(city) => setForm({ ...form, city })} /><Field label="UF" value={form.state} onChange={(state) => setForm({ ...form, state })} maxLength={2} /></div><Field label="Atividade principal" value={form.mainActivity} onChange={(mainActivity) => setForm({ ...form, mainActivity })} /><TextField label="Observações" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /><button className="primary" type="submit">Salvar fazenda</button></form>}
    <section className="panel"><h3>Fazendas</h3>{farms.length ? farms.map((farm) => <article className="row-card" key={farm.id}><div><strong>{farm.name}</strong><span>{[clientsById.get(farm.clientId)?.name, farm.mainActivity, farm.city].filter(Boolean).join(" · ") || "Sem dados complementares"}</span></div><small className="pill">ativa</small></article>) : <Empty text="Nenhuma fazenda cadastrada ainda." />}</section>
  </div>;
}

function VisitForm({ clients, farms, onSave }) {
  const [form, setForm] = useState({ clientId: "", farmId: "", visitedAt: new Date().toISOString().slice(0, 16), objective: "", productLine: "", result: "", nextAction: "", returnDate: "" });
  function submit(event) { event.preventDefault(); if (!form.clientId || !safeText(form.objective)) return; onSave({ ...form, clientId: Number(form.clientId), farmId: Number(form.farmId) || null, visitedAt: new Date(form.visitedAt).toISOString(), objective: safeText(form.objective, 500), productLine: safeText(form.productLine), result: safeText(form.result, 2000), nextAction: safeText(form.nextAction, 500), returnDate: safeText(form.returnDate, 20) }); }
  const eligibleFarms = farms.filter((farm) => !form.clientId || !farm.clientId || farm.clientId === Number(form.clientId));
  return <div className="content visit-flow"><form className="form-card" onSubmit={submit}><h3>Registrar nova visita</h3><label>Cliente visitado</label><select value={form.clientId} required onChange={(event) => setForm({ ...form, clientId: event.target.value, farmId: "" })}><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><label>Fazenda</label><select value={form.farmId} onChange={(event) => setForm({ ...form, farmId: event.target.value })}><option value="">Não informada</option>{eligibleFarms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select><label>Data e hora</label><input type="datetime-local" value={form.visitedAt} onChange={(event) => setForm({ ...form, visitedAt: event.target.value })} required /><Field label="Objetivo da visita" value={form.objective} onChange={(objective) => setForm({ ...form, objective })} placeholder="Ex.: apresentar soluções para a safra" required /><label>Linha de produtos</label><select value={form.productLine} onChange={(event) => setForm({ ...form, productLine: event.target.value })}><option value="">Selecione</option>{productLines.map((line) => <option key={line}>{line}</option>)}</select><TextField label="Resultado da visita" value={form.result} onChange={(result) => setForm({ ...form, result })} /><Field label="Próxima ação" value={form.nextAction} onChange={(nextAction) => setForm({ ...form, nextAction })} /><label>Retorno</label><input type="date" value={form.returnDate} onChange={(event) => setForm({ ...form, returnDate: event.target.value })} /><button className="primary wide" type="submit">Salvar visita</button></form></div>;
}

function History({ visits, clientsById, farmsById }) {
  return <div className="content"><section className="panel"><h3>Histórico de visitas</h3>{visits.length ? visits.map((visit) => <article className="row-card" key={visit.id}><div><strong>{clientsById.get(visit.clientId)?.name || "Cliente não informado"}</strong><span>{[farmsById.get(visit.farmId)?.name, visit.objective, formatDate(visit.visitedAt)].filter(Boolean).join(" · ")}</span>{visit.nextAction && <span className="follow-up-text">Próxima ação: {visit.nextAction}</span>}</div><small className="pill">{visit.productLine || "Visita"}</small></article>) : <Empty text="Nenhuma visita registrada ainda." />}</section></div>;
}

function Field({ label, value, onChange, placeholder, required, maxLength }) { return <><label>{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} /></>; }
function TextField({ label, value, onChange }) { return <><label>{label}</label><textarea value={value} onChange={(event) => onChange(event.target.value)} /></>; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "Data não informada" : date.toLocaleDateString("pt-BR"); }

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
