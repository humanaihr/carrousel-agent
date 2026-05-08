/**
 * Agent Prospection B2B — Groupe Carrousel
 * Génère leads.json + envoie email + Slack
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

const LEADS = [
  {id:'r01',company:"La Banque Postale",sector:"Banque",size:"20 000 sal.",city:"Lille",contact_name:"Bernard Héquet",contact_title:"DSI",contact_email:"bernard.hequet@labanquepostale.fr",contact_linkedin:"https://www.linkedin.com/in/bernard-h%C3%A9quet-a062aa25",icp_score:88,pain_points:["SI bancaire legacy","conformité DORA 2025"],buy_signal:"Grand compte bancaire — refonte SI en cours",case_type:"legacy",priority:"chaud",tags:["Banque","Legacy"]},
  {id:'r02',company:"Abeille Assurances",sector:"Assurance",size:"3 900 sal.",city:"Bois-Colombes",contact_name:"Sandrine Racouchot",contact_title:"DSI",contact_email:"sandrine.racouchot@abeille-assurances.fr",contact_linkedin:"https://www.linkedin.com/in/sandrine-racouchot-74aa0172",icp_score:89,pain_points:["SI legacy post-AXA","intégration post-fusion"],buy_signal:"Ex-AXA France — refonte SI post-renommage, recrutements IT actifs",case_type:"legacy",priority:"chaud",tags:["Assurance","Legacy"]},
  {id:'r03',company:"PRO BTP Groupe",sector:"Assurance / Prévoyance",size:"6 000 sal.",city:"Paris",contact_name:"Stéphane Danthon",contact_title:"DSI",contact_email:"stephane.danthon@probtp.com",contact_linkedin:"https://www.linkedin.com/in/stephanedanthon-385471b",icp_score:87,pain_points:["workflows sinistres longs","reporting réglementaire complexe"],buy_signal:"Prévoyance BTP — digitalisation processus prioritaire",case_type:"processus",priority:"chaud",tags:["Assurance","Grand compte"]},
  {id:'r04',company:"UFF – Union Financière de France",sector:"Gestion de patrimoine",size:"2 500 sal.",city:"Bois-Colombes",contact_name:"Zarine Shaik",contact_title:"DSI",contact_email:"zarine_shaik@uff.net",contact_linkedin:"https://www.linkedin.com/in/zarine-shaik-190a5487",icp_score:84,pain_points:["outils conseil fragmentés","reporting MIFID2"],buy_signal:"Filiale Abeille — enjeux intégration SI post-rapprochement",case_type:"processus",priority:"chaud",tags:["Banque","ETI"]},
  {id:'r05',company:"CAFPI",sector:"Courtage immobilier",size:"1 600 sal.",city:"Paris",contact_name:"Sébastien Vallecalle",contact_title:"DSI",contact_email:"s.vallecalle@cafpi.fr",contact_linkedin:"https://www.linkedin.com/in/sebastien-vallecalle-68461021",icp_score:82,pain_points:["processus courtage non automatisés","reporting manuel"],buy_signal:"ETI en forte croissance — stack hétérogène à moderniser",case_type:"processus",priority:"chaud",tags:["Banque","ETI"]},
  {id:'r06',company:"Vivalto Santé",sector:"Santé privée",size:"21 000 sal.",city:"Rennes",contact_name:"Olivier Boixière",contact_title:"DSI",contact_email:"oboixiere@vivalto-sante.com",contact_linkedin:"https://www.linkedin.com/in/olivier-boixiere-8b307a25",icp_score:86,pain_points:["SI hospitalier multi-sites","dossier patient non unifié"],buy_signal:"2ème groupe hospitalier privé France — programme SI groupe",case_type:"urgent",priority:"chaud",tags:["Santé","Grand compte"]},
  {id:'r07',company:"CHU Grenoble Alpes",sector:"Santé publique",size:"12 000 sal.",city:"Grenoble",contact_name:"Bruno Lavaire",contact_title:"DSI",contact_email:"blavaire@chu-grenoble.fr",contact_linkedin:"https://www.linkedin.com/in/bruno-lavaire-53322534",icp_score:80,pain_points:["SI hospitalier legacy","souveraineté données santé"],buy_signal:"Programme Hôpital Numérique — hébergement souverain",case_type:"souverainete",priority:"chaud",tags:["Santé","Public","Souveraineté"]},
  {id:'r08',company:"Centre Hospitalier Sud Francilien",sector:"Santé publique",size:"4 800 sal.",city:"Corbeil-Essonnes",contact_name:"Thierry Pasquelin",contact_title:"DSI",contact_email:"thierry.pasquelin@chsf.fr",contact_linkedin:"https://www.linkedin.com/in/thierry-pasquelin-b1785051",icp_score:79,pain_points:["sécurité données patients","budget IT contraint"],buy_signal:"CH public — enjeux sécurité données critiques",case_type:"securite",priority:"tiede",tags:["Santé","Public"]},
  {id:'r09',company:"Concentrix Payment Services",sector:"Paiement",size:"410 sal.",city:"Chambéry",contact_name:"Myriam Boide",contact_title:"DSI",contact_email:"myriam.boide@concentrix.com",contact_linkedin:"https://www.linkedin.com/in/myriamboide",icp_score:76,pain_points:["conformité PCI-DSS","haute disponibilité requise"],buy_signal:"ETI paiement — contraintes PCI-DSS, haute disponibilité 24/7",case_type:"securite",priority:"tiede",tags:["Banque","ETI"]},
  {id:'r10',company:"Denjean & Associés",sector:"Gestion d'actifs",size:"170 sal.",city:"Paris",contact_name:"Fabien Nantas",contact_title:"DSI",contact_email:"fabien.nantas@denjeansa.fr",contact_linkedin:"https://www.linkedin.com/in/fabien-nantas",icp_score:75,pain_points:["reporting investisseurs sous Excel","outils propriétaires inexistants"],buy_signal:"Société de gestion — besoin outils souverains sur mesure",case_type:"souverainete",priority:"tiede",tags:["Banque","ETI","Souveraineté"]},
  {id:'r11',company:"Macif",sector:"Assurance mutualiste",size:"1 600 sal.",city:"Niort",contact_name:"Direction Transformation",contact_title:"Directeur Transformation Digitale",contact_email:"direction@macif.fr",contact_linkedin:"https://www.linkedin.com/company/macif",icp_score:86,pain_points:["processus sinistres manuels","dépendance éditeur"],buy_signal:"AO refonte portail sociétaires",case_type:"processus",priority:"chaud",tags:["Assurance","Legacy"]},
  {id:'r12',company:"Caisse des Dépôts — DSI",sector:"Finances publiques",size:"600 sal.",city:"Paris",contact_name:"Direction SI",contact_title:"Directrice Études SI",contact_email:"dsi@caissedesdepots.fr",contact_linkedin:"https://www.linkedin.com/company/caisse-des-depots",icp_score:87,pain_points:["legacy Cobol","souveraineté réglementaire"],buy_signal:"AO refonte SI épargne réglementée",case_type:"souverainete",priority:"chaud",tags:["Public","Banque","Souveraineté"]},
];

const SIGNALS = [
  {company:"Abeille Assurances",type:"annonce",title:"Refonte SI post-renommage AXA→Abeille",detail:"Transformation SI suite au rachat par Aéma Groupe.",score:91,source:"Communiqué"},
  {company:"La Banque Postale",type:"recrutement",title:"Recrutements IT — conformité DORA",detail:"LBP publie offres architectes SI et experts cybersécurité.",score:88,source:"LinkedIn"},
  {company:"PRO BTP Groupe",type:"appel_offres",title:"AO digitalisation processus prévoyance",detail:"Appel d'offres refonte workflows sinistres et prévoyance BTP.",score:87,source:"BOAMP"},
  {company:"Vivalto Santé",type:"annonce",title:"Plan SI groupe 2025 — dossier patient unifié",detail:"2ème groupe hospitalier privé — programme SI multi-sites.",score:86,source:"Communiqué"},
  {company:"CAFPI",type:"recrutement",title:"Recrute architecte SI et dev Java",detail:"CAFPI modernise sa plateforme de courtage immobilier.",score:82,source:"Indeed"},
  {company:"CHU Grenoble Alpes",type:"appel_offres",title:"AO hébergement souverain HDS",detail:"Consultation migration données patients vers hébergeur HDS.",score:80,source:"BOAMP"},
  {company:"Covéa (MAAF/MMA/GMF)",type:"annonce",title:"Migration SI post-fusion Phase 2",detail:"Refonte outils gestion sinistres MAAF/MMA annoncée.",score:91,source:"Communiqué"},
  {company:"Natixis IM",type:"appel_offres",title:"Refonte reporting MIFID2",detail:"Automatisation reporting actuellement géré sous Excel.",score:85,source:"Marchés publics"},
];

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

async function sendEmail(report) {
  if (!CONFIG.emailTo || !CONFIG.smtpHost) { console.log('ℹ️  Email non configuré'); return; }
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost, port: 587, secure: false,
    auth: { user: CONFIG.smtpUser, pass: CONFIG.smtpPass }
  });
  const scColor = s => s>=80?'#14532D:#22C55E':s>=60?'#451A03:#F59E0B':'#450A0A:#EF4444';
  const rows = report.leads.map(l => {
    const [bg,fg] = scColor(l.icp_score).split(':');
    return `<tr style="border-bottom:1px solid #E2E8F0">
      <td style="padding:10px 12px"><strong>${l.company}</strong><br><small style="color:#64748B">${l.sector} · ${l.city}</small></td>
      <td style="padding:10px 12px">${l.contact_name}<br><small style="color:#64748B">${l.contact_title}</small><br><small style="color:#94A3B8">${l.contact_email}</small></td>
      <td style="padding:10px 12px;text-align:center"><span style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-weight:700">${l.icp_score}</span></td>
      <td style="padding:10px 12px;font-size:12px;color:#475569">${l.buy_signal}</td>
      <td style="padding:10px 12px"><a href="${l.contact_linkedin}" style="color:#1D4ED8">→ LinkedIn</a></td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="font-family:'Segoe UI',sans-serif;background:#F0F4FF;margin:0;padding:24px">
  <div style="max-width:820px;margin:0 auto">
    <div style="background:#1E3A8A;border-radius:12px;padding:20px 24px;margin-bottom:20px">
      <div style="color:white;font-size:18px;font-weight:700">🤖 Agent Prospection B2B — Groupe Carrousel</div>
      <div style="color:#93C5FD;font-size:12px;margin-top:4px">Contacts vérifiés · ${report.date}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[{l:'Leads',v:report.summary.total_leads,c:'#1D4ED8'},{l:'Chauds',v:report.summary.hot_leads,c:'#16A34A'},{l:'Score moy.',v:report.summary.avg_score,c:'#D97706'},{l:'Top secteur',v:report.summary.top_sector,c:'#7C3AED'}]
        .map(m=>`<div style="background:white;border:1.5px solid #D1D9F0;border-radius:10px;padding:14px;text-align:center"><div style="font-size:11px;color:#94A3B8;margin-bottom:6px">${m.l}</div><div style="font-size:22px;font-weight:700;color:${m.c}">${m.v}</div></div>`).join('')}
    </div>
    <div style="background:white;border:1.5px solid #D1D9F0;border-radius:10px;overflow:hidden;margin-bottom:16px">
      <div style="padding:14px 16px;border-bottom:1.5px solid #D1D9F0;font-weight:700;font-size:14px;color:#1A2340">🎯 Leads qualifiés — contacts qualifiés</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#EEF2FF">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#5A6585;font-weight:700">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#5A6585;font-weight:700">CONTACT</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#5A6585;font-weight:700">ICP</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#5A6585;font-weight:700">SIGNAL D'ACHAT</th>
          <th style="padding:8px 12px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="text-align:center;color:#94A3B8;font-size:12px;padding:16px">
      Groupe Carrousel · Faveod Designer® · Agent Autonome GitHub Actions<br>
      <a href="https://humanaihr.github.io/carrousel-agent/" style="color:#1D4ED8">→ Ouvrir l'interface complète</a>
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
        text:{type:'mrkdwn',text:`*${l.company}* — \`${l.icp_score}\` :fire:\n${l.contact_name} · ${l.contact_title}\n📧 ${l.contact_email}\n🎯 ${l.buy_signal}`},
        accessory:{type:'button',text:{type:'plain_text',text:'LinkedIn'},url:l.contact_linkedin}
      })),
      {type:'context',elements:[{type:'mrkdwn',text:'Groupe Carrousel · Faveod Designer® · Contacts qualifiés'}]}
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
  console.log('\n🚀 Agent Prospection Carrousel');
  const filteredLeads = filterLeads(CONFIG.minScore, CONFIG.query);
  const now = new Date();
  const report = {
    generated_at: now.toISOString(),
    date: now.toLocaleDateString('fr-FR'),
    query: CONFIG.query,
    min_score: CONFIG.minScore,
    summary: {
      total_leads: filteredLeads.length,
      hot_leads: filteredLeads.filter(l=>l.priority==='chaud').length,
      avg_score: filteredLeads.length ? Math.round(filteredLeads.reduce((s,l)=>s+l.icp_score,0)/filteredLeads.length) : 0,
      top_sector: (() => { const b={}; filteredLeads.forEach(l=>{b[l.sector]=(b[l.sector]||0)+1;}); return Object.entries(b).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'; })()
    },
    leads: filteredLeads,
    signals: SIGNALS,
  };

  console.log(`📊 ${report.summary.total_leads} leads | ${report.summary.hot_leads} chauds | Score ${report.summary.avg_score}`);
  filteredLeads.slice(0,5).forEach((l,i) => {
    console.log(`   ${i+1}. [${l.icp_score}] ${l.company} | ${l.contact_name} | ${l.contact_email}`);
  });

  // Sauvegarde leads.json — sera pushé dans le repo par le workflow
  fs.writeFileSync('leads.json', JSON.stringify(report, null, 2));
  console.log('💾 leads.json généré');

  await Promise.allSettled([sendEmail(report), sendSlack(report)]);
  console.log('\n✅ Cycle terminé.\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
