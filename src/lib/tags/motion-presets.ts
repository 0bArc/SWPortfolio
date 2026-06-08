import type { TagKeyframe } from "@/lib/tags/types";

export type MotionPresetId =
  | "left-right"
  | "right-left"
  | "up-down"
  | "down-up"
  | "diagonal-se"
  | "diagonal-nw"
  | "diagonal-ne"
  | "diagonal-sw"
  | "orbit"
  | "figure-eight"
  | "pulse"
  | "bounce-x"
  | "bounce-y";

export interface MotionPreset {
  id: MotionPresetId;
  label: string;
  hint: string;
  keyframes: TagKeyframe[];
}

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "left-right",
    label: "→",
    hint: "Left to right",
    keyframes: [
      { at: 0, bgX: 0, bgY: 50, glow: 0.6 },
      { at: 100, bgX: 100, bgY: 50, glow: 0.6 },
    ],
  },
  {
    id: "right-left",
    label: "←",
    hint: "Right to left",
    keyframes: [
      { at: 0, bgX: 100, bgY: 50, glow: 0.6 },
      { at: 100, bgX: 0, bgY: 50, glow: 0.6 },
    ],
  },
  {
    id: "up-down",
    label: "↓",
    hint: "Top to bottom",
    keyframes: [
      { at: 0, bgX: 50, bgY: 0, glow: 0.6 },
      { at: 100, bgX: 50, bgY: 100, glow: 0.6 },
    ],
  },
  {
    id: "down-up",
    label: "↑",
    hint: "Bottom to top",
    keyframes: [
      { at: 0, bgX: 50, bgY: 100, glow: 0.6 },
      { at: 100, bgX: 50, bgY: 0, glow: 0.6 },
    ],
  },
  {
    id: "diagonal-se",
    label: "↘",
    hint: "Diagonal down-right",
    keyframes: [
      { at: 0, bgX: 0, bgY: 0, glow: 0.65 },
      { at: 100, bgX: 100, bgY: 100, glow: 0.65 },
    ],
  },
  {
    id: "diagonal-nw",
    label: "↖",
    hint: "Diagonal up-left",
    keyframes: [
      { at: 0, bgX: 100, bgY: 100, glow: 0.65 },
      { at: 100, bgX: 0, bgY: 0, glow: 0.65 },
    ],
  },
  {
    id: "diagonal-ne",
    label: "↗",
    hint: "Diagonal up-right",
    keyframes: [
      { at: 0, bgX: 0, bgY: 100, glow: 0.65 },
      { at: 100, bgX: 100, bgY: 0, glow: 0.65 },
    ],
  },
  {
    id: "diagonal-sw",
    label: "↙",
    hint: "Diagonal down-left",
    keyframes: [
      { at: 0, bgX: 100, bgY: 0, glow: 0.65 },
      { at: 100, bgX: 0, bgY: 100, glow: 0.65 },
    ],
  },
  {
    id: "orbit",
    label: "◯",
    hint: "Square orbit",
    keyframes: [
      { at: 0, bgX: 0, bgY: 0, glow: 0.7 },
      { at: 25, bgX: 100, bgY: 0, glow: 0.75 },
      { at: 50, bgX: 100, bgY: 100, glow: 0.7 },
      { at: 75, bgX: 0, bgY: 100, glow: 0.75 },
      { at: 100, bgX: 0, bgY: 0, glow: 0.7 },
    ],
  },
  {
    id: "figure-eight",
    label: "∞",
    hint: "Figure eight",
    keyframes: [
      { at: 0, bgX: 50, bgY: 0, glow: 0.7 },
      { at: 25, bgX: 100, bgY: 50, glow: 0.8 },
      { at: 50, bgX: 50, bgY: 100, glow: 0.7 },
      { at: 75, bgX: 0, bgY: 50, glow: 0.8 },
      { at: 100, bgX: 50, bgY: 0, glow: 0.7 },
    ],
  },
  {
    id: "pulse",
    label: "◎",
    hint: "Glow pulse, static gradient",
    keyframes: [
      { at: 0, bgX: 50, bgY: 50, glow: 0.3 },
      { at: 50, bgX: 50, bgY: 50, glow: 1 },
      { at: 100, bgX: 50, bgY: 50, glow: 0.3 },
    ],
  },
  {
    id: "bounce-x",
    label: "↔",
    hint: "Horizontal bounce",
    keyframes: [
      { at: 0, bgX: 0, bgY: 50, glow: 0.6 },
      { at: 50, bgX: 100, bgY: 50, glow: 0.8 },
      { at: 100, bgX: 0, bgY: 50, glow: 0.6 },
    ],
  },
  {
    id: "bounce-y",
    label: "↕",
    hint: "Vertical bounce",
    keyframes: [
      { at: 0, bgX: 50, bgY: 0, glow: 0.6 },
      { at: 50, bgX: 50, bgY: 100, glow: 0.8 },
      { at: 100, bgX: 50, bgY: 0, glow: 0.6 },
    ],
  },
];

export function getMotionPreset(id: MotionPresetId): TagKeyframe[] {
  const preset = MOTION_PRESETS.find((p) => p.id === id);
  return preset ? preset.keyframes.map((k) => ({ ...k })) : [];
}
