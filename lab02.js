/*
 * STAT LAB — Laboratory 02: AqSolDB
 * Isolated presentation and interactive analysis. Does not modify Lab 01 logic.
 */
(function (global) {
    "use strict";

    const DATA_URL = "./data/aqsoldb.csv";
    const COLORS = ["#2a6f97", "#e76f51", "#2a9d8f"];
    const VARIABLES = [
        { key: "Solubility", id: "logs", code: "RV 01", name: "Растворимость в воде", symbol: "LogS", unit: "log₁₀(моль/л)", color: COLORS[0], definition: "Десятичный логарифм молярной растворимости вещества в воде. Это экспериментальная величина: на неё влияют температура, pH, методика измерения и качество исходных источников.", random: "Для одного соединения повторные измерения могут различаться из-за экспериментального шума. Дополнительная вариативность возникает из-за объединения нескольких источников данных.", model: "Смесь нормальных распределений, K = 3", ks: "0,01112", p: "0,3802", modelNote: "Смесь лучше одиночных моделей воспроизводит левую асимметрию и квантили. Skew-normal — лучший одиночный кандидат.", evidence: "Повторные измерения есть у 2 236 соединений (22,4%); среднее SD повторов — 0,301, медиана — 0,132 LogS. Случайный лес предсказывает LogS по другим дескрипторам с R²(CV) = 0,774 и RMSE = 1,126, то есть остаточная вариативность сохраняется." },
        { key: "MolLogP", id: "logp", code: "RV 02", name: "Липофильность", symbol: "Mol LogP", unit: "безразмерная", color: COLORS[1], definition: "Десятичный логарифм коэффициента распределения вещества между октанолом и водой. В AqSolDB это расчётный дескриптор молекулярной структуры.", random: "Для фиксированной структуры значение детерминировано. Случайность появляется при выборе молекулы из огромного химического пространства; неполнота дескрипторов оставляет модельную неопределённость.", model: "Распределение Стьюдента, ν ≈ 2,4", ks: "0,01089", p: "0,4055", modelNote: "Тяжёлые хвосты плохо описываются нормальным законом. Student t воспроизводит их существенно лучше.", evidence: "Для фиксированной структуры LogP расчётный. Случайный лес по остальным числовым дескрипторам даёт R²(CV) = 0,8658 и RMSE = 1,289; неполное предсказание отражает ограниченность набора признаков и разнообразие структур." },
        { key: "MolWt", id: "molwt", code: "RV 03", name: "Молекулярная масса", symbol: "Mol Wt", unit: "г/моль", color: COLORS[2], definition: "Сумма атомных масс всех атомов молекулярной структуры. Для конкретной структуры это детерминированная характеристика.", random: "Стохастичность связана с выборкой молекул из химического пространства: в выборке встречаются соединения разного размера, от небольших молекул до редких макромолекул.", model: "Смесь логнормальных распределений, K = 3", ks: "0,0120", p: "0,291", modelNote: "Смесь логнормальных сохраняет положительный носитель и лучше одиночной логнормальной модели описывает длинный правый хвост.", evidence: "Для одной молекулы масса детерминирована. Линейная регрессия по другим дескрипторам даёт R²(CV) = 0,9673 и RMSE = 33,31 г/моль: масса почти определяется числом тяжёлых атомов, но модель не восстанавливает её идеально." }
    ];

    const NAV = [
        ["overview", "Обзор", "00"], ["dataset", "Датасет", "01"],
        ["variables", "Случайные величины", "02"], ["dependence", "Зависимость", "03"],
        ["hypotheses", "Проверка гипотез", "04"], ["sampling", "Выборки", "05"],
        ["methods", "Методы и распределения", "06"], ["generator", "Генераторы", "07"],
        ["conclusions", "Выводы", "08"], ["references", "Источники", "09"]
    ];

    let rows = null;
    let loadPromise = null;
    let activeVariable = "Solubility";
    let sectionObserver = null;

    const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const fmt = (value, digits = 3) => Number.isFinite(value) ? value.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";
    const numeric = key => (rows || []).map(row => row[key]).filter(Number.isFinite);

    function parseCSV(text) {
        const table = [];
        let row = [], cell = "", quoted = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
                else quoted = !quoted;
            } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
            else if (ch === "\n" && !quoted) { row.push(cell.replace(/\r$/, "")); if (row.some(v => v !== "")) table.push(row); row = []; cell = ""; }
            else cell += ch;
        }
        row.push(cell.replace(/\r$/, ""));
        if (row.some(v => v !== "")) table.push(row);
        if (table.length < 2) throw new Error("CSV не содержит наблюдений.");
        const headers = table[0].map(v => v.trim());
        const required = ["Solubility", "MolLogP", "MolWt", "NumAromaticRings", "Group"];
        const indexes = Object.fromEntries(required.map(name => [name, headers.indexOf(name)]));
        const missing = required.filter(name => indexes[name] < 0);
        if (missing.length) throw new Error(`В AqSolDB отсутствуют столбцы: ${missing.join(", ")}`);
        return table.slice(1).map(cells => {
            const item = { Group: cells[indexes.Group] };
            required.filter(k => k !== "Group").forEach(k => item[k] = Number(cells[indexes[k]]));
            return item;
        }).filter(item => required.filter(k => k !== "Group").every(k => Number.isFinite(item[k])));
    }

    async function loadData() {
        if (rows) return rows;
        if (loadPromise) return loadPromise;
        const embedded = typeof window.getStatLabEmbeddedCSV === "function"
            ? window.getStatLabEmbeddedCSV(DATA_URL) : null;
        const sourcePromise = (window.location.protocol === "file:" && embedded !== null)
            ? Promise.resolve(embedded)
            : fetch(new URL(DATA_URL, document.baseURI).href).then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            }).catch(error => {
                if (embedded !== null) return embedded;
                throw new Error(`Не удалось загрузить ${DATA_URL}: ${error.message}`);
            });
        loadPromise = sourcePromise.then(parseCSV)
            .then(data => { rows = data; return rows; })
            .catch(error => { loadPromise = null; throw error; });
        return loadPromise;
    }

    function mean(values) { return values.reduce((a, b) => a + b, 0) / values.length; }
    function variance(values) { const m = mean(values); return values.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, values.length - 1); }
    function quantile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }
    function describe(values) {
        const m = mean(values), v = variance(values), sd = Math.sqrt(v);
        // Skewness and excess kurtosis use population central moments (as scipy.stats.skew/kurtosis).
        const populationSd = Math.sqrt(values.reduce((sum, x) => sum + (x - m) ** 2, 0) / values.length) || 1;
        const m3 = values.reduce((sum, x) => sum + ((x - m) / populationSd) ** 3, 0) / values.length;
        const m4 = values.reduce((sum, x) => sum + ((x - m) / populationSd) ** 4, 0) / values.length;
        const q1 = quantile(values, .25), q3 = quantile(values, .75), iqr = q3 - q1;
        return { n: values.length, mean: m, median: quantile(values, .5), variance: v, sd, cv: m !== 0 ? sd / m : NaN, min: Math.min(...values), max: Math.max(...values), q1, q3, skew: m3, kurtosis: m4 - 3, outliers: values.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).length };
    }
    function ranks(values) {
        const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
        const out = Array(values.length);
        for (let i = 0; i < order.length;) {
            let j = i + 1; while (j < order.length && order[j][0] === order[i][0]) j++;
            const rank = (i + 1 + j) / 2;
            for (let k = i; k < j; k++) out[order[k][1]] = rank;
            i = j;
        }
        return out;
    }
    function correlation(a, b) {
        const ma = mean(a), mb = mean(b);
        let num = 0, da = 0, db = 0;
        for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
        return num / Math.sqrt(da * db);
    }
    function paired(keyA, keyB) {
        const a = [], b = [];
        rows.forEach(row => { if (Number.isFinite(row[keyA]) && Number.isFinite(row[keyB])) { a.push(row[keyA]); b.push(row[keyB]); } });
        return { a, b };
    }
    function histogram(values, color, bins = 34) {
        const min = Math.min(...values), max = Math.max(...values), width = (max - min) / bins || 1;
        const counts = Array(bins).fill(0);
        values.forEach(x => counts[Math.min(bins - 1, Math.floor((x - min) / width))]++);
        const peak = Math.max(...counts), barWidth = 560 / bins;
        const bars = counts.map((count, i) => `<rect x="${20 + i * barWidth}" y="${190 - count / peak * 150}" width="${Math.max(1, barWidth - 2)}" height="${count / peak * 150}" rx="2" fill="${color}" opacity=".82"/>`).join("");
        return `<svg class="lab02-chart" viewBox="0 0 600 230" role="img" aria-label="Гистограмма распределения"><line x1="20" y1="190" x2="580" y2="190" stroke="currentColor" opacity=".35"/>${bars}<text x="20" y="214">${fmt(min, 2)}</text><text x="580" y="214" text-anchor="end">${fmt(max, 2)}</text></svg>`;
    }
    function metric(label, value, note = "") { return `<div class="lab02-metric"><span>${escape(label)}</span><strong>${escape(value)}</strong>${note ? `<small>${escape(note)}</small>` : ""}</div>`; }
    function section(id, eyebrow, title, description, body) {
        return `<section class="section lab02-section" id="${id}"><div class="section-heading"><span class="tag">${eyebrow}</span><h2>${title}</h2><p class="muted">${description}</p></div>${body}</section>`;
    }

    function renderShell() {
        return `
        <section class="hero lab02-hero" id="overview">
            <div class="hero-content"><div class="eyebrow">APPLIED STATISTICS · LABORATORY 02</div>
            <h1>AqSolDB — свойства химических соединений</h1>
            <p>Исследование растворимости, липофильности и молекулярной массы как случайных величин. Два спринта: статистический анализ и построение генераторов распределений.</p>
            <div class="hero-meta"><span><b>9 982</b> наблюдения</span><span><b>3</b> случайные величины</span><span><b>2</b> спринта</span></div></div>
        </section>
        <div class="grid metrics lab02-overview-metrics">${metric("Наблюдения", "9 982", "AqSolDB")}${metric("Признаки", "26", "столбцов")}${metric("Пропуски в RV", "0", "по трём выбранным величинам")}${metric("Источники", "9", "публичных баз данных")}</div>
        ${section("dataset", "01 / DATASET", "Датасет и подготовка", "AqSolDB: объединённый набор данных растворимости и молекулярных дескрипторов.", `
            <div class="card"><div class="section-head"><div><span class="tag">OPENML · ID 43546</span><h3>AqSolDB</h3></div><span class="experiment-status">● DATA LOADED LOCALLY</span></div>
            <p>Каждая строка описывает химическое соединение: экспериментально или расчётно определённые свойства и структурные дескрипторы. Набор объединяет девять публичных источников; для повторных значений растворимости использовались медианы или наиболее авторитетные записи. Для наблюдений предусмотрены группы надёжности G1–G5.</p>
            <div class="lab02-data-status" id="lab02DataStatus">Загрузка локального CSV…</div>
            <div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Поле</th><th>Содержание</th><th>Роль</th></tr></thead><tbody>
            <tr><td>Solubility</td><td>LogS, log₁₀(моль/л)</td><td>Экспериментальная величина</td></tr><tr><td>MolLogP</td><td>Липофильность</td><td>Расчётный дескриптор</td></tr><tr><td>MolWt</td><td>Молекулярная масса, г/моль</td><td>Расчётный дескриптор</td></tr><tr><td>NumAromaticRings</td><td>Количество ароматических колец</td><td>Группирующий признак</td></tr><tr><td>Group</td><td>Группа надёжности G1–G5</td><td>Группирующий признак</td></tr>
            </tbody></table></div><p class="muted">Источник: <a href="https://www.openml.org/d/43546" target="_blank" rel="noopener">OpenML dataset 43546 ↗</a>. CSV поставляется вместе с проектом и не требует загрузки из внешнего сервиса.</p></div>
        `)}
        ${section("variables", "02 / RANDOM VARIABLES", "Три случайные величины", "Изучи описательную статистику, форму распределения и выбросы каждой величины.", `
            <div class="card"><div class="lab02-variable-tabs" role="tablist">${VARIABLES.map(v => `<button type="button" class="lab02-tab ${v.key === activeVariable ? "is-active" : ""}" data-lab02-variable="${v.key}" role="tab" aria-selected="${v.key === activeVariable}">${v.code} · ${v.symbol}</button>`).join("")}</div><div id="lab02VariableDetail"><div class="empty-state">Рассчитываем статистики…</div></div></div>
        `)}
        ${section("dependence", "03 / DEPENDENCE", "Анализ зависимости", "Корреляции Пирсона и Спирмена для пар величин. Нулевая корреляция сама по себе не доказывает независимость.", `<div class="card"><div id="lab02Dependence"></div></div>`)}
        ${section("hypotheses", "04 / INFERENCE", "Проверка гипотез", "Три гипотезы из исследования: влияние ароматических колец на LogS, различия Mol Wt между группами надёжности и связь липофильности с растворимостью.", `
            <div class="grid two-col"><div class="card"><span class="tag">HYPOTHESIS 01 · MANN–WHITNEY</span><h3>Ароматические кольца и растворимость</h3><p>H₀: распределения LogS одинаковы у соединений с ароматическими кольцами и без них.</p><p>H₁: распределения различаются.</p><div class="lab02-result-grid">${metric("n: с кольцами", "5 853")}${metric("n: без колец", "4 129")}${metric("Медианы", "−3,040 / −1,711")}${metric("Размер эффекта", "−0,341", "ранговая бисериальная корреляция")}</div><div class="lab02-test-result"><b>U = 7,96 × 10⁶</b><span>p = 6,768 × 10⁻¹⁸⁶</span></div><p class="muted">При α = 0,05 H₀ отвергается. В выборке соединения с ароматическими кольцами имеют более низкую медианную растворимость.</p></div>
            <div class="card"><span class="tag">HYPOTHESIS 02 · KRUSKAL–WALLIS</span><h3>Молекулярная масса и надёжность данных</h3><p>H₀: распределения Mol Wt в группах G1–G5 одинаковы.</p><p>H₁: хотя бы одна группа отличается.</p><div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Группа</th><th>n</th><th>Медиана, г/моль</th></tr></thead><tbody><tr><td>G1</td><td>7 746</td><td>237,255</td></tr><tr><td>G2</td><td>235</td><td>284,428</td></tr><tr><td>G3</td><td>1 182</td><td>200,250</td></tr><tr><td>G4</td><td>183</td><td>227,076</td></tr><tr><td>G5</td><td>636</td><td>171,712</td></tr></tbody></table></div><div class="lab02-test-result"><b>H = 292,4</b><span>p = 4,777 × 10⁻⁶²</span></div><p class="muted">При α = 0,05 H₀ отвергается. Статистическая значимость не означает автоматически большого практического эффекта.</p></div></div>
            <div class="card lab02-hypothesis-third"><span class="tag">HYPOTHESIS 03 · MANN–WHITNEY</span><h3>Липофильность и растворимость</h3><p>Проверяется, выше ли Mol LogP у практически нерастворимых соединений (LogS &lt; −4), чем у хорошо растворимых (LogS ≥ −2). H₀: медианы равны; H₁: медиана первой группы выше.</p><div class="lab02-result-grid">${metric("n: LogS &lt; −4", "2 870")}${metric("n: LogS ≥ −2", "3 903")}${metric("Медианы LogP", "4,226 / 0,679")}${metric("Размер эффекта", "0,8503", "ранговая бисериальная корреляция")}</div><div class="lab02-test-result"><b>U = 1,036 × 10⁷</b><span>p-value ≈ 0</span></div><p class="muted">H₀ отвергается. Более гидрофобные соединения в этой выборке имеют более низкую растворимость. Нулевое отображение p-value связано с округлением численного результата.</p></div>
            <div class="note lab02-note"><label for="lab02Alpha">Уровень значимости α</label><select id="lab02Alpha" class="select"><option value="0.01">0,01</option><option value="0.05" selected>0,05</option><option value="0.10">0,10</option></select><p id="lab02AlphaResult">Все три теста статистически значимы при α = 0,05.</p></div>
        `)}
        ${section("sampling", "05 / SAMPLING", "Выборки и состоятельность оценок", "Проведи моделирование выборочного среднего с возвращением и без возвращения из конечной совокупности AqSolDB.", `
            <div class="card"><div class="lab02-controls"><div><label for="lab02SampleVariable">Случайная величина</label><select id="lab02SampleVariable" class="select">${VARIABLES.map(v => `<option value="${v.key}">${v.symbol}</option>`).join("")}</select></div><div><label for="lab02SampleSize">Объём выборки n: <b id="lab02SampleSizeOut">500</b></label><input id="lab02SampleSize" type="range" min="10" max="3000" step="10" value="500"></div></div><button type="button" class="button-primary" id="lab02RunSampling">Запустить 300 повторений</button><div id="lab02SamplingResult" class="lab02-sampling-result"><p class="muted">Выбери размер выборки и запусти эксперимент.</p></div></div>
            <div class="note">Для выборки без возвращения применяется поправка на конечность генеральной совокупности: Var(X̄) = s²/n · (N−n)/(N−1). При большом N различие с выборкой с возвращением невелико.</div>
        `)}
        ${section("methods", "06 / METHODS", "Нормализация и модели распределений", "Сопоставление преобразований и одиночных семейств распределений по AIC/BIC и статистике KS D.", `
            <div class="grid two-col"><div class="card"><span class="tag">NORMALIZATION</span><h3>Преобразования данных</h3><div class="lab02-method-list"><div><b>Z-score</b><span>Центрирование и масштабирование; форма распределения сохраняется.</span></div><div><b>Min–Max</b><span>Перенос значений в [0, 1]; форма распределения сохраняется.</span></div><div><b>Yeo–Johnson</b><span>Мощностное преобразование, способное уменьшать асимметрию.</span></div><div><b>Quantile → N(0,1)</b><span>Квантильное преобразование к нормальной шкале; меняет форму распределения.</span></div><div><b>Box–Cox</b><span>Дополнительно применим для строго положительных данных.</span></div></div></div>
            <div class="card"><span class="tag">MODEL SELECTION</span><h3>Лучшие одиночные кандидаты</h3><div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Величина</th><th>Модель</th><th>KS D</th></tr></thead><tbody><tr><td>LogS</td><td>Skew-normal</td><td>0,0204</td></tr><tr><td>Mol LogP</td><td>Student t (ν≈2,4)</td><td>0,01109</td></tr><tr><td>Mol Wt</td><td>Lognormal</td><td>0,03201</td></tr></tbody></table></div><p class="muted">KS D используется как мера расхождения. Обычный p-value KS некорректен, если параметры распределения оценены на тех же данных; для формальной проверки нужна поправка Лиллиефорса или параметрический bootstrap.</p></div></div>
        `)}
        ${section("generator", "07 / GENERATORS", "Спринт 2 — генераторы случайных величин", "Собственные равномерные датчики и методы построения генераторов для трёх исследуемых распределений.", `
            <div class="card"><span class="tag">BASE U(0,1)</span><h3>Базовые датчики</h3><div class="grid two-col"><div><h4>Линейный конгруэнтный генератор</h4><p class="muted">Xₙ₊₁ = (aXₙ + c) mod m. Полный период смешанного ЛКГ обеспечивают условия Халла–Добелла.</p><b>Основной учебный вариант: m = 2³²</b></div><div><h4>MT19937 — Вихрь Мерсенна</h4><p class="muted">32-битный генератор с периодом 2¹⁹⁹³⁷ − 1 и процедурой tempering выходных слов.</p><b>Выбран основным датчиком</b></div></div><div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Тест равномерности, p-value</th><th>ЛКГ m=2³²</th><th>MT19937</th><th>ЛКГ m=2¹¹</th></tr></thead><tbody><tr><td>χ²</td><td>0,8641</td><td>0,9879</td><td>0,0853</td></tr><tr><td>KS</td><td>0,6130</td><td>0,9438</td><td>1,0000</td></tr><tr><td>Serial pairs</td><td>0,3052</td><td>0,2878</td><td>≈ 0</td></tr><tr><td>Gap</td><td>0,8781</td><td>0,8484</td><td>≈ 0</td></tr><tr><td>Runs-up</td><td>0,8983</td><td>0,9722</td><td>0,4317</td></tr><tr><td>Serial correlation</td><td>0,6881</td><td>0,3057</td><td>≈ 0</td></tr></tbody></table></div></div>
            <div class="card"><span class="tag">NORMAL GENERATORS</span><h3>Сравнение методов получения N(0,1)</h3><div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Метод</th><th>Принятие · эксперимент / теория</th><th>U на одно значение</th><th>Время на 10⁴</th></tr></thead><tbody><tr><td>Полярный Марсальи</td><td>0,7816 / 0,7854</td><td>1,279</td><td>43,03 мс</td></tr><tr><td>Киндерман — Монахан</td><td>0,7298 / 0,7306</td><td>2,741</td><td>88,34 мс</td></tr><tr><td>Бокс — Мюллер</td><td>1,0000 / 1,0000</td><td>1,000</td><td>33,78 мс</td></tr></tbody></table></div><p class="muted">Время зависит от среды и реализации. Для полярного метода теоретическая вероятность принятия равна π/4.</p></div>
            <div class="grid two-col lab02-generator-cards">${VARIABLES.map(v => `<div class="card"><span class="tag">${v.code}</span><h3>${v.symbol}</h3><b>${v.model}</b><p class="muted">${v.modelNote}</p><div class="lab02-generator-score">KS D = ${v.ks} · p = ${v.p}</div></div>`).join("")}</div>
            <div class="card"><span class="tag">MODEL PARAMETERS</span><h3>Параметры подобранных моделей</h3><div class="lab02-table-wrap"><table class="lab02-table"><thead><tr><th>Величина</th><th>Параметры / конструкция</th><th>Результат</th></tr></thead><tbody><tr><td>LogS</td><td>Нормальная смесь K=3; веса 0,3272 / 0,6087 / 0,0641; μ: −5,235 / −2,005 / 0,6764; σ: 2,028 / 1,383 / 0,3425</td><td>KS D = 0,009229</td></tr><tr><td>Mol LogP</td><td>Student t: ν = 2,4006; loc = 1,9822; scale = 1,7722</td><td>KS D = 0,01089</td></tr><tr><td>Mol Wt</td><td>Смесь логнормальных K=3, подобранная в пространстве ln(x)</td><td>KS D ≈ 0,0120</td></tr></tbody></table></div><p class="muted">Для Student t при ν≈2,4 дисперсия конечна, но четвёртый момент и конечный теоретический эксцесс не существуют.</p></div>
            <div class="card"><span class="tag">IMPLEMENTATION CHECKS</span><h3>Проверки генераторов</h3><p>В ноутбуке реализованы ЛКГ, MT19937, полярный метод Марсальи, метод Киндермана — Монахана, Бокс — Мюллер, skew-normal, смеси нормальных с EM, квантильный датчик, гамма-датчик Марсальи — Цанга, Student t и смеси логнормальных.</p><div class="lab02-test-result"><b>62 теста пройдены</b><span>pytest · fixed seed</span></div><p class="muted">Также отмечены дополнительные методы: inverse CDF для logistic, Weibull, Gumbel и exponential, метод фон Неймана и Johnson SU.</p></div>
            <div class="card"><span class="tag">INTERACTIVE SAMPLER</span><h3>Эмпирический квантильный генератор</h3><p>Сгенерируй значения через обратную эмпирическую функцию распределения. Это удобный эталон сравнения, но он не создаёт значений за пределами исходного диапазона.</p><div class="lab02-controls"><div><label for="lab02GeneratorVariable">Величина</label><select id="lab02GeneratorVariable" class="select">${VARIABLES.map(v => `<option value="${v.key}">${v.symbol}</option>`).join("")}</select></div><div><label for="lab02GeneratorN">Размер генерации: <b id="lab02GeneratorNOut">2000</b></label><input id="lab02GeneratorN" type="range" min="100" max="10000" step="100" value="2000"></div></div><button type="button" class="button-primary" id="lab02RunGenerator">Сгенерировать выборку</button><div id="lab02GeneratorResult" class="lab02-sampling-result"></div></div>
        `)}
        ${section("conclusions", "08 / CONCLUSIONS", "Общие выводы", "Ключевые результаты двух спринтов лабораторной работы.", `
            <div class="card"><ol class="conclusion-list"><li><b>LogS</b> имеет умеренную отрицательную асимметрию (около −0,55). Среди одиночных моделей лучше skew-normal; смесь нормальных K=3 улучшает согласие.</li><li><b>Mol LogP</b> обладает тяжёлыми хвостами (эксцесс около 29,5). Распределение Стьюдента с ν≈2,4 лучше воспроизводит хвосты, чем нормальный закон.</li><li><b>Mol Wt</b> резко скошена вправо (асимметрия около 5,5). Смесь логнормальных K=3 лучше одиночной логнормальной модели.</li><li>Три величины зависимы: более крупные и липофильные молекулы в среднем хуже растворяются в воде.</li><li>Оценки центра стабилизируются с ростом объёма выборки; дисперсия среднего без возвращения ниже из-за поправки на конечность совокупности.</li><li>Статистически значимые различия между группами следует интерпретировать вместе с медианами и размером эффекта.</li></ol></div>
        `)}
        ${section("references", "09 / REFERENCES", "Список литературы", "Источники данных и математические основания методов.", `
            <div class="card"><ol class="lab02-references"><li>Sorkun M. C., Khetan A., Er S. AqSolDB, a curated reference set of aqueous solubility and 2D descriptors for a diverse set of compounds. <i>Scientific Data</i>. 2019. Vol. 6. Art. 143. <a href="https://doi.org/10.1038/s41597-019-0151-1" target="_blank" rel="noopener">DOI: 10.1038/s41597-019-0151-1</a>.</li><li>Knuth D. E. <i>The Art of Computer Programming. Vol. 2: Seminumerical Algorithms</i>. 3rd ed. 1997.</li><li>Hull T. E., Dobell A. R. Random number generators. <i>SIAM Review</i>. 1962. Vol. 4(3). P. 230–254.</li><li>Matsumoto M., Nishimura T. Mersenne Twister. <i>ACM TOMACS</i>. 1998. Vol. 8(1). P. 3–30.</li><li>Marsaglia G., Bray G. A convenient method for generating normal variables. <i>SIAM Review</i>. 1964. Vol. 6. P. 260–264.</li><li>Kinderman A. J., Monahan J. F. Computer generation of random variables using the ratio of uniform deviates. <i>ACM TOMS</i>. 1977. Vol. 3. P. 257–260.</li><li>Marsaglia G., Tsang W. W. A simple method for generating gamma variables. <i>ACM TOMS</i>. 2000. Vol. 26. P. 363–372.</li><li>Azzalini A. A class of distributions which includes the normal ones. <i>Scandinavian Journal of Statistics</i>. 1985. Vol. 12. P. 171–178.</li><li>Akaike H. A new look at the statistical model identification. <i>IEEE Transactions on Automatic Control</i>. 1974. Vol. 19. P. 716–723.</li><li>Schwarz G. Estimating the dimension of a model. <i>The Annals of Statistics</i>. 1978. Vol. 6. P. 461–464.</li></ol></div>
        `)}
        <footer class="footer"><span>STAT LAB</span><span>ЛАБОРАТОРНАЯ 02</span><span>ПРИКЛАДНАЯ СТАТИСТИКА</span></footer>`;
    }

    function renderVariable() {
        const variable = VARIABLES.find(v => v.key === activeVariable) || VARIABLES[0];
        const values = numeric(variable.key);
        const d = describe(values);
        const cvLabel = d.mean > 0 ? `${fmt(d.cv * 100, 2)}%` : "не интерпретируется";
        const stats = [metric("Объём n", d.n.toLocaleString("ru-RU")), metric("Среднее", fmt(d.mean)), metric("Медиана", fmt(d.median)), metric("Дисперсия (выборочная)", fmt(d.variance)), metric("Ст. отклонение", fmt(d.sd)), metric("Асимметрия", fmt(d.skew)), metric("Эксцесс", fmt(d.kurtosis)), metric("Коэффициент вариации", cvLabel, d.mean > 0 ? "SD / среднее" : "среднее неположительное"), metric("Выбросы IQR", d.outliers.toLocaleString("ru-RU"))].join("");
        document.getElementById("lab02VariableDetail").innerHTML = `<div class="lab02-variable-intro"><div><span class="tag">${variable.code} · ${variable.unit}</span><h3>${variable.name} (${variable.symbol})</h3><p>${variable.definition}</p><p class="muted">${variable.random}</p></div><div class="lab02-model-chip"><small>Рекомендуемая модель · Sprint 2</small><b>${variable.model}</b></div></div><div class="lab02-evidence"><span class="tag">STOCHASTIC NATURE · SPRINT 1</span><p>${variable.evidence}</p></div><div class="lab02-metrics-grid">${stats}</div><div class="lab02-chart-block"><div><h4>Эмпирическое распределение</h4><p class="muted">Гистограмма исходных наблюдений</p></div>${histogram(values, variable.color)}</div><div class="lab02-variable-footer"><span>Минимум: <b>${fmt(d.min)}</b></span><span>Q1: <b>${fmt(d.q1)}</b></span><span>Q3: <b>${fmt(d.q3)}</b></span><span>Максимум: <b>${fmt(d.max)}</b></span></div>`;
    }

    function renderDependence() {
        const pairs = [["Solubility", "MolLogP"], ["Solubility", "MolWt"], ["MolLogP", "MolWt"]];
        const labels = { Solubility: "LogS", MolLogP: "Mol LogP", MolWt: "Mol Wt" };
        const result = pairs.map(([a, b]) => { const p = paired(a, b); return { a, b, pearson: correlation(p.a, p.b), spearman: correlation(ranks(p.a), ranks(p.b)), n: p.a.length }; });
        document.getElementById("lab02Dependence").innerHTML = `<div class="lab02-dependence-grid">${result.map(r => `<div class="lab02-correlation"><span>${labels[r.a]} ↔ ${labels[r.b]}</span><strong>${fmt(r.spearman, 4)}</strong><small>ρ Спирмена · r Пирсона ${fmt(r.pearson, 4)} · n = ${r.n.toLocaleString("ru-RU")}</small><div class="lab02-correlation-track"><i style="width:${Math.abs(r.spearman) * 100}%;${r.spearman < 0 ? "margin-left:auto" : ""}"></i></div></div>`).join("")}</div><p class="muted">В ноутбуке для LogS–Mol LogP получено ρ = −0,7398, для LogS–Mol Wt ρ = −0,5386; обе связи отрицательные. При n ≈ 10⁴ малые p-value ожидаемы, поэтому важен размер корреляции.</p>`;
    }

    function seeded(seed) { let state = seed >>> 0; return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; }; }
    function runSampling() {
        const key = document.getElementById("lab02SampleVariable").value;
        const values = numeric(key), N = values.length;
        const n = Math.min(Number(document.getElementById("lab02SampleSize").value), N);
        const d = describe(values), reps = 300, random = seeded(20261120);
        const withMeans = [], withoutMeans = [];
        for (let r = 0; r < reps; r++) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += values[Math.floor(random() * N)];
            withMeans.push(sum / n);
            const indexes = Array.from({ length: N }, (_, i) => i);
            for (let i = 0; i < n; i++) { const j = i + Math.floor(random() * (N - i)); [indexes[i], indexes[j]] = [indexes[j], indexes[i]]; }
            let s = 0; for (let i = 0; i < n; i++) s += values[indexes[i]];
            withoutMeans.push(s / n);
        }
        const empiricalWith = variance(withMeans), empiricalWithout = variance(withoutMeans);
        // d.variance is the sample variance (denominator N - 1). Convert it to the finite-population variance first.
        const populationVariance = d.variance * (N - 1) / N;
        const theoreticalWith = populationVariance / n;
        const theoreticalWithout = populationVariance / n * (N - n) / (N - 1);
        document.getElementById("lab02SamplingResult").innerHTML = `<div class="lab02-metrics-grid">${metric("Среднее ГС", fmt(d.mean))}${metric("Var(X̄), с возвращением", fmt(empiricalWith, 5), `теория ${fmt(theoreticalWith, 5)}`)}${metric("Var(X̄), без возвращения", fmt(empiricalWithout, 5), `теория ${fmt(theoreticalWithout, 5)}`)}${metric("Поправка на конечность", fmt((N - n) / (N - 1), 4))}</div><p class="muted">300 повторений · n = ${n} · N = ${N.toLocaleString("ru-RU")}. Среднее выборочных средних: с возвращением ${fmt(mean(withMeans))}; без возвращения ${fmt(mean(withoutMeans))}.</p>`;
    }

    function runGenerator() {
        const key = document.getElementById("lab02GeneratorVariable").value;
        const n = Number(document.getElementById("lab02GeneratorN").value);
        const values = numeric(key).sort((a, b) => a - b), random = seeded(2024 + n), sample = Array.from({ length: n }, () => { const u = random() * (values.length - 1), i = Math.floor(u); return values[i] + (values[i + 1] - values[i]) * (u - i); });
        const d = describe(sample), ref = describe(values), variable = VARIABLES.find(v => v.key === key);
        document.getElementById("lab02GeneratorResult").innerHTML = `<div class="lab02-metrics-grid">${metric("Среднее генератора", fmt(d.mean), `исходные ${fmt(ref.mean)}`)}${metric("SD генератора", fmt(d.sd), `исходные ${fmt(ref.sd)}`)}${metric("Медиана", fmt(d.median), `исходные ${fmt(ref.median)}`)}${metric("Асимметрия", fmt(d.skew), `исходные ${fmt(ref.skew)}`)}</div><div class="lab02-chart-block"><h4>Сгенерированная выборка · ${variable.symbol}</h4>${histogram(sample, variable.color)}</div><p class="muted">Выборка получена эмпирическим квантильным методом из ${n.toLocaleString("ru-RU")} значений. Генератор воспроизводим при одинаковом размере выборки (seed = 2024 + n).</p>`;
    }

    function attach() {
        document.querySelectorAll("[data-lab02-variable]").forEach(button => button.addEventListener("click", () => {
            activeVariable = button.dataset.lab02Variable;
            document.querySelectorAll("[data-lab02-variable]").forEach(item => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-selected", String(active)); });
            renderVariable();
        }));
        const alpha = document.getElementById("lab02Alpha");
        alpha?.addEventListener("change", () => {
            const a = Number(alpha.value);
            const pValues = [6.768e-186, 4.777e-62, 0]; // third p-value underflows to 0 in double precision
            const significant = pValues.filter(p => p < a).length;
            const result = document.getElementById("lab02AlphaResult");
            if (result) result.textContent = `${significant} из 3 тестов статистически значимы при α = ${String(a).replace(".", ",")}.`;
        });
        const size = document.getElementById("lab02SampleSize"), sizeOut = document.getElementById("lab02SampleSizeOut");
        size?.addEventListener("input", () => sizeOut.textContent = size.value);
        document.getElementById("lab02RunSampling")?.addEventListener("click", runSampling);
        const genN = document.getElementById("lab02GeneratorN"), genOut = document.getElementById("lab02GeneratorNOut");
        genN?.addEventListener("input", () => genOut.textContent = genN.value);
        document.getElementById("lab02RunGenerator")?.addEventListener("click", runGenerator);
    }

    async function render(page) {
        page.innerHTML = renderShell();
        renderNavigation();
        try {
            const data = await loadData();
            if (!document.getElementById("lab02DataStatus")) return;
            document.getElementById("lab02DataStatus").textContent = `Данные загружены: ${data.length.toLocaleString("ru-RU")} строк и 26 исходных столбцов. Пропусков в трёх исследуемых величинах нет. Проверка структуры пройдена.`;
            renderVariable();
            renderDependence();
            attach();
        } catch (error) {
            const status = document.getElementById("lab02DataStatus");
            if (status) status.innerHTML = `<span class="lab02-error">Ошибка загрузки данных: ${escape(error.message)}. Проверь, что файл data/aqsoldb.csv находится рядом с index.html.</span>`;
            console.error("Lab 02 data loading failed:", error);
        }
    }

    function renderNavigation() {
        if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; }
        const nav = document.getElementById("sectionNav");
        if (!nav) return;
        nav.innerHTML = `<div class="nav-label">СТРУКТУРА ИССЛЕДОВАНИЯ</div>${NAV.map(([id, title, number]) => `<a href="#${id}" class="nav-link"><span class="nav-number">${number}</span>${title}</a>`).join("")}`;
        nav.querySelectorAll("a").forEach(link => link.addEventListener("click", event => {
            event.preventDefault(); document.getElementById(link.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth" });
        }));
        if (typeof IntersectionObserver === "function") {
            const links = [...nav.querySelectorAll("a")];
            sectionObserver = new IntersectionObserver(entries => {
                const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (visible[0]) links.forEach(link => link.classList.toggle("active", link.hash === `#${visible[0].target.id}`));
            }, { root: document.querySelector(".main") || null, rootMargin: "-10% 0px -60% 0px" });
            NAV.forEach(([id]) => { const node = document.getElementById(id); if (node) sectionObserver.observe(node); });
        }
    }

    function destroy() { if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; } }

    global.StatLabLab02 = Object.freeze({ render, renderNavigation, attach, destroy });
})(window);
