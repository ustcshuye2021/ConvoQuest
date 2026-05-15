/* Game State Management */

const GameState = {
  screen: 'welcome',
  apiKey: '',           // User-provided key (for custom models)
  model: 'glm-5.1',    // Default to GLM-5.1 (built-in)
  customBaseUrl: '',    // Custom API base URL (for custom models)
  useBuiltIn: true,     // Using built-in model (no user key needed)
  mode: null,
  gameType: 'history', // 'history' or 'turtle'
  difficulty: null,

  host: {
    secretFigure: null,
    preparedHints: [],
    hintsRevealed: 0,
    guessesUsed: 0,
    guessedFigures: [],
    questionsAsked: 0,
    gameOver: false,
    won: false,
    // Scoring
    score: 100,
    baseScore: 100,
    // Blind guesses: easy=1, medium=3, hard=5
    blindGuessesTotal: 0,
    blindGuessesLeft: 0,
    // Portrait
    portrait: {},
    qaHistory: []
  },

  guess: {
    confirmed: [],
    ruledOut: [],
    topCandidates: [],
    portrait: {},
    confidence: 0,
    questionsAsked: 0,
    questionsHistory: [],
    guessesUsed: 0,
    gameOver: false,
    won: false,
    // New tracking fields
    playerHintUsed: false,       // has player given AI a hint?
    lastActionWasGuess: false,   // prevent consecutive guesses
    qaHistory: []                // [{question: "1. xxx?", answer: "是"}]
  },

  turtle: {
    puzzle: null,
    surface: '',
    hintsRevealed: 0,
    questionsAsked: 0,
    guessesUsed: 0,
    gameOver: false,
    won: false,
    // AI guess mode
    confirmed: [],
    ruledOut: [],
    keyInsights: [],
    confidence: 0,
    // Player guess mode - known info tracking
    knownInfo: [], // [{question: "...", answer: "是/否/无关"}]
    lastQuestion: ''
  },

  messages: [],

  reset() {
    this.mode = null;
    this.difficulty = null;
    this.host = {
      secretFigure: null, preparedHints: [], hintsRevealed: 0,
      guessesUsed: 0, guessedFigures: [], questionsAsked: 0,
      gameOver: false, won: false,
      score: 100, baseScore: 100,
      blindGuessesTotal: 0, blindGuessesLeft: 0,
      portrait: {}, qaHistory: []
    };
    this.guess = {
      confirmed: [], ruledOut: [], topCandidates: [], portrait: {},
      confidence: 0, questionsAsked: 0, questionsHistory: [],
      guessesUsed: 0, gameOver: false, won: false,
      playerHintUsed: false, lastActionWasGuess: false, qaHistory: []
    };
    this.turtle = {
      puzzle: null, surface: '', hintsRevealed: 0,
      questionsAsked: 0, guessesUsed: 0,
      gameOver: false, won: false,
      confirmed: [], ruledOut: [], keyInsights: [], confidence: 0,
      knownInfo: [], lastQuestion: ''
    };
    this.messages = [];
  },

  resetFull() {
    this.reset();
    this.apiKey = '';
  },

  getMaxHints() {
    return this.difficulty === 'easy' ? 6 : 8;
  },

  getBlindGuesses() {
    // easy=1, medium=3, hard=5
    const map = { easy: 1, medium: 3, hard: 5 };
    return map[this.difficulty] || 1;
  }
};
