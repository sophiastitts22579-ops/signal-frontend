import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Search, Zap, Users, Megaphone, Mail, Palette, LayoutGrid,
  CheckCircle2, XCircle, TrendingUp, Flame, CloudLightning, ChevronRight,
  Menu, X, Globe, MapPin, Play, Pause, Clock, ArrowUpRight, Sparkles,
  DollarSign, Send, FileText, BellRing, Loader2, Copy, RefreshCw, Trash2, AlertCircle
} from "lucide-react";

/* ================================================================
   SIGNAL v4 — Connected to real backend
   Every button now calls actual API endpoints
================================================================ */
const T = {
  bg: "#070B14",
  glass: "rgba(19, 26, 44, 0.62)",
  glassUp: "rgba(28, 37, 62, 0.72)",
  line: "rgba(126, 145, 190, 0.16)",
  lineUp: "rgba(126, 145, 190, 0.30)",
  text: "#EDF1FA",
  mut: "#96A0B8",
  dim: "#5D6780",
  aqua: "#43E5CE",
  amber: "#FFBE47",
  coral: "#FF7A66",
  green: "#5CE08A",
  blue: "#6BA6FF",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
* { box-sizing: border-box; }
body { margin: 0; background: ${T.bg}; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { background: rgba(126,145,190,.25); border-radius: 4px; }
.cc-glass {
  background: ${T.glass};
  border: 1px solid ${T.line};
  border-radius: 20px;
  backdrop-filter: blur(14px);
  box-shadow: 0 1px 0 rgba(255,255,255,.05) inset, 0 20px 50px -20px rgba(0,0,0,.7);
  position: relative;
}
.cc-glass::before {
  content: ""; position: absolute; inset: 0; border-radius: 20px; padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,0) 38%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
}
.cc-spin { animation: ccspin 1s linear infinite; }
@keyframes ccspin { to { transform: rotate(360deg); } }
textarea.cc-area, input.cc-inp {
  font-family: 'Inter', sans-serif; width: 100%; background: rgba(7,11,20,.7);
  border: 1px solid ${T.lineUp}; border-radius: 12px; padding: 12px 14px;
  font-size: 13.5px; color: ${T.text}; outline: none; resize: vertical;
}
`;

const disp = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const body = { fontFamily: "'Inter', sans-serif" };

/* ================================================================
   API CLIENT
================================================================ */
class APIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL || "http://localhost:5000";
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
    };
    if (data) opts.body = JSON.stringify(data);

    try {
      const res = await fetch(url, opts);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      throw new Error(err.message || "Network error");
    }
  }

  async getClients() { return this.request("GET", "/api/clients"); }
  async getClient(id) { return this.request("GET", `/api/clients/${id}`); }
  async createClient(name, site, zip) { return this.request("POST", "/api/clients/create", { name, site, zip }); }
  async patchClient(id, data) { return this.request("PATCH", `/api/clients/${id}`, data); }

  async draftCampaign(clientId, goal) { return this.request("POST", "/api/campaigns/draft", { clientId, goal }); }
  async decideCampaign(approvalId, decision) { return this.request("POST", "/api/campaigns/decide", { approvalId, decision }); }

  async captureLeadWebhook(clientId, name, contact, source) { return this.request("POST", "/api/leads/capture", { clientId, name, contact, source }); }
  async handoffLead(clientId, leadIdx) { return this.request("POST", "/api/leads/handoff", { clientId, leadIdx }); }

  async writeDrip(clientId, topic) { return this.request("POST", "/api/drips/write", { clientId, topic }); }
  async updateDripEmail(dripId, idx, subject, body) { return this.request("PATCH", `/api/drips/${dripId}/email/${idx}`, { subject, body }); }

  async getApprovals() { return this.request("GET", "/api/approvals"); }
  async scanTriggers(clients) { return this.request("POST", "/api/triggers/scan", { clients }); }

  async generateDeck(clientId, website) { return this.request("POST", "/api/deck/generate", { clientId, website }); }
}

/* ================================================================
   PRIMITIVES
================================================================ */
const Glass = ({ children, style, className = "", ...rest }) => (
  <div className={`cc-glass ${className}`} style={style} {...rest}>{children}</div>
);

const Label = ({ children, color = T.dim }) => (
  <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color, fontWeight: 600 }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, tone = "ghost", style, busy = false, disabled = false }) => {
  const tones = {
    primary: { background: `linear-gradient(135deg, ${T.aqua}, #2BB8A4)`, color: "#052A24", border: "none", boxShadow: `0 6px 22px -6px ${T.aqua}70` },
    amber: { background: `linear-gradient(135deg, ${T.amber}, #E89A1F)`, color: "#2A1D04", border: "none", boxShadow: `0 6px 22px -6px ${T.amber}70` },
    ghost: { background: "rgba(255,255,255,.04)", color: T.mut, border: `1px solid ${T.line}` },
    danger: { background: "rgba(255,122,102,.08)", color: T.coral, border: `1px solid ${T.coral}44` },
  };
  const off = busy || disabled;
  return (
    <button onClick={off ? undefined : onClick} disabled={off}
      style={{ ...body, ...tones[tone], borderRadius: 12, padding: "9px 15px", fontSize: 13, fontWeight: 600, cursor: off ? "default" : "pointer", opacity: off && !busy ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6, transition: "filter .15s", ...style }}
      onMouseEnter={e => !off && (e.currentTarget.style.filter = "brightness(1.12)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "none")}>
      {busy && <Loader2 size={14} className="cc-spin" />}
      {children}
    </button>
  );
};

const Avatar = ({ c, size = 44, fs = 15 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
    background: `linear-gradient(140deg, ${c.hue}, ${c.hue}55)`,
    boxShadow: `0 8px 24px -6px ${c.hue}66, inset 0 1px 0 rgba(255,255,255,.35)`,
    color: "#0A0E18", ...disp, fontWeight: 800, fontSize: fs,
    display: "grid", placeItems: "center",
  }}>{c.initials}</div>
);

const Spark = ({ data, color, w = 90, h = 30 }) => {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const id = `g${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Ring = ({ pct, color, size = 62, stroke = 6, children }) => {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(126,145,190,.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(pct, 100) / 100)} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
};

const Heat = ({ v }) => {
  const c = v >= 80 ? T.coral : v >= 55 ? T.amber : T.blue;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 90 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(126,145,190,.15)", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${c}88, ${c})`, boxShadow: `0 0 8px ${c}77` }} />
      </div>
      <span style={{ ...mono, fontSize: 12, color: c, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
        <Flame size={11} />{v}
      </span>
    </div>
  );
};

const StatusPill = ({ s }) => {
  const map = { live: { c: T.green, t: "Live", I: Play }, paused: { c: T.amber, t: "Paused", I: Pause }, draft: { c: T.dim, t: "Draft", I: Clock } };
  const { c, t, I } = map[s] || map.draft;
  return (
    <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: c, border: `1px solid ${c}44`, background: `${c}14`, borderRadius: 999, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: ".08em", boxShadow: s === "live" ? `0 0 12px ${c}33` : "none" }}>
      <I size={10} /> {t}
    </span>
  );
};

/* ================================================================
   SHEETS
================================================================ */
function Sheet({ title, subtitle, onClose, children, footer, hue = T.aqua }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,7,14,.8)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 70, padding: 14 }} onClick={onClose}>
      <Glass style={{ width: "100%", maxWidth: 620, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${T.line}`, background: `linear-gradient(120deg, ${hue}14, transparent 60%)` }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div>
                <div style={{ ...disp, fontWeight: 800, fontSize: 19, color: T.text }}>{title}</div>
                {subtitle && <div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 3 }}>{subtitle}</div>}
              </div>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={18} /></button>
            </div>
          </div>
          <div style={{ padding: "18px 22px", overflowY: "auto", minHeight: 0 }}>{children}</div>
          {footer && <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.line}`, display: "flex", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
        </div>
      </Glass>
    </div>
  );
}

/* ================================================================
   MAIN APP
================================================================ */
export default function App() {
  const [api, setAPI] = useState(null);
  const [clients, setClients] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [view, setView] = useState("portfolio");
  const [navOpen, setNavOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [note, setNote] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const loaded = useRef(false);

  const toast = msg => { setNote(msg); setTimeout(() => setNote(null), 3000); };

  const showError = msg => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  // Initialize API client & load data
  useEffect(() => {
    const apiClient = new APIClient(process.env.REACT_APP_API_URL || "http://localhost:5000");
    setAPI(apiClient);

    (async () => {
      try {
        const clientsData = await apiClient.getClients();
        setClients(clientsData || []);
        const approvalsData = await apiClient.getApprovals();
        setApprovals(approvalsData || []);
        loaded.current = true;
      } catch (err) {
        showError(`Failed to load data: ${err.message}`);
      }
    })();
  }, []);

  if (!api) return <div style={{ ...body, color: T.text, background: T.bg, padding: 20, minHeight: "100vh" }}>Initializing...</div>;

  const patchClient = (id, patch) =>
    setClients(cs => cs.map(c => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));

  // Create new client
  const createClient = async (name, site, zip, setStatus) => {
    setStatus("Researching the business and local market…");
    try {
      const result = await api.createClient(name, site, zip);
      setClients(cs => [...cs, result.client]);
      setApprovals(ap => [...ap, {
        id: Date.now().toString(), clientId: result.client.id, hue: result.client.hue,
        client: name, item: `Launch "${result.campaign.name}" — ${result.campaign.why || "first campaign"}`,
        amount: result.campaign.budget || 20, per: "/day",
      }]);
      setAdding(false);
      setView(result.client.id);
      toast(`${name} researched — first campaign drafted, waiting for your approval.`);
    } catch (err) {
      showError(err.message);
    }
    setStatus(null);
  };

  // Approve/Deny
  const decide = async (id, ok) => {
    const a = approvals.find(x => x.id === id);
    try {
      await api.decideCampaign(id, ok ? "approve" : "deny");
      setApprovals(ap => ap.filter(x => x.id !== id));
      if (ok && a?.clientId) {
        patchClient(a.clientId, c => ({
          campaigns: c.campaigns.map(cm => (cm.id === a.campaignId ? { ...cm, status: "live", spend: a.amount } : cm)),
        }));
      }
      toast(ok ? `Approved — $${a.amount} ${a.per} is live.` : "Denied — nothing launched, $0 spent.");
    } catch (err) {
      showError(err.message);
    }
  };

  // Draft campaign
  const draftCampaign = async (clientId, goal, key) => {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    setBusyKey(key);
    try {
      const result = await api.draftCampaign(clientId, goal);
      patchClient(clientId, cl => ({
        campaigns: [...(cl.campaigns || []), result.campaign],
      }));
      setApprovals(a => [...a, {
        id: Date.now().toString(), clientId, hue: c.hue, client: c.name,
        item: `Launch "${result.campaign.name}" — ${goal}`, amount: 20, per: "/day",
      }]);
      setSheet(null);
      toast(`"${result.campaign.name}" drafted with ad copy — in your approval queue.`);
    } catch (err) {
      showError(err.message);
    }
    setBusyKey(null);
  };

  // Generate deck
  const makeDeck = async (client) => {
    setBusyKey("deck" + client.id);
    try {
      const result = await api.generateDeck(client.id, client.site);
      setSheet({ kind: "deck", data: result.deck, hue: client.hue });
    } catch (err) {
      showError(err.message);
    }
    setBusyKey(null);
  };

  // Write drip
  const writeDrip = async (clientId, topic) => {
    setBusyKey("newdrip");
    try {
      const result = await api.writeDrip(clientId, topic);
      patchClient(clientId, cl => ({
        drips: [...(cl.drips || []), result.drip],
      }));
      const c = clients.find(x => x.id === clientId);
      setSheet({ kind: "drip", clientId, dripId: result.drip.id, hue: c.hue });
      toast(`"${result.drip.name}" written — review and edit every email.`);
    } catch (err) {
      showError(err.message);
    }
    setBusyKey(null);
  };

  // Hand off lead
  const handOff = async (clientId, leadIdx) => {
    setBusyKey(`ho${leadIdx}`);
    try {
      const result = await api.handoffLead(clientId, leadIdx);
      patchClient(clientId, cl => ({
        leads: cl.leads.map((ld, i) => i === leadIdx ? { ...ld, stage: "Handed off ✓" } : ld),
      }));
      const c = clients.find(x => x.id === clientId);
      setSheet({ kind: "handoff", data: result.handoff, lead: c.leads[leadIdx].name, hue: c.hue });
    } catch (err) {
      showError(err.message);
    }
    setBusyKey(null);
  };

  // Scan triggers
  const scanTriggers = async () => {
    setBusyKey("scan");
    try {
      const result = await api.scanTriggers(clients);
      if (result.triggers.length) {
        setTriggers(result.triggers.map(t => ({
          icon: t.type === "storm" ? "storm" : "trend",
          text: t.text,
          clientId: clients.find(c => c.name === t.clientName)?.id || clients[0]?.id,
          cta: "Draft it",
        })));
        toast("Radar refreshed with live opportunities.");
      } else {
        toast("No strong triggers found right now.");
      }
    } catch (err) {
      showError(err.message);
    }
    setBusyKey(null);
  };

  const copyText = async (t) => {
    try { await navigator.clipboard.writeText(t); toast("Copied to clipboard."); }
    catch { toast("Copy failed — select and copy manually."); }
  };

  /* Derived */
  const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const active = clients.find(c => c.id === view);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 880;

  /* ================================================================
     RENDER SHEET
  ================================================================ */
  const renderSheet = () => {
    if (!sheet) return null;

    if (sheet.kind === "deck") {
      const d = sheet.data;
      const full = `${d.title}\n\n${d.oneLiner}\n\n` + (d.sections || []).map(s => `${s.heading}\n${s.content}`).join("\n\n");
      return (
        <Sheet title={d.title} subtitle={d.oneLiner} hue={sheet.hue} onClose={() => setSheet(null)}
          footer={<><Btn tone="primary" onClick={() => copyText(full)}><Copy size={14} /> Copy full pitch</Btn><Btn onClick={() => setSheet(null)}>Close</Btn></>}>
          <div style={{ display: "grid", gap: 14 }}>
            {(d.sections || []).map((s, i) => (
              <div key={i}>
                <Label color={sheet.hue}>{s.heading}</Label>
                <div style={{ ...body, fontSize: 13.5, color: T.mut, lineHeight: 1.7, marginTop: 6 }}>{s.content}</div>
              </div>
            ))}
          </div>
        </Sheet>
      );
    }

    if (sheet.kind === "handoff") {
      const d = sheet.data;
      return (
        <Sheet title={`Hand-off: ${sheet.lead}`} subtitle="Ready to send to your client" hue={sheet.hue} onClose={() => setSheet(null)}
          footer={<><Btn tone="primary" onClick={() => copyText(`Subject: ${d.subject}\n\n${d.body}`)}><Copy size={14} /> Copy email</Btn><Btn onClick={() => setSheet(null)}>Close</Btn></>}>
          <Label color={sheet.hue}>Subject</Label>
          <div style={{ ...body, fontSize: 14.5, fontWeight: 600, color: T.text, margin: "6px 0 16px" }}>{d.subject}</div>
          <Label color={sheet.hue}>Body</Label>
          <div style={{ ...body, fontSize: 13.5, color: T.mut, lineHeight: 1.75, marginTop: 6, whiteSpace: "pre-wrap" }}>{d.body}</div>
        </Sheet>
      );
    }

    if (sheet.kind === "ask") {
      return <AskSheet sheet={sheet} busy={busyKey === sheet.busyKey} onClose={() => setSheet(null)} />;
    }
    return null;
  };

  function AskSheet({ sheet, busy, onClose }) {
    const [val, setVal] = useState("");
    return (
      <Sheet title={sheet.title} subtitle={sheet.subtitle} hue={sheet.hue} onClose={onClose}
        footer={<><Btn tone="primary" busy={busy} onClick={() => val.trim() && sheet.onSubmit(val.trim())}><Sparkles size={14} /> {sheet.cta}</Btn><Btn onClick={onClose}>Cancel</Btn></>}>
        <input className="cc-inp" autoFocus placeholder={sheet.placeholder} value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && val.trim() && sheet.onSubmit(val.trim())} />
      </Sheet>
    );
  }

  /* ================================================================
     PORTFOLIO VIEW
  ================================================================ */
  const Portfolio = () => {
    const totals = useMemo(() => ({
      leads: clients.reduce((s, c) => s + (c.leads_this_month || 0), 0),
      live: clients.reduce((s, c) => s + ((c.campaigns || []).filter(x => x.status === "live").length || 0), 0),
      mrr: clients.reduce((s, c) => s + (c.retainer || 0), 0),
    }), [clients]);

    const stats = [
      { l: "Leads this month", v: totals.leads, c: T.aqua, spark: [12, 15, 18, 22, 25, 30, Math.max(totals.leads, 1)], I: Users },
      { l: "Live campaigns", v: totals.live, c: T.green, spark: [2, 3, 3, 4, 4, 5, Math.max(totals.live, 1)], I: Megaphone },
      { l: "Monthly retainers", v: `$${(totals.mrr / 1000).toFixed(1)}k`, c: T.amber, spark: [1.5, 1.5, 3.7, 3.7, 5.5, 5.5, Math.max(totals.mrr / 1000, 0.1)], I: TrendingUp },
    ];

    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ padding: "10px 0 4px" }}>
          <Label color={T.aqua}>Mission control · {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</Label>
          <h1 style={{ ...disp, fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, margin: "8px 0 0", lineHeight: 1.06, letterSpacing: "-0.02em" }}>
            <span style={{ color: T.text }}>Every client. Every campaign.</span><br />
            <span style={{ background: `linear-gradient(90deg, ${T.aqua}, ${T.blue} 55%, ${T.amber})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>One cockpit.</span>
          </h1>
        </div>

        {error && (
          <Glass style={{ padding: 16, borderLeft: `3px solid ${T.coral}`, background: "rgba(242,105,91,.08)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={17} color={T.coral} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ ...body, fontSize: 13, color: T.coral }}>{error}</div>
            </div>
          </Glass>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {stats.map((s, i) => (
            <Glass key={i} style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <s.I size={14} color={s.c} />
                  <span style={{ ...body, fontSize: 12, color: T.dim }}>{s.l}</span>
                </div>
                <div style={{ ...mono, fontSize: 30, fontWeight: 600, color: T.text, marginTop: 6, textShadow: `0 0 24px ${s.c}44` }}>{s.v}</div>
              </div>
              <Spark data={s.spark} color={s.c} />
            </Glass>
          ))}
        </div>

        {/* Approval queue */}
        {approvals.length === 0 ? (
          <Glass style={{ padding: 20 }}>
            <div style={{ ...body, color: T.mut, fontSize: 13.5, display: "flex", gap: 9, alignItems: "center" }}>
              <CheckCircle2 size={17} color={T.green} /> Approval queue clear — nothing spends without you.
            </div>
          </Glass>
        ) : (
          <Glass style={{ overflow: "hidden", boxShadow: `0 0 0 1px ${T.amber}30, 0 24px 60px -20px ${T.amber}25` }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 11, background: `linear-gradient(90deg, ${T.amber}12, transparent 60%)` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(140deg, ${T.amber}, #E89A1F)`, display: "grid", placeItems: "center", boxShadow: `0 6px 18px -4px ${T.amber}88` }}>
                <DollarSign size={17} color="#2A1D04" />
              </div>
              <div>
                <div style={{ ...disp, fontWeight: 800, fontSize: 16, color: T.text }}>Spend approval queue</div>
                <div style={{ ...body, fontSize: 11.5, color: T.dim }}>Nothing goes live until you say so</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ ...mono, fontSize: 18, fontWeight: 600, color: T.amber }}>${approvals.reduce((s, a) => s + (a.amount || 0), 0)}</div>
                <div style={{ ...mono, fontSize: 10, color: T.dim }}>{approvals.length} WAITING</div>
              </div>
            </div>
            {approvals.map(a => (
              <div key={a.id} style={{ padding: "15px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: a.hue, boxShadow: `0 0 10px ${a.hue}`, flexShrink: 0 }} />
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ ...body, fontSize: 13.5, color: T.text, fontWeight: 500 }}>{a.item}</div>
                  <div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 2 }}>{a.client}</div>
                </div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 600, color: T.amber, whiteSpace: "nowrap" }}>
                  ${a.amount}<span style={{ fontSize: 10.5, color: T.dim }}> {a.per}</span>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <Btn tone="amber" onClick={() => decide(a.id, true)}><CheckCircle2 size={14} /> Approve</Btn>
                  <Btn tone="danger" onClick={() => decide(a.id, false)}><XCircle size={15} /></Btn>
                </div>
              </div>
            ))}
          </Glass>
        )}

        {/* Trigger radar */}
        <Glass style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${T.coral}1E`, display: "grid", placeItems: "center", border: `1px solid ${T.coral}44` }}>
              <BellRing size={14} color={T.coral} />
            </div>
            <div style={{ ...disp, fontWeight: 800, fontSize: 16, color: T.text }}>Trigger radar</div>
            <Btn busy={busyKey === "scan"} onClick={scanTriggers} style={{ marginLeft: "auto", padding: "7px 12px", fontSize: 12 }}>
              <RefreshCw size={13} /> Scan the web now
            </Btn>
          </div>
          {triggers.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 0", borderTop: i ? `1px solid ${T.line}` : "none", flexWrap: "wrap" }}>
              {t.icon === "storm"
                ? <CloudLightning size={17} color={T.coral} style={{ flexShrink: 0 }} />
                : <Sparkles size={17} color={T.aqua} style={{ flexShrink: 0 }} />}
              <div style={{ ...body, fontSize: 13.5, color: T.mut, flex: "1 1 240px", lineHeight: 1.5 }}>{t.text}</div>
              <Btn busy={busyKey === `trig${i}`} onClick={() => draftCampaign(t.clientId, t.text, `trig${i}`)}>
                Draft it <ArrowUpRight size={13} />
              </Btn>
            </div>
          ))}
        </Glass>

        {/* Client grid */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <div style={{ ...disp, fontWeight: 800, fontSize: 19, color: T.text }}>Client modules</div>
          <Btn tone="primary" onClick={() => setAdding(true)} style={{ marginLeft: "auto" }}><Plus size={14} /> Add new client</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
          {filtered.map(c => {
            const pct = Math.round(((c.leads_this_month || 0) / Math.max(c.leads_goal || 1, 1)) * 100);
            return (
              <Glass key={c.id} style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setView(c.id)}>
                <div style={{ height: 64, background: `linear-gradient(120deg, ${c.hue}33, ${c.hue}08 65%), radial-gradient(90px 50px at 85% 0%, ${c.hue}44, transparent)`, borderBottom: `1px solid ${T.line}`, position: "relative" }}>
                  <div style={{ position: "absolute", left: 18, bottom: -20 }}><Avatar c={c} size={48} fs={16} /></div>
                  <ChevronRight size={17} color={T.dim} style={{ position: "absolute", right: 14, top: 14 }} />
                </div>
                <div style={{ padding: "28px 18px 18px" }}>
                  <div style={{ ...disp, fontWeight: 800, fontSize: 16.5, color: T.text }}>{c.name}</div>
                  <div style={{ ...body, fontSize: 11.5, color: T.dim, marginTop: 2 }}>{c.zip}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                    <Ring pct={pct} color={pct >= 100 ? T.green : c.hue}>
                      <span style={{ ...mono, fontSize: 12.5, fontWeight: 600, color: pct >= 100 ? T.green : T.text }}>{pct}%</span>
                    </Ring>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...body, fontSize: 11.5, color: T.dim }}>Lead goal</div>
                      <div style={{ ...mono, fontSize: 17, fontWeight: 600, color: T.text }}>{c.leads_this_month || 0}<span style={{ color: T.dim, fontSize: 12 }}> / {c.leads_goal}</span></div>
                      <Spark data={c.spark || [0, 0, 0, 0, 0, 0, 0]} color={c.hue} w={100} h={22} />
                    </div>
                  </div>
                </div>
              </Glass>
            );
          })}
        </div>
      </div>
    );
  };

  /* ================================================================
     CLIENT VIEW
  ================================================================ */
  const ClientView = ({ client }) => {
    const [tab, setTab] = useState("Overview");
    const tabs = [
      { n: "Overview", I: LayoutGrid }, { n: "Campaigns", I: Megaphone },
      { n: "Leads", I: Users }, { n: "Drip emails", I: Mail }, { n: "Brand", I: Palette },
    ];
    const pct = Math.round(((client.leads_this_month || 0) / Math.max(client.leads_goal || 1, 1)) * 100);

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "26px 22px", background: `linear-gradient(120deg, ${client.hue}26, transparent 58%), radial-gradient(240px 120px at 92% 0%, ${client.hue}30, transparent)` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <Avatar c={client} size={58} fs={20} />
              <div style={{ minWidth: 0 }}>
                <h1 style={{ ...disp, fontSize: "clamp(22px, 3.4vw, 32px)", fontWeight: 800, color: T.text, margin: 0 }}>{client.name}</h1>
                <div style={{ ...body, fontSize: 12.5, color: T.mut, display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Globe size={11} /> {client.site || "—"}</span>
                  <span style={{ display: "flex", gap: 5, alignItems: "center" }}><MapPin size={11} /> {client.zip || "—"}</span>
                  <span style={{ ...mono, color: T.amber, fontSize: 11.5 }}>${client.retainer}/mo</span>
                </div>
              </div>
              <Btn tone="primary" busy={busyKey === "deck" + client.id} style={{ marginLeft: "auto" }} onClick={() => makeDeck(client)}>
                <FileText size={14} /> Generate pitch deck
              </Btn>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, borderTop: `1px solid ${T.line}`, overflowX: "auto", padding: "0 10px" }}>
            {tabs.map(t => (
              <button key={t.n} onClick={() => setTab(t.n)}
                style={{ ...body, background: "none", border: "none", borderBottom: `2.5px solid ${tab === t.n ? client.hue : "transparent"}`, color: tab === t.n ? T.text : T.dim, padding: "13px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                <t.I size={13} /> {t.n}
              </button>
            ))}
          </div>
        </Glass>

        {tab === "Overview" && (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Glass style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <Ring pct={pct} color={pct >= 100 ? T.green : client.hue} size={66}>
                <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: T.text }}>{pct}%</span>
              </Ring>
              <div>
                <div style={{ ...body, fontSize: 12, color: T.dim }}>Lead goal</div>
                <div style={{ ...mono, fontSize: 22, fontWeight: 600, color: T.aqua }}>{client.leads_this_month || 0}/{client.leads_goal}</div>
              </div>
            </Glass>
            <Glass style={{ padding: 18 }}><div style={{ ...mono, fontSize: 28, fontWeight: 600, color: T.green }}>{(client.campaigns || []).filter(c => c.status === "live").length}</div><div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 4 }}>Live campaigns</div></Glass>
            <Glass style={{ padding: 18 }}><div style={{ ...mono, fontSize: 28, fontWeight: 600, color: T.amber }}>{(client.drips || []).reduce((s, d) => s + d.active, 0)}</div><div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 4 }}>In drip sequences</div></Glass>
            <Glass style={{ padding: 18 }}><div style={{ ...mono, fontSize: 28, fontWeight: 600, color: T.coral }}>{(client.leads || []).filter(l => l.heat >= 80).length}</div><div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 4 }}>Hot leads ready</div></Glass>
            <Glass style={{ padding: 20, gridColumn: "1 / -1" }}>
              <Label color={client.hue}>Target audience</Label>
              <div style={{ ...body, fontSize: 13.5, color: T.mut, marginTop: 8, lineHeight: 1.7 }}>{client.audience || "—"}</div>
            </Glass>
          </div>
        )}

        {tab === "Campaigns" && (
          <div style={{ display: "grid", gap: 12 }}>
            {(client.campaigns || []).map(c => (
              <Glass key={c.id} style={{ padding: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ ...body, fontSize: 14.5, fontWeight: 600, color: T.text }}>{c.name}</span>
                    <StatusPill s={c.status} />
                  </div>
                  <div style={{ ...body, fontSize: 12, color: T.dim, marginTop: 4 }}>{c.platform} · posts {c.posts}</div>
                </div>
                <div style={{ textAlign: "right" }}><div style={{ ...mono, fontSize: 15, fontWeight: 600, color: T.text }}>{c.clicks || "—"}<span style={{ fontSize: 10.5, color: T.dim }}> clicks</span></div><div style={{ ...body, fontSize: 11.5, color: T.aqua }}>{c.conv || "—"}</div></div>
                <div style={{ ...mono, fontSize: 14, color: c.spend ? T.amber : T.dim, fontWeight: 600 }}>{c.spend ? `$${c.spend}/d` : "$0"}</div>
              </Glass>
            ))}
            <Btn style={{ justifySelf: "start" }}
              onClick={() => setSheet({
                kind: "ask", hue: client.hue, busyKey: "newcamp",
                title: "New campaign", subtitle: `I'll draft the full campaign in ${client.name}'s voice, then queue it for your approval.`,
                placeholder: "Goal or offer — e.g. 'fill slow Tuesdays'",
                cta: "Draft campaign", onSubmit: v => draftCampaign(client.id, v, "newcamp"),
              })}>
              <Plus size={14} /> New campaign
            </Btn>
          </div>
        )}

        {tab === "Leads" && (
          <div style={{ display: "grid", gap: 10 }}>
            {(client.leads || []).length === 0 && (
              <Glass style={{ padding: 20 }}>
                <div style={{ ...body, fontSize: 13, color: T.dim }}>No leads yet — they'll flow in once campaigns are live on the ad platforms (coming in Phase 3).</div>
              </Glass>
            )}
            {(client.leads || []).map((l, i) => (
              <Glass key={i} style={{ padding: "15px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,.05)", border: `1px solid ${T.line}`, display: "grid", placeItems: "center", ...disp, fontWeight: 700, fontSize: 13, color: T.mut }}>
                  {l.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: "1 1 150px" }}>
                  <div style={{ ...body, fontSize: 13.5, fontWeight: 600, color: T.text }}>{l.name}</div>
                  <div style={{ ...mono, fontSize: 10.5, color: T.dim }}>{l.contact} · {l.source}</div>
                </div>
                <div style={{ flex: "0 1 150px" }}><Heat v={l.heat} /></div>
                <span style={{ ...body, fontSize: 12, color: l.stage === "Handed off ✓" ? T.green : T.mut, fontWeight: l.stage === "Hand off now" ? 600 : 400 }}>{l.stage}</span>
                {l.heat >= 80 && l.stage !== "Handed off ✓"
                  ? <Btn tone="primary" busy={busyKey === `ho${i}`} onClick={() => handOff(client.id, i)} style={{ padding: "7px 12px", fontSize: 12 }}><Send size={12} /> Hand off</Btn>
                  : <span style={{ width: 92 }} />}
              </Glass>
            ))}
          </div>
        )}

        {tab === "Drip emails" && (
          <div style={{ display: "grid", gap: 12 }}>
            {(client.drips || []).map((d, i) => (
              <Glass key={i} style={{ padding: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${client.hue}1E`, border: `1px solid ${client.hue}44`, display: "grid", placeItems: "center" }}>
                  <Mail size={16} color={client.hue} />
                </div>
                <div style={{ flex: "1 1 180px" }}>
                  <div style={{ ...body, fontSize: 14, fontWeight: 600, color: T.text }}>{d.name}</div>
                  <div style={{ ...body, fontSize: 11.5, color: T.dim, marginTop: 2 }}>{d.emails} emails · {d.active} in sequence</div>
                </div>
                <Ring pct={d.open_rate || 0} color={T.aqua} size={54} stroke={5}>
                  <div style={{ textAlign: "center" }}><div style={{ ...mono, fontSize: 11.5, fontWeight: 600, color: T.aqua }}>{d.open_rate || 0}%</div><div style={{ ...mono, fontSize: 7.5, color: T.dim }}>OPEN</div></div>
                </Ring>
              </Glass>
            ))}
            <Btn style={{ justifySelf: "start" }}
              onClick={() => setSheet({
                kind: "ask", hue: client.hue, busyKey: "newdrip",
                title: "New drip sequence", subtitle: `I'll write every email in ${client.name}'s voice — you can edit every word.`,
                placeholder: "Topic — e.g. 'win back inactive customers'",
                cta: "Write sequence", onSubmit: v => writeDrip(client.id, v),
              })}>
              <Plus size={14} /> New drip sequence
            </Btn>
          </div>
        )}

        {tab === "Brand" && (
          <Glass style={{ padding: 22, display: "grid", gap: 20, maxWidth: 580 }}>
            <div>
              <Label color={client.hue}>Brand voice</Label>
              <input className="cc-inp" style={{ marginTop: 8 }} value={client.voice}
                onChange={e => api.patchClient(client.id, { voice: e.target.value })} />
            </div>
            <div>
              <Label>Accent color</Label>
              <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
                {["#6BA6FF", "#FF9A5C", "#C79BFF", "#43E5CE", "#FF7A66"].map(h => (
                  <button key={h}
                    onClick={() => api.patchClient(client.id, { hue: h })}
                    style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(140deg, ${h}, ${h}88)`, border: h === client.hue ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer", boxShadow: h === client.hue ? `0 0 14px ${h}77` : "none", padding: 0 }} />
                ))}
              </div>
            </div>
            <Btn tone="primary" style={{ justifySelf: "start" }} onClick={() => toast("Brand kit saved.")}>
              Save brand kit
            </Btn>
          </Glass>
        )}
      </div>
    );
  };

  /* ================================================================
     ADD CLIENT MODAL
  ================================================================ */
  const AddClientModal = () => {
    const [name, setName] = useState("");
    const [site, setSite] = useState("");
    const [zip, setZip] = useState("");
    const [status, setStatus] = useState(null);
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(4,7,14,.8)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }} onClick={() => !status && setAdding(false)}>
        <Glass style={{ padding: 26, width: "100%", maxWidth: 430 }}>
          <div onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ ...disp, fontWeight: 800, fontSize: 21, color: T.text }}>Add new client</div>
              {!status && <button onClick={() => setAdding(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={18} /></button>}
            </div>
            <div style={{ ...body, fontSize: 12.5, color: T.mut, marginTop: 6, lineHeight: 1.55 }}>
              Name, website, zip — I'll research the business, draft the first campaign, and queue it for your approval.
            </div>
            {status ? (
              <div style={{ marginTop: 24, display: "grid", placeItems: "center", gap: 12, padding: "18px 0" }}>
                <Loader2 size={28} className="cc-spin" color={T.aqua} />
                <div style={{ ...body, fontSize: 13, color: T.mut, textAlign: "center" }}>{status}</div>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 18 }}><Label>Business name</Label>
                  <input className="cc-inp" style={{ marginTop: 7 }} value={name} onChange={e => setName(e.target.value)} /></div>
                <div style={{ marginTop: 13 }}><Label>Website</Label>
                  <input className="cc-inp" style={{ marginTop: 7 }} value={site} onChange={e => setSite(e.target.value)} /></div>
                <div style={{ marginTop: 13 }}><Label>Zip code</Label>
                  <input className="cc-inp" style={{ marginTop: 7 }} value={zip} onChange={e => setZip(e.target.value)} /></div>
                <Btn tone="primary" style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
                  onClick={() => name.trim() && createClient(name.trim(), site.trim(), zip.trim(), setStatus)}>
                  <Zap size={14} /> Create module & start research
                </Btn>
              </>
            )}
          </div>
        </Glass>
      </div>
    );
  };

  /* ================================================================
     SIDEBAR
  ================================================================ */
  const sidebar = (
    <div style={{ width: 256, background: "rgba(11,16,28,.92)", backdropFilter: "blur(16px)", borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column", height: "100%" }}>
      <button onClick={() => { setView("portfolio"); setNavOpen(false); }}
        style={{ ...disp, background: "none", border: "none", cursor: "pointer", padding: "20px 16px", display: "flex", gap: 10, alignItems: "center", textAlign: "left" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(140deg, ${T.aqua}, #1FA895)`, display: "grid", placeItems: "center", boxShadow: `0 8px 22px -6px ${T.aqua}99` }}>
          <Zap size={17} color="#052A24" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text, lineHeight: 1 }}>SIGNAL</div>
          <div style={{ ...mono, fontSize: 8.5, color: T.dim, letterSpacing: ".2em", marginTop: 4 }}>MARKETING OPS</div>
        </div>
      </button>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(7,11,20,.6)", border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 11px" }}>
          <Search size={13} color={T.dim} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients"
            style={{ ...body, background: "none", border: "none", outline: "none", color: T.text, fontSize: 12.5, width: "100%" }} />
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        <div style={{ padding: "4px 16px 8px" }}><Label>Clients · {clients.length}</Label></div>
        {filtered.map(c => (
          <button key={c.id} onClick={() => { setView(c.id); setNavOpen(false); }}
            style={{ ...body, display: "flex", gap: 10, alignItems: "center", width: "100%", background: view === c.id ? `linear-gradient(90deg, ${c.hue}14, transparent)` : "none", border: "none", borderLeft: `3px solid ${view === c.id ? c.hue : "transparent"}`, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}>
            <Avatar c={c} size={28} fs={11} />
            <span style={{ fontSize: 13, color: view === c.id ? T.text : T.mut, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${T.line}` }}>
        <Btn tone="primary" onClick={() => { setAdding(true); setNavOpen(false); }} style={{ width: "100%", justifyContent: "center" }}>
          <Plus size={14} /> Add new client
        </Btn>
      </div>
    </div>
  );

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div style={{ ...body, background: T.bg, minHeight: "100vh", display: "flex", color: T.text, position: "relative" }}>
      <style>{CSS}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(900px 500px at 80% -10%, rgba(67,229,206,.10), transparent 60%),
          radial-gradient(700px 420px at -10% 30%, rgba(107,166,255,.09), transparent 60%),
          radial-gradient(800px 500px at 60% 110%, rgba(255,190,71,.07), transparent 60%)`,
      }} />

      {!isMobile && <div style={{ position: "sticky", top: 0, height: "100vh", zIndex: 2 }}>{sidebar}</div>}

      {navOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(4,7,14,.7)", backdropFilter: "blur(4px)" }} onClick={() => setNavOpen(false)}>
          <div style={{ height: "100%" }} onClick={e => e.stopPropagation()}>{sidebar}</div>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", borderBottom: `1px solid ${T.line}`, position: "sticky", top: 0, background: "rgba(7,11,20,.75)", backdropFilter: "blur(12px)", zIndex: 30 }}>
          {isMobile && (
            <button onClick={() => setNavOpen(true)} style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 4 }}>
              <Menu size={20} />
            </button>
          )}
          <div style={{ ...mono, fontSize: 10.5, color: T.dim, letterSpacing: ".12em" }}>
            {view === "portfolio" ? "PORTFOLIO" : active?.name.toUpperCase()}
          </div>
          {approvals.length > 0 && (
            <button onClick={() => setView("portfolio")}
              style={{ ...mono, marginLeft: "auto", background: `${T.amber}16`, border: `1px solid ${T.amber}50`, color: T.amber, borderRadius: 999, padding: "6px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center", boxShadow: `0 0 18px ${T.amber}22` }}>
              <DollarSign size={12} /> {approvals.length} to approve
            </button>
          )}
        </div>

        <div style={{ padding: "26px 20px 70px", maxWidth: 1100, margin: "0 auto" }}>
          {view === "portfolio" ? <Portfolio /> : active && <ClientView client={active} />}
        </div>
      </div>

      {adding && <AddClientModal />}
      {renderSheet()}

      {note && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: T.glassUp, backdropFilter: "blur(14px)", border: `1px solid ${T.lineUp}`, borderRadius: 14, padding: "12px 20px", ...body, fontSize: 13, color: T.text, zIndex: 80, boxShadow: "0 16px 40px rgba(0,0,0,.6)" }}>
          {note}
        </div>
      )}
    </div>
  );
}
