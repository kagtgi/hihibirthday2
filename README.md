# 12 Months of Us 💕

An interactive, romantic web experience chronicling a year-long journey through 31 chapters of memories, games, and stories.

## ✨ Features

- **31 Interactive Chapters** - One for each day/month of your journey
- **Dynamic Theming** - Each month has its unique color palette
- **Mini Games** - Collect emojis (hearts, flowers, stars, etc.) to unlock questions
- **Personal Reflections** - Share thoughts, quotes, and memories
- **Beautiful Photo Galleries** - Multiple images per chapter with smooth navigation
- **Romantic Ending** - Photo collage of all your memories

## 🎮 User Experience

Each chapter can have one of two flows:

### Question Type
1. Title card with month
2. Mini-game (collect 5 emojis)
3. Reflection question with multiple choice
4. Reveal showing "her choice" vs "his choice"
5. Personal note (optional)
6. Photo gallery

### Animate Type
1. Title card with month
2. Animated quote (typewriter effect)
3. Personal note (optional)
4. Photo gallery

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:7777` with live reload enabled.

### Customization

1. **Add/Edit Chapters** - Modify JSON files in `description/` folder (1.json through 31.json)
2. **Add Photos** - Place images in `image/` folder
3. **Update Styling** - Edit `style/style.css` for colors, fonts, animations
4. **Change Logic** - Modify `script/main.js` for behavior

## 📁 Project Structure

```
hihibirthday2/
├── index.html              # Main HTML entry point
├── script/
│   └── main.js            # Core application logic (618 lines)
├── style/
│   └── style.css          # Complete styling (890+ lines)
├── description/           # Chapter data
│   ├── 1.json - 31.json  # Individual chapter configurations
├── image/                 # Photo files
│   └── (your images)
├── img/                   # UI assets (favicon, icons)
└── README.md
```

## 📝 Chapter JSON Format

Each chapter follows this structure:

### Question Type Chapter
```json
{
  "id": 1,
  "month": "February 2025",
  "minigameType": "hearts",
  "question": "What was the best part of this month?",
  "answers": {
    "A": "Option A",
    "B": "Option B",
    "C": "Option C",
    "D": "All of them! ✨"
  },
  "key": "D",
  "myNote": "Personal reflection here",
  "caption": "Image caption",
  "image": ["photo1.jpg", "photo2.jpg"]
}
```

### Animate Type Chapter
```json
{
  "id": 11,
  "month": "May 2025",
  "minigameType": "animate",
  "text": "Your quote or message here",
  "question": "",
  "answers": "",
  "key": "",
  "myNote": "Optional note",
  "caption": "Image caption",
  "image": ["photo.jpg"]
}
```

## 🎨 Mini-Game Types

Choose from these emoji collections for your games:

- `hearts` - 💕💗💖💝❤️
- `flowers` - 🌸🌺🌹🌷💐
- `doggo go` - 🐕🐶🦮🐩🐾
- `stars` - ⭐🌟✨💫🌠
- `bubbles` - 🫧💭🔮⭕🌀
- `blockblast` - 🧱🟦🟩🟨🟥
- `pikachu_match` - ⚡🔴🟡💛⭐
- `flappy bird` - 🐦🕊️🦅🐤🪶
- `Love Letter` - 💌💕💖💝❤️
- `Bubble Pop` - 🫧💭🔵🟣⚪
- `animate` - No game, just text animation

## 🎨 Color Themes

Each month has its unique gradient background:

| Month | Theme Color |
|-------|------------|
| February | Pink/Rose |
| March | Green |
| April | Yellow |
| May | Pink |
| June | Blue |
| July | Red |
| August | Cyan |
| September | Orange |
| October | Purple |
| November | Brown |
| December | Indigo |
| January | Light Blue |

## ⚠️ Important: HEIC Images

**If you have HEIC images (iPhone photos), they won't display in most browsers!**

HEIC is only supported in Safari. For Chrome, Firefox, and Edge compatibility, you MUST convert HEIC to JPG.

**See [HEIC_CONVERSION.md](HEIC_CONVERSION.md) for detailed conversion instructions.**

Quick check: This project currently has **13 HEIC images** that need conversion:
- `5.HEIC`, `7.HEIC`, `13.HEIC`, `18.HEIC`, `23.HEIC`, `28.HEIC`, `30.HEIC`
- `37.HEIC`, `39.HEIC`, `41.HEIC`, `42.HEIC`, `43.HEIC`, `51.HEIC`

## 🛠️ Technical Stack

- **HTML5** - Semantic structure
- **Vanilla CSS** - Custom animations, gradients, glassmorphism
- **Vanilla JavaScript (ES6)** - Object-oriented, no frameworks
- **GSAP** - Professional animations library
- **Google Fonts** - Playfair Display & Montserrat

## 🌐 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Mobile Responsive

Fully optimized for mobile devices with:
- Touch-friendly tap interactions
- Responsive typography
- Optimized layouts for small screens
- Smooth animations

## 🎯 Development

### File Watching
The development server automatically reloads when you edit:
- HTML files
- CSS files  
- JavaScript files
- JSON data files

### Adding a New Chapter

1. Create `description/XX.json` (where XX is the chapter number)
2. Add your photos to `image/` folder
3. Follow the JSON format above
4. Reference your image filenames in the JSON

### Customizing Themes

Edit `script/main.js` to modify the `themes` object:

```javascript
this.themes = {
  'February': { 
    bg: 'linear-gradient(135deg, #FFE5E8 0%, #FFB5BA 100%)', 
    primary: '#FF6B7A' 
  },
  // Add more months...
};
```

## 🚀 Deployment

### GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Select main branch
4. Your site will be at `https://yourusername.github.io/repo-name/`

### Other Platforms

This is a static site - deploy to:
- Netlify (drag & drop)
- Vercel
- Firebase Hosting
- Any static hosting service

## 🎁 Gift Button

The final screen includes a "Open Your Real Gift" button. Customize it in `script/main.js`:

```javascript
document.querySelector('.gift-btn').addEventListener('click', () => {
  // Customize this action!
  alert('Quà của em đây! 💕');
});
```

## 📄 License

MIT License - Free to use and modify for your own projects!

## 💕 Credits

Based on the [happy-birthday template](https://github.com/faahim/happy-birthday) by Afiur Rahman Fahim, heavily customized into an interactive romantic journey application.

## 🐛 Known Issues

- HEIC images don't display in Chrome/Firefox (see HEIC_CONVERSION.md)
- Very large images may cause slow loading on mobile

## 🔮 Future Enhancements

Potential improvements:
- [ ] Add background music
- [ ] Video support in galleries
- [ ] Social sharing functionality  
- [ ] Save progress in localStorage
- [ ] Password protection option
- [ ] Custom animations per chapter

---

**Made with 💕 for that special someone**

Enjoy your journey through memories! 🎉
