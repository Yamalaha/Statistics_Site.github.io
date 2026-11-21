// ==========================================
// STAT LAB — DATA CONFIGURATION
// Здесь хранятся данные всех лабораторных.
// ==========================================

window.LABS = [

    // ======================================
    // LAB 01 — WINE QUALITY
    // ======================================

    {
        id: "lab-01",
        palette: { accent: "#945165", accentLight: "#F1E5E8", series: ["#945165", "#B89A62", "#788C7D"] },
        number: "01",
        title: "Wine Quality",
        subtitle: "Wine Quality as a stochastic system",
        status: "Research stage",

        description:
            "Исследование физико-химических характеристик и сенсорной оценки качества вина.",

        dataset: {
            name: "Wine Quality",
            source: "UCI Machine Learning Repository",
            url: "https://archive.ics.uci.edu/dataset/186/wine+quality",

            description:
                "Объединённый набор данных красных и белых вин Vinho Verde. Содержит физико-химические измерения и сенсорные оценки.",

            metrics: [
                { label: "Observations", value: "6 497" },
                { label: "Variables", value: "13" },
                { label: "Missing values", value: "0" },
                { label: "Duplicates", value: "1 177" }
            ],

            groups: [
                { label: "Red wine", value: 1599 },
                { label: "White wine", value: 4898 }
            ]
        },

        // Три случайные величины
        variables: [

            {
                id: "quality",
                code: "RV 01",
                symbol: "Q",

                name: "Quality",
                type: "Discrete · Ordinal",
                unit: "Score",

                description:
                    "Сенсорная оценка качества вина. Каждую пробу оценивала группа дегустаторов; итоговая оценка представляет собой медиану их оценок.",

                nature:
                    "Случайность относится к выбору образца вина из исследуемой совокупности. Для уже зафиксированной строки датасета значение является наблюдаемым.",

                formula: "P(Q = k) = nₖ / N",

                statistics: [
                    { label: "Mean", value: "5.818" },
                    { label: "Median", value: "6.000" },
                    { label: "Variance", value: "0.763" },
                    { label: "Std. dev.", value: "0.873" },
                    { label: "Mode", value: "6" },
                    { label: "Range", value: "3–9" },
                    { label: "D’Agostino–Pearson K²", value: "50.3590" },
                    { label: "p-value normality", value: "1.161 × 10⁻¹¹" }
                ],

                chart: {
                    type: "bar",
                    title: "Empirical distribution",
                    labels: ["3", "4", "5", "6", "7", "8", "9"],
                    values: [30, 216, 2138, 2836, 1079, 193, 5],
                    unit: "observations"
                },

                conclusion:
                    "Наиболее часто встречается оценка 6 — 43,65% наблюдений. Тест Д’Агостино–Пирсона отвергает нормальность (K² = 50.3590; p = 1.161 × 10⁻¹¹). Поскольку quality — дискретная порядковая переменная, результат следует трактовать как диагностическое сравнение, а не как требование нормальности для дальнейшего анализа."
            },

            {
                id: "alcohol",
                code: "RV 02",
                symbol: "X₁",

                name: "Alcohol",
                type: "Continuous",
                unit: "% об.",

                description:
                    "Содержание этанола в образце вина.",

                nature:
                    "Содержание алкоголя зависит от сахаристости сусла, температуры, активности дрожжей и условий ферментации. Для случайно выбранного образца эти факторы не заданы полностью.",

                formula: "X = alcohol, X > 0",

                statistics: [
                    { label: "Red mean", value: "10.423" },
                    { label: "White mean", value: "10.514" },
                    { label: "Red variance", value: "1.1356" },
                    { label: "White variance", value: "1.5144" }
                ],

                chart: {
                    type: "bar",
                    title: "Mean alcohol content",
                    labels: ["Red wine", "White wine"],
                    values: [10.423, 10.514],
                    unit: "% об."
                },

                conclusion:
                    "Среднее содержание алкоголя немного выше в белом вине. Для определения наилучшей модели распределения необходимо выполнить полноценную подгонку по исходным наблюдениям и сравнить модели по критериям качества."
            },

            {
                id: "acidity",
                code: "RV 03",
                symbol: "X₂",

                name: "Volatile acidity",
                type: "Continuous",
                unit: "g/dm³",

                description:
                    "Концентрация летучих кислот в образце вина.",

                nature:
                    "Формирование летучей кислотности зависит от активности уксуснокислых бактерий, температуры ферментации и доступа кислорода.",

                formula: "X = volatile acidity, X > 0",

                statistics: [
                    { label: "Mean", value: "0.3397" },
                    { label: "Median", value: "0.2900" },
                    { label: "Variance", value: "0.0271" },
                    { label: "Std. dev.", value: "0.1646" },
                    { label: "Skewness", value: "1.4951" },
                    { label: "Kurtosis", value: "2.8254" }
                ],

                chart: {
                    type: "bar",
                    title: "Mean volatile acidity",
                    labels: ["Red wine", "White wine"],
                    values: [0.5278, 0.2782],
                    unit: "g/dm³"
                },

                conclusion:
                    "Распределение имеет выраженную положительную асимметрию и тяжёлый правый хвост."
            }

        ],

        // Проверенные в исследовании гипотезы
        hypotheses: [

            {
                id: "quality-color",
        
                title:
                    "Различается ли среднее качество красного и белого вина?",
        
                method:
                    "t-критерий Уэлча",
        
                h0:
                    "Среднее качество красного и белого вина одинаково: μred = μwhite.",
        
                h1:
                    "Среднее качество красного и белого вина различается: μred ≠ μwhite.",
        
                pValue: 8.17e-24,
        
                pValueText: "8.17 × 10⁻²⁴",
        
                metrics: [
        
                    {
                        label: "Разность средних (красное − белое)",
                        value: "−0.2419"
                    },
        
                    {
                        label: "95% доверительный интервал",
                        value: "[−0.2886; −0.1952]"
                    },
        
                    {
                        label: "Коэффициент d Коэна",
                        value: "−0.2790"
                    }
        
                ],
        
                conclusion:
                    "Среднее качество красного и белого вина статистически различается. В данной выборке средняя оценка красного вина ниже."
        
            },
        
        
            {
                id: "alcohol-quality",
        
                title:
                    "Связано ли содержание алкоголя с оценкой качества?",
        
                method:
                    "Корреляционный анализ Пирсона и Спирмена",
        
                h0:
                    "В каждой группе вина коэффициенты корреляции Пирсона и Спирмена между alcohol и quality равны нулю.",
        
                h1:
                    "Хотя бы в одной группе хотя бы один из коэффициентов корреляции отличается от нуля.",
        
                pValue: null,
        
                pValueText:
                    "Рассчитывается по исходным CSV отдельно для каждой корреляции.",
        
                metrics: [
                    { label: "Пирсон r — красное", value: "0.4762" },
                    { label: "p-value Пирсона — красное", value: "2.831 × 10⁻⁹¹" },
                    { label: "Пирсон r — белое", value: "0.4356" },
                    { label: "p-value Пирсона — белое", value: "5.615 × 10⁻²²⁶" },
                    { label: "Спирмен ρ — красное", value: "0.4785" },
                    { label: "p-value Спирмена — красное", value: "2.727 × 10⁻⁹²" },
                    { label: "Спирмен ρ — белое", value: "0.4404" },
                    { label: "p-value Спирмена — белое", value: "1.659 × 10⁻²³¹" }
                ],
        
                conclusion:
                    "В обеих группах положительная связь статистически значима по Пирсону и Спирмену. Проверки рассматриваются отдельно и имеют разведочный характер; поправка на множественные сравнения не применялась."
        
            },
        
        
            {
                id: "acidity-color",
        
                title:
                    "Различается ли летучая кислотность красного и белого вина?",
        
                method:
                    "Критерий Манна — Уитни",
        
                h0:
                    "Распределения летучей кислотности в двух группах одинаковы.",
        
                h1:
                    "Распределения летучей кислотности в двух группах различаются.",
        
                pValue: null,
        
                pValueText:
                    "Рассчитывается по исходным CSV; для экстремально малого значения дополнительно выводится log₁₀(p).",
        
                metrics: [
        
                    {
                        label: "Статистика U",
                        value: "7 059 623.5"
                    },
        
                    {
                        label: "Статистика z",
                        value: "48.2901"
                    },
        
                    {
                        label: "log₁₀(p-value)",
                        value: "−508.1541"
                    },
        
                    {
                        label: "Медиана — красное вино",
                        value: "0.52"
                    },
        
                    {
                        label: "Медиана — белое вино",
                        value: "0.26"
                    }
        
                ],
        
                conclusion:
                    "Распределения летучей кислотности красного и белого вина существенно различаются. Для экстремально малого p-value дополнительно приводится log₁₀(p)."
        
            }
        
        ],

        // Эмпирическая проверка состоятельности
        sampling: {

            title: "Quality · sampling experiment",

            description:
                "Сравнение стандартных отклонений выборочных средних при отборе с возвращением и без возвращения.",

            trueMean: "5.8184",

            
points: [
    {
        n: 10,
        wr: 0.27235,
        wor: 0.28996,
        seWr: 0.27613,
        seWor: 0.27593
    },
    {
        n: 30,
        wr: 0.16180,
        wor: 0.15578,
        seWr: 0.15942,
        seWor: 0.15907
    },
    {
        n: 50,
        wr: 0.12424,
        wor: 0.12299,
        seWr: 0.12349,
        seWor: 0.12302
    },
    {
        n: 100,
        wr: 0.08866,
        wor: 0.08528,
        seWr: 0.08732,
        seWor: 0.08665
    },
    {
        n: 300,
        wr: 0.04953,
        wor: 0.05115,
        seWr: 0.05041,
        seWor: 0.04924
    },
    {
        n: 500,
        wr: 0.03823,
        wor: 0.03778,
        seWr: 0.03905,
        seWor: 0.03752
    },
    {
        n: 1000,
        wr: 0.02756,
        wor: 0.02553,
        seWr: 0.02761,
        seWor: 0.02540
    }
]

        },

        methods: [
            {
                title: "EDA",
                description:
                    "Первичный анализ структуры датасета, диапазонов, пропусков, дубликатов и распределений."
            },
            {
                title: "Min-Max",
                description:
                    "Масштабирование значений в заданный диапазон."
            },
            {
                title: "Z-score",
                description:
                    "Стандартизация относительно среднего и стандартного отклонения."
            },
            {
                title: "Distribution fitting",
                description:
                    "Сравнение теоретических распределений с помощью AIC и KS."
            },
            {
                title: "Statistical inference",
                description:
                    "Проверка гипотез и исследование зависимостей."
            }
        ],

        conclusions: [
            "Все три величины имеют различную природу и форму распределений.",
            "Оценка качества имеет дискретную порядковую шкалу.",
            "Содержание алкоголя положительно связано с оценкой качества.",
            "Летучая кислотность имеет выраженную положительную асимметрию.",
            "Разброс выборочных средних уменьшается при росте объёма выборки."
        ],

        references: [
            {
                title: "UCI Machine Learning Repository",
                description: "Wine Quality Dataset",
                url: "https://archive.ics.uci.edu/dataset/186/wine+quality"
            },
            {
                title: "Cortez et al. (2009)",
                description:
                    "Modeling wine preferences by data mining from physicochemical properties.",
                url: "https://doi.org/10.1016/j.dss.2009.05.016"
            }
        ],

        generator: {
            status: "ready",
        
            description:
                "Условный генератор оценки качества при заданной крепости. " +
                "Распределение строится по k ближайшим винам обучающей выборки (k = 720).",
        
            method: "inverse_cdf",
            k: 720,
        
            // Демо-точка из ноутбука 01_generator / 05_generator_convergence
            demo: {
                alcohol: 12.0,
                unit: "% об.",
                qualities: [3, 4, 5, 6, 7, 8, 9],
                probabilities: [
                    0.002519,
                    0.013854,
                    0.075567,
                    0.505038,
                    0.322418,
                    0.078086,
                    0.002519
                ],
                mean: 6.375315,
                variance: 0.670222
            },
        
            // Сходимость оценок (из 05_generator_convergence)
            convergence: [
                { n: 10,     mean_rmse: 0.265768, mean_rmse_theory: 0.258886, variance_rmse: 0.407098, variance_rmse_theory: 0.375721 },
                { n: 30,     mean_rmse: 0.152308, mean_rmse_theory: 0.149468, variance_rmse: 0.217039, variance_rmse_theory: 0.211567 },
                { n: 100,    mean_rmse: 0.083704, mean_rmse_theory: 0.081867, variance_rmse: 0.121348, variance_rmse_theory: 0.114931 },
                { n: 300,    mean_rmse: 0.047256, mean_rmse_theory: 0.047266, variance_rmse: 0.066813, variance_rmse_theory: 0.066203 },
                { n: 1000,   mean_rmse: 0.025967, mean_rmse_theory: 0.025889, variance_rmse: 0.035098, variance_rmse_theory: 0.036232 },
                { n: 3000,   mean_rmse: 0.015582, mean_rmse_theory: 0.014947, variance_rmse: 0.020598, variance_rmse_theory: 0.020914 },
                { n: 10000,  mean_rmse: 0.008417, mean_rmse_theory: 0.008187, variance_rmse: 0.010864, variance_rmse_theory: 0.011454 },
                { n: 30000,  mean_rmse: 0.004653, mean_rmse_theory: 0.004727, variance_rmse: 0.006317, variance_rmse_theory: 0.006613 },
                { n: 100000, mean_rmse: 0.002574, mean_rmse_theory: 0.002589, variance_rmse: 0.003719, variance_rmse_theory: 0.003622 }
            ],
        
            // Сравнение с test (из 04_generator_comparison)
            realComparison: {
                n: 1302,
                tv: 0.0294,
                realMean: 5.8295,
                modelMean: 5.7816,
                realVariance: 0.7313,
                modelVariance: 0.7383
            },
        
            // Rejection sampling (из 06_rejection_generator)
            rejection: {
                acceptRateEmpirical: 0.2840,
                acceptRateTheory: 0.2829,
                medianMsInverse: 1.92,
                medianMsRejection: 4.29
            },
        
            math: {
                title: "Метод обратной функции распределения",
                formula: "P(Q* = qⱼ | x) = pⱼ(x)",
                note:
                    "Интервалы длины pⱼ на [0,1). U ~ Uniform[0,1) выбирает оценку. " +
                    "Среднее генератора совпадает со средним kNN-соседей."
            }
        }

    },

    // ======================================
    // LAB 02 — AqSolDB
    // ======================================

    {
        id: "lab-02",
        palette: { accent: "#2A6F97", accentLight: "#E5F0F5", series: ["#2A6F97", "#E76F51", "#2A9D8F"] },
        number: "02",
        title: "AqSolDB",
        subtitle: "Статистическое исследование свойств химических соединений и построение генераторов случайных величин.",
        status: "Interactive",
        description: "Исследование растворимости LogS, липофильности Mol LogP и молекулярной массы Mol Wt на данных AqSolDB.",
        dataset: {
            name: "AqSolDB",
            source: "OpenML · dataset 43546",
            url: "https://www.openml.org/d/43546",
            description: "Объединённый набор данных экспериментальной растворимости и 2D-дескрипторов 9 982 химических соединений из девяти публичных источников.",
            metrics: [
                { label: "Observations", value: "9 982" },
                { label: "Variables", value: "26" },
                { label: "Missing values", value: "0" },
                { label: "Source datasets", value: "9" }
            ],
            groups: [
                { label: "G1", value: 7746 },
                { label: "G2", value: 235 },
                { label: "G3", value: 1182 },
                { label: "G4", value: 183 },
                { label: "G5", value: 636 }
            ]
        },
        variables: [
            { id: "logs", code: "RV 01", symbol: "LogS", name: "Растворимость в воде", type: "Continuous", unit: "log₁₀(моль/л)" },
            { id: "logp", code: "RV 02", symbol: "Mol LogP", name: "Липофильность", type: "Continuous", unit: "безразмерная" },
            { id: "molwt", code: "RV 03", symbol: "Mol Wt", name: "Молекулярная масса", type: "Continuous", unit: "г/моль" }
        ],
        hypotheses: [
            { id: "aromatic-solubility", title: "Отличается ли растворимость соединений с ароматическими кольцами и без них?", method: "Критерий Манна — Уитни", pValue: 6.768e-186 },
            { id: "reliability-mass", title: "Одинаково ли распределение молекулярной массы в группах надёжности G1–G5?", method: "Критерий Краскела — Уоллиса", pValue: 4.777e-62 },
            { id: "solubility-logp", title: "Выше ли липофильность у практически нерастворимых соединений?", method: "Односторонний критерий Манна — Уитни", pValue: 0 }
        ],
        sampling: null,
        methods: [],
        conclusions: [],
        references: [],
        generator: { status: "Interactive", description: "ЛКГ, MT19937 и генераторы распределений для LogS, Mol LogP и Mol Wt." }
    },

    // ======================================
    // ======================================
    // LAB 03 — ChEMBL / EGFR
    // ======================================

    {
        id: "lab-03",
        palette: { accent: "#C44569", accentLight: "#F8E9EE", series: ["#C44569", "#168C86", "#7656A6"] },
        number: "03",
        title: "ChEMBL · EGFR",
        subtitle: "Статистическое исследование биологической активности и физико-химических свойств соединений, измеренных для человеческой мишени EGFR.",
        status: "CSV required",
        description: "Исследование активности pIC50, молекулярной массы и топологической полярной поверхности молекул, для которых в ChEMBL доступны измерения IC50 в отношении человеческого EGFR (CHEMBL203).",
        dataset: {
            name: "ChEMBL · EGFR (CHEMBL203)",
            source: "ChEMBL database · EMBL-EBI REST API",
            url: "https://www.ebi.ac.uk/chembl/",
            description: "Итоговая таблица: одна строка на молекулу; pIC50 агрегирован медианой доступных измерений IC50. Отбор включает IC50 в nM, pChEMBL value, confidence score ≥ 8 и сопоставимые отношения измерения.",
            metrics: [], groups: []
        },
        variables: [
            { id: "pic50", code: "RV 01", symbol: "pIC50", name: "Биологическая активность", type: "Continuous", unit: "log₁₀-шкала", description: "Стандартизованная мера активности ChEMBL (pChEMBL value). Для IC50 в nM проверяется пересчёт pIC50 = 9 − log₁₀(IC50 [nM]).", nature: "Случайный эксперимент — выбор соединения из зафиксированной совокупности записей ChEMBL. Опубликованные assay могут различаться условиями и протоколами.", formula: "pIC50 = −log₁₀(IC50 [M])", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения итогового CSV." },
            { id: "molecular-weight", code: "RV 02", symbol: "MW", name: "Молекулярная масса", type: "Continuous", unit: "г/моль", description: "Молекулярная масса соединения, присоединённая из химических свойств ChEMBL.", nature: "Для выбранной молекулы значение фиксировано; случайность возникает из процедуры выбора соединения из исследуемой совокупности.", formula: "X₂ = Molecular Weight", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения итогового CSV." },
            { id: "tpsa", code: "RV 03", symbol: "TPSA", name: "Топологическая полярная поверхность", type: "Continuous", unit: "Å²", description: "Топологическая полярная поверхность молекулы — вычисляемый дескриптор, характеризующий вклад полярных атомов.", nature: "Для выбранной молекулы значение фиксировано; случайность возникает из процедуры выбора соединения из исследуемой совокупности.", formula: "X₃ = TPSA", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения итогового CSV." }
        ],
        hypotheses: [], sampling: null, methods: [], conclusions: [], references: [
            { title: "ChEMBL database", url: "https://www.ebi.ac.uk/chembl/" },
            { title: "ChEMBL web services", url: "https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services" },
            { title: "Target CHEMBL203 — EGFR", url: "https://www.ebi.ac.uk/chembl/api/data/target/CHEMBL203.json" },
            { title: "Mersenne Twister (1998)", url: "https://doi.org/10.1145/272991.272995" }
        ],
        generator: { status: "MT19937 implemented", description: "Собственный MT19937 + обратное эмпирическое квантильное преобразование для pIC50; train/test 70/30." }
    },

    // ======================================
    // LAB 04 — QM9
    // ======================================

    {
        id: "lab-04",
        palette: { accent: "#356FE0", accentLight: "#EAF0FE", series: ["#356FE0", "#C04491", "#C47A2C"] },
        number: "04",
        title: "QM9 · Molecular Properties",
        subtitle: "Статистическое исследование квантово-химических характеристик малых органических молекул.",
        status: "CSV required",
        description: "Исследование HOMO–LUMO gap, дипольного момента и изотропной поляризуемости молекул из набора QM9. Значения получены квантово-химическим расчётом B3LYP/6-31G(2df,p).",
        dataset: {
            name: "QM9",
            source: "QM9 · TensorFlow Datasets",
            url: "https://doi.org/10.6084/m9.figshare.c.978904.v5",
            description: "Набор квантово-химических характеристик малых органических молекул. Генеральная совокупность ограничена молекулами, представленными в используемой выгрузке QM9; свойства являются расчётными, а не экспериментальными.",
            metrics: [], groups: []
        },
        variables: [
            { id: "gap", code: "RV 01", symbol: "gap", name: "HOMO–LUMO gap", type: "Continuous", unit: "эВ", description: "Энергетическая щель между HOMO и LUMO; используется поле gap из TensorFlow Datasets QM9.", nature: "Случайный эксперимент — выбор молекулы из совокупности QM9. Для каждой фиксированной молекулы результат квантово-химического расчёта задан.", formula: "Y₁ = gap", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения CSV QM9." },
            { id: "mu", code: "RV 02", symbol: "μ", name: "Дипольный момент", type: "Continuous", unit: "Дебай", description: "Модуль дипольного момента молекулы, рассчитанный квантово-химическим методом.", nature: "Случайный эксперимент — выбор молекулы из совокупности QM9; значение свойства фиксировано для выбранной молекулы.", formula: "Y₂ = μ", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения CSV QM9." },
            { id: "alpha", code: "RV 03", symbol: "α", name: "Изотропная поляризуемость", type: "Continuous", unit: "Bohr³", description: "Изотропная поляризуемость молекулы — характеристика отклика электронной системы на внешнее электрическое поле.", nature: "Случайный эксперимент — выбор молекулы из совокупности QM9; значение свойства фиксировано для выбранной молекулы.", formula: "Y₃ = α", statistics: [], chart: null, conclusion: "Фактические статистики и распределение рассчитываются после подключения CSV QM9." }
        ],
        hypotheses: [], sampling: null, methods: [], conclusions: [], references: [
            { title: "QM9 original dataset", url: "https://doi.org/10.6084/m9.figshare.c.978904.v5" },
            { title: "TensorFlow Datasets — QM9", url: "https://www.tensorflow.org/datasets/catalog/qm9" },
            { title: "Ramakrishnan et al. (2014)", url: "https://doi.org/10.1038/sdata.2014.22" },
            { title: "Mersenne Twister (1998)", url: "https://doi.org/10.1145/272991.272995" }
        ],
        generator: { status: "MT19937 implemented", description: "Собственный MT19937 + обратное эмпирическое квантильное преобразование для HOMO–LUMO gap; train/test 70/30." }
    }

];