import React from "react";

export const CLIENTS_PER_PAGE = 20;

const pageItems = (currentPage, totalPages) => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = currentPage <= 3
    ? [1, 2, 3, 4, totalPages]
    : currentPage >= totalPages - 2
      ? [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
      : [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  return pages.reduce((items, page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push(`ellipsis-${page}`);
    items.push(page);
    return items;
  }, []);
};

export default function Pagination({ page, totalItems, pageSize = CLIENTS_PER_PAGE, onChange, itemLabel = "clientes" }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const goToPage = (nextPage, event) => {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
    onChange(nextPage);
    const panel = event.currentTarget.closest(".panel");
    window.requestAnimationFrame(() => panel?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
  };
  return <nav className="source-pagination" aria-label={`Paginação de ${itemLabel}`}>
    <p><strong>{firstItem}–{lastItem}</strong> de {totalItems} {itemLabel}</p>
    <div className="source-pagination-controls">
      <button type="button" className="source-pagination-arrow" disabled={page === 1} onClick={(event) => goToPage(page - 1, event)} aria-label="Página anterior">‹<span>Anterior</span></button>
      <div className="source-pagination-pages">
        {pageItems(page, totalPages).map((item) => typeof item === "number"
          ? <button type="button" key={item} className={`source-pagination-page${item === page ? " active" : ""}`} aria-current={item === page ? "page" : undefined} aria-label={`Página ${item} de ${totalPages}`} onClick={(event) => goToPage(item, event)}>{item}</button>
          : <span key={item} aria-hidden="true">…</span>)}
      </div>
      <span className="source-pagination-mobile-label">Página {page} de {totalPages}</span>
      <button type="button" className="source-pagination-arrow" disabled={page === totalPages} onClick={(event) => goToPage(page + 1, event)} aria-label="Próxima página"><span>Próxima</span>›</button>
    </div>
  </nav>;
}
