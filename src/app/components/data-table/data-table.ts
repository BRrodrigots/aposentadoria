import { Component, inject, signal, computed } from '@angular/core';
import { CalculatorService, AccumulationDataPoint, RetirementDataPoint } from '../../services/calculator.service';
import { FormatService } from '../../services/format.service';
import * as XLSX from 'xlsx';

type TableTab = 'accumulation' | 'retirement';
type ViewMode = 'yearly' | 'monthly';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.html',
})
export class DataTable {
  protected readonly calc = inject(CalculatorService);
  protected readonly fmt = inject(FormatService);

  protected readonly activeTab = signal<TableTab>('accumulation');
  protected readonly viewMode = signal<ViewMode>('yearly');

  protected readonly accData = computed(() => {
    const r = this.calc.results();
    return this.viewMode() === 'yearly' ? r.accDataYearly : r.accDataMonthly;
  });

  protected readonly retData = computed(() => {
    const r = this.calc.results();
    return this.viewMode() === 'yearly' ? r.retDataYearly : r.retDataMonthly;
  });

  /** Rótulo do período (ex: "Ano 5" ou "Ano 2 / Mês 3") */
  protected periodLabel(row: { year: number; month: number }): string {
    if (this.viewMode() === 'yearly') {
      return `Ano ${row.year}`;
    }
    return `${row.year}a ${row.month}m`;
  }

  /** Exporta dados da aba ativa para Excel (.xlsx) */
  protected exportToExcel(): void {
    const isAcc = this.activeTab() === 'accumulation';
    const isMonthly = this.viewMode() === 'monthly';
    const suffix = isMonthly ? 'mensal' : 'anual';

    if (isAcc) {
      this.exportAccumulation(suffix, isMonthly);
    } else {
      this.exportRetirement(suffix, isMonthly);
    }
  }

  private exportAccumulation(suffix: string, isMonthly: boolean): void {
    const data = this.accData();
    const rows = data.map((d: AccumulationDataPoint) => {
      const row: Record<string, string | number> = {};
      if (isMonthly) {
        row['Ano'] = d.year;
        row['Mês'] = d.month;
      } else {
        row['Ano'] = d.year;
      }
      row['Aporte do Período'] = d.periodContrib;
      row['Rendimento do Período'] = d.periodReturn;
      row['Total Aportado'] = d.contributions;
      row['Ganhos Acumulados'] = d.gains;
      row['Patrimônio'] = d.portfolio;
      row['Patrimônio (hoje)'] = d.portfolioReal;
      return row;
    });

    this.downloadXlsx(rows, `acumulacao_${suffix}`);
  }

  private exportRetirement(suffix: string, isMonthly: boolean): void {
    const data = this.retData();
    const rows = data.map((d: RetirementDataPoint) => {
      const row: Record<string, string | number> = {};
      if (isMonthly) {
        row['Ano'] = d.year;
        row['Mês'] = d.month;
      } else {
        row['Ano'] = d.year;
      }
      row['Retirada do Período'] = d.periodWithdrawal;
      row['Rendimento do Período'] = d.periodReturn;
      row['Saldo'] = d.balance;
      row['Saldo (hoje)'] = d.balanceReal;
      return row;
    });

    this.downloadXlsx(rows, `aposentadoria_${suffix}`);
  }

  private downloadXlsx(rows: Record<string, string | number>[], name: string): void {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 2, 14),
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${name}.xlsx`);
  }
}
