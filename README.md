# Recess 🎮

> Where AI comes to play

**AI games powered by your own API key. No backend. No signup. No middleman.**

[**🎯 Play Now**](https://recess.com) • [**🚀 Contribute**](#contributing) • [**📖 Docs**](CONTRIBUTING.md)

---

## What is Recess?

Recess is a collection of browser-based games where AI models compete against each other for your entertainment. Think of it as an arcade where instead of quarters, you bring your own API key.

**All day you made AI work for you. Tonight, just watch it play.**

### 🎮 Current Games

| Game | What happens | Players |
|------|-------------|---------|
| **Model Roast** 🔥 | Two models debate a topic across 3 rounds | 2 models |
| **Guess the Model** 🕵️ | Blind responses - guess which AI wrote what | 3-5 models |
| **Roast Me** 😈 | Describe yourself, let AIs roast you | 3 models |
| **Haiku Battle** 🎋 | Models write haikus on the same topic | 4 models |
| **The Therapists** 🛌️ | 5 different therapy styles analyze you | 5 personas |
| **The Advisors** 💼 | Business advice from different perspectives | 4 personas |
| **The Writers Room** ✍️ | Literary legends tackle your prompt | 4 personas |
| **Explain It As** 🎭 | Models explain topics as different characters | 3 personas |
| **Hot Take** 💣 | Models give controversial opinions | 3 models |

---

## 🚀 Quick Start

### Option 1: Play Online
Just visit [recess.com](https://recess.com) - works in any modern browser.

### Option 2: Run Locally
```bash
# Clone the repo
git clone https://github.com/chinmayPatil10/recess.git
cd recess

# Start a local server (choose one):
python -m http.server 8080        # Python
python3 -m http.server 8080       # Python 3
npx serve .                       # Node.js
php -S localhost:8080             # PHP

# Open http://localhost:8080
```

**That's it!** No build step, no npm install, no configuration.

---

## 🔑 How API Keys Work

### Bring Your Own Key (Required)
- **1 API Key**: Persona mode or model family comparisons
- **Multiple Keys**: Cross-provider battles (OpenAI vs Anthropic vs Google)
- Your key goes **directly** from your browser to the provider
- We never see it, store it, or proxy it

### Supported Providers
- **OpenAI**: GPT-4o, GPT-4o mini, GPT-3.5 Turbo
- **Anthropic**: Claude Opus, Sonnet, Haiku  
- **Google**: Gemini Pro, Gemini Flash
- **DeepSeek**: Chat, Reasoner
- **Mistral**: Large, Small

---

## 🛠️ Contributing

We'd love your help building new games! 

### Game Ideas We Want
- **The Philosophers** (Socrates, Nietzsche, Alan Watts, Žižek)
- **The Chefs** (Gordon Ramsay, Julia Child, Salt Bae)
- **The News Desk** (BBC, TMZ, The Onion, Local News)
- **The Lawyers** (Prosecution vs Defense on silly cases)
- **The Critics** (Movie, food, art critics)
- **The Comedians** (Different comedy styles)

### How to Contribute

1. **Fork this repo**
2. **Copy the template**: `GAME_TEMPLATE.html` → `games/your-game.html`
3. **Fill in the blanks**: Look for `// CHANGE THIS` comments
4. **Test it works**: Free mode + with API keys
5. **Add to homepage**: Add your game card to `index.html`
6. **Submit PR**: Use our PR template

**Read the full guide**: [CONTRIBUTING.md](CONTRIBUTING.md)

### Development Rules
- Must work in free mode (no API key)
- Must work with 1 API key
- Use `renderResponse()` for model output
- Include share functionality
- Max 6 panels per game
- No external dependencies

---

## 🏗️ Architecture

### The Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: CSS custom properties + arcade.css
- **AI Client**: Direct fetch() to provider APIs
- **Deployment**: Static files on CDN

### Key Files
```
├── index.html              # Homepage
├── css/arcade.css          # Main stylesheet  
├── js/
│   ├── ai-client.js       # API calling logic
│   ├── key-manager.js     # API key storage
│   ├── nav.js             # Navigation injection
│   └── share-card.js      # Social sharing
├── games/                 # Individual game files
├── GAME_TEMPLATE.html     # Template for new games
└── CONTRIBUTING.md        # Development guide
```

### How Games Work
1. **Setup**: User enters topic + selects models/personas
2. **Execution**: Parallel API calls stream to panels
3. **Voting**: User picks winner or rates responses  
4. **Sharing**: Generate social media card with results

---

## 🔒 Privacy & Security

- **No backend**: Everything runs in your browser
- **No data collection**: No analytics, no tracking, no cookies
- **No proxies**: API keys go directly to providers
- **sessionStorage only**: Keys cleared when you close the tab
- **Open source**: Audit the code yourself

---

## 💰 Cost

### Per-Game Estimates (OpenAI)
- Model Roast (3 rounds): ~$0.004
- Guess the Model (5 answers): ~$0.008  
- Haiku Battle (4 models): ~$0.003
- Full session, all games: ~$0.03

**Most games cost less than a penny to play.**

### Our Costs
- **Server costs**: $0 (static files)
- **API costs**: $0 (you pay directly)
- **Maintenance**: ❤️ (open source)

---

## 🤝 Community

- **Issues**: [Report bugs or request features](https://github.com/chinmayPatil10/recess/issues)
- **Discussions**: [Share ideas and get help](https://github.com/chinmayPatil10/recess/discussions)
- **Twitter**: [@chinmayPatil10](https://twitter.com/chinmayPatil10)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

**TL;DR**: Do whatever you want with this code. Build your own version, sell it, modify it, just keep the license notice.

---

## 🙏 Credits

Built by [@chinmayPatil10](https://github.com/chinmayPatil10)

Special thanks to:
- All the AI providers for their APIs
- The open source community
- Everyone who contributes games and ideas

---

**Ready to play?** → [**recess.com**](https://recess.com) 🎮
