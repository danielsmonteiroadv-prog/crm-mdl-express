import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

const etapas = ["Lead Novo", "Qualificação", "Reunião Diagnóstico", "Proposta Enviada", "Negociação", "Fechado", "Perdido"];
const planos = {
  "Premium 100": 2412.85,
  "Premium 200": 4584.42,
  "Premium 400": 8710.40,
  "Premium 800": 15678.72,
  "Premium 1600": 28221.69,
  "Premium 3200": 50799.04,
  "Premium 5000": 71436.16,
};

export default function CRM() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("Todas");
  const [formAberto, setFormAberto] = useState(false);
  const [metaMensal, setMetaMensal] = useState(30000);
  const [carregando, setCarregando] = useState(true);
  const [novoLead, setNovoLead] = useState({ empresa: "", responsavel: "", whatsapp: "", tipo: "Manipulação", porte: "Média", origem: "Prospecção ativa", regiao: "", volume: "Premium 200", etapa: "Lead Novo", temperatura: "Morno", dor: "", proxima_acao: "", data_proxima_acao: "", valor_estimado: planos["Premium 200"] });

  useEffect(() => {
    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push("/");
      setUsuario(data.session.user);
      await carregarLeads();
      setCarregando(false);
    }
    iniciar();
  }, [router]);

  async function carregarLeads() {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (!error) setLeads(data || []);
  }

  const leadsFiltrados = useMemo(() => leads.filter((lead) => {
    const texto = `${lead.empresa} ${lead.responsavel || ""} ${lead.regiao || ""} ${lead.dor || ""} ${lead.origem || ""}`.toLowerCase();
    return texto.includes(query.toLowerCase()) && (etapaFiltro === "Todas" || lead.etapa === etapaFiltro);
  }), [leads, query, etapaFiltro]);

  const totalPipeline = leads.filter((lead) => lead.etapa !== "Perdido").reduce((sum, lead) => sum + Number(lead.valor_estimado || 0), 0);
  const oportunidadesAbertas = leads.filter((lead) => !["Fechado", "Perdido"].includes(lead.etapa)).length;
  const fechados = leads.filter((lead) => lead.etapa === "Fechado").length;
  const propostas = leads.filter((lead) => ["Proposta Enviada", "Negociação"].includes(lead.etapa)).length;
  const percentualMeta = metaMensal > 0 ? Math.round((totalPipeline / metaMensal) * 100) : 0;

  async function adicionarLead() {
    if (!novoLead.empresa.trim()) return;
    const { error } = await supabase.from("leads").insert({ ...novoLead, user_id: usuario.id, valor_estimado: Number(novoLead.valor_estimado || 0) });
    if (!error) {
      await carregarLeads();
      setFormAberto(false);
      setNovoLead({ empresa: "", responsavel: "", whatsapp: "", tipo: "Manipulação", porte: "Média", origem: "Prospecção ativa", regiao: "", volume: "Premium 200", etapa: "Lead Novo", temperatura: "Morno", dor: "", proxima_acao: "", data_proxima_acao: "", valor_estimado: planos["Premium 200"] });
    }
  }

  async function atualizarLead(id, campo, valor) {
    const { error } = await supabase.from("leads").update({ [campo]: valor }).eq("id", id);
    if (!error) setLeads((prev) => prev.map((lead) => lead.id === id ? { ...lead, [campo]: valor } : lead));
  }

  async function sair() { await supabase.auth.signOut(); router.push("/"); }
  function alterarPlano(plano) { setNovoLead({ ...novoLead, volume: plano, valor_estimado: planos[plano] || 0 }); }

  if (carregando) return <main className="page"><p>Carregando CRM...</p></main>;

  return (
    <main className="page">
      <section className="container">
        <header className="header">
          <div><p className="brand">MDL EXPRESS</p><h1>CRM Comercial — Last Mile Farmacêutico</h1><p className="muted">Movimento • Disciplina • Lógica aplicados à captação e relacionamento B2B.</p></div>
          <div className="actions"><button onClick={() => setFormAberto(!formAberto)}>+ Novo Lead</button><button className="secondary" onClick={sair}>Sair</button></div>
        </header>
        <section className="metrics">
          <Metric label="Pipeline estimado" value={`R$ ${totalPipeline.toLocaleString("pt-BR")}`} />
          <Metric label="Oportunidades abertas" value={oportunidadesAbertas} />
          <Metric label="Propostas/negociações" value={propostas} />
          <Metric label="Contratos fechados" value={fechados} />
          <div className="card"><p>Meta mensal MDL</p><input type="number" value={metaMensal} onChange={(e) => setMetaMensal(Number(e.target.value || 0))} /><small>Pipeline representa {percentualMeta}% da meta</small></div>
        </section>
        {formAberto && <section className="card formCard"><h2>Cadastrar novo lead</h2><div className="grid">
          <input placeholder="Empresa" value={novoLead.empresa} onChange={(e) => setNovoLead({ ...novoLead, empresa: e.target.value })} />
          <input placeholder="Responsável" value={novoLead.responsavel} onChange={(e) => setNovoLead({ ...novoLead, responsavel: e.target.value })} />
          <input placeholder="WhatsApp" value={novoLead.whatsapp} onChange={(e) => setNovoLead({ ...novoLead, whatsapp: e.target.value })} />
          <input placeholder="Região" value={novoLead.regiao} onChange={(e) => setNovoLead({ ...novoLead, regiao: e.target.value })} />
          <select value={novoLead.volume} onChange={(e) => alterarPlano(e.target.value)}>{Object.keys(planos).map((plano) => <option key={plano}>{plano}</option>)}</select>
          <input placeholder="Valor estimado mensal" type="number" value={novoLead.valor_estimado} onChange={(e) => setNovoLead({ ...novoLead, valor_estimado: e.target.value })} />
          <select value={novoLead.temperatura} onChange={(e) => setNovoLead({ ...novoLead, temperatura: e.target.value })}><option>Quente</option><option>Morno</option><option>Frio</option></select>
          <select value={novoLead.origem} onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })}><option>Site</option><option>WhatsApp</option><option>Instagram</option><option>Indicação</option><option>LinkedIn</option><option>Prospecção ativa</option></select>
          <input placeholder="Dor principal" value={novoLead.dor} onChange={(e) => setNovoLead({ ...novoLead, dor: e.target.value })} />
          <input placeholder="Próxima ação" value={novoLead.proxima_acao} onChange={(e) => setNovoLead({ ...novoLead, proxima_acao: e.target.value })} />
          <input type="date" value={novoLead.data_proxima_acao} onChange={(e) => setNovoLead({ ...novoLead, data_proxima_acao: e.target.value })} />
        </div><button onClick={adicionarLead}>Salvar Lead</button></section>}
        <section className="filters"><input placeholder="Buscar por empresa, responsável, região, dor ou origem..." value={query} onChange={(e) => setQuery(e.target.value)} /><select value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value)}><option>Todas</option>{etapas.map((etapa) => <option key={etapa}>{etapa}</option>)}</select></section>
        <section className="leadGrid">{leadsFiltrados.map((lead) => <LeadCard key={lead.id} lead={lead} atualizarLead={atualizarLead} />)}</section>
      </section>
    </main>
  );
}

function Metric({ label, value }) { return <div className="card"><p>{label}</p><strong>{value}</strong></div>; }
function LeadCard({ lead, atualizarLead }) { return <article className="card leadCard"><div className="leadHeader"><div><h3>{lead.empresa}</h3><p>{lead.responsavel}</p></div><span className={`badge ${lead.temperatura?.toLowerCase()}`}>{lead.temperatura}</span></div><div className="info"><p><b>WhatsApp:</b> {lead.whatsapp}</p><p><b>Região:</b> {lead.regiao}</p><p><b>Tipo/Porte:</b> {lead.tipo} • {lead.porte}</p><p><b>Origem:</b> {lead.origem}</p><p><b>Plano:</b> {lead.volume}</p><p><b>Estimativa:</b> R$ {Number(lead.valor_estimado || 0).toLocaleString("pt-BR")}/mês</p></div><div className="box"><small>Dor principal</small><p>{lead.dor || "Não informada"}</p></div><div className="box yellow"><small>Próxima ação</small><p>{lead.proxima_acao || "Não definida"}</p><em>Data: {lead.data_proxima_acao || "não definida"}</em></div><label>Etapa do funil</label><select value={lead.etapa} onChange={(e) => atualizarLead(lead.id, "etapa", e.target.value)}>{etapas.map((etapa) => <option key={etapa}>{etapa}</option>)}</select></article>; }
