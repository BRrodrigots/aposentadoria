import { Injectable, computed, signal } from '@angular/core';

export interface AccumulationDataPoint {
  year: number;
  portfolio: number;
  contributions: number;
  portfolioReal: number;
  contributionsReal: number;
}

export interface RetirementDataPoint {
  year: number;
  balance: number;
  balanceReal: number;
}

export interface CalculationResults {
  accData: AccumulationDataPoint[];
  retData: RetirementDataPoint[];
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
    const accData: AccumulationDataPoint[] = [];
    let portfolio = 0;
    let totalContrib = 0;

    for (let y = 1; y <= years; y++) {
      const yearlyInflFactor = adjustForInflation
        ? (1 + inflation / 100) ** (y - 1)
        : 1;
      const adjContrib = monthlyContrib * yearlyInflFactor;
      for (let m = 0; m < 12; m++) {
        portfolio = portfolio * (1 + monthlyRate) + adjContrib;
        totalContrib += adjContrib;
      }
      const deflator = (1 + inflation / 100) ** y;
      accData.push({
        year: y,
        portfolio: Math.round(portfolio),
        contributions: Math.round(totalContrib),
        portfolioReal: Math.round(portfolio / deflator),
        contributionsReal: Math.round(totalContrib / deflator),
      });
    }

    const finalPortfolio = portfolio;
    const safeWithdrawalMonthly = (finalPortfolio * 0.04) / 12;
    const safeWithdrawalReal =
      safeWithdrawalMonthly / (1 + inflation / 100) ** years;

    const retData: RetirementDataPoint[] = [];
    let retPortfolio = finalPortfolio;

    for (let y = 1; y <= retirementYears; y++) {
      for (let m = 0; m < 12; m++) {
        retPortfolio =
          retPortfolio * (1 + monthlyRate) - safeWithdrawalMonthly;
        if (retPortfolio < 0) retPortfolio = 0;
      }
      const totalYear = years + y;
      const deflator = (1 + inflation / 100) ** totalYear;
      retData.push({
        year: y,
        balance: Math.round(Math.max(retPortfolio, 0)),
        balanceReal: Math.round(Math.max(retPortfolio, 0) / deflator),
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
      accData,
      retData,
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
