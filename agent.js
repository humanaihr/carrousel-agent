/**
 * Agent Prospection B2B — Groupe Carrousel
 * GitHub Actions · Exécution autonome cron
 *
 * Secrets GitHub à configurer (Settings → Secrets → Actions) :
 *   EMAIL_TO      → ton@email.com
 *   SMTP_HOST     → smtp.gmail.com
 *   SMTP_USER     → ton@gmail.com
 *   SMTP_PASS     → app_password (https://myaccount.google.com/apppasswords)
 *   SLACK_WEBHOOK → https://hooks.slack.com/services/XXX (optionnel)
 */

const nodemailer = require('nodemailer');
const https      = require('https');
const fs         = require('fs');

// ── CONFIG ────────────────────────────────────────────
const CONFIG = {
  minScore:     parseInt(process.env.MIN_SCORE || '75'),
  query:        process.env.QUERY || 'leads chauds du jour',
  emailTo:      process.env.EMAIL_TO,
  smtpHost:     process.env.SMTP_HOST,
  smtpUser:     process.env.SMTP_USER,
  smtpPass:     process.env.SMTP_PASS,
  slackWebhook: process.env.SLACK_WEBHOOK,
};

// ── BASE DE LEADS ─────────────────────────────────────
const LEADS = [
  {id:'l01',company:"Caisse Régionale Crédit Agricole IDF",sector:"Banque",size:"1200 sal., ETI",city:"Paris",contact_name:"Laurent Ferreira",contact_title:"DSI",contact_email:"l.ferreira@ca-idf.fr",contact_linkedin:"https://linkedin.com/in/laurent-ferreira-dsi",icp_score:91,pain_points:["SI legacy mainframe","coûts maintenance élevés"],buy_signal:"Offre DSI transformation digitale publiée",case_type:"legacy",priority:"chaud",tags:["Banque","Legacy"]},
  {id:'l02',company:"Banque Palatine",sector:"Banque privée",size:"780 sal., ETI",city:"Paris",contact_name:"Nathalie Rousseau",contact_title:"Directrice SI",contact_email:"n.rousseau@palatine.fr",contact_linkedin:"https://linkedin.com/in/nathalie-rousseau-palatine",icp_score:88,pain_points:["processus patrimoine non digitalisés","ERP inadapté"],buy_signal:"Recrutement Responsable Architecture SI",case_type:"processus",priority:"chaud",tags:["Banque"]},
  {id:'l03',company:"SFIL – Société de Financement Local",sector:"Banque publique",size:"320 sal., ETI",city:"Paris",contact_name:"Marie-Christine Aubert",contact_title:"Directrice Transformation",contact_email:"mc.aubert@sfil.fr",contact_linkedin:"https://linkedin.com/in/mc-aubert-sfil",icp_score:83,pain_points:["conformité DORA","reporting réglementaire manuel"],buy_signal:"AO modernisation SI — BOAMP",case_type:"souverainete",priority:"chaud",tags:["Banque","Public"]},
  {id:'l04',company:"MGEN Groupe VYV",sector:"Mutuelle/Assurance",size:"1800 sal., ETI",city:"Paris",contact_name:"Sophie Girard",contact_title:"DSI",contact_email:"s.girard@mgen.fr",contact_linkedin:"https://linkedin.com/in/sophie-girard-mgen",icp_score:89,pain_points:["SI vieillissant","automatisation sinistres absente"],buy_signal:"Plan transformation SI 2024-2026 annoncé",case_type:"legacy",priority:"chaud",tags:["Assurance","Legacy"]},
  {id:'l05',company:"Macif",sector:"Assurance mutualiste",size:"1600 sal., ETI",city:"Niort",contact_name:"Pierre Lefèvre",contact_title:"Directeur Transformation Digitale",contact_email:"p.lefevre@macif.fr",contact_linkedin:"https://linkedin.com/in/pierre-lefevre-macif",icp_score:86,pain_points:["processus sinistres 20 étapes manuelles","dépendance éditeur"],buy_signal:"AO refonte portail sociétaires",case_type:"processus",priority:"chaud",tags:["Assurance"]},
  {id:'l06',company:"CNP Assurances",sector:"Assurance vie",size:"1400 sal., ETI",city:"Paris",contact_name:"Claire Morin",contact_title:"Responsable Architecture SI",contact_email:"c.morin@cnp.fr",contact_linkedin:"https://linkedin.com/in/claire-morin-cnp",icp_score:90,pain_points:["valeurs sensibles gérées manuellement","traçabilité insuffisante"],buy_signal:"Recrutement chef projet digitalisation processus",case_type:"securite",priority:"chaud",tags:["Assurance"]},
  {id:'l07',company:"Orano",sector:"Industrie nucléaire",size:"850 sal., ETI",city:"Paris",contact_name:"Véronique Pelletier",contact_title:"Resp. Applications Métier",contact_email:"v.pelletier@orano.group",contact_linkedin:"https://linkedin.com/in/veronique-pelletier-orano",icp_score:84,pain_points:["données critiques nucléaires","souveraineté infrastructure"],buy_signal:"AO SI souverain hébergement France",case_type:"souverainete",priority:"chaud",tags:["Industrie","Souveraineté"]},
  {id:'l08',company:"Systra",sector:"Ingénierie transport",size:"680 sal., ETI",city:"Paris",contact_name:"Marc Tessier",contact_title:"CTO",contact_email:"m.tessier@systra.com",contact_linkedin:"https://linkedin.com/in/marc-tessier-systra",icp_score:82,pain_points:["outils PLM obsolètes","dépendance offshore"],buy_signal:"AO modernisation outils ingénierie",case_type:"legacy",priority:"chaud",tags:["Industrie","Legacy"]},
  {id:'l09',company:"Caisse des Dépôts — DSI",sector:"Finances publiques",size:"600 sal., ETI",city:"Paris",contact_name:"Sandrine Lacombe",contact_title:"Directrice Études SI",contact_email:"s.lacombe@caissedesdepots.fr",contact_linkedin:"https://linkedin.com/in/sandrine-lacombe-cdc",icp_score:87,pain_points:["legacy Cobol finances publiques","souveraineté réglementaire"],buy_signal:"AO refonte SI épargne réglementée",case_type:"souverainete",priority:"chaud",tags:["Public","Banque"]},
  {id:'l10',company:"Elsan",sector:"Santé privée",size:"950 sal., ETI",city:"Paris",contact_name:"Béatrice Auger",contact_title:"DSI",contact_email:"b.auger@elsan.care",contact_linkedin:"https://linkedin.com/in/beatrice-auger-elsan",icp_score:81,pain_points:["dossier patient non unifié","intégrations multisites"],buy_signal:"Fusion 3 cliniques, refonte SI groupe",case_type:"urgent",priority:"chaud",tags:["Santé","Legacy"]},
  {id:'l11',company:"Edmond de Rothschild AM",sector:"Gestion de patrimoine",size:"340 sal., ETI",city:"Paris",contact_name:"Philippe Caron",contact_title:"DSI",contact_email:"p.caron@edmond-de-rothschild.com",contact_linkedin:"https://linkedin.com/in/philippe-caron-edr",icp_score:85,pain_points:["reporting AIFMD non automatisé","workflow validation par email"],buy_signal:"Recrutement Product Owner SI actifs",case_type:"processus",priority:"chaud",tags:["Banque"]},
  {id:'l12',company:"Tikehau Capital",sector:"Gestion d'actifs",size:"430 sal., ETI",city:"Paris",contact_name:"Frédéric Blanc",contact_title:"DSI",contact_email:"f.blanc@tikehau.com",contact_linkedin:"https://linkedin.com/in/frederic-blanc-tikehau",icp_score:82,pain_points:["reporting investisseurs sous Excel","automatisation absente"],buy_signal:"Croissance AUM x3, recrutement IT",case_type:"processus",priority:"chaud",tags:["Banque"]},
  {id:'l13',company:"Neuflize OBC",sector:"Banque privée",size:"290 sal., ETI",city:"Paris",contact_name:"Isabelle Moreau",contact_title:"Directrice Opérations & SI",contact_email:"i.moreau@neuflize-obc.fr",contact_linkedin:"https://linkedin.com/in/isabelle-moreau-neuflize",icp_score:76,pain_points:["onboarding client manuel","conformité LCB-FT non auto"],buy_signal:"Pression ACPR, recrutement chef projet",case_type:"urgent",priority:"tiede",tags:["Banque"]},
  {id:'l14',company:"Tessi",sector:"Services BPO",size:"520 sal., ETI",city:"Paris",contact_name:"Isabelle Renard",contact_title:"Directrice Transformation",contact_email:"i.renard@tessi.fr",contact_linkedin:"https://linkedin.com/in/isabelle-renard-tessi",icp_score:79,pain_points:["processus OCR vieillissant","dépendance éditeur"],buy_signal:"AO modernisation plateforme documents",case_type:"legacy",priority:"tiede",tags:["Industrie","Legacy"]},
  {id:'l15',company:"Groupama Banque",sector:"Banque/Assurance",size:"540 sal., ETI",city:"Paris",contact_name:"Olivier Deschamps",contact_title:"CTO",contact_email:"o.deschamps@groupama-banque.fr",contact_linkedin:"https://linkedin.com/in/olivier-deschamps-groupama",icp_score:85,pain_points:["dette technique applicative","intégration SI complexe"],buy_signal:"Migration cloud annoncée, recrutement architectes",case_type:"legacy",priority:"chaud",tags:["Banque","Assurance"]},
];

const SIGNALS = [
  {company:"BNP Paribas CIB",type:"recrutement",title:"Recrute DSI transformation digitale",detail:"3 offres architectes SI + chef projet modernisation publiées LinkedIn.",score:90,source:"LinkedIn"},
  {company:"Covéa (MAAF/MMA/GMF)",type:"annonce",title:"Migration SI post-fusion Phase 2",detail:"Refonte outils gestion sinistres MAAF/MMA annoncée.",score:91,source:"Communiqué"},
  {company:"Mutuelle Nationale Territoriale",type:"appel_offres",title:"AO refonte SI gestion contrats",detail:"Budget estimé 1,2M€ — BOAMP.",score:87,source:"BOAMP"},
  {company:"SNCF Réseau",type:"appel_offres",title:"AO modernisation gestion incidents réseau",detail:"Modernisation outil gestion incidents ferroviaires.",score:88,source:"BOAMP"},
  {company:"Natixis Investment Managers",type:"appel_offres",title:"Refonte reporting réglementaire MIFID2",detail:"Automatisation reporting actuellement géré sous Excel.",score:85,source:"Marchés publics"},
];

// ── CORE LOGIC ────────────────────────────────────────
function filterLeads(minScore, query) {
  let pool = LEADS.slice();
  if (minScore) pool = pool.filter(l => l.icp_score >= minScore);
  if (query && query !== 'leads chauds du jour') {
    const kw = query.toLowerCase().split(/\s+/);
    pool = pool.filter(l => {
      const hay = (l.company+l.sector+l.city+l.contact_title+(l.pain_points||[]).join(' ')).toLowerCase();
      return kw.some(k => hay.includes(k));
    });
    if (!pool.length) pool = LEADS.filter(l => l.icp_score >= minScore);
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
      avg_score: Math.round(leads.reduce((s,l)=>s+l.icp_score,0)/leads.length),
      top_sector: (() => { const b={}; leads.forEach(l=>{b[l.sector]=(b[l.sector]||0)+1;}); return Object.entries(b).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'; })()
    },
    leads,
    signals: signals.slice(0, 5),
  };
}

// ── EMAIL ─────────────────────────────────────────────
async function sendEmail(report) {
  if (!CONFIG.emailTo || !CONFIG.smtpHost) {
    console.log('ℹ️  Email non configuré — skipping');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost, port: 587, secure: false,
    auth: { user: CONFIG.smtpUser, pass: CONFIG.smtpPass }
  });

  const scColor = s => s>=80?'#14532D:#22C55E':s>=60?'#451A03:#F59E0B':'#450A0A:#EF4444';
  const prioColor = p => p==='chaud'?'#EF4444':p==='tiede'?'#F59E0B':'#3B82F6';

  const rows = report.leads.map(l => {
    const [bg,fg] = scColor(l.icp_score).split(':');
    return `
    <tr style="border-bottom:1px solid #E2E8F0">
      <td style="padding:10px 12px">
        <div style="font-weight:600;font-size:13px">${l.company}</div>
        <div style="font-size:11px;color:#64748B">${l.sector} · ${l.city} · ${l.size}</div>
      </td>
      <td style="padding:10px 12px">
        <div style="font-weight:500;font-size:13px">${l.contact_name}</div>
        <div style="font-size:11px;color:#64748B">${l.contact_title}</div>
        <div style="font-size:11px;color:#94A3B8">${l.contact_email}</div>
      </td>
      <td style="padding:10px 12px;text-align:center">
        <span style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px;font-family:monospace">${l.icp_score}</span>
      </td>
      <td style="padding:10px 12px">
        <span style="color:${prioColor(l.priority)};font-weight:600;font-size:11px">${l.priority.toUpperCase()}</span>
      </td>
      <td style="padding:10px 12px;font-size:11px;color:#475569">${l.buy_signal}</td>
      <td style="padding:10px 12px">
        <a href="${l.contact_linkedin}" style="color:#3B82F6;font-size:12px;text-decoration:none">→ LinkedIn</a>
      </td>
    </tr>`;
  }).join('');

  const sigRows = report.signals.map(s => `
    <tr style="border-bottom:1px solid #E2E8F0">
      <td style="padding:8px 12px;font-weight:600;font-size:12px">${s.company}</td>
      <td style="padding:8px 12px;font-size:12px">${s.title}</td>
      <td style="padding:8px 12px;font-size:11px;color:#64748B">${s.detail}</td>
      <td style="padding:8px 12px;font-size:11px;color:#94A3B8">${s.source}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:'Segoe UI',sans-serif;background:#F8FAFC;margin:0;padding:0">
  <div style="max-width:800px;margin:0 auto;padding:24px">
    <div style="background:#0F1117;border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;background:#3B82F6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">🤖</div>
      <div>
        <div style="color:#fff;font-size:16px;font-weight:600">Agent Prospection B2B</div>
        <div style="color:#8892A4;font-size:11px;font-family:monospace">Groupe Carrousel · Rapport du ${report.date}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[
        {l:'Leads analysés',v:report.summary.total_leads,c:'#3B82F6'},
        {l:'Leads chauds',v:report.summary.hot_leads,c:'#22C55E'},
        {l:'Score ICP moyen',v:report.summary.avg_score,c:'#F59E0B'},
        {l:'Top secteur',v:report.summary.top_sector,c:'#8B5CF6'},
      ].map(m=>`<div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:10px;color:#94A3B8;font-family:monospace;text-transform:uppercase;margin-bottom:6px">${m.l}</div>
        <div style="font-size:20px;font-weight:700;color:${m.c}">${m.v}</div>
      </div>`).join('')}
    </div>

    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-weight:600;font-size:13px">
        🎯 Leads qualifiés (score ≥ ${report.min_score})
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F8FAFC">
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">CONTACT</th>
          <th style="text-align:center;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">ICP</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">PRIORITÉ</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">SIGNAL D'ACHAT</th>
          <th style="padding:8px 12px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-weight:600;font-size:13px">
        📡 Signaux d'achat détectés
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F8FAFC">
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">SIGNAL</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">DÉTAIL</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;color:#94A3B8;font-family:monospace">SOURCE</th>
        </tr></thead>
        <tbody>${sigRows}</tbody>
      </table>
    </div>

    <div style="text-align:center;color:#94A3B8;font-size:11px;font-family:monospace;padding:16px">
      Groupe Carrousel · Agent Prospection Autonome · GitHub Actions<br>
      Faveod Designer® · +650 projets · BNP · SNCF · EDF · CNP
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

// ── SLACK ─────────────────────────────────────────────
async function sendSlack(report) {
  if (!CONFIG.slackWebhook) return;
  const top3 = report.leads.slice(0, 3);
  const payload = {
    blocks: [
      { type:'header', text:{type:'plain_text',text:`🤖 Agent Carrousel — ${report.date}`} },
      { type:'section', fields:[
        {type:'mrkdwn',text:`*Leads analysés:* ${report.summary.total_leads}`},
        {type:'mrkdwn',text:`*Leads chauds:* ${report.summary.hot_leads}`},
        {type:'mrkdwn',text:`*Score moyen:* ${report.summary.avg_score}/100`},
        {type:'mrkdwn',text:`*Top secteur:* ${report.summary.top_sector}`},
      ]},
      {type:'divider'},
      ...top3.map(l=>({
        type:'section',
        text:{type:'mrkdwn',text:`*${l.company}* — Score \`${l.icp_score}\` :fire:\n${l.contact_name} · ${l.contact_title}\n📧 ${l.contact_email}\n🎯 ${l.buy_signal}`},
        accessory:{type:'button',text:{type:'plain_text',text:'LinkedIn'},url:l.contact_linkedin}
      })),
      {type:'context',elements:[{type:'mrkdwn',text:'Groupe Carrousel · Faveod Designer® · Agent Prospection Autonome'}]}
    ]
  };
  await new Promise((res,rej)=>{
    const url = new URL(CONFIG.slackWebhook);
    const body = JSON.stringify(payload);
    const req = https.request({hostname:url.hostname,path:url.pathname+url.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},r=>{r.on('data',()=>{});r.on('end',res);});
    req.on('error',rej);req.write(body);req.end();
  });
  console.log('✅ Notification Slack envoyée');
}

// ── MAIN ──────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Agent Prospection Carrousel — démarrage');
  console.log(`   Requête: "${CONFIG.query}"`);
  console.log(`   Score minimum: ${CONFIG.minScore}`);
  console.log(`   Date: ${new Date().toLocaleDateString('fr-FR')}\n`);

  const filteredLeads = filterLeads(CONFIG.minScore, CONFIG.query);
  const report = buildReport(filteredLeads, SIGNALS);

  console.log(`📊 Résultats:`);
  console.log(`   ${report.summary.total_leads} leads qualifiés`);
  console.log(`   ${report.summary.hot_leads} leads chauds`);
  console.log(`   Score moyen: ${report.summary.avg_score}/100`);
  console.log(`\n🎯 Top 5 leads:`);
  filteredLeads.slice(0,5).forEach((l,i) => {
    console.log(`   ${i+1}. ${l.company} | ${l.contact_name} (${l.contact_title}) | ICP: ${l.icp_score} | ${l.priority}`);
    console.log(`      → ${l.buy_signal}`);
    console.log(`      → ${l.contact_email}`);
  });

  // Sauvegarde JSON
  const filename = `rapport-${new Date().toISOString().slice(0,10)}-run${process.env.GITHUB_RUN_NUMBER||'local'}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Rapport sauvegardé: ${filename}`);

  // Envois
  await Promise.allSettled([
    sendEmail(report),
    sendSlack(report),
  ]);

  console.log('\n✅ Cycle terminé.\n');
}

main().catch(e => { console.error('❌ Erreur:', e.message); process.exit(1); });
