const STORAGE_KEY = 'rs.smpp-sms.accent-color'

export interface AccentPreset {
  name: string
  color: string
  values: Record<string, string>
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    name: 'Orange',
    color: '#f97316',
    values: {
      '--accent-50': 'oklch(0.98 0.016 73.684)',
      '--accent-100': 'oklch(0.954 0.038 75.164)',
      '--accent-200': 'oklch(0.901 0.076 70.697)',
      '--accent-300': 'oklch(0.837 0.128 66.29)',
      '--accent-500': 'oklch(0.705 0.191 47.604)',
      '--accent-600': 'oklch(0.646 0.191 41.116)',
    },
  },
  {
    name: 'Violet',
    color: '#8b5cf6',
    values: {
      '--accent-50': 'oklch(0.969 0.016 293.756)',
      '--accent-100': 'oklch(0.943 0.029 294.588)',
      '--accent-200': 'oklch(0.894 0.057 293.283)',
      '--accent-300': 'oklch(0.811 0.111 293.571)',
      '--accent-500': 'oklch(0.606 0.25 292.717)',
      '--accent-600': 'oklch(0.541 0.281 293.009)',
    },
  },
  {
    name: 'Sky',
    color: '#38bdf8',
    values: {
      '--accent-50': 'oklch(0.977 0.013 236.62)',
      '--accent-100': 'oklch(0.951 0.026 236.824)',
      '--accent-200': 'oklch(0.901 0.058 230.902)',
      '--accent-300': 'oklch(0.828 0.111 230.318)',
      '--accent-500': 'oklch(0.685 0.169 237.323)',
      '--accent-600': 'oklch(0.588 0.158 241.966)',
    },
  },
  {
    name: 'Rose',
    color: '#f43f5e',
    values: {
      '--accent-50': 'oklch(0.969 0.015 12.422)',
      '--accent-100': 'oklch(0.941 0.03 12.58)',
      '--accent-200': 'oklch(0.892 0.058 10.001)',
      '--accent-300': 'oklch(0.81 0.117 11.638)',
      '--accent-500': 'oklch(0.645 0.246 16.439)',
      '--accent-600': 'oklch(0.586 0.253 17.585)',
    },
  },
  {
    name: 'Emerald',
    color: '#10b981',
    values: {
      '--accent-50': 'oklch(0.979 0.021 166.113)',
      '--accent-100': 'oklch(0.95 0.052 163.051)',
      '--accent-200': 'oklch(0.905 0.093 164.15)',
      '--accent-300': 'oklch(0.845 0.143 164.978)',
      '--accent-500': 'oklch(0.696 0.17 162.48)',
      '--accent-600': 'oklch(0.596 0.145 163.225)',
    },
  },
  {
    name: 'Fuchsia',
    color: '#d946ef',
    values: {
      '--accent-50': 'oklch(0.977 0.017 308.212)',
      '--accent-100': 'oklch(0.952 0.037 307.174)',
      '--accent-200': 'oklch(0.903 0.076 306.703)',
      '--accent-300': 'oklch(0.833 0.145 306.383)',
      '--accent-500': 'oklch(0.667 0.295 322.15)',
      '--accent-600': 'oklch(0.591 0.293 322.896)',
    },
  },
]

export function applyAccentColor(presetName: string) {
  const preset = ACCENT_PRESETS.find((p) => p.name === presetName) ?? ACCENT_PRESETS[0]
  const root = document.documentElement
  for (const [key, value] of Object.entries(preset.values)) {
    root.style.setProperty(key, value)
  }
}

export function getSavedAccentColor(): string {
  if (typeof window === 'undefined') return 'Orange'
  return localStorage.getItem(STORAGE_KEY) ?? 'Orange'
}

export function saveAccentColor(presetName: string) {
  localStorage.setItem(STORAGE_KEY, presetName)
  applyAccentColor(presetName)
}

export function initAccentColor() {
  applyAccentColor(getSavedAccentColor())
}
