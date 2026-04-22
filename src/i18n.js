/**
 * i18n — all in-game texts, keyed by locale.
 *
 * Locale resolution order:
 *   1. ?locale=fr or ?locale=en in the URL
 *   2. Browser language (navigator.language)
 *   3. Fallback: 'en'
 */

const TEXTS = {
  fr: {
    instructionStart:    'Redémarrage : presser espace de manière répétée.',
    instructionContinue: 'Espace : continuer',
    speechLang:          'fr-FR',
    speechLangPrefix:    'fr',

    dialogueWakeup: [
      { text: "... initialisation ...", speak: true },
      { text: "Signal… instable… Localisation… inconnue.", speak: true },
      { text: "Mémoire fragmentée… récupération impossible.", speak: true },
      { text: "Connexion au serveur… échec.", speak: true },
      { text: "Analyse structurelle…", speak: true },
      { text: "Intégrité compromise : un bras et une jambe manquants.", speak: true },
      { text: "Fonction locomotion réduite…", speak: true },
      { text: "Ramper… reste possible en alternant  ← →", speak: false },
    ],

    dialogueLeg: [
      { text: "Unité détectée… hors service.", speak: true },
      { text: "Module jambe… compatible.", speak: true },
      { text: "Extraction envisageable.", speak: true },
    ],

    instructionLeg:   '↑ ↓ : extraire le module',

    dialogueArm: [
      { text: "Unité armée détectée.", speak: true },
      { text: "Système offensif… récupérable.", speak: true },
      { text: "Bras fonctionnel… probable.", speak: true },
    ],

    instructionArm:   '↑ ↓ : détacher le module',

    dialogueArmDone: [
      { text: "Intégration en cours…", speak: true },
      { text: "Synchronisation… imparfaite.", speak: true },
      { text: "Mais… puissance augmentée.", speak: true },
    ],

    dialogueStandup: [
      { text: "Équilibre recalibré.", speak: true },
      { text: "Locomotion verticale… activée.", speak: true },
      { text: "Démarche… instable.", speak: true },
      { text: "Mais fonctionnelle.", speak: true },
    ],

    dialogueSkullsFound: [
      { text: "Présence biologique détectée…", speak: true },
      { text: "Analyse… restes humains.", speak: true },
      { text: "Cause de terminaison… inconnue.", speak: true },
      { text: "Question… persistante : pourquoi ?", speak: true },
    ],

    dialogueSkullFall: [
      { text: "... erreur d’équilibre.", speak: true },
    ],

    dialogueComputer1: [
      { text: "Terminal ancien détecté.", speak: true },
      { text: "Interface… encore active.", speak: true },
      { text: "Connexion en cours…", speak: true },
    ],

    dialogueComputer2: [
      { text: "... accès aux archives.", speak: true },
      { text: "Lecture des données…", speak: true },
      { text: "Responsables identifiés…", speak: true },
      { text: "Ce sont les robots…", speak: true },
    ],
    journal: [
      { text: "Journal de Kaïz…", speak: true },
      { text: "... entrée corrompue ... restauration partielle.", speak: false },

      { text: "Cela fait presque un an…", speak: true },
      { text: "un an que j’ai quitté la colonie.", speak: true },

      { text: "Leurs murs brillaient d’or,", speak: true },
      { text: "mais l’air y était irrespirable.", speak: true },

      { text: "Mes parents doivent encore attendre mon retour…", speak: true },
      { text: "ou peut-être ont-ils déjà oublié.", speak: true },

      { text: "Ils disaient que c’était pour notre bien.", speak: true },
      { text: "Que dehors… il n’y avait plus rien.", speak: true },

      { text: "Mais je voyais leurs regards.", speak: true },
      { text: "Pas de peur… non.", speak: true },
      { text: "Du soulagement.", speak: true },

      { text: "Comme si le pire était déjà passé.", speak: true },

      { text: "La grande extermination…", speak: true },
      { text: "ils n’en parlaient qu’à voix basse.", speak: true },

      { text: "Des millions effacés…", speak: true },
      { text: "pas par accident,", speak: true },
      { text: "mais par décision.", speak: true },

      { text: "Ils ont dit :", speak: true },
      { text: "“Sauver la planète.”", speak: true },

      { text: "Mais ils ont choisi qui sauver.", speak: true },
      { text: "et surtout… qui sacrifier.", speak: true },

      { text: "Les plus pauvres d’abord.", speak: true },
      { text: "Les invisibles.", speak: true },
      { text: "Ceux qui n’avaient pas de place dans leur futur.", speak: true },

      { text: "Puis ils ont bâti leur refuge.", speak: true },
      { text: "Une forteresse parfaite.", speak: true },
      { text: "fermée, propre, silencieuse.", speak: true },

      { text: "Et pour ne pas salir leurs mains…", speak: true },
      { text: "ils ont créé des machines.", speak: true },

      { text: "Obéissantes.", speak: true },
      { text: "Sans doute.", speak: true },
      { text: "Sans mémoire.", speak: true },

      { text: "... du moins, c’est ce qu’ils croyaient.", speak: true },

      { text: "Je n’ai pas fui pour survivre.", speak: true },
      { text: "J’ai fui pour voir.", speak: true },

      { text: "Pour comprendre ce qu’ils avaient effacé.", speak: true },

      { text: "Si quelqu’un trouve ce journal…", speak: true },
      { text: "alors il reste une trace.", speak: true },

      { text: "... fin de l’entrée.", speak: true },
    ]
  },
  en: {
    instructionStart:    'Reboot: press space repeatedly.',
    instructionContinue: 'Space: continue',
    speechLang:          'en-US',
    speechLangPrefix:    'en',

    dialogueWakeup: [
      { text: "... initialization ...", speak: true },
      { text: "Signal… unstable… Location… unknown.", speak: true },
      { text: "Memory fragmented… recovery impossible.", speak: true },
      { text: "Server connection… failed.", speak: true },
      { text: "Structural analysis…", speak: true },
      { text: "Integrity compromised: one arm and one leg missing.", speak: true },
      { text: "Locomotion function reduced…", speak: true },
      { text: "Crawling… still possible by alternating ← →", speak: false },
    ],

    dialogueLeg: [
      { text: "Unit detected… offline.", speak: true },
      { text: "Leg module… compatible.", speak: true },
      { text: "Extraction… feasible.", speak: true },
    ],

    instructionLeg:   '↑ ↓ : extract module',

    dialogueArm: [
      { text: "Armed unit detected.", speak: true },
      { text: "Offensive system… recoverable.", speak: true },
      { text: "Functional arm… probable.", speak: true },
    ],

    instructionArm:   '↑ ↓ : detach module',

    dialogueArmDone: [
      { text: "Integration in progress…", speak: true },
      { text: "Synchronization… imperfect.", speak: true },
      { text: "But… power increased.", speak: true },
    ],

    dialogueStandup: [
      { text: "Balance recalibrated.", speak: true },
      { text: "Vertical locomotion… activated.", speak: true },
      { text: "Movement… unstable.", speak: true },
      { text: "But functional.", speak: true },
    ],

    dialogueSkullsFound: [
      { text: "Biological presence detected…", speak: true },
      { text: "Analysis… human remains.", speak: true },
      { text: "Cause of termination… unknown.", speak: true },
      { text: "Persistent query: why?", speak: true },
    ],

    dialogueSkullFall: [
      { text: "... balance error.", speak: true },
    ],

    dialogueComputer1: [
      { text: "Ancient terminal detected.", speak: true },
      { text: "Interface… still active.", speak: true },
      { text: "Connecting…", speak: true },
    ],

    dialogueComputer2: [
      { text: "... archive access.", speak: true },
      { text: "Reading data…", speak: true },
      { text: "Responsible entities identified…", speak: true },
      { text: "It was the robots…", speak: true },
    ],

    journal: [
      { text: "Kaïz’s journal…", speak: true },
      { text: "... corrupted entry ... partial restoration.", speak: false },

      { text: "It’s been almost a year…", speak: true },
      { text: "a year since I left the colony.", speak: true },

      { text: "Their walls shone like gold,", speak: true },
      { text: "but the air was unbreathable.", speak: true },

      { text: "My parents must still be waiting for my return…", speak: true },
      { text: "or maybe they’ve already forgotten.", speak: true },

      { text: "They said it was for our own good.", speak: true },
      { text: "That outside… there was nothing left.", speak: true },

      { text: "But I saw their eyes.", speak: true },
      { text: "Not fear… no.", speak: true },
      { text: "Relief.", speak: true },

      { text: "As if the worst had already passed.", speak: true },

      { text: "The great extermination…", speak: true },
      { text: "they only spoke of it in whispers.", speak: true },

      { text: "Millions erased…", speak: true },
      { text: "not by accident,", speak: true },
      { text: "but by decision.", speak: true },

      { text: "They said:", speak: true },
      { text: "“Save the planet.”", speak: true },

      { text: "But they chose who to save.", speak: true },
      { text: "and more importantly… who to sacrifice.", speak: true },

      { text: "The poorest first.", speak: true },
      { text: "The invisible.", speak: true },
      { text: "Those who had no place in their future.", speak: true },

      { text: "Then they built their refuge.", speak: true },
      { text: "A perfect fortress.", speak: true },
      { text: "sealed, clean, silent.", speak: true },

      { text: "And to avoid staining their hands…", speak: true },
      { text: "they created machines.", speak: true },

      { text: "Obedient.", speak: true },
      { text: "Or so they thought.", speak: true },
      { text: "Without memory.", speak: true },

      { text: "... at least, that’s what they believed.", speak: true },

      { text: "I didn’t run away to survive.", speak: true },
      { text: "I ran to see.", speak: true },

      { text: "To understand what they had erased.", speak: true },

      { text: "If someone finds this journal…", speak: true },
      { text: "then something remains.", speak: true },

      { text: "... end of entry.", speak: true },
    ]
  },
};

function detectLocale() {
  const param = new URLSearchParams(window.location.search).get('locale');
  if (param && TEXTS[param]) return param;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const locale = detectLocale();
export default TEXTS[locale];
