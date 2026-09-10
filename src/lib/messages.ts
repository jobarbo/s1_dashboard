import { interpolate, getLocale, type Locale } from "./i18n";

const en = {
  appTitle: "S-1 Web Editor",
  appSubtitle: "Unofficial Roland AIRA Compact S-1 dashboard",
  pageTitle: "Roland S-1 Web Editor",
  pageDescription: "Visual web editor for the Roland AIRA Compact S-1 synthesizer over USB MIDI.",

  themeToLight: "Switch to light mode",
  themeToDark: "Switch to dark mode",
  language: "Language",
  langEn: "EN",
  langFr: "FR",

  openReference: "Open S-1 reference",
  openReferenceTitle: "S-1 reference (menu-only options)",

  webMidiUnavailable: "Web MIDI unavailable — using mock",
  live: "Live",
  mock: "Mock",
  usbAudioLive: "USB audio live",
  noMidiInputPort: "No MIDI input port",
  unsyncedCount: "{n} unsynced",
  out: "out",
  midiNoneInput: "(none — hardware knob sync unavailable)",
  unknownPort: "Unknown",

  channel: "Ch",
  midiOut: "MIDI out",
  midiIn: "MIDI in",
  audioIn: "Audio in",
  autoDetectS1: "Auto-detect S-1",
  mockMidi: "Mock MIDI",

  connect: "Connect",
  connecting: "Connecting…",
  disconnect: "Disconnect",
  testNote: "Test note",
  startAudio: "Start audio",
  stopAudio: "Stop audio",
  sendAll: "Send All",
  panic: "Panic",

  connectHintTitle: "Before connecting:",
  connectHint:
    "Turn {aira} off on the S-1, then power-cycle. Connect starts MIDI and USB audio (browser will ask for mic/audio permission — pick your S-1 input).",
  liveHint:
    "CC visualizers in each section are estimates. The top oscilloscope shows live USB audio. The Filter graph overlays the live USB spectrum on the estimated cutoff curve.",

  oscilloscope: "Oscilloscope",
  footer:
    "Not affiliated with Roland. Save patterns on the hardware (Shift + Write). CC-only — no SysEx, no .PRM writing in v1.",

  midiUnsupported: "Web MIDI is not supported in this browser. Use Chrome or Edge.",
  midiNoOutput: "No MIDI output device found. Connect your S-1 via USB and turn AIRA LINK off.",
  midiConnectFailed: "Failed to connect MIDI",
  audioStartFailed: "Failed to start USB audio",
  audioInputUnlabeled: "Audio input {id}…",

  refTitle: "S-1 reference",
  refSubtitle: "Hardware menu wiki — MENU (SHIFT + pad 15), effect menus, and MIDI limits.",
  closeReference: "Close reference",
  searchReference: "Search reference",
  searchPlaceholder: "Search menu codes, values…",
  pages: "Pages",
  noMatchesQuery: "No matches for “{q}”.",
  noMatchesPage: "No matches on this page.",
  access: "Access",
  values: "Values",
  label: "Label",
  value: "Value",
  meaning: "Meaning",
  optionsFor: "Options for {name}",
  scopePattern: "Pattern",
  scopeSystem: "System",
  scopeAction: "Action",

  vizWaveDrawStep: "Wave (Draw Step)",
  vizWaveDrawSlope: "Wave (Draw Slope)",
  vizWaveCcEst: "Wave (CC est.)",
  vizOscDrawStep: "Draw oscillator (step, schematic)",
  vizOscDrawSlope: "Draw oscillator (slope, schematic)",
  vizOscMixEst: "Oscillator mix (estimated)",
  vizFilterLfo: "Filter + LFO (dashed)",
  vizFilterAdsr: "Filter + ADSR time overlay",
  vizFilterUsb: "Filter + USB spectrum",
  vizFilterCc: "Filter curve (CC)",
  vizFilterLfoHint: "Orange = cutoff · Violet dashed = Filter LFO",
  vizFilterAdsrLiveHint: "Orange = cutoff (freq). Dotted A→D→S→R = time, left to right",
  vizFilterUsbHint: "Filter curve over live USB spectrum",
  vizFilterAdsrHint: "Filter response with A/D/S/R env overlays",
  vizFilterEst: "Filter response (estimated)",
  vizAdsrUsb: "ADSR + USB wave",
  vizAdsrTone: "ADSR × tone (amp)",
  vizAdsrUsbFull: "Live USB wave with estimated amp envelope",
  vizAdsrToneFull: "Amplitude envelope on a tone (estimated)",
  vizScope: "USB oscilloscope",
  vizScopeOff: "(off)",
} as const;

const fr: { [K in keyof typeof en]: string } = {
  appTitle: "S-1 Web Editor",
  appSubtitle: "Tableau de bord non officiel du Roland AIRA Compact S-1",
  pageTitle: "Roland S-1 Web Editor",
  pageDescription: "Éditeur web visuel pour le synthétiseur Roland AIRA Compact S-1 via USB MIDI.",

  themeToLight: "Passer en mode clair",
  themeToDark: "Passer en mode sombre",
  language: "Langue",
  langEn: "EN",
  langFr: "FR",

  openReference: "Ouvrir la référence S-1",
  openReferenceTitle: "Référence S-1 (options menu uniquement)",

  webMidiUnavailable: "Web MIDI indisponible — mode simulé",
  live: "Live",
  mock: "Simulé",
  usbAudioLive: "Audio USB actif",
  noMidiInputPort: "Pas d’entrée MIDI",
  unsyncedCount: "{n} non synchronisé(s)",
  out: "out",
  midiNoneInput: "(aucune — synchro des knobs matériel indisponible)",
  unknownPort: "Inconnu",

  channel: "Ch",
  midiOut: "MIDI out",
  midiIn: "MIDI in",
  audioIn: "Audio in",
  autoDetectS1: "Détection auto S-1",
  mockMidi: "MIDI simulé",

  connect: "Connecter",
  connecting: "Connexion…",
  disconnect: "Déconnecter",
  testNote: "Note test",
  startAudio: "Démarrer l’audio",
  stopAudio: "Arrêter l’audio",
  sendAll: "Tout envoyer",
  panic: "Panic",

  connectHintTitle: "Avant de connecter :",
  connectHint:
    "Désactivez {aira} sur le S-1, puis éteignez et rallumez. Connecter lance MIDI et l’audio USB (le navigateur demandera l’accès micro/audio — choisissez l’entrée S-1).",
  liveHint:
    "Les visualiseurs CC de chaque section sont des estimations. L’oscilloscope du haut affiche l’audio USB en direct. Le graphe Filter superpose le spectre USB live sur la courbe de cutoff estimée.",

  oscilloscope: "Oscilloscope",
  footer:
    "Non affilié à Roland. Sauvegardez les patterns sur l’appareil (Shift + Write). CC uniquement — pas de SysEx, pas d’écriture .PRM en v1.",

  midiUnsupported: "Web MIDI n’est pas pris en charge dans ce navigateur. Utilisez Chrome ou Edge.",
  midiNoOutput: "Aucune sortie MIDI trouvée. Branchez le S-1 en USB et désactivez AIRA LINK.",
  midiConnectFailed: "Échec de la connexion MIDI",
  audioStartFailed: "Échec du démarrage de l’audio USB",
  audioInputUnlabeled: "Entrée audio {id}…",

  refTitle: "Référence S-1",
  refSubtitle: "Wiki des menus matériel — MENU (SHIFT + pad 15), menus d’effets, et limites MIDI.",
  closeReference: "Fermer la référence",
  searchReference: "Rechercher dans la référence",
  searchPlaceholder: "Rechercher codes menu, valeurs…",
  pages: "Pages",
  noMatchesQuery: "Aucun résultat pour « {q} ».",
  noMatchesPage: "Aucun résultat sur cette page.",
  access: "Accès",
  values: "Valeurs",
  label: "Label",
  value: "Value",
  meaning: "Signification",
  optionsFor: "Options pour {name}",
  scopePattern: "Pattern",
  scopeSystem: "System",
  scopeAction: "Action",

  vizWaveDrawStep: "Wave (Draw Step)",
  vizWaveDrawSlope: "Wave (Draw Slope)",
  vizWaveCcEst: "Wave (est. CC)",
  vizOscDrawStep: "Oscillateur Draw (step, schématique)",
  vizOscDrawSlope: "Oscillateur Draw (slope, schématique)",
  vizOscMixEst: "Mix Oscillator (estimé)",
  vizFilterLfo: "Filter + LFO (pointillés)",
  vizFilterAdsr: "Filter + overlay temps ADSR",
  vizFilterUsb: "Filter + spectre USB",
  vizFilterCc: "Courbe Filter (CC)",
  vizFilterLfoHint: "Orange = cutoff · Violet pointillé = Filter LFO",
  vizFilterAdsrLiveHint: "Orange = cutoff (freq.). Pointillés A→D→S→R = temps, gauche → droite",
  vizFilterUsbHint: "Courbe Filter sur le spectre USB live",
  vizFilterAdsrHint: "Réponse Filter avec overlays A/D/S/R",
  vizFilterEst: "Réponse Filter (estimée)",
  vizAdsrUsb: "ADSR + onde USB",
  vizAdsrTone: "ADSR × tone (amp)",
  vizAdsrUsbFull: "Onde USB live avec enveloppe amp estimée",
  vizAdsrToneFull: "Enveloppe d’amplitude sur un tone (estimée)",
  vizScope: "Oscilloscope USB",
  vizScopeOff: "(off)",
};

const catalogs: Record<Locale, typeof en> = { en, fr };

export type MessageKey = keyof typeof en;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const catalog = catalogs[getLocale()] ?? catalogs.en;
  return interpolate(catalog[key], vars);
}

export function messagesFor(locale: Locale): typeof en {
  return catalogs[locale] ?? catalogs.en;
}
