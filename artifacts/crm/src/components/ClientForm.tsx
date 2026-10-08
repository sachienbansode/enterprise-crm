import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, User, Phone, Mail, MapPin, AlertCircle } from "lucide-react";


// ─── Types ───────────────────────────────────────────────────────────────────
interface Contact {
  id?: string;
  contact_type: "mobile" | "landline" | "email" | "address";
  value: string;
  label: string;
  is_primary: boolean;
}

interface ClientFormData {
  name: string;
  type: string;
  category: string;
  status: string;
  kyc_status: string;
  fatca_status: string;
  risk_profile: string;
  pan: string;
  mobile: string;
  email: string;
  address: string;
  landline: string;
  date_of_birth: string;
  date_of_incorporation: string;
  demat_account: string;
  dp_id: string;
  ckyc_id: string;
  rm_id: string;
  owner_id: string;
  verticals: string[];
  notes: string;
  contacts: Contact[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editClient?: any;
  currentUser?: any;
  token?: string;
  apiBase?: string;
}

const VERTICALS = [
  { id: "retail", label: "Retail Broking" },
  { id: "corporate", label: "Corporate Broking" },
  { id: "ib", label: "Investment Banking" },
  { id: "aif", label: "AIF" },
  { id: "ie", label: "Institutional Equities" },
];

const STATUSES = ["Active", "Dormant", "Suspended", "Closed"];
const KYC_STATUSES = ["Pending", "Verified", "Expired", "Rejected"];
const FATCA_STATUSES = ["Pending", "Compliant", "Non-Compliant", "N/A"];
const RISK_PROFILES = ["Low", "Moderate", "High", "Ultra-High"];
const CLIENT_TYPES = ["Individual", "Non-Individual"];

const BLANK_FORM: ClientFormData = {
  name: "", type: "Individual", category: "Individual", status: "Active",
  kyc_status: "Pending", fatca_status: "Pending", risk_profile: "Moderate",
  pan: "", mobile: "", email: "", address: "", landline: "",
  date_of_birth: "", date_of_incorporation: "",
  demat_account: "", dp_id: "", ckyc_id: "",
  rm_id: "", owner_id: "", verticals: [], notes: "", contacts: [],
};

const mkContact = (type: Contact["contact_type"]): Contact => ({
  contact_type: type, value: "", label: "Primary", is_primary: false,
});

// ─── Label row ───────────────────────────────────────────────────────────────
const F = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? "col-span-1" : "sm:col-span-2 md:col-span-1"}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";
const selectCls = inputCls;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientForm({ open, onClose, onSaved, editClient, currentUser, token, apiBase = "" }: ClientFormProps) {
  const API = `${apiBase}/api`;
  const [form, setForm] = useState<ClientFormData>(BLANK_FORM);
  const [categories, setCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<"basic" | "kyc" | "banking" | "contacts" | "settings">("basic");

  const isSuperAdmin = currentUser?.role?.toLowerCase().includes("super");
  const isEdit = !!editClient;

  // Fetch dropdown categories and users on open
  useEffect(() => {
    if (!open) return;
    fetch(`${API}/config/dropdowns?entity=client&field=category`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(rows => setCategories(rows.map((r: any) => r.value))).catch(() => {});
    fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : d.data || [])).catch(() => {});
  }, [open, token]);

  // Populate form from editClient
  useEffect(() => {
    if (!open) return;
    if (editClient) {
      setForm({
        name: editClient.name || "",
        type: editClient.type || "Individual",
        category: editClient.category || "Individual",
        status: editClient.status || "Active",
        kyc_status: editClient.kyc_status || "Pending",
        fatca_status: editClient.fatca_status || "Pending",
        risk_profile: editClient.risk_profile || "Moderate",
        pan: editClient.pan || "",
        mobile: editClient.mobile || "",
        email: editClient.email || "",
        address: editClient.address || "",
        landline: editClient.landline || "",
        date_of_birth: editClient.date_of_birth ? editClient.date_of_birth.split("T")[0] : "",
        date_of_incorporation: editClient.date_of_incorporation ? editClient.date_of_incorporation.split("T")[0] : "",
        demat_account: editClient.demat_account || "",
        dp_id: editClient.dp_id || "",
        ckyc_id: editClient.ckyc_id || "",
        rm_id: editClient.rm_id || "",
        owner_id: editClient.owner_id || "",
        verticals: Array.isArray(editClient.verticals) ? editClient.verticals.filter(Boolean) : [],
        notes: editClient.notes || "",
        contacts: Array.isArray(editClient.contacts) ? editClient.contacts : [],
      });
    } else {
      setForm({ ...BLANK_FORM, rm_id: currentUser?.id || "", owner_id: currentUser?.id || "" });
    }
    setError("");
    setActiveSection("basic");
  }, [open, editClient, currentUser]);

  const set = useCallback((k: keyof ClientFormData, v: any) => setForm(f => ({ ...f, [k]: v })), []);

  const toggleVertical = (vid: string) =>
    setForm(f => ({ ...f, verticals: f.verticals.includes(vid) ? f.verticals.filter(x => x !== vid) : [...f.verticals, vid] }));

  const addContact = (type: Contact["contact_type"]) =>
    setForm(f => ({ ...f, contacts: [...f.contacts, mkContact(type)] }));

  const updateContact = (idx: number, patch: Partial<Contact>) =>
    setForm(f => ({ ...f, contacts: f.contacts.map((c, i) => i === idx ? { ...c, ...patch } : c) }));

  const removeContact = (idx: number) =>
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Client name is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        ...form,
        pan: form.pan || null,
        mobile: form.mobile || null,
        email: form.email || null,
        address: form.address || null,
        landline: form.landline || null,
        date_of_birth: form.type === "Individual" ? form.date_of_birth || null : null,
        date_of_incorporation: form.type !== "Individual" ? form.date_of_incorporation || null : null,
        rm_id: form.rm_id || null,
        owner_id: form.owner_id || null,
        created_by_id: currentUser?.id,
        created_by_name: currentUser?.name || "System",
        updated_by_id: currentUser?.id,
        updated_by_name: currentUser?.name || "System",
        updated_by_role: currentUser?.role || null,
        contacts: form.contacts.filter(c => c.value.trim()),
      };

      const url = isEdit ? `${API}/clients/${editClient.id}` : `${API}/clients`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save client"); }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const SECTIONS = [
    { id: "basic", label: "Basic Info" },
    { id: "kyc", label: "KYC / Compliance" },
    { id: "banking", label: "Banking & Demat" },
    { id: "contacts", label: "Contacts" },
    { id: "settings", label: "Assignment" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit Client" : "New Client"}
            </h2>
            {isEdit && <p className="text-xs text-gray-500 mt-0.5">{editClient?.client_code}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === s.id
                  ? "bg-violet-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── BASIC INFO ── */}
          {activeSection === "basic" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <F label="Full Name *">
                  <input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="Client full name" />
                </F>
              </div>
              <F label="Client Type" half>
                <select value={form.type} onChange={e => set("type", e.target.value)} className={selectCls}>
                  {CLIENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </F>
              <F label="Category" half>
                <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                  {(categories.length ? categories : ["Individual","HUF","Corporate","LLP","Trust","FPI","Mutual Fund"]).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </F>
              <F label="PAN" half>
                <input value={form.pan} onChange={e => set("pan", e.target.value.toUpperCase())} className={inputCls} placeholder="ABCDE1234F" maxLength={10} />
              </F>
              {form.type === "Individual" ? (
                <F label="Date of Birth" half>
                  <input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} className={inputCls} />
                </F>
              ) : (
                <F label="Date of Incorporation" half>
                  <input type="date" value={form.date_of_incorporation} onChange={e => set("date_of_incorporation", e.target.value)} className={inputCls} />
                </F>
              )}
              <F label="Primary Mobile" half>
                <input value={form.mobile} onChange={e => set("mobile", e.target.value)} className={inputCls} placeholder="+91 9XXXXXXXXX" />
              </F>
              <F label="Primary Email" half>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="client@example.com" />
              </F>
              <div className="sm:col-span-2">
                <F label="Address">
                  <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} className={inputCls} placeholder="Registered address" />
                </F>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Verticals</label>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVertical(v.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.verticals.includes(v.id)
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <F label="Notes / Remarks">
                  <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls} placeholder="Internal notes about this client..." />
                </F>
              </div>
            </div>
          )}

          {/* ── KYC / COMPLIANCE ── */}
          {activeSection === "kyc" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Status" half>
                <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F label="KYC Status" half>
                <select value={form.kyc_status} onChange={e => set("kyc_status", e.target.value)} className={selectCls}>
                  {KYC_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F label="FATCA Status" half>
                <select value={form.fatca_status} onChange={e => set("fatca_status", e.target.value)} className={selectCls}>
                  {FATCA_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F label="Risk Profile" half>
                <select value={form.risk_profile} onChange={e => set("risk_profile", e.target.value)} className={selectCls}>
                  {RISK_PROFILES.map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <div className="sm:col-span-2 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  KYC documents and compliance records can be uploaded in the Client 360 → KYC & Compliance tab after creating the client.
                </p>
              </div>
            </div>
          )}

          {/* ── BANKING & DEMAT ── */}
          {activeSection === "banking" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Demat Account No." half>
                <input value={form.demat_account} onChange={e => set("demat_account", e.target.value)} className={inputCls} placeholder="1234567890123456" />
              </F>
              <F label="DP ID" half>
                <input value={form.dp_id} onChange={e => set("dp_id", e.target.value)} className={inputCls} placeholder="IN301234" />
              </F>
              <F label="CKYC ID" half>
                <input value={form.ckyc_id} onChange={e => set("ckyc_id", e.target.value)} className={inputCls} placeholder="12-digit CKYC number" />
              </F>
              <F label="Landline" half>
                <input value={form.landline} onChange={e => set("landline", e.target.value)} className={inputCls} placeholder="+91-22-12345678" />
              </F>
            </div>
          )}

          {/* ── CONTACTS ── */}
          {activeSection === "contacts" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add additional contact numbers, emails, and addresses beyond the primary ones.
              </p>
              {form.contacts.map((contact, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="mt-1 text-gray-400">
                    {contact.contact_type === "mobile" ? <Phone size={14} /> : contact.contact_type === "email" ? <Mail size={14} /> : contact.contact_type === "address" ? <MapPin size={14} /> : <Phone size={14} />}
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Type</label>
                      <select value={contact.contact_type} onChange={e => updateContact(i, { contact_type: e.target.value as any })} className={selectCls + " text-xs"}>
                        <option value="mobile">Mobile</option>
                        <option value="landline">Landline</option>
                        <option value="email">Email</option>
                        <option value="address">Address</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Label</label>
                      <select value={contact.label} onChange={e => updateContact(i, { label: e.target.value })} className={selectCls + " text-xs"}>
                        {["Primary","Office","Home","Personal","Other"].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Primary?</label>
                      <select value={contact.is_primary ? "yes" : "no"} onChange={e => updateContact(i, { is_primary: e.target.value === "yes" })} className={selectCls + " text-xs"}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">Value</label>
                      {contact.contact_type === "address" ? (
                        <textarea value={contact.value} onChange={e => updateContact(i, { value: e.target.value })} rows={2} className={inputCls + " text-xs"} placeholder="Full address..." />
                      ) : (
                        <input value={contact.value} onChange={e => updateContact(i, { value: e.target.value })} className={inputCls + " text-xs"} placeholder={contact.contact_type === "email" ? "email@example.com" : "+91..."} />
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeContact(i)} className="mt-1 p-1 text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 flex-wrap">
                {(["mobile","landline","email","address"] as const).map(type => (
                  <button key={type} onClick={() => addContact(type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-colors">
                    <Plus size={12} /> Add {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ASSIGNMENT ── */}
          {activeSection === "settings" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Assigned RM" half>
                <select value={form.rm_id} onChange={e => set("rm_id", e.target.value)} className={selectCls}>
                  <option value="">— None —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </F>
              {isSuperAdmin && (
                <F label="Owner (Super Admin only)" half>
                  <select value={form.owner_id} onChange={e => set("owner_id", e.target.value)} className={selectCls}>
                    <option value="">— Auto-assign —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </F>
              )}
              <div className="sm:col-span-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Client Owner</strong> has full PII access and can view all documents. RM has standard access based on their vertical permissions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          {error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
            >
              {saving ? (
                <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : (
                <><User size={14} /> {isEdit ? "Save Changes" : "Create Client"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
