/* Camada de terminologia para a versão AgroVerde do aplicativo compilado. */
(() => {
  const replacements = [
    [/Therapeutica Pharmacia/gi, "AgroVerde"],
    [/Therapeutica Visitas/gi, "AgroVerde — Gestão de Visitas"],
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
    return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
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
    document.querySelectorAll('input[type="email"]').forEach((input) => {
      if (input.value === "representante@therapeutica.com.br") {
        input.value = "vendedor@agroverde.com.br";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => applyTerminology(node));
      if (mutation.type === "characterData") applyTerminology(mutation.target);
      if (mutation.type === "attributes") applyTerminology(mutation.target);
    });
  });

  window.addEventListener("DOMContentLoaded", () => {
    applyTerminology();
    observer.observe(document.body, { attributes: true, characterData: true, childList: true, subtree: true });
  });
})();
