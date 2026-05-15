# ConvoQuest - AI Puzzle Game

An AI-powered historical figure guessing game and turtle soup puzzle game built with vanilla JavaScript and Express.js backend.

## Project Structure

```
ConvoQuest/
├── server.js              # Express backend with OpenAI-compatible API proxy
├── package.json           # Dependencies (express)
├── public/
│   ├── index.html         # Multi-screen UI (welcome, mode-selection, game screens)
│   ├── css/style.css      # Styling
│   └── js/
│       ├── app.js         # Entry point, event binding, screen routing
│       ├── game-state.js  # Central state management (GameState object)
│       ├── prompts.js     # Historical figure game prompts
│       ├── turtle-prompts.js # Turtle soup game prompts
│       ├── ai-host-mode.js   # AI hosts, player guesses
│       ├── ai-guess-mode.js  # Player hosts, AI guesses
│       ├── turtle-soup.js    # Turtle soup modes
│       ├── api.js          # API communication layer
│       └── ui.js           # UI helper functions
└── .claude/
    ├── agents/            # Custom agents for game development
    └── skills/            # Workflow skills
```

## Game Modes

### 猜历史人物 (Guess Historical Figure)
- **AI 出题**: AI selects a figure, gives hints, player guesses
- **AI 来猜**: Player thinks of a figure, AI asks questions to guess

### 海龟汤 (Turtle Soup)
- **AI 出题**: AI presents a puzzle surface, player asks yes/no questions
- **AI 来猜**: Player provides puzzle surface, AI tries to solve it

## Architecture

### Frontend
- Vanilla HTML/CSS/JS (no framework)
- Multi-screen layout with CSS transitions
- SSE streaming for AI responses
- Two-column game layout (sidebar + chat area)

### Backend
- Express.js server on port 3000
- `/api/chat` endpoint proxies to AI providers
- Built-in GLM model support (embedded API key for quick start)
- Support for: DeepSeek, OpenAI, Qwen, Kimi, custom APIs

### State Management
- `GameState` object tracks all game state
- Sub-states: `host`, `guess`, `turtle`
- Fields: secretFigure, hints, guesses, portrait, qaHistory, confidence

## Running the Project

```bash
npm install
npm start
# Open http://localhost:3000
```

## Adding New Game Modes

See `.claude/skills/add-game-mode/SKILL.md` for the workflow.

## Development Agents

- `game-designer`: Design new game mechanics and modes
- `prompt-engineer`: Optimize AI prompts and responses
- `web-ui-specialist`: Frontend styling and components
- `backend-developer`: API and server modifications
- `qa-tester`: Testing and bug verification

## Code Style

- No comments unless explaining non-obvious constraints
- Functions named by what they do
- Keep files focused - one responsibility per module
- Prefer direct edits over new abstractions