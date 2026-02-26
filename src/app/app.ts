import { Component } from '@angular/core';
import { Header } from './components/header/header';
import { ParameterPanel } from './components/parameter-panel/parameter-panel';
import { StatsGrid } from './components/stats-grid/stats-grid';
import { ChartPanel } from './components/chart-panel/chart-panel';
import { ReverseCalculator } from './components/reverse-calculator/reverse-calculator';
import { Footer } from './components/footer/footer';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    ParameterPanel,
    StatsGrid,
    ChartPanel,
    ReverseCalculator,
    Footer,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
