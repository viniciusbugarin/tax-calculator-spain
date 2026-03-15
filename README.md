# Calculadora IRPF España

**Calculadora profesional de salario neto** para España. Calcula IRPF y Seguridad Social por comunidad autónoma, ajustada automáticamente al año fiscal en curso.

Proyecto portfolio — HTML · CSS · JavaScript puro · Chart.js

---

## Características

- **Detección automática del año fiscal** — carga `data/irpf-{año}.json` automáticamente
- **Datos fiscales en JSON** — sin código hardcodeado; actualizable sin tocar JavaScript
- **Motor fiscal separado** (`taxEngine.js`) — lógica pura, fácilmente testeable
- **17 comunidades autónomas** con sus tramos autonómicos reales
- **Gráficos en tiempo real** — distribución (tarta) y progresividad (barras)
- **Cálculo metodológicamente correcto**: SS → gastos Art. 19 → reducción Art. 20 → mínimo personal → IRPF estatal + autonómico
- **Funciona localmente** sin servidor (abriendo `index.html` directamente)
- **Listo para GitHub Pages** — rutas completamente relativas

---

## Estructura del proyecto

```
tax-calculator-spain/
├── index.html              ← Página principal
├── README.md
│
├── css/
│   └── styles.css          ← Estilos (responsive, sin frameworks)
│
├── js/
│   ├── taxEngine.js        ← Motor de cálculo fiscal (sin DOM)
│   ├── charts.js           ← Módulo Chart.js
│   └── script.js           ← UI, carga de datos, orquestador
│
├── data/
│   ├── irpf-2024.json      ← Tramos y SS para 2024
│   ├── irpf-2025.json      ← Tramos y SS para 2025
│   └── irpf-2026.json      ← Tramos y SS para 2026
│
└── assets/
    └── icons/
```

---

## Cómo ejecutar localmente

### Opción A — Servidor local (recomendado)

Con Node.js:
```bash
npx serve tax-calculator-spain
```

Con Python:
```bash
cd tax-calculator-spain
python3 -m http.server 8080
```

Luego abre: `http://localhost:8080`

### Opción B — Abrir directamente

Haz doble clic en `index.html`.  
La calculadora funciona en modo offline con datos embebidos de emergencia si el navegador bloquea la carga de JSON desde `file://`.

---

## Cómo actualizar los impuestos para un nuevo año

El diseño separa completamente los datos fiscales del código. Para añadir el año 2027:

**1. Crea el archivo** `data/irpf-2027.json` con esta estructura:

```json
{
  "year": 2027,
  "seguridad_social": {
    "contingencias_comunes": 4.70,
    "desempleo": 1.55,
    "formacion": 0.10,
    "mei": 0.25,
    "total": 6.60
  },
  "gastos_deducibles": {
    "cantidad_fija": 2000
  },
  "reduccion_trabajo": {
    "limite1": 16000,
    "limite2": 19000,
    "reduccion_maxima": 6498,
    "reduccion_minima": 3280,
    "coeficiente": 1.14286
  },
  "minimos_personales_familiares": {
    "personal": 5550,
    "conyuge_sin_ingresos": 3400,
    "hijos": [
      { "orden": 1, "importe": 2400 },
      { "orden": 2, "importe": 2700 },
      { "orden": 3, "importe": 4000 },
      { "orden": 4, "importe": 4500 }
    ]
  },
  "tramos_estatales": [
    { "desde": 0,      "hasta": 12450,  "tipo": 9.5  },
    { "desde": 12450,  "hasta": 20200,  "tipo": 12   },
    { "desde": 20200,  "hasta": 35200,  "tipo": 15   },
    { "desde": 35200,  "hasta": 60000,  "tipo": 18.5 },
    { "desde": 60000,  "hasta": 300000, "tipo": 22.5 },
    { "desde": 300000, "hasta": null,   "tipo": 24.5 }
  ],
  "comunidades_autonomas": {
    "MAD": { "nombre": "Comunidad de Madrid", "regimen": "general", "tramos": [ ... ] }
  }
}
```

**2. Añade el año a la lista** en `js/script.js` (línea `AVAILABLE_YEARS`):
```js
const AVAILABLE_YEARS = [2027, 2026, 2025, 2024];
```

**3. Listo.** El 1 de enero de 2027 la calculadora cargará automáticamente `irpf-2027.json`.

> **No es necesario modificar ningún otro archivo.**

---

## Metodología de cálculo IRPF

El cálculo sigue el procedimiento oficial de la AEAT:

| Paso | Concepto | Referencia |
|------|----------|------------|
| 1 | Rendimiento bruto = Salario bruto | — |
| 2 | − Cotización Seguridad Social (trabajador) | RDL 8/2015 |
| 3 | − Gastos de difícil justificación: **2.000 €** | Art. 19 LIRPF |
| 4 | − Reducción por rendimientos del trabajo | Art. 20 LIRPF |
| 5 | = **Base imponible** | — |
| 6 | Mínimo personal + familiar | Arts. 57–61 LIRPF |
| 7 | Cuota íntegra = Tax(base) − Tax(mínimo) | Escala estatal |
| 8 | + Cuota autonómica | Escala CCAA |
| 9 | **Neto = Bruto − SS − IRPF** | — |

### Reducción Art. 20 (2024)

| Rendimiento neto | Reducción |
|-----------------|-----------|
| ≤ 14.852 € | 6.498 € |
| 14.852 – 17.673,52 € | Reducción variable |
| > 17.673,52 € | 3.280 € |

### Cotización SS del trabajador

| Concepto | 2024 | 2025 | 2026 |
|----------|------|------|------|
| Contingencias comunes | 4,70% | 4,70% | 4,70% |
| Desempleo | 1,55% | 1,55% | 1,55% |
| Formación profesional | 0,10% | 0,10% | 0,10% |
| MEI (RDL 2/2023) | — | 0,10% | 0,20% |
| **Total** | **6,35%** | **6,45%** | **6,55%** |

---

## Subir a GitHub

```bash
cd tax-calculator-spain

git init
git add .
git commit -m "feat: calculadora IRPF España 2024-2026"

# Crea el repositorio en https://github.com/new primero
git remote add origin https://github.com/TU-USUARIO/tax-calculator-spain.git
git branch -M main
git push -u origin main
```

---

## Activar GitHub Pages

1. Ve a tu repositorio → **Settings** → **Pages**
2. En *Source* selecciona: `Deploy from a branch`
3. Branch: `main` / `/ (root)`
4. Guarda — en ~2 minutos dispondrás de:

```
https://TU-USUARIO.github.io/tax-calculator-spain/
```

> La calculadora funciona perfectamente en GitHub Pages porque usa `fetch()` para cargar los JSON sobre HTTP.

---

## Arquitectura de módulos

```
index.html
    │
    ├── js/taxEngine.js   ← Cálculo puro (sin DOM, sin efectos secundarios)
    │     calculateSocialSecurity(grossSalary)
    │     calculateIRPF(base, brackets)
    │     calculateNetSalary(input)   ← Función principal
    │
    ├── js/charts.js      ← Wrapper Chart.js
    │     TaxCharts.init()
    │     TaxCharts.update(result)
    │
    └── js/script.js      ← Orquestador de UI
          loadTaxData()            ← fetch data/irpf-{año}.json
          calcularYActualizar()    ← Llama TaxEngine + TaxCharts
          actualizarResultados()   ← Actualiza DOM
```

---

## Dependencias externas

| Librería | Versión | Carga | Propósito |
|----------|---------|-------|-----------|
| Chart.js | 4.4.3 | CDN | Gráficos |
| Google Fonts (Inter) | — | CDN | Tipografía |

Sin npm. Sin bundler. Sin frameworks. Abre y funciona.

---

## Licencia

MIT — libre para uso personal y comercial.
