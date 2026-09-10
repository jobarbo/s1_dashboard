import { getLocale, type Locale } from "./i18n";
import { MENU_HOW, S1_REFERENCE, type ReferenceItem, type ReferenceSection } from "./s1-reference";

const MENU_HOW_FR = "SHIFT + pad 15 (MENU) → sélectionner → pad 2 (ENTER)";

interface ItemOverlay {
  how?: string;
  values?: string;
  note?: string;
  meanings?: Record<string, string>;
}

interface SectionOverlay {
  title?: string;
  blurb?: string;
}

const SECTION_FR: Record<string, SectionOverlay> = {
  menu: {
    title: "MENU (Shift + pad 15)",
    blurb:
      "Maintenez SHIFT et appuyez sur pad 15. Tournez TEMPO/VALUE pour choisir un item, puis ENTER (pad 2). EXIT = pad 1. (*1) = enregistré avec le pattern courant.",
  },
  reverb: {
    title: "Menu Reverb (Shift + pad 14)",
    blurb: "Paramètres Reverb avancés. Seuls Time (CC 89) et Level (CC 91) sont accessibles en MIDI.",
  },
  delay: {
    title: "Menu Delay (Shift + pad 13)",
    blurb: "Paramètres Delay avancés. Seuls Time (CC 90) et Level (CC 92) sont des CC MIDI.",
  },
  "lfo-sync": {
    title: "Durées de notes LFO Sync",
    blurb: "Quand LFO Sync est On, RATE choisit une durée de note par rapport au tempo (pas des Hz libres).",
  },
  limits: {
    title: "Ce que MIDI ne peut pas faire",
    blurb: "Cet éditeur est CC uniquement. Le S-1 n’a pas de dump SysEx de paramètres.",
  },
};

const ITEM_FR: Record<string, ItemOverlay> = {
  vol: { note: "Volume du pattern (*1)." },
  "mod-d": {
    note: "Profondeur du vibrato/growl sur OSC ou FILTER quand la modulation (D-Motion / MIDI mod) est utilisée (*1).",
  },
  "bnd-o": {
    note: "Plage pitch bend / D-Motion pour OSC. 120 ≈ ±1 oct, 240 ≈ ±2 oct (*1). Aussi CC 18 dans cet éditeur.",
  },
  "bnd-f": {
    note: "Plage pitch bend / D-Motion pour le cutoff du filter (*1). Aussi CC 27 dans cet éditeur.",
  },
  "ns-md": {
    meanings: { Pink: "Bruit rose", "ľhit": "Bruit blanc" },
    note: "Aussi CC 78 dans cet éditeur (*1).",
  },
  "rs-md": {
    meanings: {
      OFF: "Le knob NOISE = niveau de noise uniquement. Tout autre mode utilise le knob pour riser/downer.",
      SynC: "Riser intermittent sur le contretemps des noires, calé sur le tempo.",
      qUiv: "Les intervalles entre les hits du riser s’accélèrent en tournant NOISE vers la droite.",
      qvPn: "Le riser panne L→R plus vite en tournant NOISE vers la droite.",
    },
    note:
      "Min (r.0) / max (d.0) coupent le riser. Le milieu (r.100) est le climax. Maintenez SHIFT en tournant NOISE pour bouger le knob sans son. SHIFT+pad1+pad2 fait aussi défiler les modes (*1).",
  },
  "rs-rs": { note: "Stridence du riser (*1)." },
  "rs-sh": { note: "Forme d’enveloppe : 0 = sawtooth, 100 = square." },
  "rs-lv": { note: "Volume du riser (*1)." },
  "lfo-n": {
    meanings: { norN: "Plage de vitesse normale", FASt: "Mode Fast" },
    note: "Désactivé quand LFO Sync est On. Aussi CC 79 (*1).",
  },
  "lfo-s": {
    meanings: {
      OFF: "RATE libre (style Hz)",
      On: "RATE = durée de note vs tempo ; LFO Mode ignoré",
    },
    note: "Aussi CC 106 (firmware 1.02+) (*1).",
  },
  "lfo-k": {
    meanings: {
      OFF: "La phase LFO continue librement",
      On: "Le LFO se réinitialise au note-on",
    },
    note: "Aussi CC 105 (*1).",
  },
  cho: {
    meanings: {
      OFF: "Chorus off",
      "1": "Chorus standard",
      "2": "Modulation plus rapide",
      "3": "Modulation rapide (style rotary, fast)",
      "4": "Modulation plus détendue",
    },
    note: "Aussi CC 93 dans cet éditeur (*1).",
  },
  tran: { note: "Transpose le tone engine (*1). Aussi CC 77." },
  "p-scl": {
    meanings: {
      "1_8": "Croche par step",
      "1_16": "Double-croche par step",
      "1_32": "Triple-croche par step",
      "8t": "Triolet de croches",
      "16t": "Triolet de double-croches",
      "32t": "Triolet de triple-croches",
    },
    note: "Aussi : maintenez PATTERN et tournez TEMPO/VALUE (*1).",
  },
  "n-prb": {
    note: "Décale la probabilité de lecture de chaque step. Aussi : maintenez STEP + TEMPO/VALUE.",
  },
  "n-pri": {
    meanings: {
      LASt: "Priorité Last note (quand Nono / Uni / Chd + LFO/GAtE trigger)",
      "Loľ": "Priorité Lowest note",
    },
  },
  "gl-dr": {
    meanings: {
      OFF: "Delay/reverb suivent chaque pattern (peuvent se couper au changement de pattern).",
      On: "Delay/reverb système ; les queues continuent d’un pattern à l’autre.",
    },
  },
  "d-l-md": {
    meanings: {
      PrE: "Knob DELAY = niveau d’entrée ; fade-out en baissant",
      PoSt: "Knob DELAY = niveau de sortie ; mute immédiat en baissant",
    },
  },
  "s-clk": { note: "Clocks de sync par beat (jack SYNC / division d’horloge)." },
  ch: { note: "Canal d’émission / réception pour notes & CC." },
  sync: {
    meanings: {
      AUtO: "Accepte les clocks entrantes",
      Int: "Horloge interne uniquement",
      NiDi: "Clock MIDI IN uniquement",
      USb: "Clock USB MIDI uniquement",
    },
    note: "Si quelque chose est branché dans SYNC IN, l’appareil suit toujours ce jack.",
  },
  thru: {
    meanings: {
      OFF: "Ne pas renvoyer MIDI IN → MIDI OUT",
      On: "Renvoyer MIDI IN → MIDI OUT",
    },
  },
  "tx-pc": {
    meanings: {
      OFF: "Ne pas envoyer de PC au changement de pattern",
      On: "Envoyer un PC quand le pattern change",
    },
  },
  "rx-pc": {
    meanings: {
      OFF: "Ignorer les PC entrants",
      On: "Changer de pattern à la réception d’un PC",
    },
  },
  "pc-ch": { note: "Canal MIDI utilisé pour les program changes de pattern." },
  velo: { note: "Velocity fixe pour les pads clavier." },
  tune: { note: "Accordage maître. Défaut 440.0 Hz." },
  "usb-d": { note: "OFF = suit le knob VOLUME. 1–127 = niveau de sortie USB fixe." },
  "a-lnk": {
    meanings: {
      OFF: "USB normal (défaut)",
      On: "Pour les hôtes AIRA LINK (ex. MX-1). Éteindre/rallumer après changement.",
    },
    note: "Les ports MX-1 autres que USB HOST 3 peuvent forcer le mode piles uniquement.",
  },
  "cnt-i": { note: "Durée du count-in en beats avant l’enregistrement." },
  mtro: {
    meanings: {
      OFF: "Toujours off",
      rEC: "On pendant l’enregistrement seulement",
      "rC.PL": "On pendant enregistrement et playback",
    },
  },
  "d-lat": {
    meanings: {
      OFF: "Momentané — actif tant que maintenu (défaut)",
      On: "Bascule à chaque appui",
    },
  },
  copy: {
    values: "Choisir le pattern destination → ENTER",
    note: "EXIT annule. Copie le pattern courant vers un autre emplacement.",
  },
  init: {
    values: "ENTER pour confirmer",
    note: "Efface les données de performance et les tones du pattern courant (jusqu’à extinction / réécriture).",
  },
  rlod: {
    values: "ENTER pour confirmer",
    note: "Restaure le pattern sélectionné au dernier état sauvegardé (sound + sequence).",
  },
  "rl-sd": {
    values: "ENTER pour confirmer",
    note: "Restaure le tone seulement. Raccourci : SHIFT + pad 1 + POLY.",
  },
  "rl-sq": {
    values: "ENTER pour confirmer",
    note: "Restaure uniquement les données de performance / sequencer.",
  },
  "rev-type": {
    how: "SHIFT + pad 14 (menu REVERB)",
    meanings: {
      ANb: "Ambience — espace lointain / off-mic",
      RooN: "Room — petite pièce",
      hAL1: "Hall 1 — hall clair et spacieux",
      hAL2: "Hall 2 — hall plus doux",
      PLAt: "Reverb plate",
      SPrn: "Spring d’ampli guitare",
      Nod: "Hall avec un effet ondulé",
    },
  },
  "rev-time": { how: "SHIFT + knob REVERB" },
  "rev-level": { how: "Knob REVERB" },
  "rev-pd": { how: "Menu REVERB" },
  "rev-lo": { how: "Menu REVERB" },
  "rev-hi": { how: "Menu REVERB" },
  "rev-dens": { how: "Menu REVERB" },
  "dly-sync": {
    how: "Menu DELAY",
    meanings: {
      OFF: "Time en millisecondes",
      On: "Time en durées de notes vs tempo",
    },
  },
  "dly-time": {
    how: "SHIFT + knob DELAY",
    values: "1–740 ms (Sync Off) · durées de notes (Sync On)",
  },
  "dly-level": { how: "Knob DELAY" },
  "dly-fb": { how: "Menu DELAY" },
  "dly-lo": { how: "Menu DELAY" },
  "dly-hi": { how: "Menu DELAY" },
  "lfo-rate-table": {
    how: "LFO Sync On · knob RATE",
    note: "Si RATE dérive après des changements, arrêtez puis relancez le sequencer.",
  },
  sysex: {
    how: "Tableau MIDI",
    values: "Non pris en charge pour l’édition de paramètres",
  },
  prm: {
    how: "Write matériel (SHIFT + pad 16)",
    values: "Sequencer, tables Draw/Chop, menus profonds — sauvegarder sur le S-1",
  },
  "mod-cutoff": {
    how: "DSP interne",
    values: "Le filter modulé LFO/ENV n’est pas streamé — les visualiseurs estiment à partir des CC + audio USB",
  },
};

function localizeItem(item: ReferenceItem): ReferenceItem {
  const ov = ITEM_FR[item.id];
  const how = item.how === MENU_HOW ? MENU_HOW_FR : (ov?.how ?? item.how);
  if (!ov) {
    return how === item.how ? item : { ...item, how };
  }
  return {
    ...item,
    how,
    values: ov.values ?? item.values,
    note: ov.note ?? item.note,
    options: item.options?.map((opt) => ({
      ...opt,
      meaning: ov.meanings?.[opt.label] ?? opt.meaning,
    })),
  };
}

export function localizeReference(locale: Locale = getLocale()): ReferenceSection[] {
  if (locale !== "fr") return S1_REFERENCE;
  return S1_REFERENCE.map((section) => {
    const ov = SECTION_FR[section.id];
    return {
      ...section,
      title: ov?.title ?? section.title,
      blurb: ov?.blurb ?? section.blurb,
      items: section.items.map(localizeItem),
    };
  });
}
