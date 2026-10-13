import React, { useEffect, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import { ArrowRight, ShieldCheck, TrendingUp, Wallet, History, LogOut, LockKeyhole, Menu, X, CircleHelp, AlertTriangle, RefreshCw, Users, ClipboardList } from 'lucide-react';

const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function Brand(){ return <div className="brand-mark"><span className="brand-symbol">F</span><div><strong>FAST <em>INVESTIMENTOS</em></strong><small>CLAREZA • RESPONSABILIDADE • CONTROLE</small></div></div>; }
function Notice({children, type='info'}) { return <div className={`notice ${type}`} role="status">{children}</div>; }

export default function App(){
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [page,setPage] = useState('home');
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState('');
  const [msgType,setMsgType] = useState('info');
  const [form,setForm] = useState({name:'',email:'',password:'',cpf:'',phone:''});
  const [investments,setInvestments] = useState([]);
  const [payments,setPayments] = useState([]);
  const [withdrawals,setWithdrawals] = useState([]);
  const [clients,setClients] = useState([]);
  const [adminTab,setAdminTab] = useState('clients');
  const [mobileMenu,setMobileMenu] = useState(false);

  const notify = (text,type='info') => { setMsg(text); setMsgType(type); };
  useEffect(()=>{
    if(!isConfigured) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!session){setProfile(null);setInvestments([]);setPayments([]);setWithdrawals([]);return;}
    loadProfile();
  },[session]);
  async function loadProfile(){
    const {data,error}=await supabase.from('profiles').select('id,full_name,email,phone,cpf,role,created_at').eq('id',session.user.id).single();
    if(error){notify('Não foi possível carregar seu perfil. Confira as políticas do banco de dados.','error');return;}
    setProfile(data);
    const [i,p,w]=await Promise.all([
      supabase.from('investments').select('id,group_name,principal_amount,status,created_at,maturity_date').order('created_at',{ascending:false}),
      supabase.from('payments').select('id,amount,status,provider_reference,created_at').order('created_at',{ascending:false}),
      supabase.from('withdrawals').select('id,amount,status,created_at,admin_note').order('created_at',{ascending:false})
    ]);
    setInvestments(i.data||[]); setPayments(p.data||[]); setWithdrawals(w.data||[]);
  }
  async function loadAdmin(tab=adminTab){
    setBusy(true); setAdminTab(tab);
    const tableMap={clients:'profiles',payments:'payments',investments:'investments',withdrawals:'withdrawals',audit:'audit_logs'};
    const {data,error}=await supabase.from(tableMap[tab]).select('*').order('created_at',{ascending:false}).limit(200);
    if(error) notify(`Consulta administrativa bloqueada ou indisponível: ${error.message}`,'error');
    else setClients(data||[]);
    setBusy(false);
  }
  async function submitAuth(e){
    e.preventDefault(); if(!supabase)return; setBusy(true);setMsg('');
    try{
      if(page==='signup'){
        if(form.password.length<12) throw new Error('Use uma senha com pelo menos 12 caracteres.');
        const {data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name,phone:form.phone,cpf:form.cpf}}});
        if(error)throw error;
        if(data.session) notify('Conta criada. Confira seu e-mail se a confirmação estiver habilitada.','success');
        else notify('Cadastro recebido. Verifique seu e-mail para confirmar a conta.','success');
      } else {
        const {error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});
        if(error)throw error;
        setPage('dashboard');notify('Login realizado.','success');
      }
    }catch(err){notify(err.message||'Não foi possível concluir.','error');}
    finally{setBusy(false);}
  }
  async function resetPassword(){
    if(!form.email){notify('Informe seu e-mail no campo de e-mail antes de solicitar a recuperação.','error');return;}
    const {error}=await supabase.auth.resetPasswordForEmail(form.email,{redirectTo:window.location.origin});
    notify(error?error.message:'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',error?'error':'success');
  }
  async function logout(){await supabase.auth.signOut();setPage('home');notify('Sessão encerrada.','success');}
  async function requestWithdrawal(){
    const raw=window.prompt('Valor do resgate solicitado (R$):');
    if(raw===null)return;
    const amount=Number(raw.replace(',','.'));
    if(!Number.isFinite(amount)||amount<=0){notify('Informe um valor válido.','error');return;}
    const {error}=await supabase.from('withdrawals').insert({user_id:session.user.id,amount,status:'requested'});
    notify(error?`Não foi possível registrar a solicitação: ${error.message}`:'Solicitação registrada para análise. Isso não significa que o pagamento foi executado.',error?'error':'success');
    if(!error)loadProfile();
  }
  const nav=(p)=>{setPage(p);setMobileMenu(false);setMsg('');};
  if(!isConfigured) return <div className="setup-screen"><Brand/><div className="setup-card"><AlertTriangle size={30}/><h1>Configure o ambiente</h1><p>O projeto está pronto para conectar ao Supabase. Crie seu projeto, execute <code>supabase/schema.sql</code> e preencha o arquivo <code>.env</code> com a URL e a chave pública (anon).</p><p>Consulte o README antes de publicar. Não use credenciais secretas no navegador.</p></div></div>;

  return <div className="app-shell">
    <header className="topbar"><button className="icon-button mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Abrir menu">{mobileMenu?<X/>:<Menu/>}</button><button className="brand-button" onClick={()=>nav('home')}><Brand/></button><nav className={mobileMenu?'nav open':'nav'}>
      <button onClick={()=>nav('home')}>Início</button><button onClick={()=>nav('groups')}>Grupos</button><button onClick={()=>nav('faq')}>Como funciona</button>
      {session?<><button onClick={()=>nav('dashboard')}>Minha conta</button>{profile?.role==='admin'&&<button onClick={()=>{nav('admin');loadAdmin('clients')}}>Administração</button>}<button className="nav-cta" onClick={logout}><LogOut size={16}/> Sair</button></>:<><button onClick={()=>nav('login')}>Entrar</button><button className="nav-cta" onClick={()=>nav('signup')}>Criar conta <ArrowRight size={16}/></button></>}
    </nav></header>
    {msg&&<div className="message-wrap"><Notice type={msgType}>{msg}<button onClick={()=>setMsg('')} aria-label="Fechar mensagem"><X size={16}/></button></Notice></div>}
    <main>
      {page==='home'&&<><section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="pulse"/> PLATAFORMA FINANCEIRA</span><h1>Uma nova experiência para cuidar do seu futuro com <span>mais clareza.</span></h1><p>Conheça uma plataforma pensada para quem valoriza organização, transparência e controle. Consulte informações com clareza e acompanhe seus registros em uma experiência premium.</p><div className="hero-actions"><button className="primary" onClick={()=>nav(session?'dashboard':'signup')}>{session?'Acessar minha conta':'Criar minha conta'} <ArrowRight size={18}/></button><button className="secondary" onClick={()=>nav('groups')}>Conhecer os grupos</button></div><div className="trust-line"><ShieldCheck size={17}/> Privacidade, clareza e responsabilidade em primeiro lugar</div></div><div className="hero-visual"><div className="orb orb-one"/><div className="orb orb-two"/><div className="visual-card"><div className="visual-head"><span>FAST / EXPERIÊNCIA PREMIUM</span><span className="live-dot">●</span></div><div className="visual-icon"><TrendingUp size={25}/></div><h3>Seu futuro merece clareza</h3><p>Uma experiência financeira com informações organizadas, acesso protegido e transparência em cada etapa.</p><div className="visual-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="visual-foot"><span>TRANSPARÊNCIA</span><span>SEGURANÇA</span></div></div><div className="floating-chip"><ShieldCheck size={18}/> Seus dados protegidos</div></div></section><section className="feature-grid"><article className="feature"><div className="feature-icon"><Wallet/></div><h3>Tudo em um só lugar</h3><p>Consulte suas informações e acompanhe solicitações em um painel claro e intuitivo.</p></article><article className="feature"><div className="feature-icon"><History/></div><h3>Informação transparente</h3><p>Veja o histórico e os status das operações registradas, quando disponíveis.</p></article><article className="feature"><div className="feature-icon"><LockKeyhole/></div><h3>Acesso com proteção</h3><p>Sua conta utiliza autenticação e permissões para ajudar a proteger o acesso.</p></article></section><section className="disclaimer"><AlertTriangle size={20}/><p><strong>Importante:</strong> os produtos de investimento e as movimentações financeiras só devem ser ativados após validação jurídica, regulatória, contratual e operacional. Esta instalação não confirma autorização, rentabilidade ou pagamentos.</p></section></>}
      {page==='groups'&&<section className="content-section"><span className="eyebrow">OPÇÕES CADASTRADAS</span><h1>Grupos de investimento</h1><p className="section-lead">Valores de referência solicitados para configuração. A exibição não representa oferta ativa nem autorização para captar recursos.</p><div className="group-grid">{[50,100,200,250,300,400,500,700,800,1000].map(n=><article className="group-card" key={n}><span>FAST • GRUPO</span><h2>GR {n}</h2><strong>{money(n)}</strong><p>Disponibilidade: pendente de validação</p><button className="secondary full" onClick={()=>nav(session?'dashboard':'signup')}>Consultar acesso <ArrowRight size={16}/></button></article>)}</div><Notice type="warn">Não deposite recursos com base nesta página. Os grupos permanecem informativos até que os requisitos legais e as integrações sejam verificados.</Notice></section>}
      {page==='faq'&&<section className="content-section narrow"><span className="eyebrow">TRANSPARÊNCIA</span><h1>Como funciona</h1>{[['Como crio uma conta?','Acesse “Criar conta”, preencha os dados solicitados e confirme seu e-mail, se solicitado.'],['Os grupos já estão aceitando recursos?','Não. Nesta instalação os grupos são apenas referências. A oferta deve permanecer bloqueada até validação jurídica, regulatória e operacional.'],['Como os pagamentos são confirmados?','Em produção, apenas por integração validada com o provedor ou reconciliação formal — nunca por comprovante ou clique do usuário.'],['O administrador pode ver senhas?','Não. Senhas não são exibidas nem armazenadas em texto puro. A recuperação é realizada pelo fluxo seguro de autenticação.'],['Como falar com o suporte?','Configure o telefone oficial do WhatsApp no projeto antes de publicar.']].map(([q,a])=><details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>}
      {(page==='login'||page==='signup')&&<section className="auth-layout"><div className="auth-aside"><span className="eyebrow">BEM-VINDO À FAST</span><h1>{page==='signup'?'Comece com uma conta.':'Acesse sua conta.'}</h1><p>Seus registros em uma experiência clara, organizada e protegida.</p><div className="auth-promise"><ShieldCheck/> Proteção de acesso com autenticação segura</div></div><form className="auth-card" onSubmit={submitAuth}><h2>{page==='signup'?'Criar conta':'Entrar'}</h2><p>{page==='signup'?'Preencha os dados para iniciar seu cadastro.':'Informe suas credenciais para continuar.'}</p>{page==='signup'&&<><label>Nome completo<input required autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Seu nome completo"/></label><div className="form-row"><label>CPF<input required inputMode="numeric" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} placeholder="Somente números" maxLength={14}/></label><label>Telefone<input required autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(00) 00000-0000"/></label></div></>}<label>E-mail<input required type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="voce@exemplo.com"/></label><label>Senha<input required type="password" autoComplete={page==='signup'?'new-password':'current-password'} minLength={page==='signup'?12:1} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={page==='signup'?'Mínimo de 12 caracteres':'Sua senha'}/></label>{page==='signup'&&<p className="small-note">Ao continuar, você confirma que leu os termos e a política de privacidade publicados pela empresa. Configure os documentos oficiais antes de abrir o cadastro ao público.</p>}<button className="primary full" disabled={busy}>{busy?'Aguarde...':page==='signup'?'Criar conta':'Entrar'} <ArrowRight size={17}/></button>{page==='login'&&<button type="button" className="text-button" onClick={resetPassword}>Esqueci minha senha</button>}<div className="auth-switch">{page==='signup'?'Já tem uma conta?':'Ainda não tem conta?'} <button type="button" onClick={()=>{setPage(page==='signup'?'login':'signup');setMsg('')}}>{page==='signup'?'Entrar':'Criar conta'}</button></div></form></section>}
      {page==='dashboard'&&<section className="content-section"><div className="section-heading"><div><span className="eyebrow">ÁREA DO CLIENTE</span><h1>Olá{profile?.full_name?`, ${profile.full_name.split(' ')[0]}`:''}.</h1><p className="section-lead">Acompanhe seus registros e solicitações.</p></div><button className="secondary" onClick={loadProfile}><RefreshCw size={16}/> Atualizar</button></div>{!profile?<Notice>Carregando perfil...</Notice>:<><div className="dashboard-grid"><article className="stat-card"><span>Investimentos registrados</span><strong>{investments.length}</strong><small>Somente registros persistidos</small></article><article className="stat-card"><span>Pagamentos registrados</span><strong>{payments.length}</strong><small>Não representa saldo disponível</small></article><article className="stat-card"><span>Resgates solicitados</span><strong>{withdrawals.length}</strong><small>Solicitações não são pagamentos</small></article></div><div className="panel"><div className="panel-head"><h2>Meus investimentos</h2><span>{investments.length} registros</span></div>{investments.length===0?<p className="empty">Nenhum investimento registrado.</p>:<div className="table-wrap"><table><thead><tr><th>Grupo</th><th>Valor principal</th><th>Status</th><th>Data</th></tr></thead><tbody>{investments.map(x=><tr key={x.id}><td>{x.group_name||'—'}</td><td>{money(x.principal_amount)}</td><td><span className="status">{x.status}</span></td><td>{x.created_at?new Date(x.created_at).toLocaleDateString('pt-BR'):'—'}</td></tr>)}</tbody></table></div>}</div><div className="panel"><div className="panel-head"><h2>Histórico de pagamentos</h2></div>{payments.length===0?<p className="empty">Nenhum pagamento registrado.</p>:<div className="table-wrap"><table><thead><tr><th>Valor</th><th>Status</th><th>Referência</th><th>Data</th></tr></thead><tbody>{payments.map(x=><tr key={x.id}><td>{money(x.amount)}</td><td><span className="status">{x.status}</span></td><td>{x.provider_reference||'—'}</td><td>{new Date(x.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>}</div><div className="panel"><div className="panel-head"><h2>Resgates</h2><button className="secondary" onClick={requestWithdrawal}>Solicitar análise</button></div>{withdrawals.length===0?<p className="empty">Nenhuma solicitação registrada.</p>:withdrawals.map(x=><div className="list-row" key={x.id}><div><strong>{money(x.amount)}</strong><small>{new Date(x.created_at).toLocaleDateString('pt-BR')}</small></div><span className="status">{x.status}</span>{x.admin_note&&<small>{x.admin_note}</small>}</div>)}<Notice type="warn">A solicitação não garante aprovação nem significa que um pagamento foi executado.</Notice></div></>}</section>}
      {page==='admin'&&profile?.role==='admin'&&<section className="content-section"><span className="eyebrow">ACESSO RESTRITO</span><h1>Painel administrativo</h1><p className="section-lead">Dados exibidos conforme as permissões do banco. Ações financeiras críticas precisam de fluxos de backend específicos e auditoria.</p><div className="admin-tabs">{[['clients','Clientes',Users],['payments','Pagamentos',Wallet],['investments','Investimentos',TrendingUp],['withdrawals','Resgates',History],['audit','Auditoria',ClipboardList]].map(([id,label,Icon])=><button className={adminTab===id?'active':''} onClick={()=>loadAdmin(id)} key={id}><Icon size={16}/>{label}</button>)}</div><div className="panel"><div className="panel-head"><h2>{({clients:'Clientes e perfis',payments:'Pagamentos',investments:'Investimentos',withdrawals:'Solicitações de resgate',audit:'Registros de auditoria'})[adminTab]}</h2><button className="secondary" onClick={()=>loadAdmin(adminTab)} disabled={busy}><RefreshCw size={15}/> Atualizar</button></div>{busy?<p className="empty">Carregando...</p>:clients.length===0?<p className="empty">Nenhum registro disponível ou permissão insuficiente.</p>:<div className="table-wrap"><table><thead><tr>{Object.keys(clients[0]).filter(k=>!['raw_document','password','password_hash','secret'].includes(k)).map(k=><th key={k}>{k.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{clients.map((row,idx)=><tr key={row.id||idx}>{Object.entries(row).filter(([k])=>!['raw_document','password','password_hash','secret'].includes(k)).map(([k,v])=><td key={k}>{v===null?'—':typeof v==='object'?JSON.stringify(v):String(v).slice(0,100)}</td>)}</tr>)}</tbody></table></div>}<Notice type="warn">Senhas nunca são exibidas. Dados pessoais devem ser acessados apenas quando necessários e autorizados. Não há botão para editar saldos ou apagar o histórico.</Notice></div></section>}
      {page==='admin'&&profile?.role!=='admin'&&<section className="content-section"><Notice type="error">Acesso administrativo não autorizado.</Notice><button className="secondary" onClick={()=>nav('dashboard')}>Voltar à conta</button></section>}
    </main>
    <footer className="footer"><div className="footer-main"><Brand/><p>Clareza para acompanhar seus registros. Responsabilidade em cada etapa.</p></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FAST INVESTIMENTOS</span><span>Segurança • Transparência • Responsabilidade</span></div><p className="footer-disclaimer">Informações institucionais. Produtos financeiros e movimentações dependem de validação jurídica, regulatória e operacional. Esta interface não constitui promessa de rentabilidade.</p></footer>
  </div>;
}