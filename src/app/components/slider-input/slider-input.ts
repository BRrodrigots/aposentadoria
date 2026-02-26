import { Component, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-slider-input',
  imports: [FormsModule],
  templateUrl: './slider-input.html',
})
export class SliderInput {
  /** Rótulo exibido acima do controle */
  readonly label = input.required<string>();
  /** Valor atual do controle */
  readonly value = input.required<number>();
  /** Valor mínimo permitido */
  readonly min = input.required<number>();
  /** Valor máximo permitido */
  readonly max = input.required<number>();
  /** Incremento do slider */
  readonly step = input<number>(1);
  /** Sufixo exibido no campo de texto (ex: "% a.a.", "anos") */
  readonly suffix = input<string>('');
  /** Prefixo exibido no campo de texto (ex: "R$") */
  readonly prefix = input<string>('');
  /** Texto formatado para exibição do valor mínimo */
  readonly minDisplay = input<string>('');
  /** Texto formatado para exibição do valor máximo */
  readonly maxDisplay = input<string>('');

  /** Evento emitido quando o valor muda */
  readonly valueChange = output<number>();

  /** Valor local do campo de input texto */
  protected readonly inputText = signal('');
  protected readonly isEditing = signal(false);

  constructor() {
    effect(() => {
      if (!this.isEditing()) {
        this.inputText.set(this.formatDisplay(this.value()));
      }
    });
  }

  protected readonly displayMin = computed(() =>
    this.minDisplay() || this.formatDisplay(this.min())
  );

  protected readonly displayMax = computed(() =>
    this.maxDisplay() || this.formatDisplay(this.max())
  );

  /** Formata o valor numérico para exibição */
  private formatDisplay(val: number): string {
    if (this.prefix()) {
      return val.toLocaleString('pt-BR');
    }
    if (Number.isInteger(this.step())) {
      return val.toString();
    }
    return val.toFixed(1);
  }

  protected onSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.valueChange.emit(val);
  }

  protected onInputFocus(): void {
    this.isEditing.set(true);
    this.inputText.set(this.formatDisplay(this.value()));
  }

  protected onInputBlur(): void {
    this.isEditing.set(false);
    this.commitValue();
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
  }

  /** Valida e emite o valor digitado, respeitando min/max */
  private commitValue(): void {
    const raw = this.inputText().replace(/\./g, '').replace(',', '.');
    let num = parseFloat(raw);
    if (isNaN(num)) return;
    num = Math.max(this.min(), Math.min(this.max(), num));
    const step = this.step();
    num = Math.round(num / step) * step;
    this.valueChange.emit(num);
  }
}
