/* STAT LAB — molecular datasets (ChEMBL / QM9)
 * Data-driven pages based on the current Lab03/Lab04 notebooks.
 */
(function (global) {
  "use strict";

  const CONFIG = {
    "lab-03": {
      id: "lab-03",
      title: "ChEMBL · EGFR",
      dataset: "chembl_egfr_ic50.csv",
      source: "ChEMBL · CHEMBL203 (human EGFR)",
      description: "Соединения с доступными измерениями IC50 для человеческой мишени EGFR и вычислимыми физико-химическими свойствами.",
      colors: ["#C44569", "#168C86", "#7656A6"],
      light: ["#E8A0B2", "#83C7C0", "#B7A5D1"],
      variables: [
        { key: "pIC50", id: "pic50", label: "Биологическая активность", symbol: "pIC50", unit: "log₁₀-шкала", description: "Стандартизованная мера активности: −log₁₀(IC50 [M])." },
        { key: "molecular_weight", id: "mw", label: "Молекулярная масса", symbol: "MW", unit: "г/моль", description: "Молекулярная масса соединения из свойств ChEMBL." },
        { key: "TPSA", id: "tpsa", label: "Топологическая полярная поверхность", symbol: "TPSA", unit: "Å²", description: "Вычисляемый дескриптор вклада полярных атомов." }
      ],
      target: "pIC50",
      hypothesisX: "TPSA",
      hypothesisY: "pIC50",
      samplingSizes: [10, 30, 100, 300, 1000, 3000],
      split: "70/30",
      expected: ["pIC50", "molecular_weight", "TPSA"]
    },
    "lab-04": {
      id: "lab-04",
      title: "QM9 · Molecular Properties",
      dataset: "qm9_three_properties.csv",
      source: "QM9 · TensorFlow Datasets",
      description: "Квантово-химические характеристики малых органических молекул, рассчитанные на уровне B3LYP/6-31G(2df,p).",
      colors: ["#356FE0", "#C04491", "#C47A2C"],
      light: ["#91AFE9", "#E5A0CC", "#E8BD8B"],
      variables: [
        { key: "homo_lumo_gap_eV", id: "gap", label: "Энергетический разрыв HOMO–LUMO", symbol: "gap", unit: "эВ", description: "Энергетическая щель между HOMO и LUMO." },
        { key: "dipole_moment_mu_Debye", id: "mu", label: "Дипольный момент", symbol: "μ", unit: "Дебай", description: "Модуль дипольного момента молекулы." },
        { key: "polarizability_alpha_Bohr3", id: "alpha", label: "Изотропная поляризуемость", symbol: "α", unit: "Bohr³", description: "Отклик электронной системы на внешнее электрическое поле." }
      ],
      target: "homo_lumo_gap_eV",
      hypothesisX: "homo_lumo_gap_eV",
      hypothesisY: "dipole_moment_mu_Debye",
      samplingSizes: [10, 30, 100, 300, 1000, 3000, 10000],
      split: "70/30",
      expected: ["homo_lumo_gap_eV", "dipole_moment_mu_Debye", "polarizability_alpha_Bohr3"]
    }
  };

  const $ = (root, selector) => root.querySelector(selector);
  const fmt = (x, digits = 3) => Number.isFinite(x) ? x.toLocaleString("ru-RU", { maximumFractionDigits: digits }) : "—";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function parseCSV(text) {
    text = String(text ?? "").replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/).find(line => line.trim()) || "";
    let commaCount = 0, semicolonCount = 0, quotedHeader = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') quotedHeader = !quotedHeader;
      else if (!quotedHeader && c === ",") commaCount++;
      else if (!quotedHeader && c === ";") semicolonCount++;
    }
    const delimiter = semicolonCount > commaCount ? ";" : ",";
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (c === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
      else if (c === "\n" && !quoted) { row.push(cell.trim()); if (row.some(v => v !== "")) rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
    row.push(cell.trim());
    if (row.some(v => v !== "")) rows.push(row);
    if (quoted) throw new Error("CSV содержит незакрытое поле в кавычках.");
    if (rows.length < 2) throw new Error("CSV пуст или не содержит строк наблюдений.");
    const headers = rows[0].map(h => h.trim());
    if (headers.some(h => !h)) throw new Error("В CSV обнаружен пустой заголовок столбца.");
    if (new Set(headers).size !== headers.length) throw new Error("В CSV обнаружены повторяющиеся названия столбцов.");
    return rows.slice(1).filter(values => values.some(v => String(v ?? "").trim() !== "")).map(values => {
      const item = {};
      headers.forEach((h, i) => item[h] = values[i] ?? "");
      return item;
    });
  }

  function stateDomainValid(item, config) {
    if (config.id === "lab-03") return item.molecular_weight > 0 && item.TPSA >= 0;
    return item.homo_lumo_gap_eV > 0 && item.dipole_moment_mu_Debye >= 0 && item.polarizability_alpha_Bohr3 > 0;
  }

  function cleanRows(rows, config) {
    const valid = [];
    let invalid = 0;
    rows.forEach(row => {
      const item = {};
      let ok = true;
      config.expected.forEach(key => {
        const raw = String(row[key] ?? "").trim();
        const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
        const n = normalized === "" ? NaN : Number(normalized);
        if (!Number.isFinite(n)) ok = false;
        item[key] = n;
      });
      if (ok && stateDomainValid(item, config)) valid.push(item); else invalid++;
    });
    if (valid.length < 2) throw new Error("В CSV не найдены корректные строки. Проверьте названия столбцов: " + config.expected.join(", "));
    return { rows: valid, invalid, sourceRows: rows.length };
  }

  function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
  function variance(a) { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1); }
  function quantile(a, p) {
    const x = [...a].sort((u, v) => u - v);
    const h = (x.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
    return x[lo] + (x[hi] - x[lo]) * (h - lo);
  }
  function skewness(a) {
    const m = mean(a), m2=a.reduce((s,x)=>s+(x-m)**2,0)/a.length;
    if (!m2) return 0;
    const m3=a.reduce((s,x)=>s+(x-m)**3,0)/a.length;
    return m3 / Math.pow(m2,1.5);
  }
  function kurtosis(a) {
    const m = mean(a), m2=a.reduce((s,x)=>s+(x-m)**2,0)/a.length;
    if (!m2) return 0;
    const m4=a.reduce((s,x)=>s+(x-m)**4,0)/a.length;
    return m4 / (m2*m2) - 3;
  }
  function stats(a) {
    const sorted = [...a].sort((x, y) => x - y);
    return {
      n: a.length, mean: mean(a), median: quantile(a, .5), variance: variance(a),
      sd: Math.sqrt(variance(a)), min: sorted[0], max: sorted.at(-1),
      q1: quantile(a, .25), q3: quantile(a, .75), skew: skewness(a), kurtosis: kurtosis(a)
    };
  }
  function ranks(a) {
    const sorted = a.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v);
    const out = Array(a.length);
    for (let i = 0; i < sorted.length;) {
      let j = i + 1;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const r = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) out[sorted[k].i] = r;
      i = j;
    }
    return out;
  }
  function corr(a, b) {
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x*x; db += y*y; }
    return num / Math.sqrt(da * db);
  }
  function erf(x) {
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + .3275911 * x);
    const y = 1 - (((((1.061405429*t - 1.453152027)*t) + 1.421413741)*t - .284496736)*t + .254829592)*t*Math.exp(-x*x);
    return sign * y;
  }
  function normalTwoSidedP(z) { return Math.max(0, Math.min(1, 1 - erf(Math.abs(z) / Math.SQRT2))); }
  function normalQuantile(p) {
    // Acklam approximation
    const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924];
    const b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857];
    const c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878];
    const d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742];
    if (p <= 0 || p >= 1) return p === 0 ? -Infinity : Infinity;
    if (p < .02425) { const q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > .97575) { const q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    const q=p-.5, r=q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  function histogramSVG(values, color, label) {
    const bins = 28, min = values.reduce((m,v)=>Math.min(m,v),Infinity), max = values.reduce((m,v)=>Math.max(m,v),-Infinity), span = max - min || 1;
    const counts = Array(bins).fill(0);
    values.forEach(v => counts[Math.min(bins-1, Math.floor((v-min)/span*bins))]++);
    const peak = Math.max(...counts), W=640, H=210, pad=18, gap=3, bw=(W-pad*2)/bins;
    const bars = counts.map((n,i) => {
      const h=(H-pad*2)*n/peak, x=pad+i*bw, y=H-pad-h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1,bw-gap).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${color}" opacity=".82"><title>${esc(label)}: ${n} наблюдений</title></rect>`;
    }).join("");
    return `<svg class="ml-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Гистограмма ${esc(label)}">${bars}<path d="M${pad} ${H-pad}H${W-pad}" stroke="currentColor" opacity=".25"/><text x="${pad}" y="${H-2}" font-size="10" fill="currentColor">${fmt(min,2)}</text><text x="${W-pad}" y="${H-2}" text-anchor="end" font-size="10" fill="currentColor">${fmt(max,2)}</text></svg>`;
  }
  function qqSVG(values, color) {
    const n = Math.min(100, values.length), probs = Array.from({length:n}, (_,i)=>(i+.5)/n);
    const sorted = [...values].sort((a,b)=>a-b), s = stats(values), W=360,H=230,p=24;
    const pts = probs.map((q,i)=>{
      const x=normalQuantile(q), y=sorted[Math.floor(q*(sorted.length-1))];
      const xx=p+(x+3.5)/7*(W-2*p), yy=H-p-(y-(s.mean-3.5*s.sd))/(7*s.sd||1)*(H-2*p);
      return `<circle cx="${Math.max(p,Math.min(W-p,xx))}" cy="${Math.max(p,Math.min(H-p,yy))}" r="2.2" fill="${color}" opacity=".68"/>`;
    }).join("");
    return `<svg class="ml-qq" viewBox="0 0 ${W} ${H}" role="img" aria-label="Q-Q диагностика"><path d="M${p} ${H-p}L${W-p} ${p}" stroke="#8B929A" stroke-dasharray="4 4"/><path d="M${p} ${p}V${H-p}H${W-p}" fill="none" stroke="currentColor" opacity=".25"/>${pts}</svg>`;
  }
  function metricRows(s, unit) {
    return [["Объём", fmt(s.n,0)],["Среднее",fmt(s.mean)],["Медиана",fmt(s.median)],["Дисперсия",fmt(s.variance)],["СКО",fmt(s.sd)],["Q1 / Q3",`${fmt(s.q1)} / ${fmt(s.q3)}`],["Минимум / максимум",`${fmt(s.min)} / ${fmt(s.max)}`],["Асимметрия",fmt(s.skew)],["Эксцесс",fmt(s.kurtosis)]]
      .map(([k,v])=>`<div class="ml-stat"><span>${k}</span><b>${v}${k==="Среднее"||k==="Медиана"||k==="Минимум / максимум"?" "+esc(unit):""}</b></div>`).join("");
  }
  function shuffleSplit(values, seed=42) {
    const idx=Array.from({length:values.length},(_,i)=>i);
    const rng=new MT19937(seed);
    for(let i=idx.length-1;i>0;i--){const j=Math.floor(rng.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
    const cut=Math.floor(values.length*.7);
    return {train:idx.slice(0,cut).map(i=>values[i]),test:idx.slice(cut).map(i=>values[i])};
  }

  class MT19937 {
    constructor(seed=5489) {
      this.N=624; this.M=397; this.mt=Array(this.N).fill(0); this.index=this.N;
      this.mt[0]=seed>>>0;
      for(let i=1;i<this.N;i++){const prev=this.mt[i-1];this.mt[i]=(Math.imul(1812433253,(prev^(prev>>>30)))+i)>>>0;}
    }
    twist(){
      for(let i=0;i<this.N;i++){
        const x=(this.mt[i]&0x80000000)+(this.mt[(i+1)%this.N]&0x7fffffff);
        let xa=x>>>1;if(x&1)xa^=0x9908B0DF;
        this.mt[i]=(this.mt[(i+397)%this.N]^xa)>>>0;
      }
      this.index=0;
    }
    uint32(){
      if(this.index>=this.N)this.twist();
      let y=this.mt[this.index++];
      y^=y>>>11;y^=(y<<7)&0x9D2C5680;y^=(y<<15)&0xEFC60000;y^=y>>>18;
      return y>>>0;
    }
    random(){return (this.uint32()+.5)/4294967296;}
  }
  function mtQuantileGenerator(reference,size,seed=2026) {
    const x=[...reference].sort((a,b)=>a-b);
    if(x.length<2)throw new Error("Для обучения генератора нужны минимум два значения.");
    const p=x.map((_,i)=>(i+.5)/x.length), rng=new MT19937(seed);
    return Array.from({length:size},()=>{
      const u=rng.random();
      let lo=0,hi=p.length-1;
      while(lo<hi){const mid=(lo+hi)>>1;if(p[mid]<u)lo=mid+1;else hi=mid;}
      const j=lo;
      if(j===0)return x[0]; if(u>=p[p.length-1])return x[x.length-1];
      const left=j-1, t=(u-p[left])/(p[j]-p[left]);
      return x[left]+(x[j]-x[left])*t;
    });
  }
  function ksStatistic(a,b) {
    const x=[...a].sort((u,v)=>u-v), y=[...b].sort((u,v)=>u-v);
    let i=0,j=0,d=0;
    while(i<x.length&&j<y.length){const v=Math.min(x[i],y[j]);while(i<x.length&&x[i]<=v)i++;while(j<y.length&&y[j]<=v)j++;d=Math.max(d,Math.abs(i/x.length-j/y.length));}
    return d;
  }
  function wasserstein(a,b) {
    const x=[...a].sort((u,v)=>u-v), y=[...b].sort((u,v)=>u-v), n=Math.min(1000,Math.max(x.length,y.length));
    let total=0;
    for(let i=0;i<n;i++) total+=Math.abs(x[Math.floor((i+.5)*x.length/n)]-y[Math.floor((i+.5)*y.length/n)]);
    return total/n;
  }
  function metricCompare(real,gen) {
    const a=stats(real), b=stats(gen);
    const keys=[["Среднее","mean"],["СКО","sd"],["Дисперсия","variance"],["Q05","q05"],["Медиана","median"],["Q95","q95"],["Асимметрия","skew"],["Эксцесс","kurtosis"]];
    return keys.map(([label,key])=>{
      const av=key==="q05"?quantile(real,.05):key==="q95"?quantile(real,.95):a[key];
      const bv=key==="q05"?quantile(gen,.05):key==="q95"?quantile(gen,.95):b[key];
      return `<tr><td>${label}</td><td>${fmt(av,5)}</td><td>${fmt(bv,5)}</td><td>${fmt(Math.abs(av-bv),5)}</td></tr>`;
    }).join("");
  }
  function mannWhitneyMedianSplit(rows, xKey, yKey) {
    const cut=quantile(rows.map(r=>r[xKey]),.5);
    const low=rows.filter(r=>r[xKey]<=cut).map(r=>r[yKey]), high=rows.filter(r=>r[xKey]>cut).map(r=>r[yKey]);
    const n1=low.length,n2=high.length;
    if (!n1 || !n2) throw new Error("Разделение по медиане образовало пустую группу; проверьте вариативность признака.");
    const all=low.concat(high), rr=ranks(all);
    const rankSum=rr.slice(0,n1).reduce((s,x)=>s+x,0), U=rankSum-n1*(n1+1)/2;
    const tieCounts = new Map();
    all.forEach(value => tieCounts.set(value, (tieCounts.get(value) || 0) + 1));
    const tieTerm = [...tieCounts.values()].reduce((sum,t)=>sum + (t*t*t-t),0);
    const total=n1+n2;
    const varianceU = n1*n2/12 * ((total+1) - tieTerm/(total*(total-1)));
    const sigma=Math.sqrt(Math.max(0,varianceU));
    const z=sigma>0 ? (U-n1*n2/2-(U>n1*n2/2?.5:-.5))/sigma : 0;
    return {cut,n1,n2,U,p:sigma>0?normalTwoSidedP(z):1,lowMedian:quantile(low,.5),highMedian:quantile(high,.5),rankBiserial:1-2*U/(n1*n2)};
  }
  function samplingConvergence(values, sizes=[10,30,100,300,1000,3000], seed=42) {
    const rng=new MT19937(seed), popMean=mean(values);
    sizes=sizes.filter(n=>n<=values.length);
    function sampleWithoutReplacement(n) {
      const chosen=new Set();
      while(chosen.size<n) chosen.add(Math.floor(rng.random()*values.length));
      let total=0; chosen.forEach(i=>total+=values[i]); return total/n;
    }
    return sizes.map(n=>{
      let errWR=0,errWOR=0,sumWR=0,sumWOR=0,reps=100;
      for(let r=0;r<reps;r++){
        let m=0;
        for(let j=0;j<n;j++) m+=values[Math.floor(rng.random()*values.length)];
        m/=n;
        const mwor=sampleWithoutReplacement(n);
        errWR+=(m-popMean)**2; errWOR+=(mwor-popMean)**2;
        sumWR+=m; sumWOR+=mwor;
      }
      return {n,rmseWR:Math.sqrt(errWR/reps),rmseWOR:Math.sqrt(errWOR/reps),biasWR:sumWR/reps-popMean,biasWOR:sumWOR/reps-popMean};
    });
  }
  function drawConvergence(rows) {
    if(!rows.length)return "";
    const W=620,H=220,p=35,max=Math.max(...rows.flatMap(r=>[r.rmseWR,r.rmseWOR]))||1;
    const x=i=>p+i*(W-2*p)/Math.max(1,rows.length-1), y=v=>H-p-(v/max)*(H-2*p);
    const line=key=>rows.map((r,i)=>`${i?"L":"M"}${x(i)} ${y(r[key])}`).join(" ");
    return `<svg class="ml-chart" viewBox="0 0 ${W} ${H}"><path d="M${p} ${p}V${H-p}H${W-p}" fill="none" stroke="currentColor" opacity=".25"/><path d="${line("rmseWR")}" fill="none" stroke="var(--ml-c1)" stroke-width="3"/><path d="${line("rmseWOR")}" fill="none" stroke="var(--ml-c2)" stroke-width="3"/>${rows.map((r,i)=>`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="10" fill="currentColor">${r.n}</text>`).join("")}</svg>`;
  }

  function navMarkup() {
    const items=[["overview","Обзор"],["dataset","Данные"],["eda","EDA и распределения"],["dependence","Зависимость"],["hypotheses","Гипотезы"],["sampling","Выборки"],["normalization","Масштабирование"],["generator","MT19937"],["limits","Ограничения"],["references","Источники"]];
    return `<div class="nav-label">СТРУКТУРА ИССЛЕДОВАНИЯ</div>${items.map(([id,label],i)=>`<a href="#ml-${id}" class="nav-link"><span class="nav-number">${String(i).padStart(2,"0")}</span>${label}</a>`).join("")}`;
  }
  function render(root, lab) {
    const cfg=CONFIG[lab.id]; if(!cfg)return;
    const old=global.__statLabMolecularState;
    if(old?.abort)old.abort.abort();
    const state={cfg,lab,rows:null,sourceRows:0,invalid:0,abort:null};
    global.__statLabMolecularState=state;
    const nav=$(document,"#sectionNav");
    if(nav)nav.innerHTML=navMarkup();
    setGlobalLabStatus("Загрузка данных…");
    root.innerHTML=`
      <div class="ml-page" style="--ml-c1:${cfg.colors[0]};--ml-c2:${cfg.colors[1]};--ml-c3:${cfg.colors[2]};--ml-l1:${cfg.light[0]};--ml-l2:${cfg.light[1]};--ml-l3:${cfg.light[2]}">
        <section class="ml-hero" id="ml-overview">
          <div><span class="ml-kicker">APPLIED STATISTICS · LAB ${lab.number}</span><h1>${esc(cfg.title)}</h1><p>${esc(cfg.description)}</p>
          <div class="ml-meta"><span>Источник: <b>${esc(cfg.source)}</b></span><span>Целевой генератор: <b>MT19937 + inverse empirical CDF</b></span></div></div>
          <div class="ml-hero-mark">${lab.number}</div>
        </section>
        <section class="ml-section" id="ml-dataset">
          <div class="ml-section-head"><div><span class="ml-kicker">01 · DATASET</span><h2>Паспорт данных</h2></div><span class="ml-status" data-status>Ожидание CSV</span></div>
          <div class="ml-data-panel">
            <div><div class="ml-file-name">${esc(cfg.dataset)}</div><p>Ожидаемый путь: <code>data/${esc(cfg.dataset)}</code></p><p class="ml-muted">CSV создаётся соответствующим ноутбуком. Сайт не подставляет демонстрационные или вымышленные значения.</p></div>
            <div class="ml-actions"><button type="button" class="ml-button" data-reload>Повторить загрузку</button><label class="ml-button ml-button-secondary">Загрузить CSV<input type="file" accept=".csv,text/csv" data-file hidden></label></div>
          </div>
          <div class="ml-metrics" data-overview-metrics><div class="ml-empty">Загрузка ${esc(cfg.dataset)}…</div></div>
          <div class="ml-note" data-load-message>Проверяется наличие файла в папке data/.</div>
        </section>
        <section class="ml-section" id="ml-eda">
          <div class="ml-section-head"><div><span class="ml-kicker">02 · EXPLORATORY DATA ANALYSIS</span><h2>Случайные величины и распределения</h2></div></div>
          <div class="ml-variable-grid" data-variable-cards><div class="ml-empty">Статистика появится после загрузки CSV.</div></div>
          <div class="ml-chart-grid" data-distribution-charts><div class="ml-empty">Гистограммы и Q–Q диагностика появятся после загрузки данных.</div></div>
        </section>
        <section class="ml-section" id="ml-dependence">
          <div class="ml-section-head"><div><span class="ml-kicker">03 · DEPENDENCE</span><h2>Корреляции и зависимости</h2></div></div>
          <p class="ml-section-intro">Нулевая корреляция не доказывает независимость. Сопоставляются линейная связь Пирсона и ранговая связь Спирмена.</p>
          <div class="ml-table-wrap" data-correlations><div class="ml-empty">Матрицы корреляций появятся после загрузки данных.</div></div>
        </section>
        <section class="ml-section" id="ml-hypotheses">
          <div class="ml-section-head"><div><span class="ml-kicker">04 · HYPOTHESIS TESTING</span><h2>Проверка исследовательской гипотезы</h2></div></div>
          <div class="ml-hypothesis" data-hypothesis><div class="ml-empty">Результат критерия Манна–Уитни появится после загрузки данных.</div></div>
        </section>
        <section class="ml-section" id="ml-sampling">
          <div class="ml-section-head"><div><span class="ml-kicker">05 · SAMPLING</span><h2>Выборки и сходимость оценок</h2></div></div>
          <p class="ml-section-intro">Сравниваются выборки с возвращением и без возвращения. RMSE оценивается относительно среднего полной доступной совокупности.</p>
          <div class="ml-table-wrap" data-sampling><div class="ml-empty">Таблица сходимости появится после загрузки данных.</div></div>
        </section>
        <section class="ml-section" id="ml-normalization">
          <div class="ml-section-head"><div><span class="ml-kicker">06 · TRANSFORMATIONS</span><h2>Нормализация и стандартизация</h2></div></div>
          <div class="ml-transform-grid" data-transformations><div class="ml-empty">Сводка преобразований появится после загрузки данных.</div></div>
          <p class="ml-section-intro">StandardScaler центрирует и масштабирует по стандартному отклонению; MinMaxScaler переводит значения в [0, 1]; RobustScaler использует медиану и межквартильный размах. Ранговое нормальное преобразование сохраняет порядок, но не доказывает нормальность исходного признака.</p>
        </section>
        <section class="ml-section" id="ml-generator">
          <div class="ml-section-head"><div><span class="ml-kicker">07 · OWN PRNG</span><h2>Собственный генератор MT19937</h2></div><span class="ml-status">Seed 2026</span></div>
          <div class="ml-generator-intro"><p><b>Реализованный метод:</b> MT19937 формирует равномерные числа U(0,1), после чего обратное эмпирическое квантильное преобразование переводит их в распределение целевой переменной <code>${esc(cfg.target)}</code>.</p><p>Модель обучается только на train; тестовая часть используется для независимой проверки. Генератор одномерный и не моделирует совместную структуру трёх признаков.</p></div>
          <div class="ml-model-grid">
            ${cfg.variables.map((v,i)=>`<article class="ml-model-card"><span>RV 0${i+1} · ${esc(v.symbol)}</span><b>${i===0?"Normal / Student-t":"Lognormal / Gamma"}</b><p>Кандидатные параметрические семейства из ноутбука. Сравнение проводится по AIC и диагностике KS на одной и той же переменной.</p></article>`).join("")}
          </div>
          <p class="ml-muted">Базовые методы ноутбука: эмпирическая выборка с возвращением и обратная эмпирическая CDF (NumPy PRNG). Отдельно реализованный в ноутбуке собственный PRNG — MT19937; именно его проверка на отложенной части запускается ниже.</p>
          <div class="ml-generator-controls"><label>Seed <input type="number" value="2026" min="0" max="4294967295" data-seed></label><button class="ml-button" type="button" data-run-generator>Запустить генератор и тесты</button></div>
          <div data-generator-results><div class="ml-empty">Запусти проверку после загрузки CSV.</div></div>
          <div class="ml-algorithm-table"><h3>Сравнение методов</h3><div class="ml-table-wrap"><table><thead><tr><th>Метод</th><th>Назначение</th><th>Статус в работе</th></tr></thead><tbody>
          <tr><td>MT19937</td><td>Поток равномерных псевдослучайных чисел</td><td><b>Реализован</b></td></tr>
          <tr><td>Обратная эмпирическая CDF</td><td>Преобразование U(0,1) в эмпирическое распределение целевой переменной</td><td><b>Реализована вместе с MT19937</b></td></tr>
          <tr><td>Box–Muller</td><td>Стандартное нормальное распределение</td><td>Теоретическая альтернатива</td></tr>
          <tr><td>Нейман / acceptance–rejection</td><td>Генерация из заданной плотности</td><td>Теоретическая альтернатива</td></tr>
          </tbody></table></div></div>
        </section>
        <section class="ml-section" id="ml-limits">
          <div class="ml-section-head"><div><span class="ml-kicker">08 · INTERPRETATION</span><h2>Интерпретация и ограничения</h2></div></div>
          <div class="ml-limit-grid">
            <article><b>Случайность — в выборе объекта</b><p>Для конкретной молекулы её рассчитанные или измеренные свойства фиксированы. Случайная величина определяется процедурой выбора молекулы из ограниченной совокупности.</p></article>
            <article><b>Не причинность</b><p>Корреляция и различия групп не доказывают причинного влияния одного молекулярного дескриптора на другой.</p></article>
            <article><b>Маргинальная генерация</b><p>MT19937 + квантильное преобразование воспроизводит одномерное распределение целевой величины, но не структуру молекулы и не совместное распределение признаков.</p></article>
          </div>
        </section>
        <section class="ml-section" id="ml-references">
          <div class="ml-section-head"><div><span class="ml-kicker">09 · SOURCES</span><h2>Источники</h2></div></div>
          ${lab.id==="lab-03" ? `<ul class="ml-references"><li><a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener">ChEMBL database</a></li><li><a href="https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services" target="_blank" rel="noopener">ChEMBL Web Services documentation</a></li><li><a href="https://www.ebi.ac.uk/chembl/api/data/target/CHEMBL203.json" target="_blank" rel="noopener">Target CHEMBL203 — EGFR</a></li><li>Matsumoto & Nishimura (1998), Mersenne Twister, DOI: 10.1145/272991.272995</li></ul>` : `<ul class="ml-references"><li><a href="https://doi.org/10.6084/m9.figshare.c.978904.v5" target="_blank" rel="noopener">QM9 original dataset</a></li><li><a href="https://www.tensorflow.org/datasets/catalog/qm9" target="_blank" rel="noopener">TensorFlow Datasets — QM9</a></li><li>Ramakrishnan et al. (2014), Scientific Data, DOI: 10.1038/sdata.2014.22</li><li>Matsumoto & Nishimura (1998), Mersenne Twister, DOI: 10.1145/272991.272995</li></ul>`}
        </section>
      </div>`;
    const clickNav = document.querySelectorAll("#sectionNav .nav-link");
    clickNav.forEach(link=>link.addEventListener("click",e=>{e.preventDefault();root.querySelector(link.getAttribute("href"))?.scrollIntoView({behavior:"smooth"});}));
    root.querySelector("[data-reload]").addEventListener("click",()=>loadDataset(state,root));
    root.querySelector("[data-file]").addEventListener("change",async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      try {
        const content = await file.text();
        if (global.__statLabMolecularState !== state) return;
        await consumeCSV(state,root,content,`локальный файл ${file.name}`);
      } catch(err){setMessage(root,err.message,true);}
      finally { e.target.value = ""; }
    });
    root.querySelector("[data-run-generator]").addEventListener("click",()=>runGenerator(state,root));
    loadDataset(state,root);
  }
  function setMessage(root,msg,error=false) {
    const el=root.querySelector("[data-load-message]"); if(el)el.innerHTML=`<span class="${error?"ml-error":"ml-muted"}">${esc(msg)}</span>`;
  }
  function setGlobalLabStatus(text) {
    const badge = document.getElementById("labStatus");
    if (badge) badge.textContent = text;
  }
  async function loadDataset(state,root) {
    const {cfg}=state;
    if (state.abort) state.abort.abort();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    state.abort = controller;
    root.querySelector("[data-status]").textContent="Загрузка…";
    setMessage(root,`Ищем data/${cfg.dataset}.`);
    try {
      let sourceText = null;
      let origin = `data/${cfg.dataset}`;
      const embedded = typeof global.getStatLabEmbeddedCSV === "function"
        ? global.getStatLabEmbeddedCSV(`./data/${cfg.dataset}`) : null;
      if (global.location?.protocol === "file:") {
        sourceText = embedded;
        if (sourceText !== null && sourceText !== undefined) origin = `резервная копия: ${cfg.dataset}`;
      }
      if (sourceText === null || sourceText === undefined) {
        try {
          const url = new URL(`data/${cfg.dataset}`, global.document.baseURI);
          const response=await fetch(url.href,{
            cache:"no-store",
            ...(controller ? { signal: controller.signal } : {})
          });
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          sourceText = await response.text();
        } catch (fetchError) {
          if (fetchError?.name === "AbortError") throw fetchError;
          if (embedded === null || embedded === undefined) {
            throw new Error(`Не удалось загрузить data/${cfg.dataset}: ${fetchError.message}`);
          }
          sourceText = embedded;
          origin = `резервная копия: ${cfg.dataset}`;
        }
      }
      if (global.__statLabMolecularState !== state) return;
      await consumeCSV(state,root,sourceText,origin);
    } catch(err) {
      if (err?.name === "AbortError" || global.__statLabMolecularState !== state) return;
      root.querySelector("[data-status]").textContent="CSV не подключён";
      setGlobalLabStatus("Ошибка загрузки CSV");
      root.querySelector("[data-overview-metrics]").innerHTML=`<div class="ml-metric"><span>Датасет</span><b>${esc(cfg.dataset)}</b></div><div class="ml-metric"><span>Строки</span><b>—</b></div><div class="ml-metric"><span>Переменные</span><b>3</b></div><div class="ml-metric"><span>Статус</span><b>Ожидание файла</b></div>`;
      setMessage(root,`${err.message} Сформируйте CSV выполнением ноутбука и положите его в папку data/ либо загрузите файл кнопкой выше.`,true);
    }
  }
  async function consumeCSV(state,root,text,origin) {
    const parsed=parseCSV(text), clean=cleanRows(parsed,state.cfg);
    state.rows=clean.rows;state.sourceRows=clean.sourceRows;state.invalid=clean.invalid;state.origin=origin;
    root.querySelector("[data-status]").textContent="Данные загружены";
    setGlobalLabStatus("Данные загружены");
    root.querySelector("[data-overview-metrics]").innerHTML=[
      ["Корректные строки",fmt(clean.rows.length,0)],["Столбцы анализа","3"],["Исключено строк",fmt(clean.invalid,0)],["Источник",origin]
    ].map(([k,v])=>`<div class="ml-metric"><span>${k}</span><b>${esc(v)}</b></div>`).join("");
    const loadedSummary = `Загружено ${fmt(clean.rows.length,0)} наблюдений; исключено ${fmt(clean.invalid,0)} строк из ${fmt(clean.sourceRows,0)}. Одна строка соответствует одной молекуле.`;
    const isFallback = String(origin).startsWith("резервная копия:");
    const localFileNotice = global.location?.protocol === "file:" && isFallback
      ? " Открыта резервная копия: браузер не разрешает странице file:// читать CSV напрямую из папки data/. Для чтения именно файла из data запустите сайт через локальный HTTP-сервер."
      : "";
    setMessage(root,loadedSummary + localFileNotice,false);
    renderAnalytics(state,root);
  }
  function renderAnalytics(state,root) {
    const {cfg,rows}=state;
    root.querySelector("[data-variable-cards]").innerHTML=cfg.variables.map((v,i)=>{
      const x=rows.map(r=>r[v.key]), s=stats(x);
      return `<article class="ml-variable-card" style="--ml-var:${cfg.colors[i]}"><div class="ml-var-top"><span>RV 0${i+1}</span><b>${esc(v.symbol)}</b></div><h3>${esc(v.label)}</h3><p>${esc(v.description)}</p><div class="ml-var-value">${fmt(s.mean)} <small>${esc(v.unit)} · среднее</small></div><div class="ml-stat-grid">${metricRows(s,v.unit)}</div></article>`;
    }).join("");
    root.querySelector("[data-distribution-charts]").innerHTML=cfg.variables.map((v,i)=>{
      const x=rows.map(r=>r[v.key]);
      return `<article class="ml-chart-card"><div class="ml-chart-title"><div><span>RV 0${i+1}</span><h3>${esc(v.symbol)} · ${esc(v.label)}</h3></div><i style="background:${cfg.colors[i]}"></i></div><h4>Эмпирическое распределение</h4>${histogramSVG(x,cfg.colors[i],v.symbol)}<div class="ml-qq-wrap"><div><h4>Q–Q диагностика</h4><p>Сопоставление квантилей с нормальным законом; это диагностика, а не предположение нормальности.</p></div>${qqSVG(x,cfg.colors[i])}</div></article>`;
    }).join("");
    renderDependence(state,root); renderHypothesis(state,root); renderSampling(state,root); renderTransformations(state,root);
  }
  function scatterSVG(rows, xKey, yKey, color, xLabel, yLabel) {
    const W=600,H=270,p=38, sample=rows.length>500?rows.filter((_,i)=>i%Math.ceil(rows.length/500)===0):rows;
    const xs=sample.map(r=>r[xKey]), ys=sample.map(r=>r[yKey]);
    const xmin=xs.reduce((a,b)=>Math.min(a,b),Infinity), xmax=xs.reduce((a,b)=>Math.max(a,b),-Infinity);
    const ymin=ys.reduce((a,b)=>Math.min(a,b),Infinity), ymax=ys.reduce((a,b)=>Math.max(a,b),-Infinity);
    const xr=xmax-xmin||1, yr=ymax-ymin||1;
    const points=sample.map(r=>{
      const x=p+(r[xKey]-xmin)/xr*(W-2*p), y=H-p-(r[yKey]-ymin)/yr*(H-2*p);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${color}" opacity=".35"/>`;
    }).join("");
    return `<svg class="ml-chart" viewBox="0 0 ${W} ${H}"><path d="M${p} ${p}V${H-p}H${W-p}" fill="none" stroke="currentColor" opacity=".25"/>${points}<text x="${p}" y="${H-7}" font-size="10" fill="currentColor">${fmt(xmin,2)}</text><text x="${W-p}" y="${H-7}" text-anchor="end" font-size="10" fill="currentColor">${fmt(xmax,2)}</text><text x="${p}" y="14" font-size="10" fill="currentColor">${esc(yLabel)} · ${fmt(ymax,2)}</text><text x="${W-p}" y="14" text-anchor="end" font-size="10" fill="currentColor">${esc(xLabel)}</text></svg>`;
  }
  function ecdfCompareSVG(real, generated, color, light) {
    const W=600,H=230,p=30, n=240, a=[...real].sort((x,y)=>x-y), b=[...generated].sort((x,y)=>x-y);
    const min=Math.min(a[0],b[0]), max=Math.max(a.at(-1),b.at(-1)), span=max-min||1;
    const path=arr=>arr.filter((_,i)=>i%Math.max(1,Math.floor(arr.length/n))===0).map((v,i)=>`${i?"L":"M"}${p+(v-min)/span*(W-2*p)} ${H-p-(Math.floor(i*Math.max(1,Math.floor(arr.length/n)))/arr.length)*(H-2*p)}`).join(" ");
    return `<svg class="ml-chart" viewBox="0 0 ${W} ${H}"><path d="M${p} ${p}V${H-p}H${W-p}" fill="none" stroke="currentColor" opacity=".25"/><path d="${path(a)}" fill="none" stroke="${color}" stroke-width="2.5"/><path d="${path(b)}" fill="none" stroke="${light}" stroke-width="2.5"/><text x="${p}" y="${H-7}" font-size="10" fill="currentColor">${fmt(min,2)}</text><text x="${W-p}" y="${H-7}" text-anchor="end" font-size="10" fill="currentColor">${fmt(max,2)}</text></svg>`;
  }
  function qqCompareSVG(real, generated, color) {
    const W=320,H=240,p=28, probs=Array.from({length:49},(_,i)=>(i+.5)/49);
    const a=[...real].sort((x,y)=>x-y),b=[...generated].sort((x,y)=>x-y);
    const qa=probs.map(q=>quantile(a,q)),qb=probs.map(q=>quantile(b,q));
    const min=Math.min(...qa,...qb),max=Math.max(...qa,...qb),span=max-min||1;
    const points=qa.map((v,i)=>`<circle cx="${p+(v-min)/span*(W-2*p)}" cy="${H-p-(qb[i]-min)/span*(H-2*p)}" r="2.5" fill="${color}" opacity=".7"/>`).join("");
    return `<svg class="ml-qq" viewBox="0 0 ${W} ${H}"><path d="M${p} ${H-p}L${W-p} ${p}" stroke="#8B929A" stroke-dasharray="4 4"/><path d="M${p} ${p}V${H-p}H${W-p}" fill="none" stroke="currentColor" opacity=".25"/>${points}</svg>`;
  }

  function renderDependence(state,root) {
    const {cfg,rows}=state, keys=cfg.expected;
    const pearson=[],spearman=[];
    keys.forEach(a=>{const p=[],s=[];keys.forEach(b=>{
      const x=rows.map(r=>r[a]),y=rows.map(r=>r[b]);p.push(corr(x,y));s.push(corr(ranks(x),ranks(y)));
    });pearson.push(p);spearman.push(s);});
    const matrix=(name,data)=>`<h3>${name}</h3><table><thead><tr><th>Переменная</th>${cfg.variables.map(v=>`<th>${esc(v.symbol)}</th>`).join("")}</tr></thead><tbody>${cfg.variables.map((v,i)=>`<tr><th>${esc(v.symbol)}</th>${data[i].map((x,j)=>`<td><span class="ml-corr" style="--corr:${Math.min(1,Math.abs(x))};--corr-color:${x>=0?"#23866D":"#B44B5B"}">${fmt(x,3)}</span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const pairs=[];
    for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){
      const x=rows.map(r=>r[keys[i]]),y=rows.map(r=>r[keys[j]]);
      const rho=corr(ranks(x),ranks(y)), r=corr(x,y);
      pairs.push(`<article class="ml-chart-card"><h3>${esc(cfg.variables[i].symbol)} × ${esc(cfg.variables[j].symbol)}</h3><div class="ml-pair-metrics"><span>Pearson r <b>${fmt(r,4)}</b></span><span>Spearman ρ <b>${fmt(rho,4)}</b></span></div>${scatterSVG(rows,keys[i],keys[j],cfg.colors[i],cfg.variables[i].symbol,cfg.variables[j].symbol)}</article>`);
    }
    root.querySelector("[data-correlations]").innerHTML=matrix("Пирсон · линейная связь",pearson)+matrix("Спирмен · ранговая связь",spearman)+`<div class="ml-scatter-grid">${pairs.join("")}</div><p class="ml-muted">Корреляции рассчитаны по ${fmt(rows.length,0)} полным наблюдениям. Диаграммы показывают подвыборку до 500 точек, чтобы сохранить отзывчивость интерфейса. Значения коэффициентов не являются доказательством причинности или независимости.</p>`;
  }
  function renderHypothesis(state,root) {
    const {cfg,rows}=state;
    const xKey=cfg.hypothesisX;
    const yKey=cfg.hypothesisY;
    const res=mannWhitneyMedianSplit(rows,xKey,yKey);
    const xLabel=cfg.variables.find(v=>v.key===xKey)?.symbol||xKey;
    const yLabel=cfg.variables.find(v=>v.key===yKey)?.symbol||yKey;
    root.querySelector("[data-hypothesis]").innerHTML=`
      <div class="ml-hypothesis-copy"><span class="ml-kicker">MANN–WHITNEY U · MEDIAN SPLIT</span><h3>Различается ли распределение ${esc(yLabel)} между двумя группами?</h3>
      <p>Группы сформированы делением ${esc(xLabel)} по медиане (${fmt(res.cut)}): значения ниже/равные медиане и выше медианы.</p>
      <p><b>H₀:</b> распределения целевой величины в двух независимых группах одинаковы.<br><b>H₁:</b> распределения различаются.</p></div>
      <div class="ml-hypothesis-results">
        ${[["U statistic",fmt(res.U,1)],["p-value (normal approx.)",fmt(res.p,6)],["Rank-biserial r",fmt(res.rankBiserial,4)],["Медиана группы ≤",fmt(res.lowMedian)],["Медиана группы >",fmt(res.highMedian)],["Размеры групп",`${fmt(res.n1,0)} / ${fmt(res.n2,0)}`]].map(([k,v])=>`<div class="ml-stat"><span>${k}</span><b>${v}</b></div>`).join("")}
      </div><div class="ml-note">При α = 0,05 ${res.p<.05?"есть статистические основания отвергнуть H₀":"нет статистических оснований отвергнуть H₀"}. Для большой выборки даже слабый эффект может давать малое p-value; интерпретируйте результат вместе с размером эффекта. p-value рассчитан нормальной аппроксимацией U-критерия с поправкой на непрерывность; точная реализация SciPy может дать небольшое отличие.</div>`;
  }
  function renderSampling(state,root) {
    const {cfg,rows}=state;
    root.querySelector("[data-sampling]").innerHTML=cfg.variables.map((v,i)=>{
      const values=rows.map(r=>r[v.key]), conv=samplingConvergence(values,cfg.samplingSizes,42+i);
      const n=Math.min(1000,values.length), rng=new MT19937(150+i), wr=Array.from({length:n},()=>values[Math.floor(rng.random()*values.length)]);
      const chosen=new Set();while(chosen.size<n)chosen.add(Math.floor(rng.random()*values.length));
      const wor=Array.from(chosen,j=>values[j]), pop=stats(values), swr=stats(wr),swor=stats(wor);
      return `<div class="ml-sampling-variable"><h3>${esc(v.symbol)} · ${esc(v.label)}</h3><div class="ml-legend"><span><i style="background:var(--ml-c1)"></i>С возвращением</span><span><i style="background:var(--ml-c2)"></i>Без возвращения</span></div>${drawConvergence(conv)}<table><thead><tr><th>n</th><th>RMSE · с возвращением</th><th>RMSE · без возвращения</th><th>Bias · с возвращением</th><th>Bias · без возвращения</th></tr></thead><tbody>${conv.map(r=>`<tr><td>${r.n}</td><td>${fmt(r.rmseWR,5)}</td><td>${fmt(r.rmseWOR,5)}</td><td>${fmt(r.biasWR,5)}</td><td>${fmt(r.biasWOR,5)}</td></tr>`).join("")}</tbody></table><h4>Сравнение одной выборки (n = ${n})</h4><div class="ml-table-wrap"><table><thead><tr><th>Показатель</th><th>Совокупность</th><th>С возвращением</th><th>Без возвращения</th></tr></thead><tbody>${[["Среднее","mean"],["Дисперсия","variance"],["СКО","sd"],["Медиана","median"]].map(([label,key])=>`<tr><td>${label}</td><td>${fmt(pop[key],5)}</td><td>${fmt(swr[key],5)}</td><td>${fmt(swor[key],5)}</td></tr>`).join("")}</tbody></table></div></div>`;
    }).join("")+`<p class="ml-muted">100 повторений на каждом размере; оценки сравниваются со средним доступной совокупности. Для каждой величины сравниваются две схемы отбора.</p>`;
  }
  function renderTransformations(state,root) {
    const {cfg,rows}=state;
    root.querySelector("[data-transformations]").innerHTML=cfg.variables.map((v,i)=>{
      const x=rows.map(r=>r[v.key]), s=stats(x), iqr=s.q3-s.q1;
      const rankNormal=ranks(x).map(rank=>normalQuantile((rank-.5)/x.length));
      const zMean=mean(x.map(z=>(z-s.mean)/s.sd)), zSd=Math.sqrt(variance(x.map(z=>(z-s.mean)/s.sd)));
      return `<article class="ml-transform-card" style="--ml-var:${cfg.colors[i]}"><b>${esc(v.symbol)}</b><h3>${esc(v.label)}</h3><div class="ml-stat"><span>StandardScaler · mean / SD</span><b>${fmt(zMean,4)} / ${fmt(zSd,4)}</b></div><div class="ml-stat"><span>MinMax · min / max</span><b>0 / 1</b></div><div class="ml-stat"><span>Robust · median / IQR</span><b>0 / ${fmt(iqr===0?0:1,3)}</b></div><div class="ml-stat"><span>Rank-normal · mean / SD</span><b>${fmt(mean(rankNormal),3)} / ${fmt(Math.sqrt(variance(rankNormal)),3)}</b></div></article>`;
    }).join("");
  }
  function runGenerator(state,root) {
    const {cfg,rows}=state, seed=Math.max(0,Number(root.querySelector("[data-seed]").value)||2026)>>>0;
    const values=rows.map(r=>r[cfg.target]), split=shuffleSplit(values,42);
    const generated=mtQuantileGenerator(split.train,split.test.length,seed);
    const real=split.test, ks=ksStatistic(real,generated), wd=wasserstein(real,generated);
    const uTest=new MT19937(5489), expected=[3499211612,581869302,3890346734,3586334585,545404204], observed=expected.map(()=>uTest.uint32());
    const testPassed=observed.every((v,i)=>v===expected[i]);
    const sameA=mtQuantileGenerator(split.train,20,seed), sameB=mtQuantileGenerator(split.train,20,seed);
    const different=mtQuantileGenerator(split.train,20,(seed+1)>>>0);
    const reproducible=sameA.every((v,i)=>v===sameB[i]);
    const seedChanges=sameA.some((v,i)=>v!==different[i]);
    const uniformRng=new MT19937(seed), uniforms=Array.from({length:100000},()=>uniformRng.random());
    const sortedU=[...uniforms].sort((a,b)=>a-b);
    let ksU=0, bins=Array(20).fill(0), lagNum=0, lagA=0, lagB=0;
    for(let i=0;i<uniforms.length;i++){ksU=Math.max(ksU,Math.abs((i+1)/uniforms.length-sortedU[i]),Math.abs(i/uniforms.length-sortedU[i]));bins[Math.min(19,Math.floor(uniforms[i]*20))]++;}
    const chi2=bins.reduce((s,n)=>s+(n-5000)**2/5000,0);
    const muU=mean(uniforms);
    for(let i=0;i<uniforms.length-1;i++){lagNum+=(uniforms[i]-muU)*(uniforms[i+1]-muU);lagA+=(uniforms[i]-muU)**2;lagB+=(uniforms[i+1]-muU)**2;}
    const lag1=lagNum/Math.sqrt(lagA*lagB);
    const inRange=uniforms.every(u=>u>0&&u<1);
    const out=root.querySelector("[data-generator-results]");
    out.innerHTML=`
      <div class="ml-metrics ml-generator-metrics">${[["Train",fmt(split.train.length,0)],["Test",fmt(split.test.length,0)],["KS statistic · test vs generated",fmt(ks,5)],["Wasserstein distance",fmt(wd,5)]].map(([k,v])=>`<div class="ml-metric"><span>${k}</span><b>${v}</b></div>`).join("")}</div>
      <div class="ml-test-status"><span class="${testPassed?"ml-pass":"ml-error"}">${testPassed?"✓ Эталонная последовательность MT19937 совпала":"✕ Ошибка эталонной последовательности"}</span><span class="${reproducible?"ml-pass":"ml-error"}">${reproducible?"✓ Одинаковый seed воспроизводим":"✕ Ошибка воспроизводимости"}</span><span class="${seedChanges?"ml-pass":"ml-error"}">${seedChanges?"✓ Другой seed меняет поток":"✕ Seed не изменил поток"}</span><span class="${inRange?"ml-pass":"ml-error"}">${inRange?"✓ U строго внутри (0, 1)":"✕ Нарушен диапазон U"}</span></div>
      <div class="ml-table-wrap"><table><thead><tr><th>Диагностика равномерного потока</th><th>Значение</th><th>Интерпретация</th></tr></thead><tbody><tr><td>KS statistic vs U(0,1)</td><td>${fmt(ksU,6)}</td><td>Расстояние между ECDF и равномерной CDF</td></tr><tr><td>χ² · 20 интервалов</td><td>${fmt(chi2,3)}</td><td>Проверка равномерности частот</td></tr><tr><td>Lag-1 correlation</td><td>${fmt(lag1,6)}</td><td>Корреляция соседних значений</td></tr></tbody></table></div>
      <div class="ml-table-wrap"><table><thead><tr><th>Метрика</th><th>Test</th><th>MT19937 + inverse CDF</th><th>|Разница|</th></tr></thead><tbody>${metricCompare(real,generated)}</tbody></table></div>
      <div class="ml-chart-grid ml-generator-charts"><article class="ml-chart-card"><h3>Распределения теста и генератора</h3>${histogramSVG(real,cfg.colors[0],"test")}<p>Тестовая выборка — насыщенный цвет; генератор — светлый оттенок той же цветовой семьи.</p>${histogramSVG(generated,cfg.light[0],"MT19937")}</article><article class="ml-chart-card"><h3>Эмпирические функции распределения</h3>${ecdfCompareSVG(real,generated,cfg.colors[0],cfg.light[0])}<div class="ml-legend"><span><i style="background:var(--ml-c1)"></i>Тест</span><span><i style="background:var(--ml-l1)"></i>MT19937</span></div><h4>Сопоставление квантилей (Q–Q)</h4>${qqCompareSVG(real,generated,cfg.colors[0])}</article></div>
      <div class="ml-note">Генератор обучен на train и не использует test при построении квантильной функции. KS statistic и Wasserstein distance сравнивают тестовые и сгенерированные значения. KS p-value намеренно не выдаётся как доказательство качества: в ноутбуке основная диагностика включает статистики, распределения и расстояние Васерштейна. Собственный MT19937 — детерминированный PRNG, не криптографический источник случайности.</div>`;
  }

  function selfTest() {
    const rng = new MT19937(5489);
    const expected = [3499211612,581869302,3890346734,3586334585,545404204];
    const observed = expected.map(() => rng.uint32());
    const sample = mtQuantileGenerator([1,2,3,4,5,6], 1000, 2026);
    return {
      mt19937_reference: observed.every((value, i) => value === expected[i]),
      quantile_generator_range: sample.every(value => value >= 1 && value <= 6),
      reproducibility: JSON.stringify(sample) === JSON.stringify(mtQuantileGenerator([1,2,3,4,5,6], 1000, 2026)),
      csv_parser_comma: parseCSV("a,b\n1,2\n3,4").length === 2,
      csv_parser_semicolon: parseCSV('a;b\n1;2\n3;4').length === 2,
      sample_count: sample.length
    };
  }
  global.StatLabMolecular = Object.freeze({render, selfTest, destroy(){const state=global.__statLabMolecularState;if(state?.abort)state.abort.abort();global.__statLabMolecularState=null;}});
})(window);
