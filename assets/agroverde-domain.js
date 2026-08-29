/* Camada de terminologia para a versão AgroVerde do aplicativo compilado. */
(() => {
  const replacements = [
    [/Therapeutica Pharmacia/gi, "AgroVerde"],
    [/Therapeutica Visitas/gi, "AgroVerde — Gestão de Visitas"],
    [/Therapeutica/gi, "AgroVerde"],
    [/Administrador Therapeutica/gi, "Administrador AgroVerde"],
    [/representante@therapeutica\.com\.br/gi, "vendedor@agroverde.com.br"],
    [/Visitas médicas/gi, "Visitas a fazendas"],
    [/Visitas medicas/gi, "Visitas a fazendas"],
    [/visita médica/gi, "visita comercial"],
    [/visita medica/gi, "visita comercial"],
    [/médicas/gi, "comerciais"],
    [/medicas/gi, "comerciais"],
    [/médica/gi, "comercial"],
    [/medica/gi, "comercial"],
    [/Solicitações médicas/gi, "Solicitações comerciais"],
    [/Solicitacoes medicas/gi, "Solicitações comerciais"],
    [/solicitação médica/gi, "solicitação comercial"],
    [/solicitacao medica/gi, "solicitação comercial"],
    [/Histórico de Prescrição e Solicitações/gi, "Histórico de compras e solicitações"],
    [/Historico de Prescricao e Solicitacoes/gi, "Histórico de compras e solicitações"],
    [/Perfil de prescrição/gi, "Perfil de compra"],
    [/Perfil de prescricao/gi, "Perfil de compra"],
    [/Cadastro de médicos\/prescritores/gi, "Cadastro de clientes e potenciais clientes"],
    [/Cadastro de medicos\/prescritores/gi, "Cadastro de clientes e potenciais clientes"],
    [/Linhas que costuma prescrever/gi, "Linhas de interesse"],
    [/Produtos\/ativos que costuma indicar/gi, "Produtos e insumos de interesse"],
    [/Fórmulas ou categorias recorrentes/gi, "Categorias de compra recorrentes"],
    [/Formulas ou categorias recorrentes/gi, "Categorias de compra recorrentes"],
    [/Frequência de prescrição/gi, "Frequência de compra"],
    [/Frequencia de prescricao/gi, "Frequência de compra"],
    [/Potencial de indicação/gi, "Potencial de compra"],
    [/Potencial de indicacao/gi, "Potencial de compra"],
    [/Indicações\/receitas/gi, "Oportunidades e pedidos"],
    [/Indicacoes\/receitas/gi, "Oportunidades e pedidos"],
    [/Material científico/gi, "Material técnico"],
    [/Material cientifico/gi, "Material técnico"],
    [/prescrição/gi, "compra"],
    [/prescricao/gi, "compra"],
    [/receita\/parceria/gi, "pedido/oportunidade"],
    [/receitas?/gi, "pedidos"],
    [/farmacêutica responsável/gi, "consultor técnico responsável"],
    [/farmaceutica responsavel/gi, "consultor técnico responsável"],
    [/farmacêutico/gi, "consultor técnico"],
    [/farmaceutico/gi, "consultor técnico"],
    [/Médicos\/prescritores/gi, "Clientes e potenciais clientes"],
    [/Medicos\/prescritores/gi, "Clientes e potenciais clientes"],
    [/médicos/gi, "clientes"],
    [/medicos/gi, "clientes"],
    [/Médicos/gi, "Clientes"],
    [/Medicos/gi, "Clientes"],
    [/médico/gi, "cliente"],
    [/medico/gi, "cliente"],
    [/Médico/gi, "Cliente"],
    [/Medico/gi, "Cliente"],
    [/Clínicas/gi, "Fazendas"],
    [/Clinicas/gi, "Fazendas"],
    [/clínicas/gi, "fazendas"],
    [/clinicas/gi, "fazendas"],
    [/clínica/gi, "fazenda"],
    [/clinica/gi, "fazenda"],
    [/Clínica/gi, "Fazenda"],
    [/Clinica/gi, "Fazenda"],
    [/especialidade/gi, "atividade rural"],
    [/Especialidade/gi, "Atividade rural"],
    [/conselho/gi, "documento"],
    [/Conselho/gi, "Documento"],
    [/paciente/gi, "cliente final"],
    [/Paciente/gi, "Cliente final"],
    [/Produto\/ativo/gi, "Produto/insumo"],
    [/produto\/ativo/gi, "produto/insumo"],
    [/Dra\. Ana Silva/gi, "João da Fazenda Boa Vista"],
    [/Vitamina C, acido tranexamico, Omega 3/gi, "sementes, fertilizantes, defensivos e suplementos animais"],
    [/Vitamina C, ácido tranexamico, Omega 3/gi, "sementes, fertilizantes, defensivos e suplementos animais"],
    [/acido tranexamico/gi, "fertilizante foliar"],
    [/ácido tranexamico/gi, "fertilizante foliar"],
    [/Omega 3/gi, "suplemento mineral"],
    [/Manipulados/gi, "Insumos"],
    [/Skincare/gi, "Nutrição vegetal"],
    [/Saúde/gi, "Saúde animal"],
    [/Saude/gi, "Saúde animal"],
    [/Emagrecimento/gi, "Sementes"],
    [/Mamãe\/Bebê/gi, "Fertilizantes"],
    [/Mamae\/Bebe/gi, "Fertilizantes"],
    [/Florais/gi, "Defensivos"],
    [/Homeopatia/gi, "Agricultura de precisão"],
    [/Aromaterapia/gi, "Irrigação"],
    [/Veterinária/gi, "Pecuária"],
    [/Veterinaria/gi, "Pecuária"],
    [/Mobile-first/gi, "Gestão em campo"],
    [/Visitas a fazendas com registro rapido e historico claro\./gi, "Visitas a fazendas com registro ágil e histórico claro."],
    [/Visitas a fazendas com registro rápido e histórico claro\./gi, "Visitas a fazendas com registro ágil e histórico claro."],
  ];

  function translate(value) {
    return replacements.reduce(
      (text, [pattern, replacement]) => text.replace(pattern, (match) => {
        if (match[0] !== match[0].toUpperCase()) return replacement;
        return replacement[0].toUpperCase() + replacement.slice(1);
      }),
      value,
    );
  }

  function translateElement(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      const translated = translate(element.nodeValue);
      if (translated !== element.nodeValue) element.nodeValue = translated;
      return;
    }
    if (element.nodeType !== Node.ELEMENT_NODE || element.tagName === "SCRIPT") return;
    ["placeholder", "title", "alt", "aria-label"].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const value = element.getAttribute(attribute);
      const translated = translate(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    });
    element.childNodes.forEach(translateElement);
  }

  function applyTerminology(root = document.body) {
    if (root) translateElement(root);
    hideRegistrationDocumentField();
    updateSidebarIcons();
    document.querySelectorAll('input[type="email"]').forEach((input) => {
      if (input.value === "representante@therapeutica.com.br") {
        input.value = "vendedor@agroverde.com.br";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function hideRegistrationDocumentField() {
    document.querySelectorAll("label").forEach((label) => {
      const labelText = label.textContent.trim();
      if (!/^(crm|cro|conselho|documento)\b/i.test(labelText)) return;

      label.hidden = true;
      const field = label.nextElementSibling;
      if (field && /^(INPUT|SELECT)$/i.test(field.tagName)) field.hidden = true;
    });
  }

  const sidebarIcons = {
    "Inicio": ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
    "Nova visita": ["m3 17 6-6 4 4 8-8", "M14 7h7v7"],
    "Clientes": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    "Solicitacoes": ["M9 11h6", "M9 15h6", "M9 7h6", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"],
    "Fazendas": ["M3 21h18", "M5 21V10l7-5 7 5v11", "M9 21v-5h6v5", "M12 5V2"],
    "Agenda": ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
    "Historico": ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 7v5l3 2"],
    "Catalogo": ["M21 8a2 2 0 0 0-1-1.73L13 3a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L11 21a2 2 0 0 0 2 0l7-3.27A2 2 0 0 0 21 16Z", "M3.3 7 12 11l8.7-4", "M12 21V11"],
    "Relatorios": ["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V7", "M16 16v-8"],
    "Usuarios": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    "Configuracoes": ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7", "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.08 2.08-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-3v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.08-2.08.06-.06A1.7 1.7 0 0 0 7.1 14.7 1.7 1.7 0 0 0 5.54 13.7H5.4v-3h.14A1.7 1.7 0 0 0 7.1 9.67a1.7 1.7 0 0 0-.34-1.88L6.7 7.73l2.08-2.08.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4.4h3v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.08 2.08-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z"],
  };

  function updateSidebarIcons() {
    document.querySelectorAll(".sidebar nav button").forEach((button) => {
      const label = button.textContent.trim();
      const normalizedLabel = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const paths = sidebarIcons[normalizedLabel];
      const currentIcon = button.querySelector("svg");
      if (!paths || !currentIcon || currentIcon.dataset.agroverdeIcon === normalizedLabel) return;

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("width", "20");
      icon.setAttribute("height", "20");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "2");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("stroke-linejoin", "round");
      icon.dataset.agroverdeIcon = normalizedLabel;
      paths.forEach((d) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        icon.appendChild(path);
      });
      currentIcon.replaceWith(icon);
    });
  }

  let translationScheduled = false;

  const observer = new MutationObserver((mutations) => {
    const hasNewContent = mutations.some((mutation) => mutation.addedNodes.length > 0);
    if (!hasNewContent || translationScheduled) return;

    translationScheduled = true;
    window.requestAnimationFrame(() => {
      translationScheduled = false;
      applyTerminology();
    });
  });

  window.addEventListener("DOMContentLoaded", () => {
    applyTerminology();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
