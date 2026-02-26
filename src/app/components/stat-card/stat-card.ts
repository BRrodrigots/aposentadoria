import { Component, inject, input } from '@angular/core';
import { FormatService } from '../../services/format.service';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
})
export class StatCard {
  protected readonly fmt = inject(FormatService);

  /** Rótulo do card */
  readonly label = input.required<string>();
  /** Valor nominal (sem deflacionar) */
  readonly nominal = input.required<number>();
  /** Valor real (em valores de hoje) */
  readonly real = input.required<number>();
  /** Se true, aplica estilo destacado com borda dourada */
  readonly highlight = input(false);
}
