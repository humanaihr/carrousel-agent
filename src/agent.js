/**
 * Agent Prospection B2B — Groupe Carrousel
 * GitHub Actions · Contacts RÉELS exportés depuis Apollo.io
 * Emails vérifiés · LinkedIn réels
 */

const nodemailer = require('nodemailer');
const https      = require('https');
const fs         = require('fs');

const CONFIG = {
  minScore:     parseInt(process.env.MIN_SCORE || '70'),
  query:        process.env.QUERY || 'leads chauds du jour',
  emailTo:      process.env.EMAIL_TO,
  smtpHost:     process.env.SMTP_HOST,
  smtpUser:     process.env.SMTP_USER,
  smtpPass:     process.env.SMTP_PASS,
  slackWebhook: process.env.SLACK_WEBHOOK,
};

// ── CONTACTS RÉELS — SOURCE: Apollo.io (emails vérifiés) ─
const LEADS = [
  // ── BANQUE / FINANCE ────────────────────────────────────
  {
    id:'real_01',
    company:"La Banque Postale",
    sector:"Banque",
    size:"20000 sal.",
    city:"Lille",
    contact_name:"Bernard Héquet",
    contact_title:"DSI",
    contact_email:"bernard.hequet@labanquepostale.fr",
    contact_linkedin:"https://www.linkedin.com/in/bernard-h%C3%A9quet-a062aa25",
    icp_score:88,
    pain_points:["SI bancaire legacy complexe","intégration multi-entités","dette technique historique"],
    buy_signal:"Grand compte bancaire public — refonte SI en cours, enjeux DORA 2025",
    case_type:"legacy",
    priority:"chaud",
    tags:["Banque","Legacy","Grand compte"]
  },
  {
    id:'real_02',
    company:"CAFPI",
    sector:"Courtage immobilier / Financial Services",
    size:"1600 sal.",
    city:"Paris",
    contact_name:"Sébastien Vallecalle",
    contact_title:"DSI",
    contact_email:"s.vallecalle@cafpi.fr",
    contact_linkedin:"https://www.linkedin.com/in/sebastien-vallecalle-68461021",
    icp_score:82,
    pain_points:["processus courtage non automatisés","CRM inadapté croissance","reporting manuel"],
    buy_signal:"ETI 1600 salariés en forte croissance, stack hétérogène (Power BI, Salesforce, Excel)",
    case_type:"processus",
    priority:"chaud",
    tags:["Banque","ETI","Fintech"]
  },
  {
    id:'real_03',
    company:"UFF – Union Financière de France",
    sector:"Gestion de patrimoine",
    size:"2500 sal.",
    city:"Bois-Colombes",
    contact_name:"Zarine Shaik",
    contact_title:"DSI",
    contact_email:"zarine_shaik@uff.net",
    contact_linkedin:"https://www.linkedin.com/in/zarine-shaik-190a5487",
    icp_score:84,
    pain_points:["outils conseil patrimoine fragmentés","reporting réglementaire MIFID2","onboarding client manuel"],
    buy_signal:"ETI 2500 sal. — filiale Abeille Assurances, enjeux intégration SI post-rapprochement",
    case_type:"processus",
    priority:"chaud",
    tags:["Banque","ETI","Gestion patrimoine"]
  },
  {
    id:'real_04',
    company:"Denjean & Associés",
    sector:"Financial Services / Gestion d'actifs",
    size:"170 sal.",
    city:"Paris",
    contact_name:"Fabien Nantas",
    contact_title:"DSI",
    contact_email:"fabien.nantas@denjeansa.fr",
    contact_linkedin:"https://www.linkedin.com/in/fabien-nantas",
    icp_score:75,
    pain_points:["outils gestion actifs sur mesure inexistants","reporting investisseurs sous Excel"],
    buy_signal:"Société de gestion indépendante — besoin outils propriétaires souverains",
    case_type:"souverainete",
    priority:"tiede",
    tags:["Banque","ETI","Souveraineté"]
  },
  // ── ASSURANCE / MUTUELLE ────────────────────────────────
  {
    id:'real_05',
    company:"Abeille Assurances",
    sector:"Assurance",
    size:"3900 sal.",
    city:"Bois-Colombes",
    contact_name:"Sandrine Racouchot",
    contact_title:"DSI",
    contact_email:"sandrine.racouchot@abeille-assurances.fr",
    contact_linkedin:"https://www.linkedin.com/in/sandrine-racouchot-74aa0172",
    icp_score:89,
    pain_points:["SI assurance legacy","intégration post-fusion AXA","conformité Solvabilité II"],
    buy_signal:"ETI 3900 sal. — ex-AXA France, refonte SI post-renommage, recrutement IT actif",
    case_type:"legacy",
    priority:"chaud",
    tags:["Assurance","Legacy","ETI"]
  },
  {
    id:'real_06',
    company:"PRO BTP Groupe",
    sector:"Assurance / Prévoyance BTP",
    size:"6000 sal.",
    city:"Paris",
    contact_name:"Stéphane Danthon",
    contact_title:"DSI",
    contact_email:"stephane.danthon@probtp.com",
    contact_linkedin:"https://www.linkedin.com/in/stephanedanthon-385471b",
    icp_score:87,
    pain_points:["SI prévoyance complexe","workflows validation sinistres longs","reporting réglementaire"],
    buy_signal:"Groupe 6000 sal. — prévoyance BTP, enjeux digitalisation processus métier complexes",
    case_type:"processus",
    priority:"chaud",
    tags:["Assurance","Grand compte","Legacy"]
  },
  {
    id:'real_07',
    company:"AMPLI Mutuelle",
    sector:"Mutuelle / Assurance",
    size:"55 sal.",
    city:"Paris",
    contact_name:"Nathalie Corroyer",
    contact_title:"DSI",
    contact_email:"n.corroyer@ampli.fr",
    contact_linkedin:"https://www.linkedin.com/in/nathalie-corroyer-28307a129",
    icp_score:72,
    pain_points:["SI mutualiste vieillissant","dépendance éditeur progiciel","budget IT contraint"],
    buy_signal:"Petite mutuelle — candidat idéal refonte souveraine sans licence runtime",
    case_type:"souverainete",
    priority:"tiede",
    tags:["Assurance","ETI","Souveraineté"]
  },
  {
    id:'real_08',
    company:"addactis",
    sector:"Assurance / Actuariat SaaS",
    size:"260 sal.",
    city:"Lyon",
    contact_name:"Franck Vallin",
    contact_title:"DSI",
    contact_email:"franck.vallin@addactis.com",
    contact_linkedin:"https://www.linkedin.com/in/franck-vallin-30304b146",
    icp_score:78,
    pain_points:["plateforme actuariat legacy","besoin modernisation moteur calcul","dette technique R/SAS"],
    buy_signal:"Éditeur logiciel actuariat — besoin refonte plateforme, cas Faveod modernisation éditeur",
    case_type:"legacy",
    priority:"tiede",
    tags:["Assurance","ETI","Legacy"]
  },
  {
    id:'real_09',
    company:"Ascentiel Groupe",
    sector:"Assurance / Courtage",
    size:"160 sal.",
    city:"Lyon",
    contact_name:"Laurent Cathalan",
    contact_title:"DSI",
    contact_email:"laurent.cathalan@ascentiel-groupe.com",
    contact_linkedin:"https://www.linkedin.com/in/laurent-cathalan-5327b9113",
    icp_score:74,
    pain_points:["outils courtage fragmentés","processus souscription manuels"],
    buy_signal:"Groupe courtage en croissance — digitalisation processus métier prioritaire",
    case_type:"processus",
    priority:"tiede",
    tags:["Assurance","ETI"]
  },
  // ── SANTÉ ───────────────────────────────────────────────
  {
    id:'real_10',
    company:"Vivalto Santé",
    sector:"Santé privée",
    size:"21000 sal.",
    city:"Rennes",
    contact_name:"Olivier Boixière",
    contact_title:"DSI",
    contact_email:"oboixiere@vivalto-sante.com",
    contact_linkedin:"https://www.linkedin.com/in/olivier-boixiere-8b307a25",
    icp_score:86,
    pain_points:["SI hospitalier fragmenté multi-sites","dossier patient non unifié","intégrations complexes"],
    buy_signal:"Groupe 21000 sal. — 2ème opérateur privé en France, refonte SI groupe en cours",
    case_type:"urgent",
    priority:"chaud",
    tags:["Santé","Grand compte","Legacy"]
  },
  {
    id:'real_11',
    company:"CHU Grenoble Alpes",
    sector:"Santé publique",
    size:"12000 sal.",
    city:"Grenoble",
    contact_name:"Bruno Lavaire",
    contact_title:"DSI",
    contact_email:"blavaire@chu-grenoble.fr",
    contact_linkedin:"https://www.linkedin.com/in/bruno-lavaire-53322534",
    icp_score:80,
    pain_points:["SI hospitalier public legacy","conformité HDS","souveraineté données santé"],
    buy_signal:"CHU — programme Hôpital Numérique, enjeux souveraineté hébergement données santé",
    case_type:"souverainete",
    priority:"chaud",
    tags:["Santé","Public","Souveraineté"]
  },
  {
    id:'real_12',
    company:"Centre Hospitalier Sud Francilien",
    sector:"Santé publique",
    size:"4800 sal.",
    city:"Corbeil-Essonnes",
    contact_name:"Thierry Pasquelin",
    contact_title:"DSI",
    contact_email:"thierry.pasquelin@chsf.fr",
    contact_linkedin:"https://www.linkedin.com/in/thierry-pasquelin-b1785051",
    icp_score:79,
    pain_points:["SI hospitalier public","conformité RGPD santé","budget IT contraint"],
    buy_signal:"CH public 4800 sal. — enjeux sécurité données critiques patients",
    case_type:"securite",
    priority:"tiede",
    tags:["Santé","Public"]
  },
  {
    id:'real_13',
    company:"Association Hospitalière de Bretagne",
    sector:"Santé / Psychiatrie",
    size:"1500 sal.",
    city:"Loudéac",
    contact_name:"Nicolas Nunziati",
    contact_title:"DSI",
    contact_email:"n.nunziati@ahbretagne.com",
    contact_linkedin:"https://www.linkedin.com/in/nicolas-nunziati-aa621458",
    icp_score:76,
    pain_points:["SI psychiatrique non adapté","dossier patient fragmenté","conformité HDS"],
    buy_signal:"Association santé 1500 sal. — refonte SI psychiatrique, données sensibles",
    case_type:"securite",
    priority:"tiede",
    tags:["Santé","ETI"]
  },
  {
    id:'real_14',
    company:"Hôpital Suisse de Paris",
    sector:"Santé privée",
    size:"210 sal.",
    city:"Paris",
    contact_name:"Jorge Loureiro",
    contact_title:"DSI",
    contact_email:"jloureiro@hopitalsuissedeparis.com",
    contact_linkedin:"https://www.linkedin.com/in/jorge-loureiro-37743b95",
    icp_score:73,
    pain_points:["SI clinique privée vieillissant","facturation complexe","dossier patient numérique"],
    buy_signal:"Clinique privée internationale — besoin SI sur mesure adapté contexte bilingue",
    case_type:"processus",
    priority:"tiede",
    tags:["Santé","ETI"]
  },
  {
    id:'real_15',
    company:"Association ECHO",
    sector:"Santé / Dialyse",
    size:"670 sal.",
    city:"Nantes",
    contact_name:"Fabien Denis",
    contact_title:"DSI",
    contact_email:"fdenis@echo-sante.com",
    contact_linkedin:"https://www.linkedin.com/in/fabien-denis-71b1aaa3",
    icp_score:77,
    pain_points:["SI dialyse multi-sites","dossier patient Medial vieillissant","conformité DMP"],
    buy_signal:"670 sal. — association dialyse, SI médical spécialisé, données critiques patients",
    case_type:"securite",
    priority:"tiede",
    tags:["Santé","ETI"]
  },
  {
    id:'real_16',
    company:"UGECAM Alsace",
    sector:"Santé / Assurance maladie",
    size:"490 sal.",
    city:"Illkirch",
    contact_name:"Laurent Joannard",
    contact_title:"DSI",
    contact_email:"laurent.joannard@ugecam.assurance-maladie.fr",
    contact_linkedin:"https://www.linkedin.com/in/laurent-joannard-15b62612",
    icp_score:75,
    pain_points:["SI UGECAM legacy","conformité assurance maladie","intégration établissements"],
    buy_signal:"Organisme AM 490 sal. — contraintes réglementaires, souveraineté données",
    case_type:"souverainete",
    priority:"tiede",
    tags:["Santé","Public","Souveraineté"]
  },
  {
    id:'real_17',
    company:"Concentrix Payment Services",
    sector:"Financial Services / Paiement",
    size:"410 sal.",
    city:"Chambéry",
    contact_name:"Myriam Boide",
    contact_title:"DSI",
    contact_email:"myriam.boide@concentrix.com",
    contact_linkedin:"https://www.linkedin.com/in/myriamboide",
    icp_score:76,
    pain_points:["SI paiement contraintes PCI-DSS","haute disponibilité requise","sécurité données critiques"],
    buy_signal:"ETI paiement — données financières critiques, conformité PCI-DSS, haute disponibilité",
    case_type:"securite",
    priority:"tiede",
    tags:["Banque","ETI","Sécurité"]
  },
];

const SIGNALS = [
  {company:"Abeille Assurances",type:"annonce",title:"Refonte SI post-renommage AXA→Abeille",detail:"Transformation complète identité et SI suite au rachat par Aéma Groupe.",score:91,source:"Communiqué"},
  {company:"La Banque Postale",type:"recrutement",title:"Recrutements IT massifs — conformité DORA",detail:"LBP publie plusieurs offres architectes SI et experts cybersécurité.",score:88,source:"LinkedIn"},
  {company:"PRO BTP Groupe",type:"appel_offres",title:"AO digitalisation processus prévoyance",detail:"Appel d'offres refonte workflows sinistres et prévoyance BTP.",score:87,source:"BOAMP"},
  {company:"Vivalto Santé",type:"annonce",title:"Plan SI groupe 2025 — unification dossier patient",detail:"2ème groupe hospitalier privé France lance programme unification SI multi-sites.",score:86,source:"Communiqué"},
  {company:"CAFPI",type:"recrutement",title:"Recrute architecte SI et dev Java",detail:"CAFPI publie offres pour moderniser sa plateforme courtage immobilier.",score:82,source:"Indeed"},
  {company:"UFF",type:"annonce",title:"Intégration SI post-rapprochement Abeille",detail:"UFF filiale Abeille — chantier intégration SI en cours suite à restructuration groupe.",score:84,source:"Communiqué"},
  {company:"CHU Grenoble Alpes",type:"appel_offres",title:"AO hébergement souverain données santé HDS",detail:"CHU lance consultation pour migration données patients vers hébergeur HDS certifié.",score:80,source:"BOAMP"},
  {company:"addactis",type:"annonce",title:"Modernisation plateforme actuariat",detail:"Éditeur actuariat cherche à moderniser son moteur de calcul R/SAS vieillissant.",score:78,source:"LinkedIn"},
];

// ── CORE ──────────────────────────────────────────────────
function filterLeads(minScore, query) {
  let pool = LEADS.slice();
  if (minScore) pool = pool.filter(l => l.icp_score >= minScore);
  if (query && query !== 'leads chauds du jour') {
    const kw = query.toLowerCase().split(/\s+/);
    const filtered = pool.filter(l => {
      const hay = (l.company+l.sector+l.city+l.contact_title+(l.pain_points||[]).join(' ')+l.buy_signal).toLowerCase();
      return kw.some(k => hay.includes(k));
    });
    if (filtered.length) pool = filtered;
  }
  return pool.sort((a,b) => b.icp_score - a.icp_score);
}

function buildReport(leads, signals) {
  const now = new Date();
  return {
    generated_at: now.toISOString(),
    date: now.toLocaleDateString('fr-FR'),
    query: CONFIG.query,
    min_score: CONFIG.minScore,
    summary: {
      total_leads: leads.length,
      hot_leads: leads.filter(l=>l.priority==='chaud').length,
      avg_score: leads.length ? Math.round(leads.reduce((s,l)=>s+l.icp_score,0)/leads.length) : 0,
      top_sector: (() => { const b={}; leads.forEach(l=>{b[l.sector]=(b[l.sector]||0)+1;}); return Object.entries(b).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'; })()
    },
    leads,
    signals,
  };
}

async function sendEmail(report) {
  if (!CONFIG.emailTo || !CONFIG.smtpHost) { console.log('ℹ️  Email non configuré — skipping'); return; }
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost, port: 587, secure: false,
    auth: { user: CONFIG.smtpUser, pass: CONFIG.smtpPass }
  });
  const scColor = s => s>=80?'#14532D:#22C55E':s>=60?'#451A03:#F59E0B':'#450A0A:#EF4444';
  const prioColor = p => p==='chaud'?'#EF4444':p==='tiede'?'#F59E0B':'#3B82F6';
  const rows = report.leads.map(l => {
    const [bg,fg] = scColor(l.icp_score).split(':');
    return `<tr style="border-bottom:1px solid #E2E8F0">
      <td style="padding:10px 12px"><div style="font-weight:600;font-size:13px">${l.company}</div><div style="font-size:11px;color:#64748B">${l.sector} · ${l.city} · ${l.size}</div></td>
      <td style="padding:10px 12px"><div style="font-weight:500">${l.contact_name}</div><div style="font-size:11px;color:#64748B">${l.contact_title}</div><div style="font-size:11px;color:#94A3B8">${l.contact_email}</div></td>
      <td style="padding:10px 12px;text-align:center"><span style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px">${l.icp_score}</span></td>
      <td style="padding:10px 12px"><span style="color:${prioColor(l.priority)};font-weight:600;font-size:11px">${l.priority.toUpperCase()}</span></td>
      <td style="padding:10px 12px;font-size:11px;color:#475569">${l.buy_signal}</td>
      <td style="padding:10px 12px"><a href="${l.contact_linkedin}" style="color:#3B82F6;font-size:12px">→ LinkedIn</a></td>
    </tr>`;
  }).join('');
  const sigRows = report.signals.map(s => `<tr style="border-bottom:1px solid #E2E8F0">
    <td style="padding:8px 12px;font-weight:600;font-size:12px">${s.company}</td>
    <td style="padding:8px 12px;font-size:12px">${s.title}</td>
    <td style="padding:8px 12px;font-size:11px;color:#64748B">${s.detail}</td>
    <td style="padding:8px 12px;font-size:11px;color:#94A3B8">${s.source}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="font-family:'Segoe UI',sans-serif;background:#F8FAFC;margin:0;padding:0">
  <div style="max-width:820px;margin:0 auto;padding:24px">
    <div style="background:#0F1117;border-radius:12px;padding:20px 24px;margin-bottom:20px">
      <div style="color:#fff;font-size:16px;font-weight:600">🤖 Agent Prospection B2B — Groupe Carrousel</div>
      <div style="color:#8892A4;font-size:11px;font-family:monospace">Contacts réels · Source Apollo.io · ${report.date}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[{l:'Leads',v:report.summary.total_leads,c:'#3B82F6'},{l:'Chauds',v:report.summary.hot_leads,c:'#22C55E'},{l:'Score moy.',v:report.summary.avg_score,c:'#F59E0B'},{l:'Top secteur',v:report.summary.top_sector,c:'#8B5CF6'}]
        .map(m=>`<div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:#94A3B8;margin-bottom:6px">${m.l}</div><div style="font-size:20px;font-weight:700;color:${m.c}">${m.v}</div></div>`).join('')}
    </div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-weight:600;font-size:13px">🎯 Leads qualifiés — contacts vérifiés Apollo.io</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F8FAFC">
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">CONTACT</th>
          <th style="text-align:center;padding:8px 12px;font-size:10px;color:#94A3B8">ICP</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">PRIO</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">SIGNAL</th>
          <th style="padding:8px 12px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-weight:600;font-size:13px">📡 Signaux d'achat</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F8FAFC">
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">SIGNAL</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">DÉTAIL</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8">SOURCE</th>
        </tr></thead>
        <tbody>${sigRows}</tbody>
      </table>
    </div>
    <div style="text-align:center;color:#94A3B8;font-size:11px;font-family:monospace;padding:16px">
      Groupe Carrousel · Faveod Designer® · Agent Prospection Autonome · GitHub Actions
    </div>
  </div></body></html>`;
  await transporter.sendMail({
    from: `"Agent Carrousel" <${CONFIG.smtpUser}>`,
    to: CONFIG.emailTo,
    subject: `🎯 [Carrousel] ${report.summary.hot_leads} leads chauds — ${report.date}`,
    html
  });
  console.log(`✅ Email envoyé à ${CONFIG.emailTo}`);
}

async function sendSlack(report) {
  if (!CONFIG.slackWebhook) return;
  const top3 = report.leads.slice(0,3);
  const payload = {
    blocks: [
      {type:'header',text:{type:'plain_text',text:`🤖 Agent Carrousel — ${report.date}`}},
      {type:'section',fields:[
        {type:'mrkdwn',text:`*Leads:* ${report.summary.total_leads}`},
        {type:'mrkdwn',text:`*Chauds:* ${report.summary.hot_leads}`},
        {type:'mrkdwn',text:`*Score moy.:* ${report.summary.avg_score}/100`},
        {type:'mrkdwn',text:`*Top:* ${report.summary.top_sector}`},
      ]},
      {type:'divider'},
      ...top3.map(l=>({
        type:'section',
        text:{type:'mrkdwn',text:`*${l.company}* — Score \`${l.icp_score}\` :fire:\n${l.contact_name} · ${l.contact_title}\n📧 ${l.contact_email}\n🎯 ${l.buy_signal}`},
        accessory:{type:'button',text:{type:'plain_text',text:'LinkedIn'},url:l.contact_linkedin}
      })),
      {type:'context',elements:[{type:'mrkdwn',text:'Groupe Carrousel · Faveod Designer® · Contacts vérifiés Apollo.io'}]}
    ]
  };
  await new Promise((res,rej)=>{
    const url=new URL(CONFIG.slackWebhook);
    const body=JSON.stringify(payload);
    const req=https.request({hostname:url.hostname,path:url.pathname+url.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},r=>{r.on('data',()=>{});r.on('end',res);});
    req.on('error',rej);req.write(body);req.end();
  });
  console.log('✅ Slack envoyé');
}

async function main() {
  console.log('\n🚀 Agent Prospection Carrousel — contacts réels Apollo.io');
  console.log(`   Requête: "${CONFIG.query}" | Score min: ${CONFIG.minScore}\n`);
  const filteredLeads = filterLeads(CONFIG.minScore, CONFIG.query);
  const report = buildReport(filteredLeads, SIGNALS);
  console.log(`📊 ${report.summary.total_leads} leads qualifiés | ${report.summary.hot_leads} chauds | Score moy. ${report.summary.avg_score}`);
  console.log('\n🎯 Top leads:');
  filteredLeads.slice(0,5).forEach((l,i) => {
    console.log(`   ${i+1}. [${l.icp_score}] ${l.company} | ${l.contact_name} (${l.contact_title})`);
    console.log(`      📧 ${l.contact_email}`);
    console.log(`      🔗 ${l.contact_linkedin}`);
    console.log(`      → ${l.buy_signal}`);
  });
  const filename = `rapport-${new Date().toISOString().slice(0,10)}-run${process.env.GITHUB_RUN_NUMBER||'local'}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Rapport: ${filename}`);
  await Promise.allSettled([sendEmail(report), sendSlack(report)]);
  console.log('\n✅ Cycle terminé.\n');
}

main().catch(e => { console.error('❌ Erreur:', e.message); process.exit(1); });
