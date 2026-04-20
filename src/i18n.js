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
    instructionStart:    'Pour redémarrer le robot, presser la touche espace plusieurs fois.',
    instructionContinue: 'Espace pour continuer',
    speechLang:          'fr-FR',
    speechLangPrefix:    'fr',
    dialogueWakeup: [
      { text: "Mais... Où je suis ? ... Que s'est-il passé ?",      speak: true  },
      { text: "Je n'arrive pas à me connecter à mon serveur maitre...", speak: true  },
      { text: "Je pense pouvoir avancer en enchainant ← →",           speak: false },
    ],
    dialogueLeg:     [{ text: "Je peux récupérer la jambe du robot en panne.", speak: true }],
    instructionLeg:  'Appuyer sur ↑ ↓ pour retirer la jambe.',
  },
  en: {
    instructionStart:    'To reboot the robot, press the space key several times',
    instructionContinue: 'Press space to continue',
    speechLang:          'en-US',
    speechLangPrefix:    'en',
    dialogueWakeup: [
      { text: "But... where am I? ... What happened?",              speak: true  },
      { text: "I can't connect to my master server...",             speak: true  },
      { text: "I think I can crawl forward by alternating ← →",    speak: false },
    ],
    dialogueLeg:     [{ text: "I can take the broken robot's leg.", speak: true }],
    instructionLeg:  'Press ↑ ↓ to remove the leg.',
  },
};

function detectLocale() {
  const param = new URLSearchParams(window.location.search).get('locale');
  if (param && TEXTS[param]) return param;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const locale = detectLocale();
export default TEXTS[locale];
