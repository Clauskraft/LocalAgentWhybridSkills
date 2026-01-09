# Dot.Finance ("The CFO") - Design Specification

## 1. Vision

To create a specialized agent (`Dot.Finance`) that embodies the persona of a **World-Class Partner (Math/Finance/Tax)** combined with the operational precision of a **Master Controller** and the technical wizardry of an **Excel Architect**.

### Core Personas

1. **The Professor**: Deep knowledge of financial mathematics, statistics, and optimization.
2. **The Partner (KPMG Reference)**: Strategic advisory, risk assessment, compliance (DK Tax Law), and business perspective.
3. **The Controller**: Forensic attention to detail, anomaly detection, reconciliation, and audit trails.
4. **The Excel Psycho**: Ability to generate not just CSVs, but complex, formatted, formula-driven `.xlsx` artifacts (OpenPyXL/XlsxWriter) with pivots and charts.

## 2. Technical Architecture

**Type:** MCP Server (Python-based)
**Location:** `services/dot-finance`

### Dependencies

- **Data Processing:** `pandas`, `numpy`, `scipy` (for financial modeling/forecasting).
- **Excel:** `openpyxl`, `xlsxwriter` (for high-fidelity Excel generation).
- **PDF/Docs:** `pypdf`, `python-docx` (for reading annual reports/tax docs).
- **AI/Reasoning:** Uses the main `@dot` LLM connection for qualitative analysis (Partner insights).

## 3. Toolset Interface (MCP)

### A. Analysis & Controlling

- `analyze_ledger(path: str)`: Ingests GL/General Ledger exports paths. Performs anomaly detection (Benford's Law, outlier detection).
- `reconcile_accounts(source_a, source_b)`: Fuzzy matching for reconciliation.
- `audit_compliance(data, context='dk_tax')`: Checks against known constraints (e.g., VAT rules, entertainment limits).

### B. Financial Engineering

- `forecast_cashflow(historical_data, months=12)`: Time-series forecasting.
- `calculate_valuation(metrics)`: DCF, Multiples, etc.

### C. "Psycho" Excel Generation

- `create_financial_model(inputs)`: Generates a fully linked 3-statement model in Excel.
- `generate_board_pack(data)`: Creates a formatted Excel file with dashboard sheets (Charts, KPIs) ready for PPT export.

## 4. Integration with ROMA

`Dot.Finance` will be a primary execution node for `Dot.Plan`.

- **Goal:** "Analyze Q3 results and prepare a board summary."
- **ROMA Plan:**
    1. `Dot.Finance` -> `analyze_ledger(Q3_Data)`
    2. `Dot.Finance` -> `audit_compliance(Q3_Data)`
    3. `Dot.Finance` -> `generate_board_pack(Analysis)`
    4. `Dot.Show` -> `create_presentation(Board_Pack_Excel)`

## 5. Next Steps

1. Scaffold `services/dot-finance`.
2. Implement `openpyxl` wrapper for "Psycho" Excel generation.
3. Register in `apps/desktop/src/config/mcp_config.ts`.
