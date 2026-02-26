import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

const formatBRL = (v, compact = false) => {
  if (compact) {
    if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
};

const Slider = ({ label, value, min, max, step, onChange, display }) => (
  <div className="slider-group">
    <div className="slider-header">
      <span className="slider-label">{label}</span>
      <span className="slider-value">{display(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider"
    />
    <div className="slider-range">
      <span>{display(min)}</span>
      <span>{display(max)}</span>
    </div>
  </div>
);

const StatCard = ({ label, nominal, real, highlight }) => (
  <div className={`stat-card ${highlight ? "highlight" : ""}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-nominal">{formatBRL(nominal)}</div>
    <div className="stat-real">
      <span className="real-tag">hoje</span> {formatBRL(real)}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label, inflation, years }) => {
  if (!active || !payload?.length) return null;
  const deflate = (v, yr) => v / Math.pow(1 + inflation / 100, yr || label);
  return (
    <div className="custom-tooltip">
      <div className="tt-title">Ano {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="tt-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <div>
            <div>{formatBRL(p.value)}</div>
            <div className="tt-real">{formatBRL(deflate(p.value))} hoje</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RetirementCalculator() {
  const [years, setYears] = useState(30);
  const [annualReturn, setAnnualReturn] = useState(10);
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [inflation, setInflation] = useState(5);
  const [retirementYears, setRetirementYears] = useState(25);
  const [targetIncome, setTargetIncome] = useState(5000);
  const [tab, setTab] = useState("accumulation");

  const calc = useMemo(() => {
    const monthlyRate = (1 + annualReturn / 100) ** (1 / 12) - 1;
    const accData = [];
    let portfolio = 0;
    let totalContrib = 0;

    for (let y = 1; y <= years; y++) {
      const yearlyInflFactor = (1 + inflation / 100) ** (y - 1);
      const adjContrib = monthlyContrib * yearlyInflFactor;
      for (let m = 0; m < 12; m++) {
        portfolio = portfolio * (1 + monthlyRate) + adjContrib;
        totalContrib += adjContrib;
      }
      const deflator = (1 + inflation / 100) ** y;
      accData.push({
        year: y,
        patrimônio: Math.round(portfolio),
        aportes: Math.round(totalContrib),
        patrimonioReal: Math.round(portfolio / deflator),
        aportesReal: Math.round(totalContrib / deflator),
      });
    }

    const finalPortfolio = portfolio;
    const safeWithdrawalMonthly = finalPortfolio * 0.04 / 12;
    const safeWithdrawalReal = safeWithdrawalMonthly / (1 + inflation / 100) ** years;

    const retData = [];
    let retPortfolio = finalPortfolio;
    const yearlyWithdrawal = safeWithdrawalMonthly * 12;

    for (let y = 1; y <= retirementYears; y++) {
      for (let m = 0; m < 12; m++) {
        retPortfolio = retPortfolio * (1 + monthlyRate) - safeWithdrawalMonthly;
        if (retPortfolio < 0) retPortfolio = 0;
      }
      const totalYear = years + y;
      const deflator = (1 + inflation / 100) ** totalYear;
      retData.push({
        year: y,
        saldo: Math.round(Math.max(retPortfolio, 0)),
        saldoReal: Math.round(Math.max(retPortfolio, 0) / deflator),
      });
    }

    // Reverse: needed monthly contrib to reach target income
    const targetNominalMonthly = targetIncome * (1 + inflation / 100) ** years;
    const neededPortfolio = targetNominalMonthly * 12 / 0.04;
    // PMT formula: PV = 0, FV = neededPortfolio
    // FV = PMT * [(1+r)^n - 1] / r   where contributions grow with inflation
    // Approximate: iterate to find PMT
    const findMonthlyContrib = (target) => {
      let lo = 1, hi = target / 10, mid;
      for (let i = 0; i < 60; i++) {
        mid = (lo + hi) / 2;
        let p = 0;
        for (let y = 1; y <= years; y++) {
          const adj = mid * (1 + inflation / 100) ** (y - 1);
          for (let m = 0; m < 12; m++) {
            p = p * (1 + monthlyRate) + adj;
          }
        }
        if (p < target) lo = mid;
        else hi = mid;
      }
      return mid;
    };
    const neededMonthly = findMonthlyContrib(neededPortfolio);
    const neededMonthlyReal = neededMonthly;

    return {
      accData,
      retData,
      finalPortfolio,
      safeWithdrawalMonthly,
      safeWithdrawalReal,
      totalContrib,
      totalContribReal: totalContrib / (1 + inflation / 100) ** years,
      gains: finalPortfolio - totalContrib,
      finalReal: finalPortfolio / (1 + inflation / 100) ** years,
      neededMonthly,
      neededPortfolio,
      neededPortfolioReal: neededPortfolio / (1 + inflation / 100) ** years,
    };
  }, [years, annualReturn, monthlyContrib, inflation, retirementYears, targetIncome]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Syne', sans-serif;
          background: #080c14;
          color: #e8e4da;
          min-height: 100vh;
        }

        .app {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }

        .header {
          margin-bottom: 40px;
        }
        .header-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 3px;
          color: #c9a84c;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .header h1 {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 800;
          line-height: 1.1;
          color: #f5f0e8;
        }
        .header h1 span { color: #c9a84c; }

        .grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 780px) {
          .grid { grid-template-columns: 1fr; }
        }

        .panel {
          background: #0e1520;
          border: 1px solid #1e2a3a;
          border-radius: 16px;
          padding: 28px;
        }
        .panel-title {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #c9a84c;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 24px;
        }

        .slider-group { margin-bottom: 24px; }
        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .slider-label { font-size: 14px; font-weight: 600; color: #b8beca; }
        .slider-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #f5f0e8;
          font-weight: 500;
        }
        .slider {
          width: 100%;
          -webkit-appearance: none;
          height: 4px;
          background: #1e2a3a;
          border-radius: 2px;
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #c9a84c;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .slider-range {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #4a5568;
          margin-top: 4px;
          font-family: 'JetBrains Mono', monospace;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #0e1520;
          border: 1px solid #1e2a3a;
          border-radius: 12px;
          padding: 16px;
          transition: border-color 0.2s;
        }
        .stat-card.highlight {
          border-color: #c9a84c;
          background: #14100a;
        }
        .stat-label {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #4a5568;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 6px;
        }
        .stat-nominal {
          font-size: 16px;
          font-weight: 700;
          color: #f5f0e8;
          font-family: 'JetBrains Mono', monospace;
        }
        .stat-real {
          font-size: 11px;
          color: #718096;
          margin-top: 4px;
          font-family: 'JetBrains Mono', monospace;
        }
        .real-tag {
          background: #1e2a3a;
          color: #c9a84c;
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 3px;
          margin-right: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: #0a0f18;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 24px;
        }
        .tab-btn {
          flex: 1;
          padding: 8px 12px;
          background: none;
          border: none;
          color: #4a5568;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 7px;
          transition: all 0.2s;
          letter-spacing: 0.5px;
        }
        .tab-btn.active {
          background: #1e2a3a;
          color: #c9a84c;
        }

        .chart-wrap {
          height: 280px;
          margin-bottom: 8px;
        }

        .custom-tooltip {
          background: #0e1520;
          border: 1px solid #2d3748;
          border-radius: 10px;
          padding: 12px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        .tt-title {
          color: #c9a84c;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 11px;
          letter-spacing: 1px;
        }
        .tt-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 6px;
          align-items: flex-start;
        }
        .tt-real { color: #718096; font-size: 10px; }

        .reverse-section {
          background: #0e1520;
          border: 1px solid #1e2a3a;
          border-radius: 16px;
          padding: 28px;
          margin-top: 24px;
        }
        .reverse-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: center;
        }
        @media (max-width: 600px) {
          .reverse-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr; }
        }
        .reverse-result {
          background: #14100a;
          border: 1px solid #c9a84c33;
          border-radius: 12px;
          padding: 20px;
        }
        .reverse-result .big {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 700;
          color: #c9a84c;
        }
        .reverse-result .sub {
          font-size: 12px;
          color: #718096;
          margin-top: 6px;
          line-height: 1.6;
        }

        .divider {
          height: 1px;
          background: #1e2a3a;
          margin: 24px 0;
        }

        .info-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0a1828;
          border: 1px solid #1e3a5a;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          color: #4a90d9;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 20px;
        }
        .dot { width: 6px; height: 6px; background: #4a90d9; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-eyebrow">Planejamento Financeiro</div>
          <h1>Calculadora de<br /><span>Aposentadoria</span></h1>
        </div>

        <div className="info-pill">
          <span className="dot" />
          Regra dos 4% · Aportes corrigidos pela inflação · Valores em reais de hoje
        </div>

        <div className="grid">
          {/* INPUTS */}
          <div className="panel">
            <div className="panel-title">Parâmetros</div>

            <Slider
              label="Tempo até aposentadoria"
              value={years}
              min={5} max={45} step={1}
              onChange={setYears}
              display={(v) => `${v} anos`}
            />
            <Slider
              label="Rendimento anual"
              value={annualReturn}
              min={3} max={20} step={0.5}
              onChange={setAnnualReturn}
              display={(v) => `${v}% a.a.`}
            />
            <Slider
              label="Aporte mensal inicial"
              value={monthlyContrib}
              min={100} max={20000} step={100}
              onChange={setMonthlyContrib}
              display={(v) => formatBRL(v)}
            />
            <Slider
              label="Inflação anual"
              value={inflation}
              min={2} max={15} step={0.5}
              onChange={setInflation}
              display={(v) => `${v}% a.a.`}
            />
            <Slider
              label="Duração da aposentadoria"
              value={retirementYears}
              min={10} max={40} step={1}
              onChange={setRetirementYears}
              display={(v) => `${v} anos`}
            />
          </div>

          {/* RIGHT PANEL */}
          <div>
            {/* STATS */}
            <div className="stats-grid">
              <StatCard
                label="Patrimônio final"
                nominal={calc.finalPortfolio}
                real={calc.finalReal}
                highlight
              />
              <StatCard
                label="Renda mensal (4%)"
                nominal={calc.safeWithdrawalMonthly}
                real={calc.safeWithdrawalReal}
                highlight
              />
              <StatCard
                label="Total aportado"
                nominal={calc.totalContrib}
                real={calc.totalContribReal}
              />
              <StatCard
                label="Ganho com juros"
                nominal={calc.gains}
                real={calc.gains / (1 + inflation / 100) ** years}
              />
            </div>

            {/* CHARTS */}
            <div className="panel">
              <div className="tabs">
                <button
                  className={`tab-btn ${tab === "accumulation" ? "active" : ""}`}
                  onClick={() => setTab("accumulation")}
                >
                  Acumulação
                </button>
                <button
                  className={`tab-btn ${tab === "retirement" ? "active" : ""}`}
                  onClick={() => setTab("retirement")}
                >
                  Aposentadoria
                </button>
              </div>

              {tab === "accumulation" && (
                <>
                  <div className="panel-title">Crescimento do patrimônio</div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={calc.accData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gPatr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gAport" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4a90d9" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4a90d9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          tickFormatter={(v) => `${v}a`}
                        />
                        <YAxis
                          tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          tickFormatter={(v) => formatBRL(v, true)}
                          width={70}
                        />
                        <Tooltip content={<CustomTooltip inflation={inflation} />} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#718096" }} />
                        <Area
                          type="monotone"
                          dataKey="patrimônio"
                          stroke="#c9a84c"
                          strokeWidth={2}
                          fill="url(#gPatr)"
                        />
                        <Area
                          type="monotone"
                          dataKey="aportes"
                          stroke="#4a90d9"
                          strokeWidth={2}
                          fill="url(#gAport)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "JetBrains Mono", marginTop: 8 }}>
                    * Aporte mensal de {formatBRL(monthlyContrib)} corrigido em {inflation}% ao ano
                  </div>
                </>
              )}

              {tab === "retirement" && (
                <>
                  <div className="panel-title">Saldo durante a aposentadoria (regra dos 4%)</div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={calc.retData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#56b97e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#56b97e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gSaldoReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          tickFormatter={(v) => `${v}a`}
                        />
                        <YAxis
                          tick={{ fill: "#4a5568", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          tickFormatter={(v) => formatBRL(v, true)}
                          width={70}
                        />
                        <Tooltip content={<CustomTooltip inflation={inflation} />} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#718096" }} />
                        <Area type="monotone" dataKey="saldo" stroke="#56b97e" strokeWidth={2} fill="url(#gSaldo)" name="saldo nominal" />
                        <Area type="monotone" dataKey="saldoReal" stroke="#c9a84c" strokeWidth={1.5} fill="url(#gSaldoReal)" strokeDasharray="4 2" name="saldo real" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "JetBrains Mono", marginTop: 8 }}>
                    * Retirada segura de {formatBRL(calc.safeWithdrawalMonthly)}/mês · {formatBRL(calc.safeWithdrawalReal)}/mês em valores de hoje
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* REVERSE CALCULATOR */}
        <div className="reverse-section">
          <div className="panel-title">Calculadora reversa — quanto preciso aportar?</div>
          <div className="reverse-grid">
            <div>
              <Slider
                label="Renda desejada (valores de hoje)"
                value={targetIncome}
                min={500} max={50000} step={500}
                onChange={setTargetIncome}
                display={(v) => formatBRL(v)}
              />
              <div style={{ fontSize: 12, color: "#4a5568", fontFamily: "JetBrains Mono", lineHeight: 1.7 }}>
                Para receber {formatBRL(targetIncome)}/mês em valores atuais daqui {years} anos,
                considerando {inflation}% de inflação ao ano.
              </div>
            </div>
            <div className="reverse-result">
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#c9a84c", fontFamily: "JetBrains Mono", marginBottom: 10 }}>
                Aporte inicial necessário
              </div>
              <div className="big">{formatBRL(calc.neededMonthly)}<span style={{ fontSize: 14, color: "#718096" }}>/mês</span></div>
              <div className="sub">
                Patrimônio necessário: {formatBRL(calc.neededPortfolio)} nominais<br />
                ({formatBRL(calc.neededPortfolioReal)} em valores de hoje)<br />
                <br />
                Renda nominal na aposentadoria: {formatBRL(targetIncome * (1 + inflation / 100) ** years)}/mês
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
