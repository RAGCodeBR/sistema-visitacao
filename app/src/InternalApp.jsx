import React, { useEffect, useMemo, useRef, useState } from "react";
import logoAgroVerde from "../../assets/agroverde-logo.png";
import logoAgroVerdeSemFundo from "../../assets/agroverde-logo-sem-fundo.png";
import { cancelInternalContact, completeInternalContact, createInternalClient, createInternalContact, loadInternalData, updateInternalClient } from "./lib/internal-data";
import Pagination, { CLIENTS_PER_PAGE } from "./Pagination";
import "./internal-app.css";

const CONTACT_TYPES = [
  ["RELATIONSHIP", "Relacionamento"],
  ["PROSPECTING", "Prospecção"],
  ["CLOSING", "Fechamento"],
  ["QUOTE_RETURN", "Devolutiva de orçamento"],
];
const BUSINESS_LINES = [
  ["SANIDADE", "Sanidade"],
  ["NUTRICAO_ANIMAL", "Nutrição animal"],
  ["HERBICIDAS", "Herbicidas"],
  ["INSETICIDAS", "Inseticidas"],
  ["FERTILIZANTES", "Fertilizantes"],
  ["SEMENTES_PASTAGEM", "Sementes de pastagem"],
  ["OUTROS", "Outros"],
];
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Data não informada";
const normalizeName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const typeLabel = (type) => CONTACT_TYPES.find(([id]) => id === type)?.[1] || "Contato";
const lineLabel = (line) => BUSINESS_LINES.find(([id]) => id === line)?.[1] || line;

function Panel({ title, children }) { return <section className="panel"><h3>{title}</h3>{children}</section>; }
function Empty({ children }) { return <div className="empty"><p>{children}</p></div>; }
function Metric({ label, value, detail }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><em>{detail}</em></article>; }
function Field({ label, value, onChange, type = "text", required, placeholder, min }) { return <div className="source-field"><label>{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} min={min} /></div>; }

function InternalDashboard({ data, profile, isAdmin, onNavigate }) {
  const currentDate = today();
  const visible = isAdmin ? data.contacts : data.contacts.filter((item) => item.employeeId === profile.id);
  const planned = visible.filter((item) => item.status === "PLANNED");
  const todayPlans = planned.filter((item) => item.plannedDate === currentDate);
  const overdue = planned.filter((item) => item.plannedDate < currentDate);
  const completedMonth = visible.filter((item) => item.status === "COMPLETED" && String(item.contactedAt || item.plannedDate).slice(0, 7) === currentDate.slice(0, 7));
  const clientMap = new Map(data.clients.map((item) => [item.id, item]));
  return <div className="content"><section className="source-hero internal-hero"><img src={logoAgroVerde} alt="AgroVerde" /><div><span>Atendimento interno</span><h1>{isAdmin ? "Acompanhe a operação comercial interna." : "Organize contatos, orçamentos e retornos."}</h1><button className="primary" onClick={() => onNavigate(todayPlans.length || overdue.length ? "agenda" : "newContact")}>{todayPlans.length || overdue.length ? "Ver agenda" : "Registrar atendimento"}</button></div></section><section className="metrics"><Metric label="Clientes" value={data.clients.length} detail="cadastros internos" /><Metric label="Contatos hoje" value={todayPlans.length} detail="planejados" /><Metric label="Atrasados" value={overdue.length} detail="aguardando contato" /><Metric label="Atendimentos" value={completedMonth.length} detail="neste mês" /></section><Panel title="Próximos contatos">{planned.length ? planned.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)).slice(0, 6).map((contact) => <article className="row-card" key={contact.id}><div><strong>{clientMap.get(contact.clientId)?.name || "Cliente não informado"}</strong><span>{typeLabel(contact.contactType)} · {dateLabel(contact.plannedDate)}</span>{contact.quoteProduct && <small className="source-report-user">Produto: {contact.quoteProduct}</small>}</div><small className={`pill${contact.plannedDate < currentDate ? " internal-overdue" : ""}`}>{contact.plannedDate < currentDate ? "atrasado" : "planejado"}</small></article>) : <Empty>Nenhum contato pendente.</Empty>}</Panel></div>;
}

const emptyClient = { name: "", propertyName: "", phone: "", whatsapp: "", brandPreferences: "", characteristics: "", ownerId: "" };
function InternalClients({ data, profile, onReload, setNotice }) {
  const isAdmin = profile.role === "ADMIN";
  const employees = data.users.filter((item) => item.role === "INTERNO");
  const firstEmployee = employees[0]?.id || "";
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const reset = () => { setOpen(false); setEditing(null); setForm(emptyClient); };
  const openNew = () => { setEditing(null); setForm({ ...emptyClient, ownerId: isAdmin ? firstEmployee : profile.id }); setOpen(true); };
  const edit = (client) => { setEditing(client); setForm({ ...emptyClient, ...client, ownerId: client.createdBy }); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const ownerId = isAdmin ? form.ownerId : profile.id;
    if (!name || !ownerId || saving) return setNotice(!ownerId ? "Selecione o responsável pelo cliente." : "Informe o nome do cliente.");
    const duplicate = data.clients.find((item) => item.id !== editing?.id && item.createdBy === ownerId && normalizeName(item.name) === normalizeName(name));
    if (duplicate) return setNotice(`O cliente ${duplicate.name} já está cadastrado para este responsável.`);
    setSaving(true);
    try {
      const input = { ...form, name, ownerId };
      if (editing) await updateInternalClient(editing.id, input, editing.createdBy);
      else await createInternalClient(input, profile.id);
      await onReload();
      setNotice(editing ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      reset();
    } catch (error) {
      setNotice(error?.message || "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  };
  const query = normalizeName(search);
  const filtered = data.clients.filter((client) => normalizeName(`${client.name} ${client.propertyName}`).includes(query)).sort((first, second) => first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / CLIENTS_PER_PAGE));
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  const paginated = filtered.slice((page - 1) * CLIENTS_PER_PAGE, page * CLIENTS_PER_PAGE);
  return <div className="content"><section className="toolbar source-client-toolbar"><button className="primary" onClick={openNew}>Novo cliente</button><label className="search source-user-search"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar cliente" aria-label="Buscar cliente" /></label></section>{open && <form className="form-card inline-form" onSubmit={submit}><h3>{editing ? "Editar cliente" : "Novo cliente"}</h3>{isAdmin && <><label>Responsável pelo cliente</label><select required value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}><option value="">Selecione</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></>}<Field label="Nome do cliente" required value={form.name} onChange={(name) => setForm({ ...form, name })} /><Field label="Propriedade" value={form.propertyName} onChange={(propertyName) => setForm({ ...form, propertyName })} /><div className="source-grid"><Field label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /><Field label="WhatsApp" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} /></div><label>Preferências de marcas</label><textarea value={form.brandPreferences} onChange={(event) => setForm({ ...form, brandPreferences: event.target.value })} /><label>Características do cliente</label><textarea value={form.characteristics} onChange={(event) => setForm({ ...form, characteristics: event.target.value })} /><div className="row-actions"><button className="ghost small-action" type="button" onClick={reset}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar cliente"}</button></div></form>}<Panel title={isAdmin ? "Clientes por responsável" : "Meus clientes"}>{paginated.length ? paginated.map((client) => <article className="row-card" key={client.id}><div><strong>{client.name}</strong><span>{client.propertyName || "Propriedade não informada"}</span>{isAdmin && <small className="source-report-user">Responsável: {userMap.get(client.createdBy) || "Não informado"}</small>}{(client.whatsapp || client.phone) && <small className="source-report-user">{client.whatsapp ? `WhatsApp: ${client.whatsapp}` : `Telefone: ${client.phone}`}</small>}</div><button className="ghost small-action" onClick={() => edit(client)}>Editar</button></article>) : <Empty>{search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</Empty>}<Pagination page={page} totalItems={filtered.length} onChange={setPage} /></Panel></div>;
}

function EmployeeSelect({ data, profile, isAdmin, value, onChange, disabled = false }) {
  if (!isAdmin) return null;
  const employees = data.users.filter((item) => item.role === "INTERNO");
  return <><label>Responsável</label><select required disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Selecione</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></>;
}

function InternalAgenda({ data, profile, isAdmin, onReload, setNotice, onRegister }) {
  const [open, setOpen] = useState(false);
  const firstEmployee = data.users.find((item) => item.role === "INTERNO")?.id || "";
  const [form, setForm] = useState({ clientId: "", employeeId: isAdmin ? firstEmployee : profile.id, plannedDate: today(), contactType: "RELATIONSHIP" });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isAdmin && !form.employeeId && firstEmployee) setForm((current) => ({ ...current, employeeId: firstEmployee })); }, [firstEmployee, form.employeeId, isAdmin]);
  const submit = async (event) => { event.preventDefault(); if (saving) return; setSaving(true); try { await createInternalContact({ ...form, status: "PLANNED", summary: "", negotiationTypes: [], quoteProduct: "", quoteReturnDate: "", quoteOutcome: "", notClosedReason: "" }, profile.id); await onReload(); setNotice("Contato adicionado à agenda."); setOpen(false); setForm({ clientId: "", employeeId: isAdmin ? firstEmployee : profile.id, plannedDate: today(), contactType: "RELATIONSHIP" }); } catch (error) { setNotice(error?.message || "Não foi possível agendar o contato."); } finally { setSaving(false); } };
  const cancel = async (contact) => { if (!window.confirm("Cancelar este contato planejado?")) return; try { await cancelInternalContact(contact.id); await onReload(); setNotice("Contato planejado cancelado."); } catch (error) { setNotice(error?.message || "Não foi possível cancelar."); } };
  const clientMap = new Map(data.clients.map((item) => [item.id, item]));
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  const eligibleClients = data.clients.filter((item) => !isAdmin || item.createdBy === form.employeeId);
  const planned = data.contacts.filter((item) => item.status === "PLANNED" && (isAdmin ? !employeeFilter || item.employeeId === employeeFilter : item.employeeId === profile.id)).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  return <div className="content"><section className="toolbar internal-agenda-toolbar"><button className="primary" onClick={() => setOpen(!open)}>Agendar contato</button>{isAdmin && <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="">Todos os responsáveis</option>{data.users.filter((item) => item.role === "INTERNO").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</section>{open && <form className="form-card inline-form" onSubmit={submit}><h3>Novo contato planejado</h3><EmployeeSelect data={data} profile={profile} isAdmin={isAdmin} value={form.employeeId} onChange={(employeeId) => setForm({ ...form, employeeId, clientId: "" })} /><label>Cliente</label><select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Selecione</option>{eligibleClients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><InternalDateField label="Data planejada" value={form.plannedDate} onChange={(plannedDate) => setForm({ ...form, plannedDate })} /><label>Tipo de contato</label><select value={form.contactType} onChange={(event) => setForm({ ...form, contactType: event.target.value })}>{CONTACT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><div className="row-actions"><button className="ghost small-action" type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Agendando..." : "Adicionar à agenda"}</button></div></form>}<Panel title="Próximos contatos">{planned.length ? planned.map((contact) => <article className={`row-card${contact.plannedDate < today() ? " internal-row-overdue" : ""}`} key={contact.id}><div><strong>{clientMap.get(contact.clientId)?.name || "Cliente não informado"}</strong><span>{typeLabel(contact.contactType)} · {dateLabel(contact.plannedDate)}</span><small className="source-report-user">Responsável: {userMap.get(contact.employeeId) || "Não informado"}</small>{contact.quoteProduct && <span className="follow-up-text">Orçamento: {contact.quoteProduct}</span>}</div><div className="row-actions"><button className="ghost small-action" onClick={() => onRegister(contact)}>Registrar atendimento</button><button className="icon-btn danger" title="Cancelar contato" onClick={() => cancel(contact)}>×</button></div></article>) : <Empty>Nenhum contato planejado.</Empty>}</Panel></div>;
}

function InternalContactForm({ data, profile, isAdmin, plannedContact, onReload, setNotice, onComplete }) {
  const firstEmployee = data.users.find((item) => item.role === "INTERNO")?.id || "";
  const initialType = plannedContact?.contactType || "RELATIONSHIP";
  const initial = { clientId: plannedContact?.clientId || "", employeeId: plannedContact?.employeeId || (isAdmin ? firstEmployee : profile.id), plannedDate: plannedContact?.plannedDate || today(), contactType: initialType, summary: "", hasNegotiation: initialType === "CLOSING", negotiationTypes: [], hasQuote: Boolean(plannedContact?.quoteProduct), quoteProduct: plannedContact?.quoteProduct || "", quoteReturnDate: "", quoteOutcome: "", notClosedReason: "" };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(initial); }, [plannedContact?.id]);
  const toggleLine = (line) => setForm((current) => ({ ...current, negotiationTypes: current.negotiationTypes.includes(line) ? current.negotiationTypes.filter((item) => item !== line) : [...current.negotiationTypes, line] }));
  const quoteReturn = form.contactType === "QUOTE_RETURN";
  const eligibleClients = data.clients.filter((item) => !isAdmin || item.createdBy === form.employeeId);
  const submit = async (event) => { event.preventDefault(); if (saving) return; if (form.hasNegotiation && !form.negotiationTypes.length) return setNotice("Selecione ao menos um tipo de negociação."); if (form.hasQuote && (!form.quoteProduct.trim() || !form.quoteReturnDate)) return setNotice("Informe o produto e a previsão de retorno do orçamento."); if (quoteReturn && !form.quoteOutcome) return setNotice("Informe o resultado da devolutiva do orçamento."); if (quoteReturn && form.quoteOutcome === "NOT_CLOSED" && !form.notClosedReason.trim()) return setNotice("Informe o motivo do orçamento não fechado."); setSaving(true); const payload = { ...form, status: "COMPLETED", negotiationTypes: form.hasNegotiation ? form.negotiationTypes : [], quoteProduct: quoteReturn ? plannedContact?.quoteProduct || "" : form.hasQuote ? form.quoteProduct.trim() : "", quoteReturnDate: quoteReturn ? "" : form.hasQuote ? form.quoteReturnDate : "", notClosedReason: form.quoteOutcome === "NOT_CLOSED" ? form.notClosedReason.trim() : "" }; try { if (plannedContact) await completeInternalContact(plannedContact.id, payload); else await createInternalContact(payload, profile.id); await onReload(); setNotice(form.hasQuote && !quoteReturn ? "Atendimento salvo e devolutiva adicionada à agenda." : "Atendimento registrado com sucesso."); onComplete(); } catch (error) { setNotice(error?.message || "Não foi possível registrar o atendimento."); } finally { setSaving(false); } };
  return <div className="content internal-contact-flow"><form className="form-card" onSubmit={submit}><h3>{plannedContact ? "Registrar contato planejado" : "Novo atendimento"}</h3><EmployeeSelect data={data} profile={profile} isAdmin={isAdmin} disabled={Boolean(plannedContact)} value={form.employeeId} onChange={(employeeId) => setForm({ ...form, employeeId, clientId: "" })} /><label>Cliente</label><select required disabled={Boolean(plannedContact)} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Selecione</option>{eligibleClients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><InternalDateField label="Data do contato" value={form.plannedDate} onChange={(plannedDate) => setForm({ ...form, plannedDate })} /><label>Tipo de contato</label><select value={form.contactType} onChange={(event) => { const contactType = event.target.value; setForm({ ...form, contactType, hasNegotiation: contactType === "CLOSING" ? true : contactType === "QUOTE_RETURN" ? false : form.hasNegotiation, quoteOutcome: "", notClosedReason: "" }); }}>{CONTACT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>{!quoteReturn && <><label className="internal-checkbox"><input type="checkbox" checked={form.hasNegotiation} disabled={form.contactType === "CLOSING"} onChange={(event) => setForm({ ...form, hasNegotiation: event.target.checked, negotiationTypes: [] })} /> Houve negociação</label>{form.hasNegotiation && <fieldset className="internal-fieldset"><legend>Tipo de negociação</legend><div className="chips internal-contact-chips">{BUSINESS_LINES.map(([id, label]) => <button type="button" key={id} className={`chip${form.negotiationTypes.includes(id) ? " selected" : ""}`} onClick={() => toggleLine(id)}>{label}</button>)}</div></fieldset>}</>}<label>Resumo do atendimento</label><textarea required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Descreva o que foi conversado e os próximos passos" />{quoteReturn ? <div className="embedded-form"><h3>Resultado do orçamento</h3>{plannedContact?.quoteProduct && <p className="internal-quote-product">Produto: <strong>{plannedContact.quoteProduct}</strong></p>}<label>Resultado</label><select required value={form.quoteOutcome} onChange={(event) => setForm({ ...form, quoteOutcome: event.target.value, notClosedReason: "" })}><option value="">Selecione</option><option value="CLOSED">Fechado</option><option value="NOT_CLOSED">Não fechado</option></select>{form.quoteOutcome === "NOT_CLOSED" && <><label>Motivo obrigatório</label><textarea required value={form.notClosedReason} onChange={(event) => setForm({ ...form, notClosedReason: event.target.value })} /></>}</div> : <><label className="internal-checkbox"><input type="checkbox" checked={form.hasQuote} onChange={(event) => setForm({ ...form, hasQuote: event.target.checked, quoteProduct: "", quoteReturnDate: "" })} /> Gerou orçamento</label>{form.hasQuote && <div className="embedded-form"><h3>Dados do orçamento</h3><Field label="Produto orçado" required value={form.quoteProduct} onChange={(quoteProduct) => setForm({ ...form, quoteProduct })} /><InternalDateField label="Previsão de retorno do cliente" value={form.quoteReturnDate} onChange={(quoteReturnDate) => setForm({ ...form, quoteReturnDate })} /><p className="internal-help">Uma devolutiva será adicionada automaticamente à agenda.</p></div>}</>}<div className="row-actions internal-form-actions"><button className="ghost small-action" type="button" onClick={onComplete}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar atendimento"}</button></div></form></div>;
}

function InternalReportsLegacy({ data }) {
  const monthStart = `${today().slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today());
  const [employeeId, setEmployeeId] = useState("");
  const [contactType, setContactType] = useState("");
  const clientMap = new Map(data.clients.map((item) => [item.id, item]));
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  const contacts = data.contacts.filter((item) => item.status === "COMPLETED" && item.plannedDate >= from && item.plannedDate <= to && (!employeeId || item.employeeId === employeeId) && (!contactType || item.contactType === contactType));
  const uniqueClients = new Set(contacts.map((item) => item.clientId)).size;
  const closings = contacts.filter((item) => item.contactType === "CLOSING").length;
  const quoteReturns = contacts.filter((item) => item.contactType === "QUOTE_RETURN");
  const closedQuotes = quoteReturns.filter((item) => item.quoteOutcome === "CLOSED").length;
  return <div className="content"><section className="toolbar internal-report-filters"><Field label="De" type="date" value={from} onChange={setFrom} /><Field label="Até" type="date" value={to} onChange={setTo} /><div><label>Responsável</label><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Todos</option>{data.users.filter((item) => item.role === "INTERNO").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label>Tipo de contato</label><select value={contactType} onChange={(event) => setContactType(event.target.value)}><option value="">Todos</option>{CONTACT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div></section><section className="metrics"><Metric label="Atendimentos" value={contacts.length} detail="no período" /><Metric label="Clientes" value={uniqueClients} detail="atendidos" /><Metric label="Fechamentos" value={closings} detail="registrados" /><Metric label="Orçamentos fechados" value={closedQuotes} detail={`${quoteReturns.length} devolutivas`} /></section><Panel title="Atendimentos internos encontrados">{contacts.length ? contacts.sort((a, b) => String(b.contactedAt).localeCompare(String(a.contactedAt))).map((contact) => <article className="row-card" key={contact.id}><div><strong>{clientMap.get(contact.clientId)?.name || "Cliente não informado"}</strong><span>{typeLabel(contact.contactType)} · {dateLabel(contact.plannedDate)}</span><small className="source-report-user">Responsável: {userMap.get(contact.employeeId) || "Não informado"}</small>{contact.negotiationTypes.length > 0 && <span className="follow-up-text">Negociação: {contact.negotiationTypes.map(lineLabel).join(", ")}</span>}{contact.contactType === "QUOTE_RETURN" && <span className="follow-up-text">Orçamento: {contact.quoteOutcome === "CLOSED" ? "Fechado" : `Não fechado — ${contact.notClosedReason || "motivo não informado"}`}</span>}<p className="internal-contact-summary">{contact.summary}</p></div></article>) : <Empty>Nenhum atendimento interno para os filtros selecionados.</Empty>}</Panel></div>;
}

const reportDate = (contact) => String(contact.contactedAt || contact.plannedDate || "").slice(0, 10);
const brazilianDate = (value) => {
  const [year, month, day] = String(value || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};

function InternalCalendarPicker({ value, onChange, min = "" }) {
  const initial = String(value || today()).slice(0, 10);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date(`${initial}T12:00:00`));
  const pickerRef = useRef(null);
  useEffect(() => setCursor(new Date(`${String(value || initial).slice(0, 10)}T12:00:00`)), [value]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!pickerRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : index - offset + 1);
  const selectDate = (day) => {
    onChange(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setOpen(false);
  };
  return <div className="source-picker" ref={pickerRef}><button type="button" className="source-picker-trigger" onClick={() => setOpen(!open)} aria-expanded={open}>{brazilianDate(value) || "Selecione uma data"}<span>▾</span></button>{open && <div className="source-calendar"><div className="source-calendar-head"><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button><strong>{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button></div><div className="source-calendar-week">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((item) => <span key={item}>{item}</span>)}</div><div className="source-calendar-days">{cells.map((day, index) => { if (!day) return <i key={`blank-${index}`} />; const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; return <button type="button" key={day} disabled={Boolean(min && iso < min)} className={String(value).slice(0, 10) === iso ? "selected" : ""} onClick={() => selectDate(day)}>{day}</button>; })}</div></div>}</div>;
}

function InternalDateField({ label, value, onChange, min = "" }) {
  const effectiveMin = min || (label === "Data do contato" ? "" : today());
  return <div className="source-field"><label>{label}</label><InternalCalendarPicker value={value} onChange={onChange} min={effectiveMin} /></div>;
}

function InternalMonthPicker({ value, onChange }) {
  const initial = String(value || today()).slice(0, 10);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date(`${initial}T12:00:00`).getFullYear());
  const pickerRef = useRef(null);
  useEffect(() => setYear(new Date(`${String(value || initial).slice(0, 10)}T12:00:00`).getFullYear()), [value]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!pickerRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const selectedMonth = Number(initial.slice(5, 7)) - 1;
  const months = Array.from({ length: 12 }, (_, month) => new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long" }));
  return <div className="source-picker" ref={pickerRef}><button type="button" className="source-picker-trigger" onClick={() => setOpen(!open)} aria-expanded={open}>{new Date(`${initial}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}<span>▾</span></button>{open && <div className="source-calendar source-month-calendar"><div className="source-calendar-head"><button type="button" onClick={() => setYear(year - 1)}>‹</button><strong>{year}</strong><button type="button" onClick={() => setYear(year + 1)}>›</button></div><div className="source-calendar-months">{months.map((month, index) => <button type="button" key={month} className={year === new Date(`${initial}T12:00:00`).getFullYear() && index === selectedMonth ? "selected" : ""} onClick={() => { onChange(`${year}-${String(index + 1).padStart(2, "0")}-01`); setOpen(false); }}>{month}</button>)}</div></div>}</div>;
}

function InternalReportFilter({ label, allLabel, value, onChange, options, className = "" }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selected = options.find((item) => item.id === value);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!pickerRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const choose = (id) => { onChange(id); setOpen(false); };
  return <div className={`source-report-consultant ${className}`.trim()} ref={pickerRef}><label>{label}</label><button type="button" className="source-consultant-trigger" aria-expanded={open} onClick={() => setOpen(!open)}>{selected?.name || allLabel}<span>▾</span></button>{open && <div className="source-consultant-options source-client-options"><button type="button" className={!value ? "selected" : ""} onClick={() => choose("")}>{allLabel}</button>{options.map((item) => <button type="button" key={item.id} className={value === item.id ? "selected" : ""} onClick={() => choose(item.id)}>{item.name}</button>)}</div>}</div>;
}

function InternalReportBarChart({ title, subtitle, items, emptyMessage }) {
  const maximum = Math.max(0, ...items.map((item) => item.value));
  const visible = items.filter((item) => item.value > 0);
  return <section className="source-report-chart" aria-label={title}><header><div><h3>{title}</h3><p>{subtitle}</p></div></header>{visible.length ? <div className="source-report-bars">{visible.map((item) => <div className="source-report-bar-row" key={item.key}><div className="source-report-bar-label"><span>{item.label}</span><strong>{item.value} {item.value === 1 ? "registro" : "registros"}</strong></div><div className="source-report-bar-track"><i className={`source-report-bar-fill ${item.tone || "value"}`} style={{ width: `${maximum ? item.value / maximum * 100 : 0}%` }} /></div></div>)}</div> : <p className="source-report-chart-empty">{emptyMessage}</p>}</section>;
}

function InternalEmployeeChart({ contacts, data }) {
  const [selection, setSelection] = useState(null);
  const clientMap = new Map(data.clients.map((item) => [item.id, item.name]));
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  const typeKeys = ["CLOSING", "PROSPECTING", "RELATIONSHIP", "QUOTE_RETURN"];
  const typeClass = { CLOSING: "closing", PROSPECTING: "prospecting", RELATIONSHIP: "relationship", QUOTE_RETURN: "quote" };
  const groups = contacts.reduce((result, contact) => {
    const key = contact.employeeId || "unknown";
    const current = result.get(key) || { key, label: userMap.get(key) || "Responsável não informado", CLOSING: 0, PROSPECTING: 0, RELATIONSHIP: 0, QUOTE_RETURN: 0, total: 0 };
    current[contact.contactType] = (current[contact.contactType] || 0) + 1;
    current.total += 1;
    result.set(key, current);
    return result;
  }, new Map());
  const items = [...groups.values()].sort((first, second) => second.CLOSING - first.CLOSING || second.total - first.total || first.label.localeCompare(second.label, "pt-BR"));
  const maximum = Math.max(0, ...items.map((item) => item.total));
  const closingLeader = [...items].sort((first, second) => second.CLOSING - first.CLOSING)[0];
  const subtitle = closingLeader?.CLOSING ? `Mais fechamentos: ${closingLeader.label}, com ${closingLeader.CLOSING}` : "Interações registradas por responsável no período";
  const selectedContacts = selection ? contacts.filter((contact) => contact.employeeId === selection.employeeId && contact.contactType === selection.type) : [];
  const detailGroups = [...selectedContacts.reduce((result, contact) => {
    const key = contact.clientId;
    const current = result.get(key) || { key, name: clientMap.get(key) || "Cliente não informado", contacts: [] };
    current.contacts.push(contact);
    result.set(key, current);
    return result;
  }, new Map()).values()].sort((first, second) => first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" }));
  useEffect(() => { if (selection && !selectedContacts.length) setSelection(null); }, [selection, selectedContacts.length]);
  const choose = (employeeId, type) => setSelection((current) => current?.employeeId === employeeId && current?.type === type ? null : { employeeId, type });
  return <section className="source-report-chart source-report-chart-wide" aria-label="Atuação por responsável"><header><div><h3>Atuação por responsável</h3><p>{subtitle} · clique em uma cor para ver os clientes</p></div><div className="source-consultant-chart-legend"><span className="relationship">Relacionamento</span><span className="prospecting">Prospecção</span><span className="closing">Fechamento</span><span className="quote">Devolutiva</span></div></header>{items.length ? <div className="source-consultant-chart-scroll"><div className="source-consultant-chart" style={{ "--consultant-count": items.length }}><div className="source-consultant-grid" aria-hidden="true"><i /><i /><i /><i /></div>{items.map((item) => <div className="source-consultant-column" key={item.key} tabIndex="0"><div className="source-consultant-tooltip" role="tooltip"><strong>{item.label}</strong><span className="closing">Fechamentos: {item.CLOSING}</span><span className="relationship">Relacionamentos: {item.RELATIONSHIP}</span><span className="prospecting">Prospecções: {item.PROSPECTING}</span><span className="quote">Devolutivas: {item.QUOTE_RETURN}</span><small>Clique em uma cor para ver os clientes.</small></div><div className="source-consultant-bar-space"><div className="source-consultant-stack" style={{ height: `${item.total / maximum * 100}%` }}>{typeKeys.map((type) => item[type] > 0 && <button type="button" key={type} className={`${typeClass[type]}${selection?.employeeId === item.key && selection?.type === type ? " selected" : ""}`} style={{ flexGrow: item[type] }} aria-label={`${item.label}: ver clientes de ${typeLabel(type)}`} onClick={() => choose(item.key, type)} />)}</div></div><span className="source-consultant-name">{item.label}</span></div>)}</div></div> : <p className="source-report-chart-empty">Nenhuma interação registrada para os filtros selecionados.</p>}{selection && detailGroups.length > 0 && <section className="source-consultant-details"><header><div><span>Detalhes da atuação</span><h4>{typeLabel(selection.type)} — {userMap.get(selection.employeeId) || "Responsável não informado"}</h4></div><button type="button" aria-label="Fechar detalhes" onClick={() => setSelection(null)}>×</button></header><div className="source-consultant-detail-list">{detailGroups.map((group) => <article key={group.key}><div className="source-consultant-detail-client"><strong>{group.name}</strong><span>{group.contacts.length} {group.contacts.length === 1 ? "atendimento" : "atendimentos"}</span></div><div className="source-consultant-detail-visits">{group.contacts.map((contact) => <div key={contact.id}><span>{dateLabel(reportDate(contact))}</span><p>{contact.summary || contact.quoteProduct || "Atividade não informada"}</p></div>)}</div></article>)}</div></section>}</section>;
}

function InternalPrintableReport({ contacts, data, periodLabel, employeeLabel, clientLabel, typeFilterLabel }) {
  const clientMap = new Map(data.clients.map((item) => [item.id, item.name]));
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  const by = (type) => contacts.filter((contact) => contact.contactType === type).length;
  return <section className="source-report-print internal-report-print"><header className="source-report-print-head"><img src={logoAgroVerdeSemFundo} alt="AgroVerde" /><div><p>AgroVerde — Atendimento interno</p><h1>Relatório de atendimentos</h1><span>Gerado em {new Date().toLocaleString("pt-BR")}</span></div></header><section className="source-report-print-filters"><div><b>Período</b><span>{periodLabel}</span></div><div><b>Responsável</b><span>{employeeLabel}</span></div><div><b>Cliente</b><span>{clientLabel}</span></div><div><b>Tipo</b><span>{typeFilterLabel}</span></div></section><section className="source-report-print-metrics"><article><span>Clientes atendidos</span><strong>{new Set(contacts.map((item) => item.clientId)).size}</strong></article><article><span>Atendimentos</span><strong>{contacts.length}</strong></article><article><span>Relacionamentos</span><strong>{by("RELATIONSHIP")}</strong></article><article><span>Prospecções</span><strong>{by("PROSPECTING")}</strong></article><article><span>Fechamentos</span><strong>{by("CLOSING")}</strong></article><article><span>Devolutivas</span><strong>{by("QUOTE_RETURN")}</strong></article></section><h2>Atendimentos registrados</h2>{contacts.length ? <table><thead><tr><th>Data</th><th>Responsável</th><th>Cliente</th><th>Tipo</th><th>Negociação</th><th>Resumo / orçamento</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id}><td>{brazilianDate(reportDate(contact))}</td><td>{userMap.get(contact.employeeId) || "Não informado"}</td><td>{clientMap.get(contact.clientId) || "Não informado"}</td><td>{typeLabel(contact.contactType)}</td><td>{contact.negotiationTypes.map(lineLabel).join(", ") || "—"}</td><td>{contact.summary || "—"}{contact.quoteProduct ? <><br /><strong>Orçamento: {contact.quoteProduct}</strong></> : null}</td></tr>)}</tbody></table> : <p className="source-report-print-empty">Nenhum atendimento para os filtros selecionados.</p>}<footer>AgroVerde — Relatório confidencial de atendimento comercial interno.</footer></section>;
}

function InternalReports({ data }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const [period, setPeriod] = useState("DAY");
  const [employeeId, setEmployeeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactType, setContactType] = useState("");
  const employees = data.users.filter((item) => item.role === "INTERNO").map((item) => ({ id: item.id, name: item.name }));
  const clients = data.clients.filter((item) => !employeeId || item.createdBy === employeeId).sort((first, second) => first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" })).map((item) => ({ id: item.id, name: item.name }));
  useEffect(() => { if (clientId && !clients.some((item) => item.id === clientId)) setClientId(""); }, [employeeId, clientId, data.clients]);
  const weekStart = new Date(`${selectedDate}T12:00:00`);
  const weekDay = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - weekDay + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const inPeriod = (contact) => {
    const value = reportDate(contact);
    if (period === "DAY") return value === selectedDate;
    if (period === "MONTH") return value.slice(0, 7) === selectedDate.slice(0, 7);
    const date = new Date(`${value}T12:00:00`);
    return date >= weekStart && date <= weekEnd;
  };
  const contacts = data.contacts.filter((item) => item.status === "COMPLETED" && inPeriod(item) && (!employeeId || item.employeeId === employeeId) && (!clientId || item.clientId === clientId) && (!contactType || item.contactType === contactType));
  const by = (type) => contacts.filter((item) => item.contactType === type);
  const typeItems = CONTACT_TYPES.map(([id, label]) => ({ key: id, label, value: by(id).length, tone: id === "RELATIONSHIP" ? "relationship" : id === "PROSPECTING" ? "prospecting" : id === "CLOSING" ? "closing" : "quote" }));
  const businessItems = BUSINESS_LINES.map(([id, label]) => ({ key: id, label, value: contacts.filter((item) => item.negotiationTypes.includes(id)).length, tone: "value" }));
  const quoteReturns = by("QUOTE_RETURN");
  const closedQuotes = quoteReturns.filter((item) => item.quoteOutcome === "CLOSED").length;
  const periodLabel = period === "DAY" ? brazilianDate(selectedDate) : period === "WEEK" ? `${weekStart.toLocaleDateString("pt-BR")} a ${weekEnd.toLocaleDateString("pt-BR")}` : new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const employeeLabel = employeeId ? employees.find((item) => item.id === employeeId)?.name || "Responsável selecionado" : "Todos os responsáveis";
  const clientFilterLabel = clientId ? clients.find((item) => item.id === clientId)?.name || "Cliente selecionado" : "Todos os clientes";
  const typeFilterLabel = contactType ? typeLabel(contactType) : "Todos os tipos";
  const reference = <div className="source-period-reference"><label>{period === "MONTH" ? "Mês de referência" : period === "WEEK" ? "Semana de referência" : "Data selecionada"}</label>{period === "MONTH" ? <InternalMonthPicker value={selectedDate} onChange={setSelectedDate} /> : <InternalCalendarPicker value={selectedDate} onChange={setSelectedDate} />}</div>;
  const clientMap = new Map(data.clients.map((item) => [item.id, item]));
  const userMap = new Map(data.users.map((item) => [item.id, item.name]));
  return <div className="content"><section className="toolbar source-week-bar source-schedule-toolbar source-reports-toolbar internal-reports-toolbar">{reference}<div className="segment source-period-tabs" aria-label="Período do relatório">{[["DAY", "Dia"], ["WEEK", "Semana"], ["MONTH", "Mês"]].map(([id, label]) => <button key={id} type="button" className={period === id ? "on" : ""} onClick={() => setPeriod(id)}>{label}</button>)}</div><InternalReportFilter label="Responsável" allLabel="Todos os responsáveis" value={employeeId} onChange={setEmployeeId} options={employees} /><InternalReportFilter label="Cliente" allLabel="Todos os clientes" value={clientId} onChange={setClientId} options={clients} className="source-report-client" /><InternalReportFilter label="Tipo de contato" allLabel="Todos os tipos" value={contactType} onChange={setContactType} options={CONTACT_TYPES.map(([id, name]) => ({ id, name }))} /><button className="primary source-export-pdf" type="button" onClick={() => window.print()}>Exportar PDF</button></section><p className="source-report-summary">{periodLabel} · {employeeLabel} · {clientFilterLabel} · {typeFilterLabel}</p><section className="metrics source-report-kpis"><Metric label="Clientes atendidos" value={new Set(contacts.map((item) => item.clientId)).size} detail="no período" /><Metric label="Atendimentos" value={contacts.length} detail="registrados" /><Metric label="Orçamentos fechados" value={closedQuotes} detail={`${quoteReturns.length} devolutivas`} /></section><section className="source-report-visuals"><InternalReportBarChart title="Tipos de contato" subtitle="Distribuição dos atendimentos no período" items={typeItems} emptyMessage="Nenhum atendimento registrado no período." /><InternalReportBarChart title="Tipos de negociação" subtitle="Categorias trabalhadas nos atendimentos" items={businessItems} emptyMessage="Nenhuma negociação registrada para os filtros selecionados." /><InternalEmployeeChart contacts={contacts} data={data} /></section><Panel title="Atendimentos encontrados">{contacts.length ? [...contacts].sort((first, second) => reportDate(second).localeCompare(reportDate(first))).map((contact) => <article className="row-card" key={contact.id}><div><strong>{clientMap.get(contact.clientId)?.name || "Cliente não informado"}</strong><span>{typeLabel(contact.contactType)} · {dateLabel(reportDate(contact))}</span><small className="source-report-user">Responsável: {userMap.get(contact.employeeId) || "Não informado"}</small>{contact.negotiationTypes.length > 0 && <span className="follow-up-text">Negociação: {contact.negotiationTypes.map(lineLabel).join(", ")}</span>}{contact.quoteProduct && <span className="follow-up-text">Orçamento: {contact.quoteProduct}{contact.contactType === "QUOTE_RETURN" ? ` · ${contact.quoteOutcome === "CLOSED" ? "Fechado" : `Não fechado — ${contact.notClosedReason || "motivo não informado"}`}` : ""}</span>}<p className="internal-contact-summary">{contact.summary}</p></div></article>) : <Empty>Nenhum atendimento interno para os filtros selecionados.</Empty>}</Panel><InternalPrintableReport contacts={contacts} data={data} periodLabel={periodLabel} employeeLabel={employeeLabel} clientLabel={clientFilterLabel} typeFilterLabel={typeFilterLabel} /></div>;
}

export default function InternalApp({ profile, userMenu, userDirectory }) {
  const [data, setData] = useState({ clients: [], contacts: [], users: [] });
  const [view, setView] = useState("dashboard");
  const [plannedContact, setPlannedContact] = useState(null);
  const [notice, setNotice] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile.role === "ADMIN";
  const reload = async () => { const remote = await loadInternalData(); setData(remote); setLoading(false); };
  useEffect(() => { reload().catch((error) => { setNotice(error?.message || "Não foi possível carregar o ambiente interno."); setLoading(false); }); }, [profile.id]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);
  const navigate = (next) => { setView(next); setNavOpen(false); if (next !== "newContact") setPlannedContact(null); };
  const nav = useMemo(() => [["dashboard", "▦", "Início"], ["agenda", "▤", "Agenda"], ["newContact", "↗", "Novo atendimento"], ["clients", "◉", "Clientes"], ...(isAdmin ? [["users", "◌", "Usuários"], ["reports", "▥", "Relatórios internos"]] : [])], [isAdmin]);
  if (loading) return <main className="source-access"><section className="source-access-card"><img src={logoAgroVerdeSemFundo} alt="AgroVerde" /><h1>Carregando atendimento interno</h1></section></main>;
  return <div className="app-shell source-app internal-app">{navOpen && <button className="scrim" type="button" aria-label="Fechar navegação" onClick={() => setNavOpen(false)} />}<aside className={`sidebar${navOpen ? " open" : ""}`}><div className="sidebar-head"><img className="sidebar-logo" src={logoAgroVerdeSemFundo} alt="AgroVerde" /></div><nav>{nav.map(([id, icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}><span className="source-icon" aria-hidden="true">{icon}</span>{label}</button>)}</nav><p className="source-demo-note">Ambiente exclusivo para atendimento comercial interno.</p></aside><main className="main"><header className="topbar"><button className="mobile-nav-toggle" type="button" aria-label="Abrir navegação" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}><i /><i /><i /></button><div><span>{isAdmin ? "GESTÃO · ATENDIMENTO INTERNO" : "ATENDIMENTO INTERNO"}</span><h2>{nav.find(([id]) => id === view)?.[2] || "AgroVerde"}</h2></div>{userMenu}</header>{notice && <div className="source-notice">{notice}</div>}{view === "dashboard" && <InternalDashboard data={data} profile={profile} isAdmin={isAdmin} onNavigate={navigate} />}{view === "clients" && <InternalClients data={data} profile={profile} onReload={reload} setNotice={setNotice} />}{view === "agenda" && <InternalAgenda data={data} profile={profile} isAdmin={isAdmin} onReload={reload} setNotice={setNotice} onRegister={(contact) => { setPlannedContact(contact); setView("newContact"); }} />}{view === "newContact" && <InternalContactForm key={plannedContact?.id || "new"} data={data} profile={profile} isAdmin={isAdmin} plannedContact={plannedContact} onReload={reload} setNotice={setNotice} onComplete={() => { setPlannedContact(null); setView("agenda"); }} />}{view === "users" && isAdmin && userDirectory}{view === "reports" && isAdmin && <InternalReports data={data} />}</main></div>;
}
