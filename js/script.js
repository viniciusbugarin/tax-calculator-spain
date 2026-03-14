/**
 * ============================================================
 * CALCULADORA DE IRPF Y SEGURIDAD SOCIAL — ESPAÑA 2024
 * ============================================================
 * Basada en:
 *  - Ley 35/2006 del Impuesto sobre la Renta de las Personas Físicas (LIRPF)
 *  - Real Decreto Legislativo 8/2015 de la Seguridad Social
 *  - Datos AEAT 2024
 *
 * Estructura del código:
 *  1. Módulo de datos fiscales (TAX_DATA)
 *  2. Módulo de cálculo (TaxCalculator)
 *  3. Módulo de gráficos (Charts)
 *  4. Módulo de UI (UI)
 *  5. Inicialización
 * ============================================================
 */

'use strict';

/* ============================================================
   1. DATOS FISCALES
   Cargados desde data/irpf-rates.json al inicio.
   Separados de la lógica para facilitar actualización anual.
   ============================================================ */

let TAX_DATA = null;

/**
 * Carga los datos fiscales desde el JSON externo.
 * Si falla (apertura local con file://) usa datos embebidos de respaldo.
 */
async function loadTaxData() {
  try {
    const response = await fetch('./data/irpf-rates.json');
    if (!response.ok) throw new Error('No se pudo cargar el archivo JSON');
    TAX_DATA = await response.json();
  } catch (e) {
    console.warn('Cargando datos fiscales embebidos (respaldo):', e.message);
    TAX_DATA = getFallbackTaxData();
  }
  init();
}

/**
 * Datos de respaldo embebidos para cuando se abre el archivo
 * directamente con file:// (sin servidor local).
 */
function getFallbackTaxData() {
  return {
    seguridad_social: { total: 6.35 },
    gastos_deducibles: { cantidad_fija: 2000 },
    tramos_estatales: {
      tramos: [
        { desde: 0,      hasta: 12450,  tipo: 9.5  },
        { desde: 12450,  hasta: 20200,  tipo: 12   },
        { desde: 20200,  hasta: 35200,  tipo: 15   },
        { desde: 35200,  hasta: 60000,  tipo: 18.5 },
        { desde: 60000,  hasta: 300000, tipo: 22.5 },
        { desde: 300000, hasta: null,   tipo: 24.5 }
      ]
    },
    minimos_personales_familiares: {
      personal: 5550,
      conyuge_sin_ingresos: 3400,
      hijos: [
        { orden: 1, importe: 2400 },
        { orden: 2, importe: 2700 },
        { orden: 3, importe: 4000 },
        { orden: 4, importe: 4500 }
      ]
    },
    comunidades_autonomas: {
      MAD: { nombre: 'Comunidad de Madrid', regimen: 'general', tramos: [
        { desde: 0,      hasta: 12450,  tipo: 9    },
        { desde: 12450,  hasta: 17707,  tipo: 11.2 },
        { desde: 17707,  hasta: 33007,  tipo: 13.3 },
        { desde: 33007,  hasta: 53407,  tipo: 17.9 },
        { desde: 53407,  hasta: 300000, tipo: 21   },
        { desde: 300000, hasta: null,   tipo: 21   }
      ]},
      AND: { nombre: 'Andalucía', regimen: 'general', tramos: [
        { desde: 0,      hasta: 13000,  tipo: 9.5  },
        { desde: 13000,  hasta: 21000,  tipo: 12   },
        { desde: 21000,  hasta: 35200,  tipo: 15   },
        { desde: 35200,  hasta: 60000,  tipo: 18.5 },
        { desde: 60000,  hasta: 300000, tipo: 22.5 },
        { desde: 300000, hasta: null,   tipo: 24.5 }
      ]},
      CAT: { nombre: 'Cataluña', regimen: 'general', tramos: [
        { desde: 0,      hasta: 12450,  tipo: 10.5 },
        { desde: 12450,  hasta: 17707,  tipo: 12   },
        { desde: 17707,  hasta: 21000,  tipo: 14   },
        { desde: 21000,  hasta: 33007,  tipo: 15   },
        { desde: 33007,  hasta: 53407,  tipo: 18.5 },
        { desde: 53407,  hasta: 90000,  tipo: 21.5 },
        { desde: 90000,  hasta: 120000, tipo: 23.5 },
        { desde: 120000, hasta: null,   tipo: 25.5 }
      ]},
      VAL: { nombre: 'Comunitat Valenciana', regimen: 'general', tramos: [
        { desde: 0,      hasta: 12450,  tipo: 10   },
        { desde: 12450,  hasta: 17000,  tipo: 12.5 },
        { desde: 17000,  hasta: 30000,  tipo: 15   },
        { desde: 30000,  hasta: 50000,  tipo: 18.5 },
        { desde: 50000,  hasta: 65000,  tipo: 21.5 },
        { desde: 300000, hasta: null,   tipo: 29.5 }
      ]}
    }
  };
}

/* ============================================================
   2. MÓDULO DE CÁLCULO FISCAL
   ============================================================ */

const TaxCalculator = {

  /**
   * Calcula el impuesto progresivo sobre una base dada,
   * usando los tramos proporcionados.
   * @param {number} base - Base imponible en euros
   * @param {Array} tramos - Array de tramos {desde, hasta, tipo}
   * @returns {{ total: number, detalle: Array }}
   */
  calcularImpuestoPorTramos(base, tramos) {
    if (base <= 0) return { total: 0, detalle: [] };

    let total = 0;
    const detalle = [];

    for (const tramo of tramos) {
      if (base <= tramo.desde) break;

      const limite = tramo.hasta === null ? base : tramo.hasta;
      const gravado = Math.min(base, limite) - tramo.desde;
      const impuesto = gravado * (tramo.tipo / 100);

      total += impuesto;
      detalle.push({
        desde: tramo.desde,
        hasta: limite,
        tipo: tramo.tipo,
        gravado,
        impuesto
      });

      if (base <= limite) break;
    }

    return { total, detalle };
  },

  /**
   * Calcula la reducción por rendimientos del trabajo (Art. 20 LIRPF).
   * @param {number} rendimientoNeto - Rendimiento neto del trabajo
   * @returns {number} - Reducción en euros
   */
  calcularReduccionTrabajo(rendimientoNeto) {
    if (rendimientoNeto <= 14852) {
      return 6498;
    } else if (rendimientoNeto <= 17673.52) {
      return 6498 - 1.14286 * (rendimientoNeto - 14852);
    } else {
      return 3280;
    }
  },

  /**
   * Función principal: calcula todos los impuestos y deducciones.
   * @param {Object} input - Datos del contribuyente
   * @param {number} input.salarioBruto - Salario bruto anual
   * @param {number} input.numPagas - Número de pagas (12 o 14)
   * @param {string} input.estadoCivil - 'soltero' o 'casado'
   * @param {number} input.numHijos - Número de hijos
   * @param {string} input.comunidad - ID de la comunidad autónoma
   * @returns {Object} - Resultado completo del cálculo
   */
  calcular(input) {
    const { salarioBruto, numPagas, estadoCivil, numHijos, comunidad } = input;
    const data = TAX_DATA;

    // ── 1. Cotización a la Seguridad Social ────────────────
    const tasaSS = data.seguridad_social.total / 100;
    const cotizacionSS = salarioBruto * tasaSS;

    // ── 2. Gastos deducibles (Art. 19 LIRPF) ──────────────
    const gastosDucibles = Math.min(
      data.gastos_deducibles.cantidad_fija,
      salarioBruto
    );

    // ── 3. Rendimiento neto del trabajo ────────────────────
    const rendimientoNeto = Math.max(0, salarioBruto - cotizacionSS - gastosDucibles);

    // ── 4. Reducción por rendimientos del trabajo (Art. 20) ─
    const reduccionTrabajo = this.calcularReduccionTrabajo(rendimientoNeto);
    const rendimientoNetoReducido = Math.max(0, rendimientoNeto - reduccionTrabajo);

    // ── 5. Mínimo personal y familiar ─────────────────────
    const mfData = data.minimos_personales_familiares;
    let minimoPersonal = mfData.personal;

    if (estadoCivil === 'casado') {
      minimoPersonal += mfData.conyuge_sin_ingresos;
    }

    for (let i = 0; i < numHijos; i++) {
      const hijo = mfData.hijos[Math.min(i, mfData.hijos.length - 1)];
      minimoPersonal += hijo.importe;
    }

    // ── 6. Base imponible general ──────────────────────────
    const baseImponible = rendimientoNetoReducido;
    const minimoEfectivo = Math.min(minimoPersonal, baseImponible);

    // ── 7. Tramos estatales ────────────────────────────────
    const tramosEstatales = data.tramos_estatales.tramos;
    const { total: impEstatBase, detalle: detalleTramos } =
      this.calcularImpuestoPorTramos(baseImponible, tramosEstatales);
    const { total: impEstatMin } =
      this.calcularImpuestoPorTramos(minimoEfectivo, tramosEstatales);
    const irpfEstatal = Math.max(0, impEstatBase - impEstatMin);

    // ── 8. Tramos autonómicos ──────────────────────────────
    const comunidadData = data.comunidades_autonomas[comunidad] ||
      data.comunidades_autonomas['MAD'];
    const tramosAuto = comunidadData.tramos;
    const { total: impAutoBase } =
      this.calcularImpuestoPorTramos(baseImponible, tramosAuto);
    const { total: impAutoMin } =
      this.calcularImpuestoPorTramos(minimoEfectivo, tramosAuto);
    const irpfAutonomico = Math.max(0, impAutoBase - impAutoMin);

    // ── 9. Totales ─────────────────────────────────────────
    const irpfTotal = irpfEstatal + irpfAutonomico;
    const totalRetenciones = cotizacionSS + irpfTotal;
    const netoAnual = salarioBruto - totalRetenciones;
    const netoMensual = netoAnual / numPagas;

    // ── 10. Tipo efectivo y marginal ───────────────────────
    const tipoEfectivoIRPF = salarioBruto > 0
      ? (irpfTotal / salarioBruto) * 100 : 0;
    const presionFiscal = salarioBruto > 0
      ? (totalRetenciones / salarioBruto) * 100 : 0;

    // Tipo marginal: último tramo aplicado
    let tipoMarginal = 0;
    for (const t of tramosEstatales) {
      const limAuto = tramosAuto.find(a => a.desde === t.desde);
      const tipoTotal = t.tipo + (limAuto ? limAuto.tipo : 0);
      if (baseImponible > t.desde) tipoMarginal = tipoTotal;
    }

    return {
      // Inputs
      salarioBruto,
      numPagas,
      estadoCivil,
      numHijos,
      comunidadNombre: comunidadData.nombre,
      comunidadRegimen: comunidadData.regimen,

      // Deducciones
      cotizacionSS,
      gastosDucibles,
      reduccionTrabajo,
      minimoPersonal,

      // Base
      rendimientoNeto,
      rendimientoNetoReducido,
      baseImponible,

      // IRPF desglosado
      irpfEstatal,
      irpfAutonomico,
      irpfTotal,

      // Totales
      totalRetenciones,
      netoAnual,
      netoMensual,

      // Tasas
      tipoEfectivoIRPF,
      presionFiscal,
      tipoMarginal,

      // Para desglose de tramos
      detalleTramos
    };
  }
};

/* ============================================================
   3. MÓDULO DE GRÁFICOS (Chart.js)
   ============================================================ */

const Charts = {
  pieChart: null,
  barChart: null,

  /**
   * Inicializa o actualiza el gráfico de tarta (distribución).
   */
  actualizarPie(resultado) {
    const ctx = document.getElementById('grafico-pie').getContext('2d');
    const { netoAnual, cotizacionSS, irpfTotal } = resultado;

    const datos = {
      labels: ['Salario Neto', 'IRPF', 'Seguridad Social'],
      datasets: [{
        data: [
          Math.max(0, netoAnual),
          Math.max(0, irpfTotal),
          Math.max(0, cotizacionSS)
        ],
        backgroundColor: ['#10b981', '#f87171', '#f97316'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    if (this.pieChart) {
      this.pieChart.data = datos;
      this.pieChart.update('active');
    } else {
      this.pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: datos,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 16, font: { size: 12 }, usePointStyle: true }
            },
            tooltip: {
              callbacks: {
                label: (item) => ` ${item.label}: ${formatEuros(item.raw)}`
              }
            }
          },
          animation: { animateRotate: true, duration: 700 }
        }
      });
    }
  },

  /**
   * Inicializa o actualiza el gráfico de barras comparativo.
   */
  actualizarBarras(resultado) {
    const ctx = document.getElementById('grafico-barras').getContext('2d');

    // Generar datos para varios salarios de referencia
    const salarios = [15000, 20000, 25000, 30000, 40000, 50000, 60000, 80000];
    const labels = salarios.map(s => `${(s / 1000).toFixed(0)}k€`);

    const netos = [], impuestos = [];

    for (const s of salarios) {
      const r = TaxCalculator.calcular({
        salarioBruto: s,
        numPagas: resultado.numPagas,
        estadoCivil: resultado.estadoCivil,
        numHijos: resultado.numHijos,
        comunidad: Object.keys(TAX_DATA.comunidades_autonomas).find(
          k => TAX_DATA.comunidades_autonomas[k].nombre === resultado.comunidadNombre
        ) || 'MAD'
      });
      netos.push(Math.max(0, r.netoAnual));
      impuestos.push(Math.max(0, r.totalRetenciones));
    }

    const datos = {
      labels,
      datasets: [
        {
          label: 'Salario Neto',
          data: netos,
          backgroundColor: '#10b981',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Impuestos + SS',
          data: impuestos,
          backgroundColor: '#f87171',
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    };

    if (this.barChart) {
      this.barChart.data = datos;
      this.barChart.update('active');
    } else {
      this.barChart = new Chart(ctx, {
        type: 'bar',
        data: datos,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 16, font: { size: 12 }, usePointStyle: true }
            },
            tooltip: {
              callbacks: {
                label: (item) => ` ${item.dataset.label}: ${formatEuros(item.raw)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 } }
            },
            y: {
              grid: { color: '#f1f5f9' },
              ticks: {
                font: { size: 11 },
                callback: (v) => `${(v / 1000).toFixed(0)}k`
              }
            }
          },
          animation: { duration: 600 }
        }
      });
    }
  }
};

/* ============================================================
   4. MÓDULO DE INTERFAZ DE USUARIO
   ============================================================ */

const UI = {

  /** Rellena el selector de comunidades autónomas con los datos del JSON */
  poblarComunidades() {
    const select = document.getElementById('comunidad');
    const ccaa = TAX_DATA.comunidades_autonomas;

    // Ordenar por nombre
    const ordenadas = Object.entries(ccaa)
      .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre));

    select.innerHTML = '';
    for (const [id, data] of ordenadas) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = data.nombre + (data.regimen === 'foral' ? ' ⚠️' : '');
      if (id === 'MAD') opt.selected = true;
      select.appendChild(opt);
    }
  },

  /** Lee todos los inputs del formulario */
  leerInputs() {
    const brutoRaw = document.getElementById('salario-bruto').value
      .replace(/\./g, '').replace(',', '.');
    const salarioBruto = parseFloat(brutoRaw) || 0;
    const numPagas = parseInt(document.querySelector('input[name="pagas"]:checked')?.value || '14');
    const estadoCivil = document.querySelector('input[name="estado-civil"]:checked')?.value || 'soltero';
    const numHijos = parseInt(document.getElementById('num-hijos').value) || 0;
    const comunidad = document.getElementById('comunidad').value;

    return { salarioBruto, numPagas, estadoCivil, numHijos, comunidad };
  },

  /** Actualiza toda la interfaz con el resultado del cálculo */
  mostrarResultado(r) {
    // ── Tarjetas principales ─────────────────────────────────
    this.animar('res-neto-anual', formatEuros(r.netoAnual));
    this.animar('res-neto-mensual', formatEuros(r.netoMensual));
    this.animar('res-irpf', formatEuros(r.irpfTotal));
    this.animar('res-ss', formatEuros(r.cotizacionSS));
    this.animar('res-tipo-efectivo', formatPorcentaje(r.tipoEfectivoIRPF));
    this.animar('res-tipo-marginal', formatPorcentaje(r.tipoMarginal));
    this.animar('res-presion', formatPorcentaje(r.presionFiscal));

    // ── Barra visual ─────────────────────────────────────────
    const pctNeto    = Math.max(0, (r.netoAnual / r.salarioBruto) * 100);
    const pctIRPF    = Math.max(0, (r.irpfTotal / r.salarioBruto) * 100);
    const pctSS      = Math.max(0, (r.cotizacionSS / r.salarioBruto) * 100);

    document.getElementById('barra-neto').style.width  = pctNeto + '%';
    document.getElementById('barra-irpf').style.width  = pctIRPF + '%';
    document.getElementById('barra-ss').style.width    = pctSS   + '%';

    document.getElementById('pct-neto').textContent = pctNeto.toFixed(1) + '%';
    document.getElementById('pct-irpf').textContent = pctIRPF.toFixed(1) + '%';
    document.getElementById('pct-ss').textContent   = pctSS.toFixed(1)   + '%';

    // ── Desglose detallado ───────────────────────────────────
    document.getElementById('det-salario-bruto').textContent    = formatEuros(r.salarioBruto);
    document.getElementById('det-ss').textContent               = '− ' + formatEuros(r.cotizacionSS);
    document.getElementById('det-gastos').textContent           = '− ' + formatEuros(r.gastosDucibles);
    document.getElementById('det-reduccion').textContent        = '− ' + formatEuros(r.reduccionTrabajo);
    document.getElementById('det-minimo').textContent           = formatEuros(r.minimoPersonal);
    document.getElementById('det-base').textContent             = formatEuros(r.baseImponible);
    document.getElementById('det-irpf-estatal').textContent     = '− ' + formatEuros(r.irpfEstatal);
    document.getElementById('det-irpf-auto').textContent        = '− ' + formatEuros(r.irpfAutonomico);
    document.getElementById('det-neto-final').textContent       = formatEuros(r.netoAnual);

    // ── Info comunidad ───────────────────────────────────────
    document.getElementById('info-comunidad').textContent = r.comunidadNombre;

    // ── Aviso régimen foral ──────────────────────────────────
    const avisoForal = document.getElementById('aviso-foral');
    avisoForal.hidden = r.comunidadRegimen !== 'foral';

    // ── Tramos aplicados ─────────────────────────────────────
    this.mostrarTramos(r.detalleTramos, r.baseImponible);

    // ── Gráficos ─────────────────────────────────────────────
    Charts.actualizarPie(r);
    Charts.actualizarBarras(r);

    // ── Mostrar sección resultados ───────────────────────────
    document.getElementById('seccion-resultados').hidden = false;
  },

  /** Renderiza la tabla de tramos IRPF */
  mostrarTramos(detalle, base) {
    const tbody = document.getElementById('tabla-tramos-body');
    tbody.innerHTML = '';

    if (!detalle.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin tramos aplicables</td></tr>';
      return;
    }

    for (const t of detalle) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatEuros(t.desde)} — ${t.hasta >= 1e9 ? '∞' : formatEuros(t.hasta)}</td>
        <td class="text-center">${t.tipo}%</td>
        <td class="text-right">${formatEuros(t.gravado)}</td>
        <td class="text-right text-danger">${formatEuros(t.impuesto)}</td>
      `;
      tbody.appendChild(tr);
    }
  },

  /** Anima el cambio de valor en un elemento */
  animar(id, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('valor-actualizado');
    el.textContent = valor;
    setTimeout(() => el.classList.remove('valor-actualizado'), 500);
  }
};

/* ============================================================
   5. UTILIDADES
   ============================================================ */

/** Formatea un número como moneda en euros */
function formatEuros(cantidad) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cantidad);
}

/** Formatea un número como porcentaje */
function formatPorcentaje(valor) {
  return valor.toFixed(2) + '%';
}

/** Formatea el input de salario con puntos de miles */
function formatearInputSalario(input) {
  const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
  const num = parseInt(raw, 10);
  if (!isNaN(num)) {
    input.value = num.toLocaleString('es-ES');
  } else if (raw === '') {
    input.value = '';
  }
}

/* ============================================================
   6. INICIALIZACIÓN Y EVENTOS
   ============================================================ */

function init() {
  // Poblar selector de CCAA
  UI.poblarComunidades();

  // Sincronizar slider con input de texto
  const inputSalario = document.getElementById('salario-bruto');
  const slider       = document.getElementById('slider-salario');

  inputSalario.addEventListener('input', function () {
    formatearInputSalario(this);
    const val = parseInt(this.value.replace(/\./g, ''), 10) || 0;
    slider.value = Math.min(val, parseInt(slider.max));
    calcularYMostrar();
  });

  slider.addEventListener('input', function () {
    inputSalario.value = parseInt(this.value).toLocaleString('es-ES');
    calcularYMostrar();
  });

  // Eventos para todos los demás inputs
  ['pagas', 'estado-civil'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      el.addEventListener('change', calcularYMostrar);
    });
  });

  document.getElementById('num-hijos').addEventListener('input', calcularYMostrar);
  document.getElementById('comunidad').addEventListener('change', calcularYMostrar);

  // Botones de hijos
  document.getElementById('btn-hijos-menos').addEventListener('click', () => {
    const el = document.getElementById('num-hijos');
    el.value = Math.max(0, parseInt(el.value || 0) - 1);
    calcularYMostrar();
  });
  document.getElementById('btn-hijos-mas').addEventListener('click', () => {
    const el = document.getElementById('num-hijos');
    el.value = Math.min(10, parseInt(el.value || 0) + 1);
    calcularYMostrar();
  });

  // Tabs de gráficos
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
      document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
      this.classList.add('activo');
      document.getElementById(this.dataset.tab).hidden = false;
    });
  });

  // Calcular con valores iniciales
  calcularYMostrar();
}

function calcularYMostrar() {
  const inputs = UI.leerInputs();
  const resultado = TaxCalculator.calcular(inputs);
  UI.mostrarResultado(resultado);
}

// Arrancar cuando el DOM esté listo y el JSON cargado
document.addEventListener('DOMContentLoaded', loadTaxData);
