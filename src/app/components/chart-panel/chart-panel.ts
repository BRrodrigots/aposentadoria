import {
  Component,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { CalculatorService } from '../../services/calculator.service';
import { FormatService } from '../../services/format.service';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
);

@Component({
  selector: 'app-chart-panel',
  imports: [BaseChartDirective],
  templateUrl: './chart-panel.html',
})
export class ChartPanel {
  protected readonly calc = inject(CalculatorService);
  protected readonly fmt = inject(FormatService);

  protected readonly activeTab = signal<'accumulation' | 'retirement'>('accumulation');

  protected readonly accChartData = computed(() => {
    const data = this.calc.results().accData;
    return {
      labels: data.map((d) => `${d.year}a`),
      datasets: [
        {
          label: 'Patrimônio',
          data: data.map((d) => d.portfolio),
          borderColor: '#c9a84c',
          backgroundColor: 'rgba(201, 168, 76, 0.15)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Aportes',
          data: data.map((d) => d.contributions),
          borderColor: '#4a90d9',
          backgroundColor: 'rgba(74, 144, 217, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  });

  protected readonly retChartData = computed(() => {
    const data = this.calc.results().retData;
    return {
      labels: data.map((d) => `${d.year}a`),
      datasets: [
        {
          label: 'Saldo nominal',
          data: data.map((d) => d.balance),
          borderColor: '#56b97e',
          backgroundColor: 'rgba(86, 185, 126, 0.15)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Saldo real',
          data: data.map((d) => d.balanceReal),
          borderColor: '#c9a84c',
          backgroundColor: 'rgba(201, 168, 76, 0.08)',
          borderWidth: 1.5,
          borderDash: [4, 2],
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  });

  protected readonly chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: '#718096',
          font: { family: "'JetBrains Mono', monospace", size: 11 },
          boxWidth: 12,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0e1520',
        borderColor: '#2d3748',
        borderWidth: 1,
        titleColor: '#c9a84c',
        titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
        bodyColor: '#e8e4da',
        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => {
            const val = this.fmt.formatBRL(ctx.raw);
            const yearIdx = ctx.dataIndex;
            const inflation = this.calc.inflation();
            const years = this.activeTab() === 'accumulation'
              ? yearIdx + 1
              : this.calc.years() + yearIdx + 1;
            const deflator = (1 + inflation / 100) ** years;
            const realVal = this.fmt.formatBRL(ctx.raw / deflator);
            return `${ctx.dataset.label}: ${val} (${realVal} hoje)`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#4a5568',
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
        grid: { color: '#1a2332', drawBorder: false },
      },
      y: {
        ticks: {
          color: '#4a5568',
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          callback: (v: string | number) => this.fmt.formatBRL(Number(v), true),
        },
        grid: { color: '#1a2332', drawBorder: false },
      },
    },
  }));

  protected readonly accFootnote = computed(() => {
    const contrib = this.fmt.formatBRL(this.calc.monthlyContrib());
    const inflation = this.calc.inflation();
    const adjusted = this.calc.adjustContribForInflation();
    if (adjusted) {
      return `* Aporte mensal de ${contrib} corrigido em ${inflation}% ao ano`;
    }
    return `* Aporte mensal fixo de ${contrib}`;
  });

  protected readonly retFootnote = computed(() => {
    const r = this.calc.results();
    const nom = this.fmt.formatBRL(r.safeWithdrawalMonthly);
    const real = this.fmt.formatBRL(r.safeWithdrawalReal);
    return `* Retirada segura de ${nom}/mês · ${real}/mês em valores de hoje`;
  });
}
