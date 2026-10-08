// Phones: every data table is shown as a list of cards (one card per row, "Label: value"
// lines) instead of a wide table you have to scroll sideways. The CSS lives in index.css
// (@media max-width 767px); this helper copies each column header into its cells'
// data-label attribute so the card lines can show the label. Opt a table out with
// <table data-no-stack>.
export function startTableStacking(): () => void {
  let queued = false;
  const label = () => {
    queued = false;
    document.querySelectorAll<HTMLTableElement>("table:not([data-no-stack])").forEach(table => {
      const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
      if (!heads.length) return;
      // expand colspans so index → header text lines up
      const names: string[] = [];
      heads.forEach(th => { for (let i = 0; i < (th.colSpan || 1); i++) names.push((th.textContent || "").trim()); });
      table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach(tr => {
        let col = 0;
        Array.from(tr.cells).forEach(td => {
          const name = names[col] || "";
          if (td.getAttribute("data-label") !== name) td.setAttribute("data-label", name);
          col += td.colSpan || 1;
        });
      });
    });
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(label); } };
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => mo.disconnect();
}
