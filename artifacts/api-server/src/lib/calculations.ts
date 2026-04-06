export const ATO_KM_RATE = 0.88;
export const GST_RATE = 10;

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 7) {
    return `FY ${year}–${(year + 1).toString().slice(2)}`;
  }
  return `FY ${year - 1}–${year.toString().slice(2)}`;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function getFinancialYearRange(): { start: Date; end: Date } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let fyStart: Date;
  let fyEnd: Date;
  if (month >= 7) {
    fyStart = new Date(year, 6, 1);
    fyEnd = endOfDay(new Date(year + 1, 5, 30));
  } else {
    fyStart = new Date(year - 1, 6, 1);
    fyEnd = endOfDay(new Date(year, 5, 30));
  }
  return { start: fyStart, end: fyEnd };
}

export function getCurrentBasQuarter(): {
  quarter: number;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
} {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 7 && month <= 9) {
    return {
      quarter: 1,
      startDate: new Date(year, 6, 1),
      endDate: endOfDay(new Date(year, 8, 30)),
      dueDate: new Date(year, 9, 28),
    };
  } else if (month >= 10 && month <= 12) {
    return {
      quarter: 2,
      startDate: new Date(year, 9, 1),
      endDate: endOfDay(new Date(year, 11, 31)),
      dueDate: new Date(year + 1, 1, 28),
    };
  } else if (month >= 1 && month <= 3) {
    return {
      quarter: 3,
      startDate: new Date(year, 0, 1),
      endDate: endOfDay(new Date(year, 2, 31)),
      dueDate: new Date(year, 3, 28),
    };
  } else {
    return {
      quarter: 4,
      startDate: new Date(year, 3, 1),
      endDate: endOfDay(new Date(year, 5, 30)),
      dueDate: new Date(year, 6, 28),
    };
  }
}

export interface TaxBracket {
  range: string;
  rate: string;
  amount: number;
}

export function calculateAustralianIncomeTax(taxableIncome: number): {
  incomeTax: number;
  medicareLevy: number;
  lito: number;
  totalTax: number;
  brackets: TaxBracket[];
} {
  const brackets: TaxBracket[] = [];
  let incomeTax = 0;

  if (taxableIncome <= 0) {
    return { incomeTax: 0, medicareLevy: 0, lito: 0, totalTax: 0, brackets };
  }

  // 2024-25 Australian resident tax brackets (Stage 3 tax cuts effective 1 July 2024)
  if (taxableIncome <= 18200) {
    brackets.push({ range: "$0–$18,200", rate: "0%", amount: 0 });
  } else {
    const bracket1 = Math.min(taxableIncome, 45000) - 18200;
    const tax1 = bracket1 * 0.19;
    incomeTax += tax1;
    brackets.push({ range: "$18,201–$45,000", rate: "19%", amount: tax1 });
  }

  if (taxableIncome > 45000) {
    const bracket2 = Math.min(taxableIncome, 135000) - 45000;
    const tax2 = bracket2 * 0.30;
    incomeTax += tax2;
    brackets.push({ range: "$45,001–$135,000", rate: "30%", amount: tax2 });
  }

  if (taxableIncome > 135000) {
    const bracket3 = Math.min(taxableIncome, 190000) - 135000;
    const tax3 = bracket3 * 0.37;
    incomeTax += tax3;
    brackets.push({ range: "$135,001–$190,000", rate: "37%", amount: tax3 });
  }

  if (taxableIncome > 190000) {
    const bracket4 = (taxableIncome - 190000) * 0.45;
    incomeTax += bracket4;
    brackets.push({ range: "Over $190,000", rate: "45%", amount: bracket4 });
  }

  // Medicare levy 2024-25: no levy ≤ $26,000; shade-in $26,001–$32,500 at 10% of excess; full 2% above $32,500
  const MEDICARE_LOW_THRESHOLD = 26000;
  const MEDICARE_PHASE_IN_LIMIT = 32500;
  let medicareLevy: number;
  if (taxableIncome <= MEDICARE_LOW_THRESHOLD) {
    medicareLevy = 0;
  } else if (taxableIncome <= MEDICARE_PHASE_IN_LIMIT) {
    medicareLevy = (taxableIncome - MEDICARE_LOW_THRESHOLD) * 0.10;
  } else {
    medicareLevy = taxableIncome * 0.02;
  }

  // LITO (Low Income Tax Offset) 2024-25: max $700
  // Stage 1 phase-out: $37,501–$45,000 at 5c/$ ($700 → $325)
  // Stage 2 phase-out: $45,001–$66,667 at 1.5c/$ ($325 → $0)
  let lito = 0;
  if (taxableIncome <= 37500) {
    lito = 700;
  } else if (taxableIncome <= 45000) {
    lito = Math.max(0, 700 - (taxableIncome - 37500) * 0.05);
  } else if (taxableIncome <= 66667) {
    lito = Math.max(0, 325 - (taxableIncome - 45000) * 0.015);
  }

  const totalTax = Math.max(0, incomeTax + medicareLevy - lito);

  return { incomeTax, medicareLevy, lito, totalTax, brackets };
}

export function calculateGstFromInclusive(amount: number): number {
  return amount / 11;
}

export function getFinancialYear(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function generateQuoteNumber(sequenceNum: number): string {
  const year = new Date().getFullYear();
  return `Q-${year}-${String(sequenceNum).padStart(4, "0")}`;
}

export function generateInvoiceNumber(sequenceNum: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequenceNum).padStart(4, "0")}`;
}

export function generateJobNumber(sequenceNum: number): string {
  const year = new Date().getFullYear();
  return `JOB-${year}-${String(sequenceNum).padStart(4, "0")}`;
}

export function getSopaText(state: string): string {
  const acts: Record<string, string> = {
    VIC: "Building and Construction Industry Security of Payment Act 2002",
    NSW: "Building and Construction Industry Security of Payment Act 1999",
    QLD: "Building Industry Fairness (Security of Payment) Act 2017",
    WA: "Construction Contracts Act 2004",
    SA: "Building and Construction Industry Security of Payment Act 2009",
    TAS: "Building and Construction Industry Security of Payment Act 2009",
    ACT: "Building and Construction Industry (Security of Payment) Act 2009",
    NT: "Construction Contracts (Security of Payments) Act 2004",
  };
  const act = acts[state] || acts["VIC"];
  return `This payment claim is made and served under the ${act}. The respondent is required to serve a payment schedule within the time specified in the Act. Failure to do so may result in the claimant being entitled to recover the claimed amount as a debt.`;
}

export interface DepositLimit {
  message: string;
  maxPercent: number | null;
  maxFixed: number | null;
}

export function getDepositLimit(state: string, total: number): DepositLimit {
  switch (state) {
    case "VIC":
      if (total < 20000) {
        return { message: "VIC: max 10% deposit for jobs under $20,000", maxPercent: 10, maxFixed: null };
      }
      return { message: "VIC: max 5% deposit for jobs $20,000 and over", maxPercent: 5, maxFixed: null };
    case "NSW":
      if (total < 20000) {
        return { message: "NSW: max 10% deposit for jobs under $20,000", maxPercent: 10, maxFixed: null };
      }
      return { message: "NSW: max $1,000 deposit for jobs $20,000 and over", maxPercent: null, maxFixed: 1000 };
    case "QLD":
      if (total < 3300) {
        return { message: "QLD: max $100 deposit for jobs under $3,300", maxPercent: null, maxFixed: 100 };
      }
      return { message: "QLD: max 10% deposit for residential jobs", maxPercent: 10, maxFixed: null };
    default:
      return { message: "No statutory limit. Industry standard: 10%.", maxPercent: null, maxFixed: null };
  }
}
