export interface TagKeyframe {
  at: number;
  bgX: number;
  bgY: number;
  glow: number;
}

export type TagTextEffect = "none" | "cryptic" | "flicker" | "pulse";

export interface TagStyleConfig {
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  textColor: string;
  textEffect: TagTextEffect;
  duration: number;
  easing: string;
  angle: number;
  bgSize: number;
  keyframes: TagKeyframe[];
}

export interface TagStyleRecord {
  slug: string;
  config: TagStyleConfig;
  updated_at: string;
}
