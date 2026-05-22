import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

const MASTER_EMAIL = "daniel.monteiro@logisticamdl.com.br";

const etapasKanban = [
  "Atribuído",
  "Ação comercial",
  "Análise",
  "Formalização da proposta",
  "Retorno da proposta",
  "Concluído",
];

const tiposAcao = [
  "Pesquisa Internet",
  "Visita na loja",
  "Entregue Folder/cartão",
  "Agendamento de reunião",
];

export default function CRMKanban() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [leads, setLeads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [acoes, setAcoes] = useState([]);
  const [analises, setAnalises] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const isMaster = usuario?.email === MASTER_EMAIL;

  useEffect(() => {
    async function iniciar() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) return router.push("/");

      setUsuario(data.session.user);

      await carregarTudo(data.session.user);

      setCarregando(false);
    }

    iniciar();
  }, [router]);

  async function carregarTudo(user) {
    await carregarUsuarios();

    const { data: leadsData } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    const leadsPermitidos =
      user.email === MASTER_EMAIL
        ? leadsData || []
        : (leadsData || []).filter((lead) => lead.atribuido_email === user.email);

    setLeads(leadsPermitidos);

    const { data: acoesData } = await supabase
      .from("lead_acoes")
      .select("*")
      .order("created_at", { ascending: false });

    setAcoes(acoesData || []);

    const { data: analisesData } = await supabase
      .from("lead_analises")
      .select("*");

    setAnalises(analisesData || []);
  }

  async function carregarUsuarios() {
    const { data } = await supabase
      .from("crm_usuarios")
      .select("*")
      .order("nome", { ascending: true });

    setUsuarios(data || []);
  }

  async function moverLead(lead, novaEtapa) {
    const { error } = await supabase
      .from("leads")
      .update({ kanban_etapa: novaEtapa })
      .eq("id", lead.id);

    if (!error) {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id ? { ...item, kanban_etapa: novaEtapa } : item
        )
      );
    }
  }

  async function atribuirLead(lead, usuarioComercial) {
    if (!isMaster) return;

    const { error } = await supabase
      .from("leads")
      .update({
        atribuido_para: usuarioComercial.auth_user_id || null,
        atribuido_email: usuarioComercial.email,
        kanban_etapa: lead.kanban_etapa || "Atribuído",
      })
      .eq("id", lead.id);

    if (!error) {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                atribuido_para: usuarioComercial.auth_user_id || null,
                atribuido_email: usuarioComercial.email,
                kanban_etapa: item.kanban_etapa || "Atribuído",
              }
            : item
        )
      );
    }
  }

  async function registrarAcao(lead) {
    const tipo_acao = prompt(
      "Tipo de ação: Pesquisa Internet, Visita na loja, Entregue Folder/cartão ou Agendamento de reunião",
      "Pesquisa Internet"
    );

    if (!tipo_acao) return;

    const comentario = prompt("Comentário da ação comercial:");

    if (!comentario) return;

    const { error } = await supabase.from("lead_acoes").insert({
      lead_id: lead.id,
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      etapa: lead.kanban_etapa || "Ação comercial",
      tipo_acao,
      comentario,
    });

    if (!error) await carregarTudo(usuario);
  }

  async function salvarAnalise(lead) {
    const atual = analises.find((item) => item.lead_id === lead.id);

    const como_funciona_hoje = prompt(
      "1. Como funciona hoje?",
      atual?.como_funciona_hoje || ""
    );

    const entregas_mes = prompt(
      "2. Quantas entregas realiza por mês?",
      atual?.entregas_mes || ""
    );

    const observacoes = prompt(
      "Observações gerais:",
      atual?.observacoes || ""
    );

    if (atual) {
      await supabase
        .from("lead_analises")
        .update({
          como_funciona_hoje,
          entregas_mes,
          observacoes,
          usuario_email: usuario.email,
        })
        .eq("id", atual.id);
    } else {
      await supabase.from("lead_analises").insert({
        lead_id: lead.id,
        como_funciona_hoje,
        entregas_mes,
        observacoes,
        usuario_email: usuario.email,
      });
    }

    await carregarTudo(usuario);
  }

  async function salvarProposta(lead) {
    const modelo = prompt(
      "Descreva o modelo de proposta adequado:",
      lead.modelo_proposta || ""
    );

    if (modelo === null) return;

    await supabase
      .from("leads")
      .update({ modelo_proposta: modelo })
      .eq("id", lead.id);

    await carregarTudo(usuario);
  }

  async function salvarRetorno(lead) {
    const retorno = prompt(
      "Retorno da proposta: Contrato Fechado, Sem retorno ou Contra proposta enviada pelo cliente",
      lead.retorno_proposta || "Sem retorno"
    );

    if (!retorno) return;

    await supabase
      .from("leads")
      .update({ retorno_proposta: retorno })
      .eq("id", lead.id);

    await carregarTudo(usuario);
  }

  async function concluirLead(lead) {
    const status = prompt(
      "Status de conclusão: contrato fechado ou aguardar novo contato",
      lead.status_conclusao || "aguardar novo contato"
    );

    if (!status) return;

    await supabase
      .from("leads")
      .update({
        status_conclusao: status,
        kanban_etapa: "Concluído",
      })
      .eq("id", lead.id);

    await carregarTudo(usuario);
  }

  const leadsPorEtapa = useMemo(() => {
    return etapasKanban.reduce((acc, etapa) => {
      acc[etapa] = leads.filter(
        (lead) => (lead.kanban_etapa || "Atribuído") === etapa
      );
      return acc;
    }, {});
  }, [leads]);

  if (carregando) {
    return (
      <main className="page">
        <p>Carregando Kanban Comercial...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container">
        <header className="header">
          <div>
            <p className="brand">MDL EXPRESS</p>
            <h1>Gestão Comercial — Kanban</h1>
            <p className="muted">
              Acompanhamento operacional da prospecção, atribuição de leads e avanço comercial.
            </p>
          </div>

          <div className="actions">
            <button onClick={() => router.push("/crm")}>
              Voltar ao Pipeline Geral
            </button>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(260px, 1fr))",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "24px",
          }}
        >
          {etapasKanban.map((etapa) => (
            <div key={etapa} className="card" style={{ minHeight: "70vh" }}>
              <h3>{etapa}</h3>
              <p className="muted">{leadsPorEtapa[etapa]?.length || 0} leads</p>

              {(leadsPorEtapa[etapa] || []).map((lead) => (
                <article key={lead.id} className="box" style={{ marginBottom: "12px" }}>
                  <h4>{lead.empresa}</h4>
                  <p><b>Plano:</b> {lead.volume}</p>
                  <p><b>Valor:</b> R$ {Number(lead.valor_estimado || 0).toLocaleString("pt-BR")}</p>
                  <p><b>Zona:</b> {lead.zona || "Não definida"}</p>
                  <p><b>Responsável:</b> {lead.atribuido_email || "Não atribuído"}</p>

                  {isMaster && (
                    <select
                      value={lead.atribuido_email || ""}
                      onChange={(e) => {
                        const selecionado = usuarios.find(
                          (u) => u.email === e.target.value
                        );
                        if (selecionado) atribuirLead(lead, selecionado);
                      }}
                    >
                      <option value="">Atribuir usuário</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.nome || u.email}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={lead.kanban_etapa || "Atribuído"}
                    onChange={(e) => moverLead(lead, e.target.value)}
                  >
                    {etapasKanban.map((etapaOpcao) => (
                      <option key={etapaOpcao}>{etapaOpcao}</option>
                    ))}
                  </select>

                  <div className="actions" style={{ marginTop: "10px" }}>
                    <button className="secondary" onClick={() => registrarAcao(lead)}>
                      Registrar ação
                    </button>

                    <button className="secondary" onClick={() => salvarAnalise(lead)}>
                      Análise
                    </button>

                    <button className="secondary" onClick={() => salvarProposta(lead)}>
                      Proposta
                    </button>

                    <button className="secondary" onClick={() => salvarRetorno(lead)}>
                      Retorno
                    </button>

                    <button className="secondary" onClick={() => concluirLead(lead)}>
                      Concluir
                    </button>
                  </div>

                  <Historico lead={lead} acoes={acoes} analises={analises} />
                </article>
              ))}
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

function Historico({ lead, acoes, analises }) {
  const acoesLead = acoes.filter((acao) => acao.lead_id === lead.id);
  const analise = analises.find((item) => item.lead_id === lead.id);

  return (
    <div style={{ marginTop: "12px" }}>
      {analise && (
        <div className="box">
          <small>
            Análise registrada em:{" "}
            {analise.created_at
              ? new Date(analise.created_at).toLocaleString("pt-BR")
              : "data não informada"}
          </small>

          <p><b>Hoje:</b> {analise.como_funciona_hoje}</p>
          <p><b>Entregas/mês:</b> {analise.entregas_mes}</p>
          <p><b>Obs.:</b> {analise.observacoes}</p>
        </div>
      )}

      {lead.modelo_proposta && (
        <p><b>Proposta:</b> {lead.modelo_proposta}</p>
      )}

      {lead.retorno_proposta && (
        <p><b>Retorno:</b> {lead.retorno_proposta}</p>
      )}

      {lead.status_conclusao && (
        <p><b>Conclusão:</b> {lead.status_conclusao}</p>
      )}

      {acoesLead.length > 0 && (
        <div>
          <small>Histórico de ações</small>

          {acoesLead.slice(0, 5).map((acao) => (
            <p key={acao.id}>
              <b>{acao.tipo_acao}:</b> {acao.comentario}
              <br />
              <small>
                Registrado em:{" "}
                {acao.created_at
                  ? new Date(acao.created_at).toLocaleString("pt-BR")
                  : "data não informada"}
                {acao.usuario_email ? ` por ${acao.usuario_email}` : ""}
              </small>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}