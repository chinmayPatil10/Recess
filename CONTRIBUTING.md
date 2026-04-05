# Contributing to AILeela 🎮

Thanks for your interest in contributing! AILeela is designed to be contributor-friendly - you can build a new game in under an hour.

## 🎯 The Bar for a Good Game

Before you start coding, answer these three questions:

1. **What does the user vote on or decide?** (There must be a clear winner/choice moment)
2. **What would someone tweet after playing?** (The output should be shareable)  
3. **Does it work with just 1 API key?** (This is required - no free mode)

If you can't answer all three clearly, rethink the concept.

## 🚀 Quick Start

### Run Locally
```bash
git clone https://github.com/chinmayPatil10/AiLeela.git
cd AiLeela
python -m http.server 8080
# Open http://localhost:8080
```

No npm, no build step, no configuration. Just open `index.html` in a browser.

## 📝 How to Submit a Game

### Step-by-Step Process

1. **Fork this repo** on GitHub
2. **Copy the template**: `GAME_TEMPLATE.html` → `games/your-game-name.html`
3. **Fill in the blanks**: Look for all `// CHANGE THIS` comments
4. **Add to homepage**: Add your game card to the `GAMES` array in `index.html`
5. **Test thoroughly**:
   - ✅ Works with 1 API key (persona mode)
   - ✅ Works with multiple keys
   - ✅ Share card displays correctly
   - ✅ Requires API key (no free mode)
6. **Open a PR** using our pull request template

### Game Card Format
Add your game to the `GAMES` array in `index.html`:

```javascript
{
  id: 'your-game-name',
  num: '10', // Next available number
  name: 'Your Game Name',
  emoji: '🎭',
  mode: 'arena', // or 'vs' for 1v1
  tag: 'Brief description of what happens in your game.',
  diff: 'EASY', diffColor: 'green', // or MEDIUM/HARD
  artBg: 'linear-gradient(135deg, #1a0505 0%, #2d0a0a 100%)',
  models: ['GPT-4o', 'Claude', 'Gemini'], // Suggested models
  href: 'games/your-game-name.html',
}
```

## 🎮 Game Development Rules

### Must-Haves
- ✅ **API key required**: Must have at least 1 API key to play
- ✅ **1 API key support**: Persona mode or model family comparisons
- ✅ **Response rendering**: Use `renderResponse()` from `ai-client.js`
- ✅ **Share functionality**: Implement `ShareCard.show()` on game end
- ✅ **NO_META prompts**: All system prompts must end with `NO_META`
- ✅ **Mobile responsive**: Test on phone screens

### Constraints
- 🚫 **Max 6 panels**: Screen gets cramped beyond that
- 🚫 **No external dependencies**: Only use what's in `arcade.css` + `ai-client.js`
- 🚫 **No build step**: Pure HTML/CSS/JS only

### System Prompts
Always end system prompts with the `NO_META` constant:

```javascript
const systemPrompt = 'You are a helpful assistant who...' + NO_META;
```

This prevents models from adding meta-commentary like "Here's my response:" or "As an AI, I..."

## 🎨 What Makes a Great Game

### The Golden Rules
1. **Screenshot-worthy output**: People should want to share the results
2. **Clear winner moment**: There must be a voting/decision point
3. **Surprising insights**: Reveals something interesting about how models think
4. **Quick to play**: Works in under 2 minutes
5. **Rewarding to replay**: Different topics yield different results

### Game Structure Pattern
Every game follows this flow:
1. **Setup**: User inputs topic/prompt + selects models/personas
2. **Execution**: Parallel API calls stream responses to panels  
3. **Results**: Formatted responses with syntax highlighting
4. **Vote**: User picks winner or rates responses
5. **Share**: Social media card with results

## 💡 Game Ideas We'd Love to See

### High Priority
- **The Philosophers**: Socrates, Nietzsche, Alan Watts, Žižek debate topics
- **The Chefs**: Gordon Ramsay, Julia Child, Salt Bae critique recipes
- **The News Desk**: BBC, TMZ, The Onion, Local News report the same story
- **The Lawyers**: Prosecution vs Defense argue ridiculous cases
- **The Critics**: Movie/food/art critics review the same thing

### Other Ideas
- **The Comedians**: Different comedy styles (standup, roast, dad jokes)
- **The Historians**: Different eras explain modern phenomena  
- **The Scientists**: Explain concepts at different education levels
- **The Politicians**: Campaign speeches on absurd topics
- **The Influencers**: Social media personalities react to trends

### Have an Idea But Don't Want to Code?
Open an issue with the `game-idea` template and we'll find someone to build it!

## 🛠️ Technical Details

### Key Functions You'll Use
```javascript
// Build model/persona selector UI
buildModelSelector(container, options)

// Stream model response to a panel
streamToPanel(modelSpec, messages, panelElement, containerElement)

// Format model output with syntax highlighting
renderResponse(text, panelElement)

// Show social sharing card
ShareCard.show({ game, headline, body, tweetText })
```

### CSS Classes Available
- **Layout**: `.game-container`, `.game-header`, `.game-setup`, `.game-area`
- **Panels**: `.panel-header`, `.panel-content`, `.panel-thinking`
- **Buttons**: `.arcade-btn-primary`, `.arcade-btn-ghost`, `.preset-btn`
- **Inputs**: `.arcade-input`, `.setup-label`, `.setup-group`
- **States**: `.vote-mode`, `.winner`, `.loading`

### Panel Color Palette
```css
--bg: #08080a     /* Main background */
--bg2: #0f0f11    /* Panel background */  
--bg3: #16161a    /* Hover background */
--accent: #f0e040 /* Yellow accent */
--text: #e8e8ea   /* Main text */
--muted: #a8a8aa  /* Secondary text */
--dim: #2a2a2e    /* Borders */
```

### Responsive Design
- Panels stack vertically on mobile
- Use `@media (max-width: 768px)` for mobile styles
- Test on actual devices, not just browser dev tools

## 🧪 Testing Your Game

### Test Checklist
- [ ] **API key required**: Properly blocks access without API key
- [ ] **Single key**: Works with just OpenAI key (persona mode)
- [ ] **Multi-key**: Works with multiple provider keys
- [ ] **Mobile**: Responsive on phone screens
- [ ] **Share card**: Displays correctly with real content
- [ ] **Error handling**: Graceful failures when API calls fail
- [ ] **Loading states**: Shows thinking animation while streaming
- [ ] **Vote UI**: Clear winner selection and confirmation

### Common Issues
- **CORS errors**: Make sure you're testing on a local server, not file://
- **API key not found**: Check `KeyManager.guardPage()` is called
- **Panels not streaming**: Verify `streamToPanel()` parameters
- **Share card broken**: Ensure all required fields are provided

## 📋 PR Requirements

When you submit your pull request, make sure:

- [ ] Copied from `GAME_TEMPLATE.html`
- [ ] All `// CHANGE THIS` sections updated
- [ ] Requires API key (blocks access without key)
- [ ] Works with 1 API key (tested with real key)
- [ ] Uses `renderResponse()` for all model output
- [ ] Share card implemented and tested
- [ ] Game card added to `index.html` grid
- [ ] `NO_META` added to all system prompts
- [ ] Tested in Chrome and Firefox
- [ ] Screenshot included in PR description

## 🤝 Code Review Process

1. **Automated checks**: GitHub Actions will test basic functionality
2. **Manual review**: Maintainer will test the game and provide feedback
3. **Iteration**: Address any requested changes
4. **Merge**: Once approved, your game goes live!

## 🎉 After Your Game is Merged

- Your game will be live on [aileela.com](https://aileela.com)
- You'll be credited in the README
- Share it on social media! Tag us [@chinmayPatil10](https://twitter.com/chinmayPatil10)

## ❓ Need Help?

- **Bug reports**: [Open an issue](https://github.com/chinmayPatil10/AiLeela/issues)
- **Questions**: [Start a discussion](https://github.com/chinmayPatil10/AiLeela/discussions)
- **Quick help**: Comment on your PR and we'll respond quickly

---

**Ready to build?** Copy `GAME_TEMPLATE.html` and start coding! 🚀
