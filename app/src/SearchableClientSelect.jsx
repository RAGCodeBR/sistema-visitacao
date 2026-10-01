import React, { useEffect, useId, useMemo, useRef, useState } from "react";

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/\s+/g, " ")
  .trim();

export default function SearchableClientSelect({ clients, value, onChange, disabled = false, label = "Cliente" }) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selected = clients.find((client) => String(client.id) === String(value));
  const filteredClients = useMemo(() => {
    const normalizedQuery = hasTyped ? normalize(query) : "";
    return [...clients]
      .filter((client) => normalize(client.name).includes(normalizedQuery))
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" }));
  }, [clients, hasTyped, query]);

  const closeMenu = () => {
    setOpen(false);
    setHasTyped(false);
    setQuery(selected?.name || "");
  };

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) closeMenu();
    };
    const escape = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open, selected?.name]);

  useEffect(() => {
    if (!open) setQuery(selected?.name || "");
  }, [open, selected?.name]);

  useEffect(() => setActiveIndex(-1), [query, clients]);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector(`[data-client-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const choose = (client) => {
    onChange(client.id);
    setQuery(client.name);
    setHasTyped(false);
    setOpen(false);
  };
  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setHasTyped(false);
    setQuery(selected?.name || "");
  };
  const changeQuery = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setHasTyped(true);
    setOpen(true);
    if (value) onChange("");
  };
  const clear = () => {
    onChange("");
    setQuery("");
    setHasTyped(false);
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };
  const handleKeys = (event) => {
    if (!filteredClients.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredClients.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && filteredClients[activeIndex]) {
      event.preventDefault();
      choose(filteredClients[activeIndex]);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  return <div className={`source-client-combobox${open ? " open" : ""}${disabled ? " disabled" : ""}`} ref={rootRef}>
    <div className="source-client-combobox-field">
      <span className="source-client-combobox-icon" aria-hidden="true">⌕</span>
      <input ref={inputRef} type="search" role="combobox" value={query} disabled={disabled} placeholder="Selecione ou busque um cliente" aria-label={label} aria-haspopup="listbox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} autoComplete="off" onFocus={(event) => { const input = event.currentTarget; openMenu(); window.requestAnimationFrame(() => input.select()); }} onClick={(event) => { if (!open) { const input = event.currentTarget; openMenu(); window.requestAnimationFrame(() => input.select()); } }} onChange={changeQuery} onKeyDown={handleKeys} />
      {(selected || query) && !disabled && <button type="button" className="source-client-combobox-clear" aria-label="Limpar cliente selecionado" onMouseDown={(event) => event.preventDefault()} onClick={clear}>×</button>}
      <button type="button" className="source-client-combobox-toggle" disabled={disabled} tabIndex={-1} aria-label={open ? "Fechar lista de clientes" : "Abrir lista de clientes"} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) closeMenu(); else { openMenu(); window.requestAnimationFrame(() => inputRef.current?.focus()); } }}>▾</button>
    </div>
    {open && <div className="source-client-combobox-menu">
      <div className="source-client-combobox-options" id={listboxId} role="listbox" aria-label="Clientes encontrados">
        {filteredClients.length ? filteredClients.map((client, index) => <button type="button" role="option" data-client-index={index} aria-selected={String(client.id) === String(value)} className={`${String(client.id) === String(value) ? "selected " : ""}${index === activeIndex ? "active" : ""}`.trim()} key={client.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(client)}>{client.name}</button>) : <p>Nenhum cliente encontrado.</p>}
      </div>
      <small>{filteredClients.length} {filteredClients.length === 1 ? "cliente encontrado" : "clientes encontrados"}</small>
    </div>}
  </div>;
}
