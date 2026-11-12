"use client";

import {useState,type FormEvent} from "react";
import {ArrowRight,Award,BookOpen,Eye,EyeOff,GraduationCap,Hourglass,LockKeyhole,Mail,Radio,ShieldAlert,UserRound,X} from "lucide-react";
import {api,type Actor} from "@/lib/api";
import {auth} from "@/lib/auth";
import "./login.css";

function Laurel(){return <svg viewBox="0 0 46 120" aria-hidden="true"><path d="M37 114C8 88 6 43 35 6" fill="none" stroke="currentColor" strokeWidth="1.8"/>{[[30,17,-25],[23,31,-32],[17,46,-43],[14,62,-55],[16,79,-65],[22,95,-73]].map(([x,y,angle],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}><ellipse cx="-6" cy="-1" rx="4" ry="10" fill="currentColor"/><ellipse cx="6" cy="8" rx="4" ry="10" fill="currentColor"/></g>)}</svg>;}

export function LoginScreen({onAuthenticated,onClose}:{onAuthenticated?:(user:Actor)=>void;onClose?:()=>void}) {
  const [mode,setMode]=useState<"login"|"register"|"reset">("login");
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");
  const [show,setShow]=useState(false);const [remember,setRemember]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  function changeMode(next:typeof mode){setMode(next);setError("");setMessage("");setPassword("");}
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      if(mode==="login"){
        const user=await api<Actor>("/api/v1/auth/login",undefined,{method:"POST",body:JSON.stringify({email,password,remember})});
        setPassword("");if(onAuthenticated)onAuthenticated(user);else window.location.assign("/");
      }else{
        const response=await api<{message:string}>(`/api/v1/auth/${mode==="register"?"register":"request-reset"}`,undefined,{method:"POST",body:JSON.stringify(mode==="register"?{email,password,name}:{email})});
        setPassword("");setMessage(response.message);
      }
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="kairos-login"><a className="skip-link" href="#login-form">Ir para o formulário</a>
    {onClose&&<button className="login-back" onClick={onClose} aria-label="Voltar ao instituto"><X size={20}/></button>}
    <section className="login-identity" aria-label="Instituto Teológico Kairós"><span className="login-crest"><Hourglass/><BookOpen/><span className="laurel-branch left"><Laurel/></span><span className="laurel-branch right"><Laurel/></span></span><p>INSTITUTO TEOLÓGICO</p><h1>KAIRÓS</h1><div className="login-divider"><span/>◆<span/></div><h2>Formação Bíblica, Teológica<br/>e Ministerial</h2><div className="login-pillars"><div><GraduationCap/><span>Cursos<br/>estruturados</span></div><div><Radio/><span>Aulas ao vivo<br/>e interativas</span></div><div><BookOpen/><span>Biblioteca<br/>digital</span></div><div><Award/><span>Certificados<br/>e progresso</span></div></div></section>
    <section className="login-card" aria-labelledby="login-heading"><span className="login-ribbon">✝</span><h2 id="login-heading">{mode==="login"?"Acesse sua Conta":mode==="register"?"Comece sua Jornada":"Recupere seu Acesso"}</h2><p className="login-subtitle">{mode==="login"?"Entre e continue sua jornada de estudo no Instituto Teológico Kairós.":mode==="register"?"Solicite sua conta. O acesso será liberado após aprovação da administração.":"Solicite à administração a redefinição da sua senha."}</p>
      <form id="login-form" onSubmit={submit} className="login-form">
        {mode==="register"&&<label className="login-field"><UserRound/><input autoComplete="name" aria-label="Seu nome completo" placeholder="Seu nome completo" required minLength={3} maxLength={150} value={name} onChange={e=>setName(e.target.value)}/></label>}
        <label className="login-field"><Mail/><input autoComplete="email" type="email" aria-label="E-mail" placeholder="Seu e-mail" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
        {mode!=="reset"&&<label className="login-field"><LockKeyhole/><input autoComplete={mode==="login"?"current-password":"new-password"} type={show?"text":"password"} aria-label="Senha" placeholder={mode==="register"?"Crie uma senha (mínimo 12 caracteres)":"Sua senha"} required minLength={mode==="register"?12:1} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?"Ocultar senha":"Mostrar senha"} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></label>}
        {mode==="login"&&<div className="login-options"><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Lembrar-me</label><button type="button" onClick={()=>changeMode("reset")}>Esqueceu sua senha?</button></div>}
        {error&&<p className="login-error" role="alert">{error}</p>}{message&&<p className="login-success" role="status">{message}</p>}
        <button className="login-submit" disabled={busy} type="submit">{busy?"Aguarde…":mode==="login"?"Entrar":mode==="register"?"Solicitar cadastro":"Solicitar redefinição"}<ArrowRight size={22}/></button>
      </form>
      {mode==="login"?<><div className="login-or"><span/>ou continue com<span/></div><button className="login-social" disabled={!auth||busy} title={!auth?"Login Google ainda não configurado":undefined} onClick={async()=>{const {error}=await auth!.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)setError("Não foi possível iniciar o login Google.");}}><strong className="google-g">G</strong>Continuar com Google</button><button className="login-social" disabled title="Acesso por YouTube em preparação"><span className="youtube-icon">▶</span>Continuar com YouTube</button><div className="login-register"><p>Ainda não possui uma conta?</p><button onClick={()=>changeMode("register")}>Cadastre-se gratuitamente <ArrowRight size={19}/></button></div></>:<button className="login-return" onClick={()=>changeMode("login")}>Voltar para o login <ArrowRight size={17}/></button>}
    </section><span className="login-footer">Instituto Teológico Kairós · Formação com propósito</span>
  </div>;
}

export function MandatoryCredentials({user,onUpdated,onLogout}:{user:Actor;onUpdated:(u:Actor)=>void;onLogout:()=>void}){
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setError("");if(password!==confirm){setError("As senhas não coincidem.");return;}setBusy(true);try{onUpdated(await api<Actor>("/api/v1/auth/onboarding",undefined,{method:"POST",body:JSON.stringify({email,password})}));setPassword("");setConfirm("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const pending=Boolean(user.pending_email)||!user.must_change_credentials;
  return <div className="mandatory-screen"><section className="mandatory-card"><span className="mandatory-icon"><ShieldAlert size={42}/></span><span className="mandatory-label">ACESSO RESTRITO · AÇÃO OBRIGATÓRIA</span><h1>{pending?"Aguardando aprovação":"Coloque seu e-mail real e uma senha real"}</h1><p>{pending?"Sua solicitação está sob análise do administrador. Após a aprovação, entre novamente com o e-mail e a senha atualizados.":"Sua conta usa credenciais provisórias. Antes de acessar aulas ou enviar conteúdos, informe um e-mail que você utiliza e crie uma nova senha segura."}</p>{user.pending_email&&<div className="mandatory-pending">E-mail informado: <strong>{user.pending_email}</strong><br/>A liberação depende da aprovação do administrador.</div>}{!pending&&<form onSubmit={submit} className="login-form"><label>E-mail real<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Nova senha · mínimo 12 caracteres<input autoComplete="new-password" type="password" required minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirme sua nova senha<input autoComplete="new-password" type="password" required minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="login-error" role="alert">{error}</p>}<button className="login-submit" disabled={busy}>{busy?"Enviando…":"Enviar para aprovação"}<ArrowRight/></button></form>}<button className="login-return" onClick={onLogout}>Sair e voltar ao login</button></section></div>;
}
