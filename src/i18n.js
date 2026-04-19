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
    instructionStart:    'Presser la touche espace plusieurs fois',
    instructionContinue: 'Presser espace pour continuer',
    speechLang:          'fr-FR',
    speechLangPrefix:    'fr',
    dialogueWakeup: [
      "Mais... Où je suis ? ... Que s'est-il passé ?",
      "Je n'arrive pas à me connecter à mon serveur maitre...",
      "Je pense pouvoir avancer en enchainant ← →",
    ],
  },
  en: {
    instructionStart:    'Press the space key several times',
    instructionContinue: 'Press space to continue',
    speechLang:          'en-US',
    speechLangPrefix:    'en',
    dialogueWakeup: [
      "But... where am I? ... What happened?",
      "I can't connect to my master server...",
      "I think I can crawl forward by alternating ← →",
    ],
  },
};

function detectLocale() {
  const param = new URLSearchParams(window.location.search).get('locale');
  if (param && TEXTS[param]) return param;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const locale = detectLocale();
export default TEXTS[locale];
