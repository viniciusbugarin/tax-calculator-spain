/**
 * ============================================================
 * TAX ENGINE — Motor de Cálculo Fiscal
 * ============================================================
 * Módulo puro de lógica fiscal. No accede al DOM.
 * Solo funciones de cálculo. Testarle es trivial.
 *
 * Dependencia externa: ninguna.
 * Datos: recibidos como parámetros (inyección de datos).
 * ============================================================
 */

'use strict';

const TaxEngine = {

  /** Datos fiscales cargados externamente por script.js */
  taxData: null,

  // ──────────────────────────────────────────────────────────
  // 1. SEGURIDAD SOCIAL
  // ──────────────────────────────────────────────────────────

  /**
   * Calcula la cotización del empleado a la Seguridad Social.
   * @param {number} grossSalary - Salario bruto anual en euros
   * @returns {{ amount: number, rate: number, breakdown: Object }}
   */
  calculateSocialSecurity(grossSalary) {
    if (!this.taxData) throw new Error('TaxEngine: datos fiscales no cargados.');

    const ss = this.taxData.seguridad_social;
    const rate = ss.total / 100;
    const amount = grossSalary * rate;

    return {
      amount,
      rate: ss.total,
      breakdown: {
        contingencias_comunes: grossSalary * (ss.contingencias_comunes / 100),
        desempleo: grossSalary * (ss.desempleo / 100),
        formacion: grossSalary * (ss.formacion / 100),
        mei: grossSalary * ((ss.mei || 0) / 100),
      }
    };
  },

  // ──────────────────────────────────────────────────────────
  // 2. REDUCCIÓN POR RENDIMIENTOS DEL TRABAJO (Art. 20 LIRPF)
  // ──────────────────────────────────────────────────────────

  /**
   * Calcula la reducción por rendimientos del trabajo.
   * Esta reducción minora la base imponible para rentas bajas/medias.
   * @param {number} rendimientoNeto - Rendimiento neto del trabajo (antes de esta reducción)
   * @returns {number} - Importe de la reducción en euros
   */
  calculateReduccionTrabajo(rendimientoNeto) {
    // Valores 2024 (Art. 20 LIRPF, Ley 35/2006)
    const params = this.taxData?.reduccion_trabajo || {
      limite1: 14852,
      limite2: 17673.52,
      reduccion_maxima: 6498,
      reduccion_minima: 3280,
      coeficiente: 1.14286
    };

    if (rendimientoNeto <= params.limite1) {
      return params.reduccion_maxima;
    } else if (rendimientoNeto <= params.limite2) {
      return params.reduccion_maxima -
        params.coeficiente * (rendimientoNeto - params.limite1);
    } else {
      return params.reduccion_minima;
    }
  },

  // ──────────────────────────────────────────────────────────
  // 3. CÁLCULO DE IRPF
  // ──────────────────────────────────────────────────────────

  /**
   * Aplica los tramos progresivos del IRPF a una base imponible.
   * @param {number} base - Base imponible en euros
   * @param {Array}  brackets - Array de tramos [{desde, hasta, tipo}]
   * @returns {{ total: number, detail: Array }}
   */
  calculateIRPF(base, brackets) {
    if (base <= 0) return { total: 0, detail: [] };

    let total = 0;
    const detail = [];

    for (const bracket of brackets) {
      if (base <= bracket.desde) break;

      const limit = bracket.hasta === null ? base : bracket.hasta;
      const taxable = Math.min(base, limit) - bracket.desde;
      const tax = taxable * (bracket.tipo / 100);

      total += tax;
      detail.push({
        desde: bracket.desde,
        hasta: limit,
        tipo: bracket.tipo,
        gravado: taxable,
        impuesto: tax
      });

      if (base <= limit) break;
    }

    return { total, detail };
  },

  // ──────────────────────────────────────────────────────────
  // 4. CÁLCULO COMPLETO DEL SALARIO NETO
  // ──────────────────────────────────────────────────────────

  /**
   * Función principal: calcula el salario neto completo.
   *
   * Proceso oficial AEAT:
   *  1. Rendimiento bruto = Salario bruto
   *  2. Gastos deducibles  = SS + gastos fijos (Art. 19)
   *  3. Rendimiento neto   = Bruto - gastos deducibles
   *  4. Reducción Art. 20  = f(rendimiento neto)
   *  5. Base imponible     = Rendimiento neto - Reducción Art. 20
   *  6. Mínimo personal    = personal + cónyuge + hijos
   *  7. Cuota íntegra      = Tax(base) - Tax(mínimo) [estatal + autonómica]
   *  8. Neto               = Bruto - SS - IRPF
   *
   * @param {Object} input
   * @param {number} input.salarioBruto     - Salario bruto anual (€)
   * @param {number} input.numPagas         - Nº pagas (12 o 14)
   * @param {string} input.estadoCivil      - 'soltero' | 'casado'
   * @param {number} input.numHijos         - Nº hijos
   * @param {string} input.comunidad        - ID de CCAA (e.g. 'MAD')
   * @returns {Object} resultado completo
   */
  calculateNetSalary(input) {
    if (!this.taxData) throw new Error('TaxEngine: datos fiscales no cargados.');

    const { salarioBruto, numPagas, estadoCivil, numHijos, comunidad } = input;
    const data = this.taxData;

    // ── PASO 1: Seguridad Social ──────────────────────────────
    const ss = this.calculateSocialSecurity(salarioBruto);

    // ── PASO 2: Gastos deducibles (Art. 19 LIRPF) ────────────
    const gastosFijos = data.gastos_deducibles?.cantidad_fija ?? 2000;
    const gastosDucibles = Math.min(gastosFijos, salarioBruto);

    // ── PASO 3: Rendimiento neto del trabajo ──────────────────
    const rendimientoNeto = Math.max(0, salarioBruto - ss.amount - gastosDucibles);

    // ── PASO 4: Reducción por rendimientos del trabajo ────────
    const reduccionTrabajo = this.calcularReduccionTrabajo(rendimientoNeto);
    const rendimientoNetoReducido = Math.max(0, rendimientoNeto - reduccionTrabajo);

    // ── PASO 5: Base imponible general ────────────────────────
    const baseImponible = rendimientoNetoReducido;

    // ── PASO 6: Mínimo personal y familiar ───────────────────
    const mpf = data.minimos_personales_familiares;
    let minimoPersonal = mpf?.personal ?? 5550;

    if (estadoCivil === 'casado') {
      minimoPersonal += mpf?.conyuge_sin_ingresos ?? 3400;
    }

    const hijosImportes = mpf?.hijos ?? [
      { orden: 1, importe: 2400 },
      { orden: 2, importe: 2700 },
      { orden: 3, importe: 4000 },
      { orden: 4, importe: 4500 }
    ];

    for (let i = 0; i < numHijos; i++) {
      const hijoData = hijosImportes[Math.min(i, hijosImportes.length - 1)];
      minimoPersonal += hijoData.importe;
    }

    const minimoEfectivo = Math.min(minimoPersonal, baseImponible);

    // ── PASO 7: IRPF estatal ──────────────────────────────────
    const tramosEstatales = data.tramos_estatales;
    const { total: taxBase_E, detail: detalleTramos } =
      this.calculateIRPF(baseImponible, tramosEstatales);
    const { total: taxMin_E } =
      this.calculateIRPF(minimoEfectivo, tramosEstatales);
    const irpfEstatal = Math.max(0, taxBase_E - taxMin_E);

    // ── PASO 8: IRPF autonómico ───────────────────────────────
    const ccaaData = data.comunidades_autonomas?.[comunidad] ||
      data.comunidades_autonomas?.['MAD'];
    const tramosAuto = ccaaData?.tramos ?? tramosEstatales;

    const { total: taxBase_A } = this.calculateIRPF(baseImponible, tramosAuto);
    const { total: taxMin_A } = this.calculateIRPF(minimoEfectivo, tramosAuto);
    const irpfAutonomico = Math.max(0, taxBase_A - taxMin_A);

    // ── PASO 9: Totales ───────────────────────────────────────
    const irpfTotal = irpfEstatal + irpfAutonomico;
    const totalRetenciones = ss.amount + irpfTotal;
    const netoAnual = salarioBruto - totalRetenciones;
    const netoMensual = netoAnual / numPagas;

    // ── PASO 10: Tasas ────────────────────────────────────────
    const tipoEfectivoIRPF = salarioBruto > 0
      ? (irpfTotal / salarioBruto) * 100 : 0;
    const presionFiscal = salarioBruto > 0
      ? (totalRetenciones / salarioBruto) * 100 : 0;

    // Tipo marginal (último tramo alcanzado, estado + auto combinado)
    let tipoMarginal = 0;
    for (let i = 0; i < tramosEstatales.length; i++) {
      const te = tramosEstatales[i];
      const ta = tramosAuto[i] || te;
      if (baseImponible > te.desde) {
        tipoMarginal = te.tipo + ta.tipo;
      }
    }

    return {
      // Inputs
      salarioBruto, numPagas, estadoCivil, numHijos,
      comunidadId: comunidad,
      comunidadNombre: ccaaData?.nombre ?? comunidad,
      comunidadRegimen: ccaaData?.regimen ?? 'general',

      // SS
      cotizacionSS: ss.amount,
      tasaSS: ss.rate,
      ssBreakdown: ss.breakdown,

      // Deducciones
      gastosDucibles,
      reduccionTrabajo,
      minimoPersonal,

      // Base
      rendimientoNeto,
      rendimientoNetoReducido,
      baseImponible,

      // IRPF
      irpfEstatal,
      irpfAutonomico,
      irpfTotal,
      detalleTramos,

      // Neto
      totalRetenciones,
      netoAnual,
      netoMensual,

      // Ratios
      tipoEfectivoIRPF,
      presionFiscal,
      tipoMarginal,

      // Meta
      yearFiscal: data.year
    };
  },

  // Alias para compatibilidad semántica
  calcularReduccionTrabajo(rn) {
    return this.calculateReduccionTrabajo(rn);
  }
};
