/**
 * ============================================================
 * CHARTS — Módulo de Gráficos (Chart.js)
 * ============================================================
 * Gestiona todos los gráficos de la aplicación.
 * Dependencia: Chart.js (cargado vía CDN en index.html).
 *
 * Uso:
 *   TaxCharts.init();          // llamar una vez al cargar
 *   TaxCharts.update(result);  // llamar cada vez que cambie el resultado
 * ============================================================
 */

'use strict';

const TaxCharts = {

  /** Referencias a instancias de Chart.js */
  pieChart: null,
  barChart: null,

  /** Paleta de colores coherente con el CSS */
  COLORS: {
    neto:   '#10b981',  // verde esmeralda
    irpf:   '#f87171',  // rojo suave
    ss:     '#f97316',  // naranja
    bruto:  '#3b82f6',  // azul
    muted:  '#94a3b8',  // slate-400
    grid:   '#f1f5f9',  // slate-100
    white:  '#ffffff',
  },

  // ──────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ──────────────────────────────────────────────────────────

  /**
   * Configura valores globales de Chart.js.
   * Llamar una vez antes de crear gráficos.
   */
  init() {
    if (typeof Chart === 'undefined') {
      console.warn('TaxCharts: Chart.js no está disponible.');
      return;
    }

    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size   = 12;
    Chart.defaults.color       = '#64748b';
  },

  // ──────────────────────────────────────────────────────────
  // ACTUALIZACIÓN PRINCIPAL
  // ──────────────────────────────────────────────────────────

  /**
   * Actualiza todos los gráficos con el resultado de TaxEngine.
   * @param {Object} result - Resultado de TaxEngine.calculateNetSalary()
   */
  update(result) {
    if (typeof Chart === 'undefined') return;
    this._updatePie(result);
    this._updateBars(result);
  },

  // ──────────────────────────────────────────────────────────
  // GRÁFICO DE TARTA — Distribución del salario
  // ──────────────────────────────────────────────────────────

  _updatePie(result) {
    const canvas = document.getElementById('grafico-pie');
    if (!canvas) return;

    const { netoAnual, irpfTotal, cotizacionSS } = result;
    const labels  = ['Salario Neto', 'IRPF', 'Seguridad Social'];
    const valores  = [
      Math.max(0, netoAnual),
      Math.max(0, irpfTotal),
      Math.max(0, cotizacionSS)
    ];
    const colores  = [this.COLORS.neto, this.COLORS.irpf, this.COLORS.ss];

    const config = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: colores,
          borderWidth: 0,
          hoverOffset: 10,
          borderRadius: 4,
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 18,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { size: 12, weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${_fmt(ctx.raw)}`
            }
          }
        },
        animation: { animateRotate: true, animateScale: false, duration: 700 }
      }
    };

    if (this.pieChart) {
      // Actualizar datos sin recrear el gráfico (más suave)
      this.pieChart.data.datasets[0].data = valores;
      this.pieChart.update('active');
    } else {
      this.pieChart = new Chart(canvas, config);
    }
  },

  // ──────────────────────────────────────────────────────────
  // GRÁFICO DE BARRAS — Comparativa bruto vs neto
  // ──────────────────────────────────────────────────────────

  _updateBars(result) {
    const canvas = document.getElementById('grafico-barras');
    if (!canvas) return;

    // Simulamos diferentes salarios brutos para mostrar la progresividad
    const salarios = [15000, 20000, 25000, 30000, 40000, 50000, 60000, 80000, 100000];

    const brutos  = [];
    const netos   = [];
    const taxes   = [];
    const labels  = salarios.map(s => `${(s / 1000).toFixed(0)}k`);

    for (const s of salarios) {
      const r = TaxEngine.calculateNetSalary({
        salarioBruto:  s,
        numPagas:      result.numPagas,
        estadoCivil:   result.estadoCivil,
        numHijos:      result.numHijos,
        comunidad:     result.comunidadId
      });
      brutos.push(s);
      netos.push(Math.max(0, r.netoAnual));
      taxes.push(Math.max(0, r.totalRetenciones));
    }

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           'Salario Neto',
            data:            netos,
            backgroundColor: this.COLORS.neto,
            borderRadius:    { topLeft: 5, topRight: 5 },
            borderSkipped:   false,
            maxBarThickness: 32,
          },
          {
            label:           'Impuestos + SS',
            data:            taxes,
            backgroundColor: this.COLORS.irpf,
            borderRadius:    { topLeft: 5, topRight: 5 },
            borderSkipped:   false,
            maxBarThickness: 32,
          }
        ]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 18,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { size: 12, weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${_fmt(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            grid:  { color: this.COLORS.grid, drawBorder: false },
            ticks: {
              font: { size: 11 },
              callback: (v) => `${(v / 1000).toFixed(0)}k`
            }
          }
        },
        animation: { duration: 600 }
      }
    };

    if (this.barChart) {
      this.barChart.data.datasets[0].data = netos;
      this.barChart.data.datasets[1].data = taxes;
      this.barChart.update('active');
    } else {
      this.barChart = new Chart(canvas, config);
    }
  }
};

/** Formatea euros (helper local de este módulo) */
function _fmt(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n);
}
