// What kinds of deal each business vertical books. Picking a kind first means the form asks only for
// the details that matter for it (an IPO needs exchange, board and BRLM role; an AIF subscription needs scheme and commitment).
// `dealType` is the matching value in Admin → Dropdowns (deal · type); `fields` are stored on the deal as details.

export type KindField =
  | { k: string; label: string; type: "text"; placeholder?: string; span2?: boolean }
  | { k: string; label: string; type: "select" | "pills"; options: string[]; span2?: boolean }
  | { k: string; label: string; type: "money" | "date" | "pct" | "number"; span2?: boolean };
export type DealKind = { id: string; label: string; sub: string; dealType: string; valueLabel?: string; fields: KindField[] };

const ROLE = { k: "our_role", label: "Our role", type: "pills" as const, options: ["Lead / BRLM", "Co-lead", "Syndicate", "Advisor"] };
const EXCH = { k: "exchange", label: "Exchange", type: "pills" as const, options: ["NSE + BSE", "NSE", "BSE"] };

export const DEAL_KINDS: Record<string, DealKind[]> = {
  ib: [
    { id: "ipo", label: "IPO", sub: "Mainboard or SME listing — fresh issue and / or OFS", dealType: "IPO/OFS", valueLabel: "Issue size",
      fields: [{ k: "board", label: "Board", type: "pills", options: ["Mainboard", "SME"] }, EXCH, ROLE,
        { k: "issue_mix", label: "Issue", type: "pills", options: ["Fresh issue", "OFS", "Fresh + OFS"] }, { k: "drhp_target", label: "DRHP filing target", type: "date" }, { k: "fee_pct", label: "Fee", type: "pct" }] },
    { id: "qip", label: "QIP", sub: "Qualified institutional placement by a listed company", dealType: "ECM - QIP", valueLabel: "Issue size",
      fields: [ROLE, { k: "floor_price", label: "Floor price (₹)", type: "number" }, { k: "launch_target", label: "Launch target", type: "date" }, { k: "fee_pct", label: "Fee", type: "pct" }] },
    { id: "rights", label: "Rights issue", sub: "Rights offer to existing shareholders", dealType: "ECM - Rights Issue", valueLabel: "Issue size",
      fields: [ROLE, { k: "ratio", label: "Rights ratio", type: "text", placeholder: "e.g. 1:5" }, { k: "record_date", label: "Record date", type: "date" }, { k: "fee_pct", label: "Fee", type: "pct" }] },
    { id: "ofs_block", label: "OFS / Block", sub: "Promoter stake sale through OFS window or block", dealType: "Institutional Block", valueLabel: "Deal size",
      fields: [{ k: "route", label: "Route", type: "pills", options: ["OFS window", "Block deal", "Bulk deal"] }, { k: "stake_pct", label: "Stake being sold", type: "pct" }, { k: "fee_pct", label: "Fee", type: "pct" }] },
    { id: "ma", label: "M&A advisory", sub: "Buy-side or sell-side advisory, mergers, demergers", dealType: "M&A Advisory", valueLabel: "Enterprise value",
      fields: [{ k: "side", label: "Side", type: "pills", options: ["Sell-side", "Buy-side", "Merger / scheme"] }, { k: "counterparty", label: "Target / counterparty", type: "text", span2: true }, { k: "retainer", label: "Monthly retainer", type: "money" }, { k: "success_fee_pct", label: "Success fee", type: "pct" }] },
    { id: "pe", label: "Private equity / pre-IPO", sub: "Private placement or pre-IPO round", dealType: "Other", valueLabel: "Raise size",
      fields: [{ k: "instrument", label: "Instrument", type: "pills", options: ["Equity", "CCPS", "CCD"] }, { k: "pre_money", label: "Pre-money valuation", type: "money" }, { k: "investors", label: "Target investors", type: "text", span2: true }, { k: "fee_pct", label: "Fee", type: "pct" }] },
    { id: "debt", label: "Debt / NCD", sub: "NCD, bonds, structured debt arrangement", dealType: "Debt Arrangement", valueLabel: "Issue size",
      fields: [{ k: "instrument", label: "Instrument", type: "pills", options: ["NCD - public", "NCD - private", "CP", "Term loan", "Structured"] }, { k: "rating", label: "Rating", type: "text", placeholder: "e.g. CRISIL AA-" }, { k: "coupon_pct", label: "Coupon", type: "pct" }, { k: "tenor", label: "Tenor", type: "text", placeholder: "e.g. 3 years" }] },
    { id: "restructuring", label: "Debt restructuring", sub: "One-time settlement, resolution, refinancing", dealType: "Other", valueLabel: "Debt involved",
      fields: [{ k: "lenders", label: "Lenders", type: "text", span2: true }, { k: "route", label: "Route", type: "pills", options: ["OTS", "Resolution plan", "Refinance"] }] },
  ],
  aif: [
    { id: "fund_raise", label: "Fund raise", sub: "New scheme or close — commitments being raised", dealType: "AIF - Cat II", valueLabel: "Target corpus",
      fields: [{ k: "category", label: "Category", type: "pills", options: ["Cat I", "Cat II", "Cat III"] }, { k: "scheme", label: "Scheme", type: "text", span2: true }, { k: "close", label: "Close", type: "pills", options: ["First close", "Interim close", "Final close"] }, { k: "close_date", label: "Close date", type: "date" }] },
    { id: "subscription", label: "Investor subscription", sub: "An investor committing to a scheme", dealType: "AIF - Cat II", valueLabel: "Commitment",
      fields: [{ k: "scheme", label: "Scheme", type: "text", span2: true }, { k: "investor_type", label: "Investor", type: "pills", options: ["Individual / HUF", "Family office", "Corporate", "Institution", "NRI"] }, { k: "drawdown_pct", label: "First drawdown", type: "pct" }, { k: "distributor", label: "Distributor", type: "text" }] },
    { id: "distribution", label: "Distribution / exit", sub: "Capital returned to investors", dealType: "Other", valueLabel: "Amount distributed",
      fields: [{ k: "scheme", label: "Scheme", type: "text", span2: true }, { k: "record_date", label: "Record date", type: "date" }] },
  ],
  retail: [
    { id: "ipo_app", label: "IPO application", sub: "Client applying in a public issue", dealType: "IPO/OFS", valueLabel: "Application amount",
      fields: [{ k: "issue", label: "Issue", type: "text", span2: true }, { k: "category", label: "Category", type: "pills", options: ["Retail", "HNI / NII", "Employee", "Shareholder"] }] },
    { id: "mf", label: "Mutual fund / SIP", sub: "Lump sum or SIP", dealType: "Mutual Fund", valueLabel: "Amount",
      fields: [{ k: "mode", label: "Mode", type: "pills", options: ["SIP", "Lump sum", "STP / SWP"] }, { k: "scheme", label: "Scheme", type: "text", span2: true }] },
    { id: "pms", label: "PMS", sub: "Portfolio management mandate", dealType: "PMS", valueLabel: "Corpus", fields: [{ k: "strategy", label: "Strategy", type: "text", span2: true }] },
    { id: "trading", label: "Trading / F&O", sub: "Equity, derivatives or margin trading", dealType: "Equity Broking", valueLabel: "Margin / limit",
      fields: [{ k: "segment", label: "Segment", type: "pills", options: ["Equity", "F&O", "MTF", "Currency", "Commodity"] }] },
    { id: "advisory", label: "Advisory", sub: "Advisory or portfolio review", dealType: "Other", fields: [] },
  ],
  corporate: [
    { id: "block", label: "Block deal", sub: "Negotiated block in the block window", dealType: "Institutional Block", valueLabel: "Deal size",
      fields: [{ k: "scrip", label: "Scrip", type: "text" }, { k: "side", label: "Side", type: "pills", options: ["Buy", "Sell"] }, { k: "qty", label: "Quantity", type: "number" }] },
    { id: "bulk", label: "Bulk deal", sub: "Bulk trade above 0.5% of equity", dealType: "Corporate Broking", valueLabel: "Deal size",
      fields: [{ k: "scrip", label: "Scrip", type: "text" }, { k: "side", label: "Side", type: "pills", options: ["Buy", "Sell"] }] },
    { id: "treasury", label: "Treasury / margin", sub: "Corporate treasury, margin or clearing", dealType: "Corporate Broking", valueLabel: "Limit", fields: [] },
  ],
  ie: [
    { id: "block", label: "Institutional block", sub: "Block for an institutional client", dealType: "Institutional Block", valueLabel: "Deal size",
      fields: [{ k: "scrip", label: "Scrip", type: "text" }, { k: "side", label: "Side", type: "pills", options: ["Buy", "Sell"] }, { k: "institution", label: "Institution", type: "text" }] },
    { id: "volume", label: "Volume / research mandate", sub: "Ongoing broking volume or research coverage", dealType: "Equity Broking", valueLabel: "Expected volume", fields: [] },
  ],
};

export const kindOf = (verticalId: string, deal: any): DealKind | undefined =>
  (DEAL_KINDS[verticalId] || []).find(k => k.id === deal?.details?.kind || k.label === deal?.type);
