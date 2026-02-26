import { Injectable, computed, signal } from '@angular/core';

export interface AccumulationDataPoint {
  year: number;
  month: number;
  portfolio: number;
  contributions: number;
  portfolioReal: number;
  contributionsReal: number;
  /** Rendimento obtido neste período */
  periodReturn: number;
  /** Aporte realizado neste período */
  periodContrib: number;
  /** Ganho acumulado (patrimônio - aportes) */
  gains: number;
}

export interface RetirementDataPoint {
  year: number;
  month: number;
  balance: number;
  balanceReal: number;
  /** Retirada realizada neste período */
  periodWithdrawal: number;
  /** Rendimento obtido neste período */
  periodReturn: number;
}

export interface CalculationResults {
  accDataMonthly: AccumulationDataPoint[];
  accDataYearly: AccumulationDataPoint[];
  retDataMonthly: RetirementDataPoint[];
  retDataYearly: RetirementDataPoint[];
  finalPortfolio: number;
  safeWithdrawalMonthly: number;
  safeWithdrawalReal: number;
  totalContrib: number;
  totalContribReal: number;
  gains: number;
  gainsReal: number;
  finalReal: number;
  neededMonthly: number;
  neededPortfolio: number;
  neededPortfolioReal: number;
  targetNominalMonthly: number;
}

@Injectable({ providedIn: 'root' })
export class CalculatorService {
  /** Tempo em anos até a aposentadoria */
  readonly years = signal(30);
  /** Rendimento anual esperado (%) */
  readonly annualReturn = signal(10);
  /** Aporte mensal inicial (R$) */
  readonly monthlyContrib = signal(1000);
  /** Inflação anual estimada (%) */
  readonly inflation = signal(5);
  /** Duração da aposentadoria em anos */
  readonly retirementYears = signal(25);
  /** Renda mensal desejada em valores de hoje (R$) */
  readonly targetIncome = signal(5000);
  /** Se true, os aportes são corrigidos anualmente pela inflação */
  readonly adjustContribForInflation = signal(true);

  /** Resultados calculados reativamente com base nos signals de entrada */
  readonly results = computed<CalculationResults>(() => {
    const years = this.years();
    const annualReturn = this.annualReturn();
    const monthlyContrib = this.monthlyContrib();
    const inflation = this.inflation();
    const retirementYears = this.retirementYears();
    const targetIncome = this.targetIncome();
    const adjustForInflation = this.adjustContribForInflation();

    const monthlyRate = (1 + annualReturn / 100) ** (1 / 12) - 1;
    const monthlyInflation = (1 + inflation / 100) ** (1 / 12) - 1;

    const accDataMonthly: AccumulationDataPoint[] = [];
    const accDataYearly: AccumulationDataPoint[] = [];
    let portfolio = 0;
    let totalContrib = 0;

    for (let y = 1; y <= years; y++) {
      const yearlyInflFactor = adjustForInflation
        ? (1 + inflation / 100) ** (y - 1)
        : 1;
      const adjContrib = monthlyContrib * yearlyInflFactor;

      let yearReturn = 0;
      let yearContrib = 0;

      for (let m = 1; m <= 12; m++) {
        const prevPortfolio = portfolio;
        const monthReturn = prevPortfolio * monthlyRate;
        portfolio = prevPortfolio + monthReturn + adjContrib;
        totalContrib += adjContrib;

        yearReturn += monthReturn;
        yearContrib += adjContrib;

        const absoluteMonth = (y - 1) * 12 + m;
        const deflator = (1 + monthlyInflation) ** absoluteMonth;

        accDataMonthly.push({
          year: y,
          month: m,
          portfolio: Math.round(portfolio),
          contributions: Math.round(totalContrib),
          portfolioReal: Math.round(portfolio / deflator),
          contributionsReal: Math.round(totalContrib / deflator),
          periodReturn: Math.round(monthReturn),
          periodContrib: Math.round(adjContrib),
          gains: Math.round(portfolio - totalContrib),
        });
      }

      const deflatorYear = (1 + inflation / 100) ** y;
      accDataYearly.push({
        year: y,
        month: 12,
        portfolio: Math.round(portfolio),
        contributions: Math.round(totalContrib),
        portfolioReal: Math.round(portfolio / deflatorYear),
        contributionsReal: Math.round(totalContrib / deflatorYear),
        periodReturn: Math.round(yearReturn),
        periodContrib: Math.round(yearContrib),
        gains: Math.round(portfolio - totalContrib),
      });
    }

    const finalPortfolio = portfolio;
    const safeWithdrawalMonthly = (finalPortfolio * 0.04) / 12;
    const safeWithdrawalReal =
      safeWithdrawalMonthly / (1 + inflation / 100) ** years;

    const retDataMonthly: RetirementDataPoint[] = [];
    const retDataYearly: RetirementDataPoint[] = [];
    let retPortfolio = finalPortfolio;

    for (let y = 1; y <= retirementYears; y++) {
      const yearlyInflFactor = (1 + inflation / 100) ** y;
      const adjustedWithdrawal = safeWithdrawalMonthly * yearlyInflFactor;

      let yearReturn = 0;
      let yearWithdrawal = 0;

      for (let m = 1; m <= 12; m++) {
        const prevPortfolio = retPortfolio;
        const monthReturn = prevPortfolio * monthlyRate;
        retPortfolio = prevPortfolio + monthReturn - adjustedWithdrawal;
        if (retPortfolio < 0) retPortfolio = 0;

        yearReturn += monthReturn;
        yearWithdrawal += adjustedWithdrawal;

        const absoluteMonth = years * 12 + (y - 1) * 12 + m;
        const deflator = (1 + monthlyInflation) ** absoluteMonth;

        retDataMonthly.push({
          year: y,
          month: m,
          balance: Math.round(Math.max(retPortfolio, 0)),
          balanceReal: Math.round(Math.max(retPortfolio, 0) / deflator),
          periodWithdrawal: Math.round(adjustedWithdrawal),
          periodReturn: Math.round(monthReturn),
        });
      }

      const totalYear = years + y;
      const deflatorYear = (1 + inflation / 100) ** totalYear;
      retDataYearly.push({
        year: y,
        month: 12,
        balance: Math.round(Math.max(retPortfolio, 0)),
        balanceReal: Math.round(Math.max(retPortfolio, 0) / deflatorYear),
        periodWithdrawal: Math.round(yearWithdrawal),
        periodReturn: Math.round(yearReturn),
      });
    }

    const targetNominalMonthly =
      targetIncome * (1 + inflation / 100) ** years;
    const neededPortfolio = (targetNominalMonthly * 12) / 0.04;
    const neededMonthly = this.findMonthlyContrib(
      neededPortfolio,
      years,
      monthlyRate,
      inflation,
      adjustForInflation,
    );

    const deflatorFinal = (1 + inflation / 100) ** years;

    return {
      accDataMonthly,
      accDataYearly,
      retDataMonthly,
      retDataYearly,
      finalPortfolio,
      safeWithdrawalMonthly,
      safeWithdrawalReal,
      totalContrib,
      totalContribReal: totalContrib / deflatorFinal,
      gains: finalPortfolio - totalContrib,
      gainsReal: (finalPortfolio - totalContrib) / deflatorFinal,
      finalReal: finalPortfolio / deflatorFinal,
      neededMonthly,
      neededPortfolio,
      neededPortfolioReal: neededPortfolio / deflatorFinal,
      targetNominalMonthly,
    };
  });

  /**
   * Busca binária para encontrar o aporte mensal necessário
   * para atingir um patrimônio-alvo.
   */
  private findMonthlyContrib(
    target: number,
    years: number,
    monthlyRate: number,
    inflation: number,
    adjustForInflation: boolean,
  ): number {
    let lo = 1;
    let hi = target / 10;
    let mid = 0;
    for (let i = 0; i < 60; i++) {
      mid = (lo + hi) / 2;
      let p = 0;
      for (let y = 1; y <= years; y++) {
        const adj = adjustForInflation
          ? mid * (1 + inflation / 100) ** (y - 1)
          : mid;
        for (let m = 0; m < 12; m++) {
          p = p * (1 + monthlyRate) + adj;
        }
      }
      if (p < target) lo = mid;
      else hi = mid;
    }
    return mid;
  }
}
