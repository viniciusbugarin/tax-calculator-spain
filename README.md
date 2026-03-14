# 🇪🇸 Calculadora IRPF España 2024

> Herramienta web para calcular el salario neto a partir del salario bruto en España.
> IRPF y Seguridad Social ajustados por comunidad autónoma y situación familiar.

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://tu-usuario.github.io/tax-calculator-spain)
![HTML5](https://img.shields.io/badge/HTML5-✓-orange)
![CSS3](https://img.shields.io/badge/CSS3-✓-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-✓-yellow)

---

## 📸 Vista previa

```
Bruto: 30.000 €  →  Neto: ~24.228 € anuales / ~1.730 € mensuales
                      IRPF: ~3.867 €  |  SS: ~1.905 €
```

---

## ✅ Funcionalidades

- **Salario bruto anual** con slider interactivo (0 – 200.000 €)
- **Número de pagas** (12 o 14)
- **Estado civil** (soltero/a o casado/a con cónyuge sin ingresos)
- **Número de hijos** (mínimo familiar Art. 57-61 LIRPF)
- **17 comunidades autónomas** con tramos autonómicos reales 2024
- **Gráficos dinámicos**: distribución (tarta) y comparativa (barras)
- **Tabla de tramos** IRPF aplicados con desglose
- **Cálculo automático** en tiempo real al cambiar cualquier dato
- Datos fiscales en **JSON externo** — actualizable sin tocar el código

---

## 📐 Lógica de cálculo

La calculadora sigue el proceso oficial de la AEAT:

```
1. Cotización SS        = Bruto × 6,35%
2. Gastos deducibles    = 2.000 € (Art. 19 LIRPF, cantidad fija)
3. Rendimiento neto     = Bruto − SS − Gastos deducibles
4. Reducción Art. 20    =  · Si neto ≤ 14.852 €  → 6.498 €
                           · Si neto ≤ 17.673 €  → 6.498 − 1,14 × (neto − 14.852)
                           · Si neto >  17.673 €  → 3.280 €
5. Rend. neto reducido  = Rendimiento neto − Reducción Art. 20
6. Mínimo personal      = 5.550 € base
                          + 3.400 € si casado/a (cónyuge sin ingresos)
                          + 2.400 / 2.700 / 4.000 / 4.500 € por hijo (1º/2º/3º/4º+)
7. IRPF estatal         = Tax(base) − Tax(mínimo)  ← tramos fijos nacionales
8. IRPF autonómico      = Tax(base) − Tax(mínimo)  ← tramos específicos de la CCAA
9. IRPF total           = IRPF estatal + IRPF autonómico
10. Salario neto        = Bruto − SS − IRPF total
```

---

## 📁 Estructura de archivos

```
tax-calculator-spain/
├── index.html              ← Estructura HTML completa (sin JS inline)
├── README.md               ← Este archivo
├── css/
│   └── styles.css          ← Estilos responsive (CSS puro, sin frameworks)
├── js/
│   └── script.js           ← Lógica de cálculo + UI + Chart.js
├── data/
│   └── irpf-rates.json     ← Tramos IRPF 2024 de las 17 CCAA (actualizable)
└── assets/
    └── icons/              ← Carpeta para iconos/imágenes opcionales
```

---

## 💻 Ejecutar localmente

### Opción A — Abrir directamente (más simple)

1. Descarga o descomprime la carpeta `tax-calculator-spain/`
2. Abre el archivo `index.html` con tu navegador

> ⚠️ **Nota:** Algunos navegadores bloquean la carga del archivo JSON (`data/irpf-rates.json`)
> cuando se abre con `file://`. La calculadora usa **datos de respaldo embebidos** en ese caso,
> por lo que **seguirá funcionando correctamente**.

### Opción B — Con servidor local (recomendado para desarrollo)

**Con Python:**
```bash
# Python 3
cd tax-calculator-spain
python -m http.server 8080
# Abre: http://localhost:8080
```

**Con Node.js:**
```bash
npx serve tax-calculator-spain
# Abre: http://localhost:3000
```

**Con VS Code:**
- Instala la extensión **Live Server**
- Haz clic derecho en `index.html` → "Open with Live Server"

---

## 🐙 Subir a GitHub

### 1. Crear el repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `tax-calculator-spain`
3. Descripción: `Calculadora IRPF y Seguridad Social España 2024`
4. Visibilidad: **Public** ✅ (necesario para GitHub Pages gratuito)
5. ☐ No inicialices con README (ya tienes uno)
6. Haz clic en **"Create repository"**

### 2. Subir los archivos desde tu ordenador

```bash
# Entra en la carpeta del proyecto
cd tax-calculator-spain

# Inicializa git
git init

# Añade todos los archivos
git add .

# Primer commit
git commit -m "feat: calculadora IRPF España 2024 con gráficos y todas las CCAA"

# Conecta con tu repositorio de GitHub (sustituye TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/tax-calculator-spain.git

# Sube el código
git branch -M main
git push -u origin main
```

### 3. Verificar que se subió bien

- Ve a `https://github.com/TU-USUARIO/tax-calculator-spain`
- Deberías ver todos los archivos: `index.html`, `css/`, `js/`, `data/`, `README.md`

---

## 🌐 Publicar con GitHub Pages (gratis)

1. En tu repositorio de GitHub, ve a **Settings**
2. En el menú lateral izquierdo, haz clic en **Pages**
3. En "Source", selecciona **Deploy from a branch**
4. En "Branch", selecciona **`main`** y carpeta **`/ (root)`**
5. Haz clic en **Save**
6. Espera 1-3 minutos
7. Tu web estará disponible en:
   ```
   https://TU-USUARIO.github.io/tax-calculator-spain/
   ```

> 💡 GitHub Pages sirve el `index.html` de la raíz del repositorio directamente.
> El JSON se carga correctamente porque funciona como un servidor web real.

---

## 📦 Descargar desde Replit como ZIP

1. En Replit, haz clic en los **tres puntos** (···) del explorador de archivos
2. Selecciona **"Download as zip"**
3. Descomprime el archivo en tu ordenador
4. Navega hasta la carpeta `tax-calculator-spain/`
5. Abre `index.html` en tu navegador o sigue los pasos de GitHub Pages

---

## 🔄 Actualizar los tramos de IRPF para años futuros

Solo necesitas editar el archivo `data/irpf-rates.json`:

```json
{
  "tramos_estatales": {
    "tramos": [
      { "desde": 0,     "hasta": 12450,  "tipo": 19 },
      { "desde": 12450, "hasta": 20200,  "tipo": 24 },
      ...
    ]
  }
}
```

**No es necesario** tocar `script.js` ni `index.html`. La lógica lee automáticamente
los tramos del JSON al cargar la página.

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| HTML5 | — | Estructura semántica, accesibilidad (ARIA) |
| CSS3 | — | Diseño responsive, variables CSS, animaciones |
| JavaScript ES6+ | — | Lógica de cálculo, módulos, eventos, fetch API |
| [Chart.js](https://www.chartjs.org/) | 4.4.3 | Gráficos de tarta y barras (CDN) |

> **Sin frameworks, sin dependencias npm, sin compilación.** Abre y funciona.

---

## 📋 Notas legales

Esta calculadora es una herramienta **orientativa** basada en:
- **Ley 35/2006** del Impuesto sobre la Renta de las Personas Físicas (LIRPF)
- **Real Decreto Legislativo 8/2015** de la Seguridad Social
- Datos publicados por la **AEAT** (Agencia Tributaria) para el año fiscal 2024

Los resultados son **estimaciones**. Para tu declaración de la renta oficial, consulta
a un asesor fiscal certificado o la web de la Agencia Tributaria: [agenciatributaria.es](https://www.agenciatributaria.es)

---

## 🤝 Contribuir

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b fix/actualizar-tramos-2025`
3. Haz tus cambios y commit: `git commit -m "fix: actualizar tramos IRPF 2025"`
4. Push a tu rama: `git push origin fix/actualizar-tramos-2025`
5. Abre un Pull Request

---

*Desarrollado como proyecto de portfolio. MIT License.*
