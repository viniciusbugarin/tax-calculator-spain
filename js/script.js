/**
 * ============================================================
 * SCRIPT.JS — Orquestador principal
 * ============================================================
 * Responsabilidades:
 *  - Detectar año fiscal y cargar datos JSON dinámicamente
 *  - Gestionar el formulario y los eventos de usuario
 *  - Llamar a TaxEngine para el cálculo
 *  - Llamar a TaxCharts para actualizar gráficos
 *  - Actualizar el DOM con los resultados
 *
 * Dependencias: taxEngine.js, charts.js (cargados antes en HTML)
 * ============================================================
 */

'use strict';

// ────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ────────────────────────────────────────────────────────────────

/** Años disponibles, de más reciente a más antiguo */
const AVAILABLE_YEARS = [2026, 2025, 2024];

/** Formatear moneda española */
const fmt = (n) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n);

/** Formatear porcentaje */
const fmtPct = (n) => `${n.toFixed(2)}%`;

// ────────────────────────────────────────────────────────────────
// CARGA DE DATOS FISCALES
// ────────────────────────────────────────────────────────────────

/**
 * Intenta cargar el JSON de un año concreto.
 * @param {number} year
 * @returns {Promise<Object|null>}
 */
async function fetchTaxData(year) {
  try {
    const res = await fetch(`data/irpf-${year}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Carga los datos del año actual; si no existen, usa el último disponible.
 * Garantiza siempre datos válidos.
 * @returns {Promise<Object>}
 */
async function loadTaxData() {
  const currentYear = new Date().getFullYear();

  // Intentar año actual primero, luego fallback a lista disponible
  const yearsToTry = [currentYear, ...AVAILABLE_YEARS.filter(y => y !== currentYear)];

  for (const year of yearsToTry) {
    const data = await fetchTaxData(year);
    if (data) {
      console.log(`[TaxApp] Datos fiscales cargados: año ${year}`);
      return data;
    }
  }

  // Último recurso: datos embebidos mínimos
  console.warn('[TaxApp] No se encontraron JSONs. Usando datos embebidos de emergencia.');
  return getEmbeddedFallbackData();
}

// ────────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  mostrarEstadoCarga(true);

  // 1. Cargar datos fiscales
  const taxData = await loadTaxData();
  TaxEngine.taxData = taxData;

  // 2. Inicializar gráficos
  TaxCharts.init();

  // 3. Poblar selector de comunidades
  poblarComunidades(taxData);

  // 4. Actualizar indicador de año
  actualizarIndicadorAño(taxData.year);

  // 5. Calcular por primera vez con valores por defecto
  calcularYActualizar();

  // 6. Escuchar cambios en el formulario
  registrarEventos();

  mostrarEstadoCarga(false);
});

// ────────────────────────────────────────────────────────────────
// EVENTOS DEL FORMULARIO
// ────────────────────────────────────────────────────────────────

function registrarEventos() {
  const rangeSlider = document.getElementById('salario-bruto');
  const inputTexto  = document.getElementById('salario-bruto-texto');

  // Sincronizar slider ↔ input de texto
  rangeSlider?.addEventListener('input', () => {
    if (inputTexto) inputTexto.value = rangeSlider.value;
    actualizarEtiquetaSlider(Number(rangeSlider.value));
    calcularYActualizar();
  });

  inputTexto?.addEventListener('input', () => {
    const val = Math.min(Math.max(Number(inputTexto.value) || 0, 0), 200000);
    if (rangeSlider) rangeSlider.value = val;
    actualizarEtiquetaSlider(val);
    calcularYActualizar();
  });

  // Resto de campos
  ['num-pagas', 'estado-civil', 'num-hijos', 'comunidad'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', calcularYActualizar);
  });
}

function actualizarEtiquetaSlider(valor) {
  const etiqueta = document.getElementById('salario-label');
  if (etiqueta) {
    etiqueta.textContent = new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(valor);
  }
}

// ────────────────────────────────────────────────────────────────
// CÁLCULO PRINCIPAL
// ────────────────────────────────────────────────────────────────

function leerFormulario() {
  return {
    salarioBruto: Number(document.getElementById('salario-bruto')?.value) || 30000,
    numPagas:     Number(document.getElementById('num-pagas')?.value)     || 12,
    estadoCivil:         document.getElementById('estado-civil')?.value   || 'soltero',
    numHijos:     Number(document.getElementById('num-hijos')?.value)     || 0,
    comunidad:           document.getElementById('comunidad')?.value      || 'MAD',
  };
}

function calcularYActualizar() {
  if (!TaxEngine.taxData) return;

  const input = leerFormulario();

  try {
    const resultado = TaxEngine.calculateNetSalary(input);
    actualizarResultados(resultado);
    TaxCharts.update(resultado);
    manejarRegimenForal(resultado.comunidadRegimen);

    // Emitir evento para que el resto del DOM pueda reaccionar
    document.dispatchEvent(new CustomEvent('resultado-actualizado', { detail: resultado }));
  } catch (err) {
    console.error('[TaxApp] Error en cálculo:', err);
  }
}

// ────────────────────────────────────────────────────────────────
// ACTUALIZACIÓN DEL DOM — Resultados
// ────────────────────────────────────────────────────────────────

function actualizarResultados(r) {
  // Tarjetas principales
  setTexto('neto-anual',    fmt(r.netoAnual));
  setTexto('neto-mensual',  fmt(r.netoMensual));
  setTexto('irpf-total',    fmt(r.irpfTotal));
  setTexto('ss-total',      fmt(r.cotizacionSS));
  setTexto('tipo-efectivo', fmtPct(r.tipoEfectivoIRPF));
  setTexto('presion-fiscal', fmtPct(r.presionFiscal));
  setTexto('tipo-marginal',  fmtPct(r.tipoMarginal));

  // Desglose SS
  if (r.ssBreakdown) {
    setTexto('ss-cc',  fmt(r.ssBreakdown.contingencias_comunes));
    setTexto('ss-des', fmt(r.ssBreakdown.desempleo));
    setTexto('ss-fp',  fmt(r.ssBreakdown.formacion));
    setTexto('ss-mei', fmt(r.ssBreakdown.mei || 0));
  }

  // Barra de distribución
  actualizarBarraDistribucion(r);

  // Tabla de tramos
  actualizarTablaTramos(r.detalleTramos, r.baseImponible);

  // Resumen deducción
  setTexto('base-imponible',        fmt(r.baseImponible));
  setTexto('gastos-deducibles-val', fmt(r.gastosDucibles));
  setTexto('reduccion-trabajo-val', fmt(r.reduccionTrabajo));
  setTexto('minimo-personal-val',   fmt(r.minimoPersonal));

  // Info comunidad
  setTexto('comunidad-nombre', r.comunidadNombre);
  setTexto('year-fiscal-label', `Año fiscal ${r.yearFiscal}`);
}

function actualizarBarraDistribucion(r) {
  const bar = document.getElementById('barra-distribucion');
  if (!bar) return;

  const pNeto = Math.max(0, (r.netoAnual    / r.salarioBruto) * 100);
  const pIRPF = Math.max(0, (r.irpfTotal    / r.salarioBruto) * 100);
  const pSS   = Math.max(0, (r.cotizacionSS / r.salarioBruto) * 100);

  bar.innerHTML = `
    <div class="barra-segmento barra-neto" style="width:${pNeto.toFixed(1)}%"
         title="Neto ${pNeto.toFixed(1)}%"></div>
    <div class="barra-segmento barra-irpf" style="width:${pIRPF.toFixed(1)}%"
         title="IRPF ${pIRPF.toFixed(1)}%"></div>
    <div class="barra-segmento barra-ss"   style="width:${pSS.toFixed(1)}%"
         title="SS ${pSS.toFixed(1)}%"></div>
  `;

  setTexto('pct-neto', `${pNeto.toFixed(1)}%`);
  setTexto('pct-irpf', `${pIRPF.toFixed(1)}%`);
  setTexto('pct-ss',   `${pSS.toFixed(1)}%`);
}

function actualizarTablaTramos(tramos, baseImponible) {
  const tbody = document.getElementById('tabla-tramos-body');
  if (!tbody || !tramos?.length) return;

  tbody.innerHTML = tramos.map(t => {
    const activo = baseImponible > t.desde ? 'fila-activa' : '';
    return `
      <tr class="${activo}">
        <td>${fmt(t.desde)} — ${t.hasta ? fmt(t.hasta) : 'en adelante'}</td>
        <td class="text-center">${t.tipo}%</td>
        <td class="text-right">${fmt(t.gravado)}</td>
        <td class="text-right impuesto-col">${fmt(t.impuesto)}</td>
      </tr>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────────
// HELPERS DOM
// ────────────────────────────────────────────────────────────────

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function poblarComunidades(taxData) {
  const sel = document.getElementById('comunidad');
  if (!sel || !taxData?.comunidades_autonomas) return;

  const comunidades = taxData.comunidades_autonomas;
  const ordenadas = Object.entries(comunidades).sort((a, b) =>
    a[1].nombre.localeCompare(b[1].nombre, 'es')
  );

  sel.innerHTML = ordenadas.map(([id, ccaa]) => {
    const foral = ccaa.regimen === 'foral' ? ' ⚠' : '';
    return `<option value="${id}">${ccaa.nombre}${foral}</option>`;
  }).join('');

  sel.value = 'MAD';
}

function actualizarIndicadorAño(year) {
  setTexto('year-indicator', `Datos fiscales ${year}`);
  setTexto('year-fiscal-label', `Año fiscal ${year}`);
}

function manejarRegimenForal(regimen) {
  const aviso = document.getElementById('aviso-foral');
  if (aviso) aviso.style.display = regimen === 'foral' ? 'block' : 'none';
}

function mostrarEstadoCarga(cargando) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = cargando ? 'flex' : 'none';
}

// ────────────────────────────────────────────────────────────────
// DATOS DE EMERGENCIA (fallback sin servidor — protocolo file://)
// ────────────────────────────────────────────────────────────────

function getEmbeddedFallbackData() {
  return {
    year: 2024,
    seguridad_social: {
      contingencias_comunes: 4.70, desempleo: 1.55, formacion: 0.10, mei: 0, total: 6.35
    },
    gastos_deducibles: { cantidad_fija: 2000 },
    reduccion_trabajo: {
      limite1: 14852, limite2: 17673.52,
      reduccion_maxima: 6498, reduccion_minima: 3280, coeficiente: 1.14286
    },
    minimos_personales_familiares: {
      personal: 5550, conyuge_sin_ingresos: 3400,
      hijos: [
        { orden: 1, importe: 2400 }, { orden: 2, importe: 2700 },
        { orden: 3, importe: 4000 }, { orden: 4, importe: 4500 }
      ]
    },
    tramos_estatales: [
      { desde: 0,      hasta: 12450,  tipo: 9.5  },
      { desde: 12450,  hasta: 20200,  tipo: 12   },
      { desde: 20200,  hasta: 35200,  tipo: 15   },
      { desde: 35200,  hasta: 60000,  tipo: 18.5 },
      { desde: 60000,  hasta: 300000, tipo: 22.5 },
      { desde: 300000, hasta: null,   tipo: 24.5 }
    ],
    comunidades_autonomas: {
      AND: { nombre: 'Andalucía',           regimen: 'general', tramos: [
        { desde: 0, hasta: 13000, tipo: 9.5 }, { desde: 13000, hasta: 21000, tipo: 12 },
        { desde: 21000, hasta: 35200, tipo: 15 }, { desde: 35200, hasta: 60000, tipo: 18.5 },
        { desde: 60000, hasta: null, tipo: 22.5 }
      ]},
      CAT: { nombre: 'Cataluña',            regimen: 'general', tramos: [
        { desde: 0, hasta: 12450, tipo: 10.5 }, { desde: 12450, hasta: 17707, tipo: 12 },
        { desde: 17707, hasta: 33007, tipo: 14 }, { desde: 33007, hasta: 53407, tipo: 18.5 },
        { desde: 53407, hasta: null, tipo: 21.5 }
      ]},
      MAD: { nombre: 'Comunidad de Madrid', regimen: 'general', tramos: [
        { desde: 0, hasta: 12450, tipo: 9 }, { desde: 12450, hasta: 17707, tipo: 11.2 },
        { desde: 17707, hasta: 33007, tipo: 13.3 }, { desde: 33007, hasta: 53407, tipo: 17.9 },
        { desde: 53407, hasta: null, tipo: 21 }
      ]},
      PVA: { nombre: 'País Vasco ⚠',        regimen: 'foral', tramos: [
        { desde: 0, hasta: 15170, tipo: 7 }, { desde: 15170, hasta: 26990, tipo: 18 },
        { desde: 26990, hasta: 60000, tipo: 31 }, { desde: 60000, hasta: null, tipo: 40 }
      ]},
      NAV: { nombre: 'Navarra ⚠',           regimen: 'foral', tramos: [
        { desde: 0, hasta: 13370, tipo: 9.5 }, { desde: 13370, hasta: 30000, tipo: 14 },
        { desde: 30000, hasta: 60000, tipo: 24.5 }, { desde: 60000, hasta: null, tipo: 27 }
      ]}
    }
  };
}
