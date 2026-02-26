import { Component, inject, computed } from '@angular/core';
import { CalculatorService } from '../../services/calculator.service';
import { StatCard } from '../stat-card/stat-card';

@Component({
  selector: 'app-stats-grid',
  imports: [StatCard],
  templateUrl: './stats-grid.html',
})
export class StatsGrid {
  protected readonly calc = inject(CalculatorService);
  protected readonly r = computed(() => this.calc.results());
}
