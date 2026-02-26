import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormatService {
  private readonly formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

  /**
   * Formata um valor numérico como moeda BRL.
   * Quando compact=true, abrevia valores grandes (K, M).
   */
  formatBRL(value: number, compact = false): string {
    if (compact) {
      if (Math.abs(value) >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`;
      if (Math.abs(value) >= 1e3) return `R$ ${(value / 1e3).toFixed(0)}K`;
    }
    return this.formatter.format(value);
  }
}
