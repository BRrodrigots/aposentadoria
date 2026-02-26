import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalculatorService } from '../../services/calculator.service';
import { FormatService } from '../../services/format.service';
import { SliderInput } from '../slider-input/slider-input';

@Component({
  selector: 'app-parameter-panel',
  imports: [SliderInput, FormsModule],
  templateUrl: './parameter-panel.html',
})
export class ParameterPanel {
  protected readonly calc = inject(CalculatorService);
  protected readonly fmt = inject(FormatService);
}
