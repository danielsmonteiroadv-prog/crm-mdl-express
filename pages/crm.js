import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

const MASTER_EMAIL = "daniel.monteiro@logisticamdl.com.br";

const etapas = [
  "Lead Novo",
  "Qualificação",
  "Reunião Diagnóstico",
  "Proposta Enviada",
  "Negociação",
  "Fechado",
  "Perdido",
];

const zonas = [
  "Grande Tijuca (Tijuca, Vila Isabel...)",
  "Centro (Centro, Lapa...)",
  "Zona Sul 1 (Glória, Flamengo...)",
  "Zona Sul 2 (Copacabana, Ipanema...)",
  "Zona Sul 3 (Leblon, Jardim Botânico...)",
  "Zona Norte 1 (Méier, Cachambi...)",
  "Zona Norte 2 (Madureira, Cascadura...)",
  "Zona Norte 3 (Penha, Bonsucesso...)",
  "Zona Norte 4 (Irajá, Pavuna...)",
  "Barra da Tijuca (Barra, Joá...)",
  "Recreio (Recreio, Vargem Grande...)",
  "Jacarepaguá (Freguesia, Taquara...)",
  "Zona Oeste 1 (Campo Grande, Santíssimo...)",
  "Zona Oeste 2 (Bangu, Realengo...)",
  "Zona Oeste 3 (Santa Cruz, Paciência...)",
  "Zona Oeste 4 (Guaratiba, Pedra de Guaratiba...)",
];

const acoes = [
  "1. Pesquisa web para obter dados do decisor ou dono com CNPJ",
  "2. Entrega de material impresso na loja",
  "3. Insistir em visita após não obter contato do decisor",
  "4. Agendamento de reunião com decisor",
  "5. Formalização da proposta",
  "6. Contato para fechamento",
  "7. Fechamento do contrato",
];

const planos = {
  "Premium 100": 2412.85,
  "Premium 200": 4584.42,
  "Premium 400": 8710.4,
  "Premium 800": 15678.72,
  "Premium 1600": 28221.69,
  "Premium 3200": 50799.04,
  "Premium 5000": 71436.16,
};

const novoLeadPadrao = {
  empresa: "",
  responsavel: "",
  whatsapp: "",
  tipo: "Manipulação",
  porte: "Média",
  origem: "Prospecção ativa",
  regiao: "",
  zona: "",
  bairro: "",
  volume: "Premium 200",
  etapa: "Lead Novo",
  acao_etapa: "1. Pesquisa web para obter dados do decisor ou dono com CNPJ",
  temperatura: "Morno",
  dor: "",
  proxima_acao: "",
  data_proxima_acao: "",
  valor_estimado: planos["Premium 200"],
};

const contatoPadrao = {
  nome: "",
  telefone: "",
  email: "",
  classificacao: "Canal aberto",
};

export default function CRM() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [leads, setLeads] = useState([]);
  const [contatos, setContatos] = useState([]);

  const [query, setQuery] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("Todas");
  const [zonaFiltro, setZonaFiltro] = useState("Todas");
  const [volumeFiltro, setVolumeFiltro] = useState("Todos");
  const [temperaturaFiltro, setTemperaturaFiltro] = useState("Todas");
  const [dataInicioFiltro, setDataInicioFiltro] = useState("");
  const [dataFimFiltro, setDataFimFiltro] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [metaMensal, setMetaMensal] = useState(30000);
  const [carregando, setCarregando] = useState(true);

  const [novoLead, setNovoLead] = useState(novoLeadPadrao);
  const [contatosNovoLead, setContatosNovoLead] = useState([{ ...contatoPadrao }]);

  const isMaster = usuario?.email === MASTER_EMAIL;

  const metaFormatada = metaMensal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  useEffect(() => {
    async function iniciar() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) return router.push("/");

      setUsuario(data.session.user);

      await carregarLeads();
      await carregarContatos();

      setCarregando(false);
    }

    iniciar();
  }, [router]);

  async function carregarLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setLeads(data || []);
  }

  async function carregarContatos() {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error) setContatos(data || []);
  }

  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      const texto = `${lead.empresa} ${lead.responsavel || ""} ${lead.whatsapp || ""} ${lead.regiao || ""} ${lead.zona || ""} ${lead.bairro || ""} ${lead.dor || ""} ${lead.origem || ""}`.toLowerCase();

      const buscaOk = texto.includes(query.toLowerCase());

      const etapaOk =
        etapaFiltro === "Todas" || lead.etapa === etapaFiltro;

      const zonaOk =
        zonaFiltro === "Todas" || lead.zona === zonaFiltro;

      const volumeOk =
        volumeFiltro === "Todos" || lead.volume === volumeFiltro;

      const temperaturaOk =
        temperaturaFiltro === "Todas" ||
        lead.temperatura === temperaturaFiltro;

      const dataLead = lead.created_at ? lead.created_at.slice(0, 10) : "";

      const dataInicioOk =
        !dataInicioFiltro || dataLead >= dataInicioFiltro;

      const dataFimOk =
        !dataFimFiltro || dataLead <= dataFimFiltro;

      return (
        buscaOk &&
        etapaOk &&
        zonaOk &&
        volumeOk &&
        temperaturaOk &&
        dataInicioOk &&
        dataFimOk
      );
    });
  }, [
    leads,
    query,
    etapaFiltro,
    zonaFiltro,
    volumeFiltro,
    temperaturaFiltro,
    dataInicioFiltro,
    dataFimFiltro,
  ]);

  const totalPipeline = leadsFiltrados
    .filter((lead) => lead.etapa !== "Perdido")
    .reduce((sum, lead) => sum + Number(lead.valor_estimado || 0), 0);

  const oportunidadesAbertas = leadsFiltrados.filter(
    (lead) => !["Fechado", "Perdido"].includes(lead.etapa)
  ).length;

  const fechados = leadsFiltrados.filter(
    (lead) => lead.etapa === "Fechado"
  ).length;

  const propostas = leadsFiltrados.filter((lead) =>
    ["Proposta Enviada", "Negociação"].includes(lead.etapa)
  ).length;

  const percentualMeta =
    totalPipeline > 0 ? ((metaMensal / totalPipeline) * 100).toFixed(2) : 0;

  function alterarPlano(plano) {
    setNovoLead({
      ...novoLead,
      volume: plano,
      valor_estimado: planos[plano] || 0,
    });
  }

  function alterarContatoNovoLead(index, campo, valor) {
    setContatosNovoLead((prev) =>
      prev.map((contato, i) =>
        i === index ? { ...contato, [campo]: valor } : contato
      )
    );
  }

  function adicionarLinhaContatoNovoLead() {
    setContatosNovoLead((prev) => [...prev, { ...contatoPadrao }]);
  }

  function removerLinhaContatoNovoLead(index) {
    setContatosNovoLead((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function adicionarLead() {
    if (!novoLead.empresa.trim()) {
      alert("Informe pelo menos o nome da empresa.");
      return;
    }

    const { data, error } = await supabase
  .from("leads")
  .insert({
    ...novoLead,
    user_id: usuario.id,
    data_proxima_acao: novoLead.data_proxima_acao || null,
    valor_estimado: Number(
      String(novoLead.valor_estimado || 0).replace(",", ".")
    ),
  })
  .select()
  .single();

    if (!error && data) {
      const contatosValidos = contatosNovoLead.filter(
        (contato) => contato.nome || contato.telefone || contato.email
      );

      if (contatosValidos.length > 0) {
        await supabase.from("contacts").insert(
          contatosValidos.map((contato) => ({
            lead_id: data.id,
            nome: contato.nome || "Contato",
            telefone: contato.telefone,
            email: contato.email,
            classificacao: contato.classificacao,
          }))
        );
      }

      await carregarLeads();
      await carregarContatos();

      setFormAberto(false);
      setNovoLead(novoLeadPadrao);
      setContatosNovoLead([{ ...contatoPadrao }]);
    } else {
  console.error("Erro ao salvar lead:", error);
  alert(`Erro ao salvar lead: ${error?.message || "erro desconhecido"}`);
}
  }

  async function atualizarLead(id, campo, valor) {
    const { error } = await supabase
      .from("leads")
      .update({ [campo]: valor })
      .eq("id", id);

    if (!error) {
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id ? { ...lead, [campo]: valor } : lead
        )
      );
    }
  }

  async function salvarLeadEditado(leadEditado) {
    if (!isMaster || !leadEditado?.id) return;

    const { error } = await supabase
      .from("leads")
      .update({
        empresa: leadEditado.empresa,
        responsavel: leadEditado.responsavel,
        whatsapp: leadEditado.whatsapp,
        tipo: leadEditado.tipo,
        porte: leadEditado.porte,
        origem: leadEditado.origem,
        regiao: leadEditado.regiao,
        zona: leadEditado.zona,
        bairro: leadEditado.bairro,
        volume: leadEditado.volume,
        etapa: leadEditado.etapa,
        acao_etapa: leadEditado.acao_etapa,
        temperatura: leadEditado.temperatura,
        dor: leadEditado.dor,
        proxima_acao: leadEditado.proxima_acao,
        data_proxima_acao: leadEditado.data_proxima_acao || null,
        valor_estimado: Number(leadEditado.valor_estimado || 0),
      })
      .eq("id", leadEditado.id);

    if (!error) {
      await carregarLeads();
    } else {
      alert("Não foi possível salvar a edição do lead.");
    }
  }

  async function excluirLead(id) {
    if (!isMaster) return;

    const confirmar = window.confirm("Tem certeza que deseja excluir este lead?");
    if (!confirmar) return;

    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (!error) {
      await carregarLeads();
      await carregarContatos();
    } else {
      alert("Não foi possível excluir o lead.");
    }
  }

  async function adicionarContato(leadId) {
    const nome = prompt("Nome do contato:");
    const telefone = prompt("Telefone/WhatsApp:");
    const email = prompt("E-mail:");
    const classificacao = prompt(
      "Classificação: Canal aberto, Colaborador ou Decisor",
      "Canal aberto"
    );

    if (!telefone && !email && !nome) return;

    const { error } = await supabase.from("contacts").insert({
      lead_id: leadId,
      nome: nome || "Contato",
      telefone,
      email,
      classificacao: classificacao || "Canal aberto",
    });

    if (!error) {
      await carregarContatos();
    } else {
      alert("Não foi possível adicionar o contato.");
    }
  }

  async function excluirContato(id) {
    if (!isMaster) return;

    const confirmar = window.confirm("Tem certeza que deseja excluir este contato?");
    if (!confirmar) return;

    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (!error) {
      await carregarContatos();
    } else {
      alert("Não foi possível excluir o contato.");
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (carregando) {
    return (
      <main className="page">
        <p>Carregando CRM...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container">
        <header className="header">
          <div>
            <p className="brand">MDL EXPRESS</p>
            <h1>CRM Comercial — Last Mile Farmacêutico</h1>
            <p className="muted">
              Movimento • Disciplina • Lógica aplicados à captação e relacionamento B2B.
            </p>
            {isMaster && (
              <p className="muted">
                Acesso master: edição e exclusão liberadas.
              </p>
            )}
          </div>

          <div className="actions">
            <button onClick={() => setFormAberto(!formAberto)}>
              + Novo Lead
            </button>
            <button className="secondary" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <section className="metrics">
          <Metric
            label="Pipeline estimado"
            value={`R$ ${totalPipeline.toLocaleString("pt-BR")}`}
          />
          <Metric label="Oportunidades abertas" value={oportunidadesAbertas} />
          <Metric label="Propostas/negociações" value={propostas} />
          <Metric label="Contratos fechados" value={fechados} />

          <div className="card">
            <p>Meta mensal MDL</p>

            <input
              type="number"
              value={metaMensal}
              onChange={(e) => setMetaMensal(Number(e.target.value || 0))}
            />

            <strong>{metaFormatada}</strong>

            <small>
              Meta representa {percentualMeta}% do pipeline disponível
            </small>
          </div>
        </section>

        {formAberto && (
          <section className="card formCard">
            <h2>Cadastrar novo lead</h2>

            <div className="grid">
              <input
                placeholder="Empresa"
                value={novoLead.empresa}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, empresa: e.target.value })
                }
              />

              <input
                placeholder="Responsável principal"
                value={novoLead.responsavel}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, responsavel: e.target.value })
                }
              />

              <input
                placeholder="WhatsApp principal"
                value={novoLead.whatsapp}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, whatsapp: e.target.value })
                }
              />

              <select
                value={novoLead.zona}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, zona: e.target.value })
                }
              >
                <option value="">Selecione a zona comercial</option>
                {zonas.map((zona) => (
                  <option key={zona}>{zona}</option>
                ))}
              </select>

              <input
                placeholder="Bairro"
                value={novoLead.bairro}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, bairro: e.target.value })
                }
              />

              <input
                placeholder="Endereço / região detalhada"
                value={novoLead.regiao}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, regiao: e.target.value })
                }
              />

              <select
                value={novoLead.volume}
                onChange={(e) => alterarPlano(e.target.value)}
              >
                {Object.keys(planos).map((plano) => (
                  <option key={plano}>{plano}</option>
                ))}
              </select>

              <input
                placeholder="Valor estimado mensal"
                type="number"
                value={novoLead.valor_estimado}
                onChange={(e) =>
                  setNovoLead({
                    ...novoLead,
                    valor_estimado: e.target.value,
                  })
                }
              />

              <select
                value={novoLead.temperatura}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, temperatura: e.target.value })
                }
              >
                <option>Quente</option>
                <option>Morno</option>
                <option>Frio</option>
              </select>

              <select
                value={novoLead.origem}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, origem: e.target.value })
                }
              >
                <option>Site</option>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Indicação</option>
                <option>LinkedIn</option>
                <option>Prospecção ativa</option>
                <option>Visita porta a porta</option>
              </select>

              <select
                value={novoLead.acao_etapa}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, acao_etapa: e.target.value })
                }
              >
                {acoes.map((acao) => (
                  <option key={acao}>{acao}</option>
                ))}
              </select>

              <input
                placeholder="Dor principal"
                value={novoLead.dor}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, dor: e.target.value })
                }
              />

              <input
                placeholder="Próxima ação"
                value={novoLead.proxima_acao}
                onChange={(e) =>
                  setNovoLead({
                    ...novoLead,
                    proxima_acao: e.target.value,
                  })
                }
              />

              <input
                type="date"
                value={novoLead.data_proxima_acao}
                onChange={(e) =>
                  setNovoLead({
                    ...novoLead,
                    data_proxima_acao: e.target.value,
                  })
                }
              />
            </div>

            <h3>Contatos do lead</h3>

            {contatosNovoLead.map((contato, index) => (
              <div className="grid" key={index}>
                <input
                  placeholder="Nome do contato"
                  value={contato.nome}
                  onChange={(e) =>
                    alterarContatoNovoLead(index, "nome", e.target.value)
                  }
                />

                <input
                  placeholder="Telefone/WhatsApp"
                  value={contato.telefone}
                  onChange={(e) =>
                    alterarContatoNovoLead(index, "telefone", e.target.value)
                  }
                />

                <input
                  placeholder="E-mail"
                  value={contato.email}
                  onChange={(e) =>
                    alterarContatoNovoLead(index, "email", e.target.value)
                  }
                />

                <select
                  value={contato.classificacao}
                  onChange={(e) =>
                    alterarContatoNovoLead(
                      index,
                      "classificacao",
                      e.target.value
                    )
                  }
                >
                  <option>Canal aberto</option>
                  <option>Colaborador</option>
                  <option>Decisor</option>
                </select>

                <button
                  className="secondary"
                  onClick={() => removerLinhaContatoNovoLead(index)}
                >
                  Remover contato
                </button>
              </div>
            ))}

            <div className="actions">
              <button className="secondary" onClick={adicionarLinhaContatoNovoLead}>
                + Adicionar outro contato
              </button>

              <button onClick={adicionarLead}>Salvar Lead</button>
            </div>
          </section>
        )}

        <section className="filters">
          <input
            placeholder="Buscar por empresa, responsável, zona, bairro, dor ou origem..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            value={etapaFiltro}
            onChange={(e) => setEtapaFiltro(e.target.value)}
          >
            <option>Todas</option>
            {etapas.map((etapa) => (
              <option key={etapa}>{etapa}</option>
            ))}
          </select>

          <select
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
          >
            <option>Todas</option>
            {zonas.map((zona) => (
              <option key={zona}>{zona}</option>
            ))}
          </select>

          <select
            value={volumeFiltro}
            onChange={(e) => setVolumeFiltro(e.target.value)}
          >
            <option>Todos</option>
            {Object.keys(planos).map((plano) => (
              <option key={plano}>{plano}</option>
            ))}
          </select>

          <select
            value={temperaturaFiltro}
            onChange={(e) => setTemperaturaFiltro(e.target.value)}
          >
            <option>Todas</option>
            <option>Quente</option>
            <option>Morno</option>
            <option>Frio</option>
          </select>

          <input
            type="date"
            value={dataInicioFiltro}
            onChange={(e) => setDataInicioFiltro(e.target.value)}
          />

          <input
            type="date"
            value={dataFimFiltro}
            onChange={(e) => setDataFimFiltro(e.target.value)}
          />
        </section>

        <section className="leadGrid">
          {leadsFiltrados.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              contatos={contatos.filter(
                (contato) => contato.lead_id === lead.id
              )}
              atualizarLead={atualizarLead}
              salvarLeadEditado={salvarLeadEditado}
              adicionarContato={adicionarContato}
              excluirContato={excluirContato}
              excluirLead={excluirLead}
              isMaster={isMaster}
            />
          ))}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function LeadCard({
  lead,
  contatos,
  atualizarLead,
  salvarLeadEditado,
  adicionarContato,
  excluirContato,
  excluirLead,
  isMaster,
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState({ ...lead });

  useEffect(() => {
    setDraft({ ...lead });
  }, [lead]);

  function alterarDraft(campo, valor) {
    if (campo === "volume") {
      setDraft({
        ...draft,
        volume: valor,
        valor_estimado: planos[valor] || 0,
      });
      return;
    }

    setDraft({ ...draft, [campo]: valor });
  }

  async function salvar() {
    await salvarLeadEditado(draft);
    setEditando(false);
  }

  if (editando && isMaster) {
    return (
      <article className="card leadCard">
        <h3>Editando lead</h3>

        <div className="grid">
          <input
            value={draft.empresa || ""}
            onChange={(e) => alterarDraft("empresa", e.target.value)}
          />

          <input
            value={draft.responsavel || ""}
            onChange={(e) => alterarDraft("responsavel", e.target.value)}
          />

          <input
            value={draft.whatsapp || ""}
            onChange={(e) => alterarDraft("whatsapp", e.target.value)}
          />

          <select
            value={draft.zona || ""}
            onChange={(e) => alterarDraft("zona", e.target.value)}
          >
            <option value="">Selecione a zona comercial</option>
            {zonas.map((zona) => (
              <option key={zona}>{zona}</option>
            ))}
          </select>

          <input
            value={draft.bairro || ""}
            onChange={(e) => alterarDraft("bairro", e.target.value)}
          />

          <input
            value={draft.regiao || ""}
            onChange={(e) => alterarDraft("regiao", e.target.value)}
          />

          <select
            value={draft.volume || "Premium 200"}
            onChange={(e) => alterarDraft("volume", e.target.value)}
          >
            {Object.keys(planos).map((plano) => (
              <option key={plano}>{plano}</option>
            ))}
          </select>

          <input
            type="number"
            value={draft.valor_estimado || ""}
            onChange={(e) => alterarDraft("valor_estimado", e.target.value)}
          />

          <select
            value={draft.temperatura || "Morno"}
            onChange={(e) => alterarDraft("temperatura", e.target.value)}
          >
            <option>Quente</option>
            <option>Morno</option>
            <option>Frio</option>
          </select>

          <select
            value={draft.origem || "Prospecção ativa"}
            onChange={(e) => alterarDraft("origem", e.target.value)}
          >
            <option>Site</option>
            <option>WhatsApp</option>
            <option>Instagram</option>
            <option>Indicação</option>
            <option>LinkedIn</option>
            <option>Prospecção ativa</option>
            <option>Visita porta a porta</option>
          </select>

          <select
            value={draft.acao_etapa || acoes[0]}
            onChange={(e) => alterarDraft("acao_etapa", e.target.value)}
          >
            {acoes.map((acao) => (
              <option key={acao}>{acao}</option>
            ))}
          </select>

          <input
            value={draft.dor || ""}
            onChange={(e) => alterarDraft("dor", e.target.value)}
          />

          <input
            value={draft.proxima_acao || ""}
            onChange={(e) => alterarDraft("proxima_acao", e.target.value)}
          />

          <input
            type="date"
            value={draft.data_proxima_acao || ""}
            onChange={(e) => alterarDraft("data_proxima_acao", e.target.value)}
          />
        </div>

        <div className="actions">
          <button onClick={salvar}>Salvar edição</button>

          <button className="secondary" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card leadCard">
      <div className="leadHeader">
        <div>
          <h3>{lead.empresa}</h3>
          <p>{lead.responsavel}</p>
        </div>

        <span className={`badge ${lead.temperatura?.toLowerCase()}`}>
          {lead.temperatura}
        </span>
      </div>

      <div className="info">
        <p>
          <b>Criado em:</b>{" "}
          {lead.created_at
            ? new Date(lead.created_at).toLocaleDateString("pt-BR")
            : "Não informado"}
        </p>

        <p>
          <b>WhatsApp:</b> {lead.whatsapp}
        </p>

        <p>
          <b>Zona:</b> {lead.zona || "Não definida"}
        </p>

        <p>
          <b>Bairro:</b> {lead.bairro || "Não definido"}
        </p>

        <p>
          <b>Região/Endereço:</b> {lead.regiao}
        </p>

        <p>
          <b>Tipo/Porte:</b> {lead.tipo} • {lead.porte}
        </p>

        <p>
          <b>Origem:</b> {lead.origem}
        </p>

        <p>
          <b>Plano:</b> {lead.volume}
        </p>

        <p>
          <b>Estimativa:</b> R$ {Number(lead.valor_estimado || 0).toLocaleString("pt-BR")}/mês
        </p>

        <p>
          <b>Ação atual:</b> {lead.acao_etapa || "Não definida"}
        </p>
      </div>

      <div className="box">
        <small>Dor principal</small>
        <p>{lead.dor || "Não informada"}</p>
      </div>

      <div className="box yellow">
        <small>Próxima ação</small>
        <p>{lead.proxima_acao || "Não definida"}</p>
        <em>Data: {lead.data_proxima_acao || "não definida"}</em>
      </div>

      <div className="box">
        <small>Contatos</small>

        {contatos.length === 0 && <p>Nenhum contato cadastrado.</p>}

        {contatos.map((contato) => (
          <p key={contato.id}>
            <b>{contato.classificacao}:</b> {contato.nome || "Sem nome"} —{" "}
            {contato.telefone || "sem telefone"}{" "}
            {contato.email ? `— ${contato.email}` : ""}

            {isMaster && (
              <button
                className="secondary"
                onClick={() => excluirContato(contato.id)}
              >
                Excluir
              </button>
            )}
          </p>
        ))}

        <button onClick={() => adicionarContato(lead.id)}>
          + Adicionar contato
        </button>
      </div>

      <label>Etapa do funil</label>
      <select
        value={lead.etapa}
        onChange={(e) => atualizarLead(lead.id, "etapa", e.target.value)}
      >
        {etapas.map((etapa) => (
          <option key={etapa}>{etapa}</option>
        ))}
      </select>

      <label>Ação comercial</label>
      <select
        value={lead.acao_etapa || acoes[0]}
        onChange={(e) =>
          atualizarLead(lead.id, "acao_etapa", e.target.value)
        }
      >
        {acoes.map((acao) => (
          <option key={acao}>{acao}</option>
        ))}
      </select>

      {isMaster && (
        <div className="actions">
          <button className="secondary" onClick={() => setEditando(true)}>
            Editar lead
          </button>

          <button className="secondary" onClick={() => excluirLead(lead.id)}>
            Excluir lead
          </button>
        </div>
      )}
    </article>
  );
}