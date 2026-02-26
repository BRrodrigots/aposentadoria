import { Component, inject, computed } from '@angular/core';
import { CalculatorService } from '../../services/calculator.service';
import { FormatService } from '../../services/format.service';
import { SliderInput } from '../slider-input/slider-input';

@Component({
  selector: 'app-reverse-calculator',
  imports: [SliderInput],
  templateUrl: './reverse-calculator.html',
})
export class ReverseCalculator {
  protected readonly calc = inject(CalculatorService);
  protected readonly fmt = inject(FormatService);

  protected readonly description = computed(() => {
    const target = this.fmt.formatBRL(this.calc.targetIncome());
    const years = this.calc.years();
    const inflation = this.calc.inflation();
    return `Para receber ${target}/mês em valores atuais daqui ${years} anos, considerando ${inflation}% de inflação ao ano.`;
  });

  protected readonly r = computed(() => this.calc.results());
}
