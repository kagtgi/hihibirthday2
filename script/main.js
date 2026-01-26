// ===== 12 Months of Us - Main Application =====

class TwelveMonthsApp {
  constructor() {
    this.data = null;
    this.currentMonth = 0;
    this.currentStep = 0;
    this.selectedAnswer = null;
    this.gameCollected = 0;
    this.gameTarget = 5;

    // DOM Elements
    this.app = document.querySelector('.app');
    this.introScreen = document.querySelector('.intro-screen');
    this.monthScreen = document.querySelector('.month-screen');
    this.endingScreen = document.querySelector('.ending-screen');
    this.progressContainer = document.querySelector('.month-progress');

    // Steps
    this.titleCard = document.querySelector('.title-card');
    this.gameStep = document.querySelector('.game-step');
    this.questionStep = document.querySelector('.question-step');
    this.revealStep = document.querySelector('.reveal-step');
    this.imageStep = document.querySelector('.image-step');

    this.steps = [this.titleCard, this.gameStep, this.questionStep, this.revealStep, this.imageStep];

    this.init();
  }

  async init() {
    try {
      const response = await fetch('months.json');
      this.data = await response.json();
      this.setupEventListeners();
      this.createProgressDots();
      this.animateIntro();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    // Start button
    document.querySelector('.start-btn').addEventListener('click', () => this.startJourney());

    // Title card click
    this.titleCard.addEventListener('click', () => this.nextStep());

    // Reveal step click
    this.revealStep.addEventListener('click', () => this.nextStep());

    // Next month button
    document.querySelector('.next-month-btn').addEventListener('click', () => this.nextMonth());

    // Gift button
    document.querySelector('.gift-btn').addEventListener('click', () => {
      if (this.data.ending.buttonLink && this.data.ending.buttonLink !== '#gift') {
        window.location.href = this.data.ending.buttonLink;
      }
    });
  }

  createProgressDots() {
    const dotsContainer = document.querySelector('.progress-dots');
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.month = i;
      dotsContainer.appendChild(dot);
    }
  }

  updateProgressDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('current', 'completed');
      if (index < this.currentMonth) {
        dot.classList.add('completed');
      } else if (index === this.currentMonth) {
        dot.classList.add('current');
      }
    });
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
    this.monthScreen.classList.add('active');
    this.progressContainer.classList.add('visible');
    this.loadMonth(0);
  }

  loadMonth(monthIndex) {
    if (monthIndex >= this.data.months.length) {
      this.showEnding();
      return;
    }

    this.currentMonth = monthIndex;
    this.currentStep = 0;
    this.selectedAnswer = null;
    this.gameCollected = 0;

    const month = this.data.months[monthIndex];
    const theme = this.data.themes[month.id];

    // Update theme
    this.updateTheme(theme);
    this.updateProgressDots();

    // Populate month data
    this.populateMonthData(month);

    // Show first step
    this.showStep(0);
  }

  updateTheme(theme) {
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--secondary', theme.secondary);
    document.body.style.background = theme.bg;
  }

  populateMonthData(month) {
    // Title Card
    document.querySelector('.month-number').textContent = month.id;
    document.querySelector('.month-name').textContent = `${month.name} ${month.year}`;
    document.querySelector('.month-title').textContent = month.titleCard;

    // Game
    document.querySelector('.game-text').textContent = month.gameText;

    // Question
    document.querySelector('.question-text').textContent = month.question;
    this.populateAnswers(month);

    // Image
    document.querySelector('.reveal-image').src = `image/${month.image}`;
    document.querySelector('.image-caption').textContent = month.caption;

    // Update next button text for last month
    const nextBtn = document.querySelector('.next-month-btn');
    if (this.currentMonth === this.data.months.length - 1) {
      nextBtn.textContent = 'Xem Kết Thúc 💕';
    } else {
      nextBtn.textContent = 'Tháng Tiếp Theo →';
    }
  }

  populateAnswers(month) {
    const grid = document.querySelector('.answers-grid');
    grid.innerHTML = '';

    Object.entries(month.answers).forEach(([key, value]) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = value;
      btn.dataset.key = key;
      btn.addEventListener('click', () => this.selectAnswer(btn, key, month.key));
      grid.appendChild(btn);
    });
  }

  selectAnswer(btn, selectedKey, correctKey) {
    if (this.selectedAnswer) return; // Already selected

    this.selectedAnswer = selectedKey;

    // Mark selected
    btn.classList.add('selected');

    // Show key answer after a short delay
    setTimeout(() => {
      const buttons = document.querySelectorAll('.answer-btn');
      buttons.forEach(b => {
        if (b.dataset.key === correctKey) {
          b.classList.add('key-answer');
        }
      });

      // Update reveal step
      this.updateRevealStep(selectedKey, correctKey);

      // Move to next step after delay
      setTimeout(() => this.nextStep(), 1200);
    }, 500);
  }

  updateRevealStep(selectedKey, correctKey) {
    const month = this.data.months[this.currentMonth];

    const herChoiceBox = document.querySelector('.her-choice .choice-box');
    const myChoiceBox = document.querySelector('.my-choice .choice-box');

    herChoiceBox.innerHTML = month.answers[selectedKey];
    myChoiceBox.innerHTML = `${month.answers[correctKey]}<span class="heart-icon">💛</span>`;
  }

  showStep(stepIndex) {
    // Hide all steps
    this.steps.forEach(step => step.classList.remove('active'));

    // Show current step
    this.steps[stepIndex].classList.add('active');

    // Animate step entrance
    this.animateStepEntrance(stepIndex);

    // Special handling for game step
    if (stepIndex === 1) {
      this.startGame();
    }

    // Reset image animation for image step
    if (stepIndex === 4) {
      const img = document.querySelector('.reveal-image');
      img.style.animation = 'none';
      setTimeout(() => {
        img.style.animation = 'slowZoom 10s ease-in-out forwards';
      }, 50);
    }
  }

  animateStepEntrance(stepIndex) {
    const step = this.steps[stepIndex];

    gsap.from(step.children, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      stagger: 0.1
    });
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  }

  nextMonth() {
    // Animate out current step
    gsap.to(this.imageStep, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        this.imageStep.classList.remove('active');
        this.loadMonth(this.currentMonth + 1);
      }
    });
  }

  // ===== Mini Games =====
  startGame() {
    const month = this.data.months[this.currentMonth];
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.progress-bar');

    gameArea.innerHTML = '';
    this.gameCollected = 0;
    progressBar.style.width = '0%';

    const gameEmojis = this.getGameEmojis(month.gameType);

    // Spawn game elements
    for (let i = 0; i < this.gameTarget; i++) {
      setTimeout(() => {
        this.spawnGameElement(gameArea, gameEmojis, progressBar);
      }, i * 400);
    }
  }

  getGameEmojis(gameType) {
    const emojiSets = {
      hearts: ['💕', '💗', '💖', '💝', '❤️'],
      flowers: ['🌸', '🌺', '🌹', '🌷', '💐'],
      bubbles: ['🫧', '💭', '🔮', '⭕', '🌀'],
      stars: ['⭐', '🌟', '✨', '💫', '🌠']
    };
    return emojiSets[gameType] || emojiSets.hearts;
  }

  spawnGameElement(gameArea, emojis, progressBar) {
    const element = document.createElement('div');
    element.className = 'game-element';
    element.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    // Random position
    const maxX = gameArea.offsetWidth - 50;
    const maxY = gameArea.offsetHeight - 50;
    element.style.left = `${Math.random() * maxX}px`;
    element.style.top = `${Math.random() * maxY}px`;

    // Click handler
    element.addEventListener('click', () => {
      if (element.classList.contains('collected')) return;

      element.classList.add('collected');
      this.gameCollected++;

      // Update progress
      const progress = (this.gameCollected / this.gameTarget) * 100;
      progressBar.style.width = `${progress}%`;

      // Check if game complete
      if (this.gameCollected >= this.gameTarget) {
        setTimeout(() => this.nextStep(), 500);
      }
    });

    // Animate entrance
    gsap.from(element, {
      scale: 0,
      duration: 0.4,
      ease: 'back.out(1.7)'
    });

    // Float animation
    gsap.to(element, {
      y: '+=15',
      duration: 1 + Math.random(),
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gameArea.appendChild(element);
  }

  // ===== Ending Experience =====
  showEnding() {
    this.monthScreen.classList.remove('active');
    this.progressContainer.classList.remove('visible');
    this.endingScreen.classList.add('active');

    // Populate ending content
    document.querySelector('.ending-message').textContent = this.data.ending.message;
    document.querySelector('.gift-btn').textContent = this.data.ending.buttonText;

    // Create collage
    this.createCollage();
  }

  createCollage() {
    const container = document.querySelector('.collage-container');
    container.innerHTML = '';

    this.data.months.forEach((month, index) => {
      const img = document.createElement('img');
      img.className = 'collage-img';
      img.src = `image/${month.image}`;
      img.alt = month.name;
      container.appendChild(img);
    });

    // Animate collage entrance
    const images = document.querySelectorAll('.collage-img');
    gsap.to(images, {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 0.5,
      stagger: {
        each: 0.1,
        from: 'random'
      },
      delay: 0.3,
      ease: 'back.out(1.4)'
    });

    // Animate ending content
    gsap.from('.ending-content', {
      opacity: 0,
      y: 30,
      duration: 0.8,
      delay: 1.5
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TwelveMonthsApp();
});
