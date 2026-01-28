// ===== 12 Months of Us - Main Application =====
// Loads all 31 chapters from description/*.json

class TwelveMonthsApp {
  constructor() {
    this.chapters = [];
    this.currentChapter = 0;
    this.currentStep = 0;
    this.stepSequence = [];
    this.selectedAnswer = null;
    this.gameCollected = 0;
    this.gameTarget = 5;
    this.gameCompleted = false;
    this.currentGalleryIndex = 0;
    this.allImages = [];
    this.heicWarningShown = false;

    // DOM Elements
    this.app = document.querySelector('.app');
    this.introScreen = document.querySelector('.intro-screen');
    this.chapterScreen = document.querySelector('.chapter-screen');
    this.endingScreen = document.querySelector('.ending-screen');
    this.progressContainer = document.querySelector('.chapter-progress');

    // Steps
    this.titleCard = document.querySelector('.title-card');
    this.quoteStep = document.querySelector('.quote-step');
    this.noteStep = document.querySelector('.note-step');
    this.gameStep = document.querySelector('.game-step');
    this.questionStep = document.querySelector('.question-step');
    this.revealStep = document.querySelector('.reveal-step');
    this.imageStep = document.querySelector('.image-step');

    // Color themes by month
    this.themes = {
      'February': { bg: 'linear-gradient(135deg, #FFE5E8 0%, #FFB5BA 100%)', primary: '#FF6B7A' },
      'March': { bg: 'linear-gradient(135deg, #E8F5E9 0%, #A5D6A7 100%)', primary: '#66BB6A' },
      'April': { bg: 'linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%)', primary: '#FFB300' },
      'May': { bg: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)', primary: '#EC407A' },
      'June': { bg: 'linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)', primary: '#42A5F5' },
      'July': { bg: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)', primary: '#EF5350' },
      'August': { bg: 'linear-gradient(135deg, #E0F7FA 0%, #80DEEA 100%)', primary: '#26C6DA' },
      'September': { bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFCC80 100%)', primary: '#FFA726' },
      'October': { bg: 'linear-gradient(135deg, #F3E5F5 0%, #CE93D8 100%)', primary: '#AB47BC' },
      'November': { bg: 'linear-gradient(135deg, #EFEBE9 0%, #BCAAA4 100%)', primary: '#8D6E63' },
      'December': { bg: 'linear-gradient(135deg, #E8EAF6 0%, #9FA8DA 100%)', primary: '#5C6BC0' },
      'January': { bg: 'linear-gradient(135deg, #E1F5FE 0%, #81D4FA 100%)', primary: '#29B6F6' }
    };

    this.init();
  }

  async init() {
    try {
      await this.loadAllChapters();
      if (this.chapters.length === 0) {
        this.showError('Không thể tải dữ liệu. Vui lòng tải lại trang.');
        return;
      }
      this.setupEventListeners();
      this.updateTotalChapters();
      this.animateIntro();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Đã xảy ra lỗi. Vui lòng tải lại trang.');
    }
  }

  showError(message) {
    const introContent = document.querySelector('.intro-content');
    if (introContent) {
      introContent.innerHTML = `
        <h1 class="intro-title">Oops!</h1>
        <p class="intro-subtitle">${message}</p>
        <button class="start-btn" onclick="location.reload()">Tải Lại</button>
      `;
    }
  }

  async loadAllChapters() {
    const chapterPromises = [];
    for (let i = 1; i <= 31; i++) {
      chapterPromises.push(
        fetch(`description/${i}.json`)
          .then(res => res.json())
          .catch(() => null)
      );
    }
    const results = await Promise.all(chapterPromises);
    this.chapters = results.filter(ch => ch !== null);

    // Collect all images for ending collage
    this.chapters.forEach(ch => {
      if (ch.image && ch.image.length > 0) {
        this.allImages.push(...ch.image);
      }
    });
  }

  setupEventListeners() {
    // Start button
    document.querySelector('.start-btn').addEventListener('click', () => this.startJourney());

    // Title card click
    this.titleCard.addEventListener('click', () => this.advanceStep());

    // Quote step click
    this.quoteStep.addEventListener('click', () => this.advanceStep());

    // Note step click
    this.noteStep.addEventListener('click', () => this.advanceStep());

    // Reveal step click
    this.revealStep.addEventListener('click', () => this.advanceStep());

    // Next chapter button
    document.querySelector('.next-chapter-btn').addEventListener('click', () => this.nextChapter());

    // Gallery navigation
    document.querySelector('.gallery-prev').addEventListener('click', () => this.galleryPrev());
    document.querySelector('.gallery-next').addEventListener('click', () => this.galleryNext());

    // Touch swipe for gallery
    this.setupGallerySwipe();

    // Gift button
    document.querySelector('.gift-btn').addEventListener('click', () => {
      alert('Quà của em đây! 💕');
    });
  }

  setupGallerySwipe() {
    const gallery = document.querySelector('.gallery-wrapper');
    let touchStartX = 0;
    let touchEndX = 0;

    gallery.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    gallery.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleGallerySwipe(touchStartX, touchEndX);
    }, { passive: true });
  }

  handleGallerySwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next image
        this.galleryNext();
      } else {
        // Swipe right - previous image
        this.galleryPrev();
      }
    }
  }

  updateTotalChapters() {
    document.querySelector('.total-chapters').textContent = this.chapters.length;
  }

  animateIntro() {
    gsap.from('.intro-title', {
      opacity: 0,
      y: 30,
      duration: 1,
      delay: 0.3
    });

    gsap.from('.intro-subtitle', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      delay: 0.6
    });

    gsap.from('.intro-hearts .heart', {
      opacity: 0,
      scale: 0,
      duration: 0.5,
      stagger: 0.15,
      delay: 1
    });

    gsap.from('.start-btn', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      delay: 1.5
    });
  }

  startJourney() {
    this.introScreen.classList.remove('active');
    this.chapterScreen.classList.add('active');
    this.progressContainer.classList.add('visible');
    this.loadChapter(0);
  }

  loadChapter(chapterIndex) {
    if (chapterIndex >= this.chapters.length) {
      this.showEnding();
      return;
    }

    this.currentChapter = chapterIndex;
    this.currentStep = 0;
    this.selectedAnswer = null;
    this.gameCollected = 0;
    this.gameCompleted = false;
    this.currentGalleryIndex = 0;

    const chapter = this.chapters[chapterIndex];

    // Update theme based on month
    this.updateTheme(chapter.month);
    this.updateProgress();

    // Populate chapter data
    this.populateChapterData(chapter);

    // Build step sequence based on chapter type
    this.buildStepSequence(chapter);

    // Show first step
    this.showStep(0);
  }

  buildStepSequence(chapter) {
    this.stepSequence = [];

    // Always start with title card
    this.stepSequence.push('title');

    // Check if it's animate type or question type
    const isAnimateType = chapter.minigameType === 'animate' || !chapter.question || chapter.question === '';

    if (isAnimateType) {
      // Animate type: show quote animation
      if (chapter.text && chapter.text !== '') {
        this.stepSequence.push('quote');
      }
      // Show note if exists
      if (chapter.myNote && chapter.myNote !== '') {
        this.stepSequence.push('note');
      }
    } else {
      // Question type: game -> question -> reveal
      this.stepSequence.push('game');
      this.stepSequence.push('question');
      this.stepSequence.push('reveal');
      // Show note if exists
      if (chapter.myNote && chapter.myNote !== '') {
        this.stepSequence.push('note');
      }
    }

    // Always end with image
    this.stepSequence.push('image');
  }

  updateTheme(monthStr) {
    // Extract month name from string like "February 2025"
    const monthName = monthStr.split(' ')[0];
    const theme = this.themes[monthName] || this.themes['February'];

    document.body.style.background = theme.bg;
    document.documentElement.style.setProperty('--primary', theme.primary);
  }

  updateProgress() {
    const progress = ((this.currentChapter + 1) / this.chapters.length) * 100;
    document.querySelector('.current-chapter').textContent = this.currentChapter + 1;
    document.querySelector('.progress-fill').style.width = `${progress}%`;
  }

  populateChapterData(chapter) {
    // Title Card
    document.querySelector('.chapter-number').textContent = this.currentChapter + 1;
    document.querySelector('.chapter-month').textContent = chapter.month;

    // Quote
    document.querySelector('.quote-text').textContent = chapter.text || '';

    // Note
    document.querySelector('.note-text').textContent = chapter.myNote || '';

    // Game text and hint - dynamic based on game type
    document.querySelector('.game-text').textContent = chapter.text || this.getGameText(chapter.minigameType);
    document.querySelector('.game-hint').textContent = this.getGameHint(chapter.minigameType);

    // Question
    document.querySelector('.question-text').textContent = chapter.question || '';
    this.populateAnswers(chapter);

    // Caption
    document.querySelector('.image-caption').textContent = chapter.caption || '';

    // Images
    this.populateGallery(chapter);

    // Update next button text for last chapter
    const nextBtn = document.querySelector('.next-chapter-btn');
    if (this.currentChapter === this.chapters.length - 1) {
      nextBtn.textContent = 'Xem Kết Thúc 💕';
    } else {
      nextBtn.textContent = 'Tiếp Theo →';
    }
  }

  populateAnswers(chapter) {
    const grid = document.querySelector('.answers-grid');
    grid.innerHTML = '';

    if (!chapter.answers || typeof chapter.answers !== 'object') return;

    Object.entries(chapter.answers).forEach(([key, value]) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = value;
      btn.dataset.key = key;
      btn.addEventListener('click', () => this.selectAnswer(btn, key, chapter.key, chapter));
      grid.appendChild(btn);
    });
  }

  populateGallery(chapter) {
    const container = document.querySelector('.gallery-container');
    container.innerHTML = '';
    container.style.transform = 'translateX(0%)';
    this.currentGalleryIndex = 0;

    if (!chapter.image || chapter.image.length === 0) return;

    // Filter out video and HEIC files (not supported in most browsers)
    const validImages = chapter.image.filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    validImages.forEach((imgPath, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'gallery-image-wrapper';

      // Add loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'image-loading-spinner';
      wrapper.appendChild(spinner);

      const img = document.createElement('img');
      img.className = 'gallery-image';
      img.alt = `Memory ${index + 1}`;
      img.style.opacity = '0';

      // Set src after creating element for smoother loading
      img.src = `image/${imgPath}`;

      img.onload = () => {
        spinner.remove();
        // Smooth fade in
        gsap.to(img, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        });
      };

      img.onerror = () => {
        wrapper.style.display = 'none';
        console.warn(`Failed to load image: ${imgPath}`);
      };

      wrapper.appendChild(img);
      container.appendChild(wrapper);
    });

    this.updateGalleryNav(validImages.length);
  }

  updateGalleryNav(total) {
    const counter = document.querySelector('.gallery-counter');
    const prevBtn = document.querySelector('.gallery-prev');
    const nextBtn = document.querySelector('.gallery-next');
    const nav = document.querySelector('.gallery-nav');

    if (total <= 1) {
      nav.style.display = 'none';
    } else {
      nav.style.display = 'flex';
      counter.textContent = `${this.currentGalleryIndex + 1} / ${total}`;
      prevBtn.disabled = this.currentGalleryIndex === 0;
      nextBtn.disabled = this.currentGalleryIndex === total - 1;
    }
  }

  galleryPrev() {
    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (this.currentGalleryIndex > 0) {
      this.currentGalleryIndex--;
      this.slideGallery();
      this.updateGalleryNav(validImages.length);
    }
  }

  galleryNext() {
    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (this.currentGalleryIndex < validImages.length - 1) {
      this.currentGalleryIndex++;
      this.slideGallery();
      this.updateGalleryNav(validImages.length);
    }
  }

  slideGallery() {
    const container = document.querySelector('.gallery-container');
    const offset = -this.currentGalleryIndex * 100;
    container.style.transform = `translateX(${offset}%)`;
  }

  selectAnswer(btn, selectedKey, correctKey, chapter) {
    if (this.selectedAnswer) return;

    this.selectedAnswer = selectedKey;
    btn.classList.add('selected');

    setTimeout(() => {
      const buttons = document.querySelectorAll('.answer-btn');
      buttons.forEach(b => {
        if (b.dataset.key === correctKey) {
          b.classList.add('key-answer');
        }
      });

      this.updateRevealStep(selectedKey, correctKey, chapter);

      setTimeout(() => this.advanceStep(), 1000);
    }, 500);
  }

  updateRevealStep(selectedKey, correctKey, chapter) {
    const herChoiceBox = document.querySelector('.her-choice .choice-box');
    const myChoiceBox = document.querySelector('.my-choice .choice-box');

    herChoiceBox.textContent = chapter.answers[selectedKey] || '';
    myChoiceBox.innerHTML = `${chapter.answers[correctKey] || ''}<span class="heart-icon">💛</span>`;
  }

  getStepElement(stepName) {
    const stepMap = {
      'title': this.titleCard,
      'quote': this.quoteStep,
      'note': this.noteStep,
      'game': this.gameStep,
      'question': this.questionStep,
      'reveal': this.revealStep,
      'image': this.imageStep
    };
    return stepMap[stepName];
  }

  showStep(stepIndex) {
    // Hide all steps
    [this.titleCard, this.quoteStep, this.noteStep, this.gameStep,
    this.questionStep, this.revealStep, this.imageStep].forEach(step => {
      step.classList.remove('active');
    });

    const stepName = this.stepSequence[stepIndex];
    const stepElement = this.getStepElement(stepName);

    if (stepElement) {
      stepElement.classList.add('active');
      this.animateStepEntrance(stepName, stepElement);
    }

    // Special handling
    if (stepName === 'game') {
      this.startGame();
    }

    if (stepName === 'quote') {
      this.animateQuote();
    }

    if (stepName === 'image') {
      this.resetGalleryAnimation();
    }
  }

  animateStepEntrance(stepName, stepElement) {
    gsap.from(stepElement.children, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      stagger: 0.1
    });
  }

  animateQuote() {
    const quoteText = document.querySelector('.quote-text');
    const text = quoteText.textContent;

    // Split into characters
    quoteText.innerHTML = text.split('').map(char =>
      char === ' ' ? ' ' : `<span class="quote-char">${char}</span>`
    ).join('');

    // Animate each character
    gsap.to('.quote-char', {
      opacity: 1,
      duration: 0.03,
      stagger: 0.03,
      ease: 'none'
    });
  }

  resetGalleryAnimation() {
    const images = document.querySelectorAll('.gallery-image');
    images.forEach(img => {
      img.style.animation = 'none';
      setTimeout(() => {
        img.style.animation = 'slowZoom 10s ease-in-out forwards';
      }, 50);
    });
  }

  advanceStep() {
    if (this.currentStep < this.stepSequence.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  }

  nextChapter() {
    gsap.to(this.imageStep, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        this.imageStep.style.opacity = 1;
        this.loadChapter(this.currentChapter + 1);
      }
    });
  }

  // ===== Mini Games =====
  startGame() {
    const chapter = this.chapters[this.currentChapter];

    // Check if this is a Memory Match game
    if (chapter.minigameType === 'memory_match') {
      this.startMemoryMatch();
      return;
    }

    // Check if this is a Greeting animation
    if (chapter.minigameType === 'greeting') {
      this.startGreetingAnimation();
      return;
    }

    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid'); // Clean up from memory match
    this.gameCollected = 0;
    this.gameCompleted = false;
    this.gameTarget = 5; // Easy mode - only 5 items
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    const gameEmojis = this.getGameEmojis(chapter.minigameType);
    const useCssHearts = chapter.minigameType === 'css_hearts';

    // Wait for the CSS transition to complete (0.5s) before spawning elements
    // This ensures the game-step is fully visible and has proper dimensions
    // Using 550ms to give a small buffer after the 500ms transition
    setTimeout(() => {
      // Spawn elements with staggered timing for smoother experience
      for (let i = 0; i < this.gameTarget; i++) {
        setTimeout(() => {
          this.spawnGameElement(gameArea, gameEmojis, progressBar, useCssHearts);
        }, i * 200);
      }
    }, 550);
  }

  // ===== Memory Match Game =====
  startMemoryMatch() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.add('memory-match-grid');
    this.gameCompleted = false;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    // Memory match state
    this.memoryCards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 4; // 4 pairs = 8 cards
    this.isChecking = false;

    // Use images from the project
    const cardImages = [
      'image/1.jpg',
      'image/2.jpg',
      'image/6.jpg',
      'image/10.jpg'
    ];

    // Create pairs and shuffle
    const cards = [...cardImages, ...cardImages];
    this.shuffleArray(cards);

    setTimeout(() => {
      cards.forEach((imgSrc, index) => {
        const card = this.createMemoryCard(imgSrc, index, progressBar);
        gameArea.appendChild(card);
        this.memoryCards.push(card);
      });

      // Animate cards entrance
      gsap.from('.memory-card', {
        scale: 0,
        duration: 0.3,
        stagger: 0.08,
        ease: 'back.out(1.7)'
      });
    }, 550);
  }

  createMemoryCard(imgSrc, index, progressBar) {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.index = index;
    card.dataset.image = imgSrc;

    card.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-card-front">
          <span>💕</span>
        </div>
        <div class="memory-card-back">
          <img src="${imgSrc}" alt="Memory card">
        </div>
      </div>
    `;

    const handleClick = () => {
      if (this.isChecking || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
      }

      // Flip card
      card.classList.add('flipped');
      this.flippedCards.push(card);

      // Play haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);

      // Check for match when 2 cards are flipped
      if (this.flippedCards.length === 2) {
        this.isChecking = true;
        this.checkMemoryMatch(progressBar);
      }
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleClick();
    }, { passive: false });

    return card;
  }

  checkMemoryMatch(progressBar) {
    const [card1, card2] = this.flippedCards;
    const isMatch = card1.dataset.image === card2.dataset.image;

    setTimeout(() => {
      if (isMatch) {
        // Match found!
        card1.classList.add('matched');
        card2.classList.add('matched');
        this.matchedPairs++;

        // Update progress
        const progress = (this.matchedPairs / this.totalPairs) * 100;
        progressBar.style.width = `${progress}%`;

        // Celebration animation
        gsap.to([card1, card2], {
          scale: 1.1,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        });

        // Check win condition
        if (this.matchedPairs >= this.totalPairs && !this.gameCompleted) {
          this.gameCompleted = true;
          progressBar.classList.add('completed');

          gsap.to(progressBar, {
            scale: 1.05,
            duration: 0.2,
            yoyo: true,
            repeat: 1
          });

          setTimeout(() => this.advanceStep(), 800);
        }
      } else {
        // No match - flip back
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
      }

      this.flippedCards = [];
      this.isChecking = false;
    }, 800);
  }

  // ===== Greeting Animation =====
  startGreetingAnimation() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid');
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    // Create greeting container
    const greetingContainer = document.createElement('div');
    greetingContainer.className = 'greeting-container';
    greetingContainer.innerHTML = `
      <div class="greeting-text">Xin chào!</div>
      <div class="greeting-emoji">👋</div>
    `;

    gameArea.appendChild(greetingContainer);

    // Animate the greeting
    setTimeout(() => {
      gsap.fromTo('.greeting-text',
        { opacity: 0, y: 30, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
      );

      gsap.fromTo('.greeting-emoji',
        { opacity: 0, scale: 0, rotation: -45 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.6, delay: 0.4, ease: 'back.out(1.7)' }
      );

      // Waving animation for emoji
      gsap.to('.greeting-emoji', {
        rotation: 20,
        duration: 0.3,
        delay: 1,
        repeat: 3,
        yoyo: true,
        ease: 'power1.inOut'
      });

      // Progress animation
      gsap.to(progressBar, {
        width: '100%',
        duration: 2.5,
        ease: 'power1.inOut',
        onComplete: () => {
          progressBar.classList.add('completed');
          setTimeout(() => this.advanceStep(), 500);
        }
      });
    }, 550);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getGameText(gameType) {
    const gameTexts = {
      'greeting': 'Chào mừng bạn!',
      'hearts': 'Thu thập những trái tim yêu thương',
      'flowers': 'Hái những bông hoa xinh đẹp',
      'bubbles': 'Chạm vào những bong bóng lung linh',
      'stars': 'Thu thập những ngôi sao lấp lánh',
      'doggo go': 'Chơi với những chú cún đáng yêu',
      'blockblast': 'Thu thập những viên đá quý',
      'pikachu_match': 'Bắt những tia sét Pikachu',
      'flappy bird': 'Thu thập những chú chim nhỏ',
      'Love Letter': 'Thu thập những lá thư tình',
      'Bubble Pop': 'Bấm vỡ những bong bóng',
      'sparkles': 'Thu thập những ánh sao',
      'roses': 'Hái những đóa hồng',
      'sweets': 'Thu thập những viên kẹo ngọt',
      'kisses': 'Thu thập những nụ hôn',
      'memory_match': 'Lật thẻ tìm cặp hình giống nhau'
    };
    return gameTexts[gameType] || 'Thu thập các biểu tượng';
  }

  getGameHint(gameType) {
    if (gameType === 'memory_match') {
      return 'Chạm vào thẻ để lật! Tìm các cặp hình giống nhau 🎴';
    }
    if (gameType === 'greeting') {
      return 'Chờ một chút nhé... 💕';
    }
    return 'Chạm vào các biểu tượng để thu thập! 👆';
  }

  getGameEmojis(gameType) {
    const emojiSets = {
      'hearts': ['💕', '💗', '💖', '💝', '❤️'],
      'flowers': ['🌸', '🌺', '🌹', '🌷', '💐'],
      'bubbles': ['🫧', '💭', '🔮', '💜', '💗'],
      'stars': ['⭐', '🌟', '✨', '💫', '🌠'],
      'doggo go': ['🐕', '🐶', '🦮', '🐩', '🐾'],
      'blockblast': ['💎', '💠', '🔷', '🔶', '💗'],
      'pikachu_match': ['⚡', '💛', '🌟', '✨', '⭐'],
      'flappy bird': ['🐦', '🕊️', '💕', '🐤', '🪽'],
      'Love Letter': ['💌', '💕', '💖', '💝', '❤️'],
      'Bubble Pop': ['🫧', '💭', '💜', '💗', '💖'],
      'sparkles': ['✨', '💖', '🌟', '💫', '💕'],
      'roses': ['🌹', '💐', '🌺', '💕', '❤️'],
      'sweets': ['🍬', '🍭', '💖', '🧁', '🍫'],
      'kisses': ['💋', '💕', '💗', '💖', '❤️']
    };
    return emojiSets[gameType] || emojiSets['hearts'];
  }

  spawnGameElement(gameArea, emojis, progressBar, useCssHearts = false) {
    const element = document.createElement('div');
    element.className = 'game-element';

    if (useCssHearts) {
      // Create CSS heart instead of emoji
      element.innerHTML = '<span class="css-heart-game"></span>';
      element.classList.add('css-heart-element');
    } else {
      element.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    }

    // Get dimensions with fallback values if not yet rendered
    const areaWidth = gameArea.offsetWidth || 320;
    const areaHeight = gameArea.offsetHeight || 280;

    // Larger touch area for easier tapping
    const padding = 60;
    const maxX = areaWidth - padding;
    const maxY = areaHeight - padding;
    element.style.left = `${padding/2 + Math.random() * (maxX - padding)}px`;
    element.style.top = `${padding/2 + Math.random() * (maxY - padding)}px`;

    // Support both click and touch
    const handleCollect = (e) => {
      e.preventDefault();
      if (element.classList.contains('collected')) return;

      element.classList.add('collected');
      this.gameCollected++;

      // Play haptic feedback on mobile if available
      if (navigator.vibrate) navigator.vibrate(50);

      const progress = (this.gameCollected / this.gameTarget) * 100;
      progressBar.style.width = `${progress}%`;

      if (this.gameCollected >= this.gameTarget && !this.gameCompleted) {
        this.gameCompleted = true;
        progressBar.classList.add('completed');

        // Celebration animation
        gsap.to(progressBar, {
          scale: 1.05,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        });

        setTimeout(() => this.advanceStep(), 500);
      }
    };

    element.addEventListener('click', handleCollect);
    element.addEventListener('touchstart', handleCollect, { passive: false });

    gsap.from(element, {
      scale: 0,
      duration: 0.3,
      ease: 'back.out(1.7)'
    });

    // Gentle floating animation
    gsap.to(element, {
      y: '+=10',
      duration: 1 + Math.random() * 0.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gameArea.appendChild(element);
  }

  // ===== Ending Experience =====
  showEnding() {
    this.chapterScreen.classList.remove('active');
    this.progressContainer.classList.remove('visible');
    this.endingScreen.classList.add('active');

    this.createCollage();
  }

  createCollage() {
    const container = document.querySelector('.collage-container');
    container.innerHTML = '';

    // Use first valid image from each chapter for collage
    const collageImages = this.chapters
      .filter(ch => ch.image && ch.image.length > 0)
      .map(ch => {
        // Find first valid image in chapter
        const validImg = ch.image.find(img => {
          const ext = img.toLowerCase().split('.').pop();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });
        return validImg;
      })
      .filter(img => img !== undefined)
      .slice(0, 31);

    collageImages.forEach((imgPath, index) => {
      const img = document.createElement('img');
      img.className = 'collage-img';
      img.src = `image/${imgPath}`;
      img.alt = `Memory ${index + 1}`;
      img.loading = 'lazy';
      img.onerror = () => {
        img.style.display = 'none';
        console.warn(`Collage image failed to load: ${imgPath}`);
      };
      container.appendChild(img);
    });

    // Animate collage entrance
    gsap.to('.collage-img', {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      stagger: {
        each: 0.08,
        from: 'random'
      },
      delay: 0.3,
      ease: 'back.out(1.2)'
    });

    // Animate ending content
    gsap.from('.ending-content', {
      opacity: 0,
      y: 30,
      duration: 0.8,
      delay: 2
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TwelveMonthsApp();
});
