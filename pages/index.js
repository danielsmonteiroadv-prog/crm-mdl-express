import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/crm");
    });
  }, [router]);

  async function entrar(e) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) return setErro(error.message);
    router.push("/crm");
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <p className="brand">MDL EXPRESS</p>
        <h1>CRM Comercial</h1>
        <p className="muted">Movimento • Disciplina • Lógica</p>
        <form onSubmit={entrar} className="form">
          <input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          {erro && <p className="error">{erro}</p>}
          <button disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
