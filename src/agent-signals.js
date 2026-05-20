/**
 * Agent Signaux Temps Réel — Groupe Carrousel
 * Sources : BOAMP (appels d'offres publics) + RSS presse économique
 * GitHub Actions — exécution autonome
 */

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const xml2js   = require('xml2js');

// ── CONFIG ────────────────────────────────────────────────
const KEYWORDS_IT = [
  'refonte SI', 'modernisation SI', 'transformation digitale',
  'logiciel sur mesure', 'développement applicatif', 'legacy',
  'dette technique', 'souveraineté numérique', 'ERP inadapté',
  'système d\'information', 'application métier', 'DSI',
  'informatique bancaire', 'post-marché', 'conformité MIFID',
  'conformité DORA', 'conformité EMIR', 'intermédiaire financier'
];

const SECTORS_TARGET = [
  'banque', 'assurance', 'mutuelle', 'finance', 'crédit',
  'épargne', 'prévoyance', 'gestion actifs', 'post-marché',
  'industrie', 'santé', 'hôpital', 'clinique'
];

// ── RSS FEEDS ─────────────────────────────────────────────
const RSS_FEEDS = [
  {
    name: 'Les Echos - Finance',
    url: 'https://feeds.lesechos.fr/lesechos-finance',
    type: 'presse'
  },
  {
    name: "L'Usine Digitale",
    url: 'https://www.usine-digitale.fr/rss/all.xml',
    type: 'presse'
  },
  {
    name: 'CIO Online',
    url: 'https://www.cio-online.com/rss',
    type: 'presse'
  },
  {
    name: 'Silicon.fr',
    url: 'https://www.silicon.fr/feed',
    type: 'presse'
  },
  {
    name: 'Informatique News',
    url: 'https://www.informatiquenews.fr/feed',
    type: 'presse'
  }
];

// ── BOAMP API ─────────────────────────────────────────────
// API officielle BOAMP - marchés publics IT
const BOAMP_API = 'https://www.boamp.fr/api/search/';
const BOAMP_PARAMS = [
  'informatique', 'logiciel', 'système information',
  'développement applicatif', 'transformation numérique',
  'modernisation', 'infogérance'
];

// ── FETCH UTILS ───────────────────────────────────────────
function fetchUrl(url, timeout) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { 
      timeout: timeout || 10000,
      headers: { 
        'User-Agent': 'CarrouselAgent/1.0 (prospection@carrousel.fr)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchJSON(url) {
  const data = await fetchUrl(url);
  return JSON.parse(data);
}

// ── RELEVANCE SCORING ─────────────────────────────────────
function scoreRelevance(text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  let score = 0;
  
  // Keyword matches
  KEYWORDS_IT.forEach(kw => {
    if (t.includes(kw.toLowerCase())) score += 15;
  });
  
  // Sector matches  
  SECTORS_TARGET.forEach(sec => {
    if (t.includes(sec.toLowerCase())) score += 10;
  });
  
  // Boost for strong signals
  if (t.includes('dsi') || t.includes('directeur si')) score += 20;
  if (t.includes('refonte') && t.includes('si')) score += 25;
  if (t.includes('legacy') || t.includes('obsolescence')) score += 20;
  if (t.includes('souverain') || t.includes('souveraineté')) score += 20;
  if (t.includes('mifid') || t.includes('dora') || t.includes('emir')) score += 15;
  
  return Math.min(score, 100);
}

function extractCompany(text) {
  if (!text) return null;
  // Try to extract company name from BOAMP/RSS text
  const patterns = [
    /(?:acheteur|pouvoir adjudicateur)\s*:\s*([^\n,\.]+)/i,
    /(?:maître d'ouvrage|maîtrise d'ouvrage)\s*:\s*([^\n,\.]+)/i,
    /([A-Z][A-Za-zÀ-ÿ\s&]+(?:SA|SAS|SARL|GIE|Groupe|Banque|Assurance|Mutuelle))/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim().slice(0, 60);
  }
  return null;
}

// ── BOAMP SCRAPER ─────────────────────────────────────────
async function fetchBOAMP() {
  const signals = [];
  console.log('📡 Fetching BOAMP signals...');
  
  for (const keyword of BOAMP_PARAMS.slice(0, 4)) { // limit to 4 to avoid rate limiting
    try {
      const url = `${BOAMP_API}?q=${encodeURIComponent(keyword)}&size=10&sort=dateparution:desc`;
      const data = await fetchJSON(url);
      const hits = data?.hits?.hits || [];
      
      hits.forEach(hit => {
        const src = hit._source || {};
        const title = src.objet || src.libelle || '';
        const desc = src.descripteurs || src.objet || '';
        const acheteur = src.acheteur?.denomination || src.nomacheteur || extractCompany(title) || 'Non specifie';
        const score = scoreRelevance(title + ' ' + desc + ' ' + acheteur);
        
        if (score >= 25) {
          signals.push({
            id: 'boamp_' + (hit._id || Date.now()),
            company: acheteur,
            signal_type: 'appel_offres',
            signal_title: title.slice(0, 80),
            signal_detail: desc.slice(0, 200),
            source: 'BOAMP',
            source_url: `https://www.boamp.fr/avis/detail/${hit._id || ''}`,
            date: src.dateparution || new Date().toISOString().slice(0, 10),
            relevance_score: score,
            keywords_matched: KEYWORDS_IT.filter(k => (title + desc).toLowerCase().includes(k.toLowerCase())),
            icp_match: ['DSI', 'SI', 'Transformation']
          });
        }
      });
      
      console.log(`  BOAMP "${keyword}": ${hits.length} hits, ${signals.filter(s=>s.id.startsWith('boamp')).length} relevant`);
      await new Promise(r => setTimeout(r, 500)); // rate limit
    } catch(e) {
      console.log(`  BOAMP "${keyword}" error: ${e.message}`);
    }
  }
  
  return signals;
}

// ── RSS SCRAPER ───────────────────────────────────────────
async function fetchRSS(feed) {
  try {
    const xml = await fetchUrl(feed.url, 8000);
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    
    const channel = result?.rss?.channel || result?.feed || {};
    const items = channel.item || channel.entry || [];
    const itemArr = Array.isArray(items) ? items : [items];
    
    const signals = [];
    itemArr.slice(0, 20).forEach(item => {
      const title = (item.title?._ || item.title || '').toString();
      const desc = (item.description?._ || item.description || item.summary?._ || item.summary || '').toString();
      const link = (item.link?._ || item.link || item.id || '').toString();
      const pubDate = item.pubDate || item.published || item.updated || '';
      
      const fullText = title + ' ' + desc;
      const score = scoreRelevance(fullText);
      
      if (score >= 20) {
        const company = extractCompany(fullText) || feed.name;
        signals.push({
          id: 'rss_' + Buffer.from(title).toString('base64').slice(0, 16),
          company: company,
          signal_type: 'publication',
          signal_title: title.replace(/<[^>]*>/g, '').slice(0, 80),
          signal_detail: desc.replace(/<[^>]*>/g, '').slice(0, 200),
          source: feed.name,
          source_url: link,
          date: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          relevance_score: score,
          keywords_matched: KEYWORDS_IT.filter(k => fullText.toLowerCase().includes(k.toLowerCase())),
          icp_match: ['DSI', 'Transformation', 'SI']
        });
      }
    });
    
    return signals;
  } catch(e) {
    console.log(`  RSS ${feed.name} error: ${e.message}`);
    return [];
  }
}

async function fetchAllRSS() {
  console.log('📰 Fetching RSS feeds...');
  const allSignals = [];
  
  for (const feed of RSS_FEEDS) {
    const signals = await fetchRSS(feed);
    allSignals.push(...signals);
    console.log(`  ${feed.name}: ${signals.length} signals`);
    await new Promise(r => setTimeout(r, 300));
  }
  
  return allSignals;
}

// ── DEDUP + SORT ──────────────────────────────────────────
function processSignals(signals) {
  // Remove duplicates by title similarity
  const seen = new Set();
  const unique = signals.filter(s => {
    const key = s.signal_title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by relevance score desc
  unique.sort((a, b) => b.relevance_score - a.relevance_score);
  
  return unique.slice(0, 30); // keep top 30
}

// ── EMAIL REPORT ──────────────────────────────────────────
async function sendSignalsEmail(signals, emailTo, smtpConfig) {
  if (!emailTo || !smtpConfig.host) return;
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host, port: 587, secure: false,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass }
  });
  
  const boamp = signals.filter(s => s.source === 'BOAMP');
  const rss = signals.filter(s => s.source !== 'BOAMP');
  const date = new Date().toLocaleDateString('fr-FR');
  
  const rows = signals.slice(0, 15).map(s => `
    <tr style="border-bottom:1px solid #E2E8F0">
      <td style="padding:8px 12px">
        <strong>${s.company}</strong><br>
        <small style="color:#64748B">${s.source}</small>
      </td>
      <td style="padding:8px 12px">
        <div style="font-weight:500">${s.signal_title}</div>
        <div style="font-size:11px;color:#64748B;margin-top:2px">${s.signal_detail.slice(0,120)}...</div>
      </td>
      <td style="padding:8px 12px;text-align:center">
        <span style="background:#DBEAFE;color:#1D4ED8;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">${s.relevance_score}</span>
      </td>
      <td style="padding:8px 12px">
        <a href="${s.source_url}" style="color:#1D4ED8;font-size:12px">→ Voir</a>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="font-family:'Segoe UI',sans-serif;background:#F0F4FF;margin:0;padding:24px">
  <div style="max-width:800px;margin:0 auto">
    <div style="background:#1E3A8A;border-radius:12px;padding:20px 24px;margin-bottom:20px">
      <div style="color:white;font-size:18px;font-weight:700">📡 Signaux d'achat temps réel — Groupe Carrousel</div>
      <div style="color:#93C5FD;font-size:12px;margin-top:4px">${date} · BOAMP + Presse économique</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <div style="background:white;border:1.5px solid #D1D9F0;border-radius:8px;padding:14px;flex:1;text-align:center">
        <div style="font-size:11px;color:#94A3B8">Signaux totaux</div>
        <div style="font-size:24px;font-weight:700;color:#1D4ED8">${signals.length}</div>
      </div>
      <div style="background:white;border:1.5px solid #D1D9F0;border-radius:8px;padding:14px;flex:1;text-align:center">
        <div style="font-size:11px;color:#94A3B8">BOAMP (AO publics)</div>
        <div style="font-size:24px;font-weight:700;color:#16A34A">${boamp.length}</div>
      </div>
      <div style="background:white;border:1.5px solid #D1D9F0;border-radius:8px;padding:14px;flex:1;text-align:center">
        <div style="font-size:11px;color:#94A3B8">Presse économique</div>
        <div style="font-size:24px;font-weight:700;color:#D97706">${rss.length}</div>
      </div>
    </div>
    <div style="background:white;border:1.5px solid #D1D9F0;border-radius:10px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1.5px solid #D1D9F0;font-weight:700;font-size:14px">
        🎯 Top signaux par pertinence ICP Carrousel
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#EEF2FF">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#5A6585">ENTREPRISE</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#5A6585">SIGNAL</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#5A6585">SCORE</th>
          <th style="padding:8px 12px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="text-align:center;color:#94A3B8;font-size:12px;padding:16px">
      Groupe Carrousel · Faveod Designer® · Agent Signaux Autonome
    </div>
  </div></body></html>`;

  await transporter.sendMail({
    from: `"Agent Carrousel Signaux" <${smtpConfig.user}>`,
    to: emailTo,
    subject: `📡 [Carrousel Signaux] ${signals.length} opportunités détectées — ${date}`,
    html
  });
  console.log(`✅ Email signaux envoyé à ${emailTo}`);
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('\n📡 Agent Signaux Temps Réel — Groupe Carrousel');
  console.log(`   ${new Date().toLocaleString('fr-FR')}\n`);

  const [boampSignals, rssSignals] = await Promise.allSettled([
    fetchBOAMP(),
    fetchAllRSS()
  ]);
  
  const allSignals = [
    ...(boampSignals.status === 'fulfilled' ? boampSignals.value : []),
    ...(rssSignals.status === 'fulfilled' ? rssSignals.value : [])
  ];
  
  const processed = processSignals(allSignals);
  
  console.log(`\n📊 Résultats:`);
  console.log(`   ${processed.length} signaux pertinents détectés`);
  console.log(`   ${processed.filter(s=>s.source==='BOAMP').length} appels d'offres BOAMP`);
  console.log(`   ${processed.filter(s=>s.source!=='BOAMP').length} articles presse`);
  
  console.log('\n🎯 Top 5 signaux:');
  processed.slice(0, 5).forEach((s, i) => {
    console.log(`   ${i+1}. [${s.relevance_score}] ${s.company} — ${s.signal_title.slice(0,50)}`);
    console.log(`      Source: ${s.source} | ${s.date}`);
  });

  // Save signals.json for GitHub Pages HTML
  const output = {
    generated_at: new Date().toISOString(),
    total: processed.length,
    signals: processed
  };
  fs.writeFileSync('signals.json', JSON.stringify(output, null, 2));
  console.log('\n💾 signals.json sauvegardé');

  // Send email if configured
  if (process.env.EMAIL_TO && process.env.SMTP_HOST) {
    await sendSignalsEmail(processed, process.env.EMAIL_TO, {
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    });
  }

  console.log('\n✅ Cycle signaux terminé.\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
