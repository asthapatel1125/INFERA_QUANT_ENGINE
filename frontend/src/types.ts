export interface Zone {
  timestamp: string;
  zone: string;
  stable_zone: string;
  stability: number;
  transition_flag: boolean;
  candidate_samples: number;
}

export interface CurvePoint {
  strike: number;
  gex: number;
  dex: number;
  vex: number;
  tex: number;
  rex: number;
}

export interface Exposure {
  timestamp: string;
  spot: number;
  totals: Record<"gex" | "dex" | "vex" | "tex" | "rex", number>;
  curve: CurvePoint[];
  call_wall: number;
  put_wall: number;
  gamma_flip_lower: number;
  gamma_flip_upper: number;
  long_gamma_zones: number[];
  short_gamma_zones: number[];
  greek_stability: number;
  bands: Record<string, string>;
}

export interface Microstructure {
  timestamp: string;
  quote_imbalance: number;
  microprice: number;
  midprice: number;
  spread: number;
  spread_regime: "TIGHT" | "NORMAL" | "WIDE";
  sweep_detected: boolean;
  liquidity_score: number;
  micro_stability: number;
  tape_speed: number;
  iv_slope: number;
  vol_of_vol: number;
  term_structure: { expiry: string; iv: number }[];
}

export interface SignalScores {
  timestamp: string;
  direction_score: number;
  explosion_score: number;
  precision_score: number;
}

export interface Alert {
  timestamp: string;
  active: boolean;
  tier: "TIER_1" | "TIER_2" | null;
  direction: "LONG" | "SHORT" | null;
  zone: string;
  precision: number;
  explosion: number;
  direction_score: number;
  micro_confirmed: boolean;
}

export type StreamChannel = "zones" | "exposures" | "micro" | "scores" | "alerts";

