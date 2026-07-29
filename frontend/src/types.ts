export interface Zone {
  timestamp: string;
  zone: string;
  stable_zone: string;
  stability: number;
  transition_flag: boolean;
  candidate_samples: number;
  symbol: string;
  spot: number;
  data_source: string;
  zone_changed: boolean;
  why: string[];
  determination: {
    greek_regime: string;
    time_regime: string;
    volatility_regime: string;
    microstructure_stability: number;
    combined_zone_score: number;
  };
  greeks: {
    gamma_slope: number;
    vanna_drift: number;
    charm_drift: number;
    speed_stability: number;
    zomma_stability: number;
    color_stability: number;
  };
  time_context: {
    current_hour: string;
    session_phase: string;
    session_bias: string;
    expected_behavior: string;
  };
  volatility_context: {
    iv_expansion: number;
    iv_compression: number;
    vol_of_vol: number;
    term_structure_slope: number;
    regime: string;
  };
  microstructure_context: {
    quote_imbalance: number;
    microprice_direction: string;
    sweep_detected: boolean;
    spread_regime: string;
    liquidity_score: number;
    microstructure_stability: number;
    regime: string;
  };
  change_event: null | {
    timestamp: string;
    from_zone: string;
    to_zone: string;
    greeks: Zone["greeks"];
    volatility: Zone["volatility_context"];
    microstructure: Zone["microstructure_context"];
    time: Zone["time_context"];
  };
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
  symbol: string;
  data_source: string;
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
  symbol: string;
  data_source: string;
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
