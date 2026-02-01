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

    // Prevent double advance
    this.isAdvancing = false;
    this.advanceDebounceTime = 300;

    // Timing controls - prevent skipping before content is viewed
    this.canAdvance = true;
    this.quoteAnimationComplete = false;
    this.minViewingTimeMs = 1500; // Minimum time to view any step

    // Gallery swipe controls - prevent swiping before image displays
    this.galleryImageLoaded = [];  // Track which images have loaded
    this.gallerySwiping = false;   // Prevent rapid swiping
    this.gallerySwipeCooldown = 400; // ms between swipes

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
    // Helper function to add both click and touch handlers
    const addClickAndTouch = (element, handler) => {
      let lastEventTime = 0;
      const wrappedHandler = (e) => {
        // Prevent double-trigger from touch + click
        const now = Date.now();
        if (now - lastEventTime < 100) return;
        lastEventTime = now;
        handler(e);
      };
      element.addEventListener('click', wrappedHandler);
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        wrappedHandler(e);
      }, { passive: false });
    };

    // Start button
    addClickAndTouch(document.querySelector('.start-btn'), () => this.startJourney());

    // Title card click/touch
    addClickAndTouch(this.titleCard, () => this.advanceStep());

    // Quote step click/touch
    addClickAndTouch(this.quoteStep, () => this.advanceStep());

    // Note step click/touch
    addClickAndTouch(this.noteStep, () => this.advanceStep());

    // Game step click/touch (after game completion)
    addClickAndTouch(this.gameStep, (e) => {
      // Only advance if game is complete AND not clicking on game elements
      if (this.gameCompleted && !e.target.closest('.game-element') && !e.target.closest('.memory-card')) {
        this.advanceStep();
      }
    });

    // Question step click/touch (after answer is selected and revealed)
    addClickAndTouch(this.questionStep, (e) => {
      // Only advance if answer is selected AND not clicking on answer buttons
      if (this.selectedAnswer && !e.target.closest('.answer-btn')) {
        this.advanceStep();
      }
    });

    // Reveal step click/touch
    addClickAndTouch(this.revealStep, () => this.advanceStep());

    // Next chapter button
    addClickAndTouch(document.querySelector('.next-chapter-btn'), () => this.nextChapter());

    // Gallery navigation
    addClickAndTouch(document.querySelector('.gallery-prev'), () => this.galleryPrev());
    addClickAndTouch(document.querySelector('.gallery-next'), () => this.galleryNext());

    // Mouse drag and touch swipe for gallery
    this.setupGalleryInteractions();

    // Keyboard navigation
    this.setupKeyboardNavigation();

    // Gift button
    addClickAndTouch(document.querySelector('.gift-btn'), () => {
      alert('Quà của em đây! 💕');
    });
  }

  setupGalleryInteractions() {
    const gallery = document.querySelector('.gallery-wrapper');
    let startX = 0;
    let isDragging = false;

    // Mouse drag for desktop
    gallery.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      gallery.style.cursor = 'grabbing';
    });

    gallery.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
    });

    gallery.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      gallery.style.cursor = 'grab';
      this.handleGalleryDrag(startX, e.clientX);
    });

    gallery.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        gallery.style.cursor = 'grab';
      }
    });

    // Touch swipe for touch devices
    gallery.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].screenX;
    }, { passive: true });

    gallery.addEventListener('touchend', (e) => {
      this.handleGalleryDrag(startX, e.changedTouches[0].screenX);
    }, { passive: true });
  }

  handleGalleryDrag(startX, endX) {
    // Lowered threshold for more responsive swipes (from 50 to 30)
    const threshold = 30;
    const diff = startX - endX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        this.galleryNext();
      } else {
        this.galleryPrev();
      }
    }
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Get current active screen
      const introActive = this.introScreen.classList.contains('active');
      const chapterActive = this.chapterScreen.classList.contains('active');
      const endingActive = this.endingScreen.classList.contains('active');

      // Intro screen - Enter or Space to start
      if (introActive) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.startJourney();
        }
        return;
      }

      // Chapter screen navigation
      if (chapterActive) {
        const currentStepName = this.stepSequence[this.currentStep];

        // Space or Enter to advance step
        if (e.key === 'Enter' || e.key === ' ') {
          if (['title', 'quote', 'note', 'reveal'].includes(currentStepName)) {
            e.preventDefault();
            this.advanceStep();
          }
          // Allow advancing game step only after game is completed
          if (currentStepName === 'game' && this.gameCompleted) {
            e.preventDefault();
            this.advanceStep();
          }
          // Allow advancing question step only after answer is selected
          if (currentStepName === 'question' && this.selectedAnswer && this.canAdvance) {
            e.preventDefault();
            this.advanceStep();
          }
        }

        // Arrow keys for gallery
        if (currentStepName === 'image') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.galleryPrev();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.galleryNext();
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.nextChapter();
          }
        }

        // Number keys for answers (1-4)
        if (currentStepName === 'question' && !this.selectedAnswer) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= 4) {
            const buttons = document.querySelectorAll('.answer-btn');
            if (buttons[num - 1]) {
              buttons[num - 1].click();
            }
          }
        }
      }

      // Ending screen
      if (endingActive) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.querySelector('.gift-btn').click();
        }
      }
    });
  }

  updateTotalChapters() {
    document.querySelector('.total-chapters').textContent = this.chapters.length;
  }

  animateIntro() {
    // Optimized intro animations - faster durations, smoother easing
    gsap.from('.intro-title', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: 0.15,
      ease: 'power2.out'
    });

    gsap.from('.intro-subtitle', {
      opacity: 0,
      y: 15,
      duration: 0.5,
      delay: 0.35,
      ease: 'power2.out'
    });

    gsap.from('.intro-hearts .heart', {
      opacity: 0,
      scale: 0,
      duration: 0.35,
      stagger: 0.08,
      delay: 0.55,
      ease: 'back.out(1.5)'
    });

    gsap.from('.start-btn', {
      opacity: 0,
      y: 15,
      duration: 0.5,
      delay: 0.85,
      ease: 'power2.out'
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

      // Add both click and touch handlers with debounce
      let lastTapTime = 0;
      const handleSelect = (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - lastTapTime < 100) return;
        lastTapTime = now;
        this.selectAnswer(btn, key, chapter.key, chapter);
      };

      btn.addEventListener('click', handleSelect);
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(e);
      }, { passive: false });

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

    // Reset image loaded tracking and swipe state
    this.galleryImageLoaded = new Array(validImages.length).fill(false);
    this.gallerySwiping = false;

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
        // Mark this image as loaded
        this.galleryImageLoaded[index] = true;
        // Optimized fade in - faster, GPU accelerated
        gsap.to(img, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          force3D: true
        });
        // When first image loads, start preloading next images
        if (index === 0) {
          this.preloadAdjacentImages();
        }
      };

      img.onerror = () => {
        wrapper.style.display = 'none';
        // Mark as "loaded" so it doesn't block navigation
        this.galleryImageLoaded[index] = true;
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
    const swipeHint = document.querySelector('.swipe-hint');
    const nextChapterBtn = document.querySelector('.next-chapter-btn');

    if (total <= 1) {
      // Hide navigation and swipe hint when only 1 image
      nav.style.display = 'none';
      if (swipeHint) swipeHint.style.display = 'none';
      // Single image - show continue button immediately
      if (nextChapterBtn) {
        nextChapterBtn.style.opacity = '1';
        nextChapterBtn.style.pointerEvents = 'auto';
      }
    } else {
      // Show navigation and swipe hint when multiple images
      nav.style.display = 'flex';
      if (swipeHint) swipeHint.style.display = 'block';
      counter.textContent = `${this.currentGalleryIndex + 1} / ${total}`;
      prevBtn.disabled = this.currentGalleryIndex === 0;
      nextBtn.disabled = this.currentGalleryIndex === total - 1;

      // Update swipe hint based on position
      if (swipeHint) {
        if (this.currentGalleryIndex < total - 1) {
          swipeHint.textContent = `← Vuốt để xem thêm ${total - this.currentGalleryIndex - 1} ảnh →`;
          swipeHint.classList.add('has-more');
        } else {
          swipeHint.textContent = 'Đã xem hết ảnh';
          swipeHint.classList.remove('has-more');
        }
      }

      // Show continue button more prominently after viewing all images
      if (nextChapterBtn) {
        if (this.currentGalleryIndex >= total - 1) {
          nextChapterBtn.style.opacity = '1';
          nextChapterBtn.style.pointerEvents = 'auto';
          // Pulse animation to draw attention
          gsap.to(nextChapterBtn, {
            scale: 1.05,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut'
          });
        } else {
          // Still visible but less prominent until all images viewed
          nextChapterBtn.style.opacity = '0.6';
          nextChapterBtn.style.pointerEvents = 'auto';
        }
      }
    }
  }

  galleryPrev() {
    // Prevent rapid swiping
    if (this.gallerySwiping) return;

    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    const targetIndex = this.currentGalleryIndex - 1;
    if (targetIndex < 0) return;

    // Check if target image has loaded, or wait briefly
    if (!this.galleryImageLoaded[targetIndex]) {
      // Image not loaded yet, wait a bit and try again
      setTimeout(() => this.galleryPrev(), 100);
      return;
    }

    this.gallerySwiping = true;
    this.currentGalleryIndex = targetIndex;
    this.slideGallery();
    this.updateGalleryNav(validImages.length);

    // Reset swipe cooldown
    setTimeout(() => {
      this.gallerySwiping = false;
    }, this.gallerySwipeCooldown);
  }

  galleryNext() {
    // Prevent rapid swiping
    if (this.gallerySwiping) return;

    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    const targetIndex = this.currentGalleryIndex + 1;
    if (targetIndex >= validImages.length) return;

    // Check if target image has loaded, or wait briefly
    if (!this.galleryImageLoaded[targetIndex]) {
      // Image not loaded yet, wait a bit and try again
      setTimeout(() => this.galleryNext(), 100);
      return;
    }

    this.gallerySwiping = true;
    this.currentGalleryIndex = targetIndex;
    this.slideGallery();
    this.updateGalleryNav(validImages.length);

    // Reset swipe cooldown
    setTimeout(() => {
      this.gallerySwiping = false;
    }, this.gallerySwipeCooldown);
  }

  slideGallery() {
    const container = document.querySelector('.gallery-container');
    const offset = -this.currentGalleryIndex * 100;
    container.style.transform = `translateX(${offset}%)`;

    // Preload adjacent images for smoother experience
    this.preloadAdjacentImages();
  }

  preloadAdjacentImages() {
    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    // Preload next 2 images
    for (let i = 1; i <= 2; i++) {
      const nextIndex = this.currentGalleryIndex + i;
      if (nextIndex < validImages.length && !this.galleryImageLoaded[nextIndex]) {
        const preloadImg = new Image();
        preloadImg.src = `image/${validImages[nextIndex]}`;
      }
    }
  }

  selectAnswer(btn, selectedKey, correctKey, chapter) {
    if (this.selectedAnswer) return;

    this.selectedAnswer = selectedKey;
    btn.classList.add('selected');

    // Animate selection feedback
    gsap.to(btn, {
      scale: 1.02,
      duration: 0.2,
      ease: 'power2.out'
    });

    // Show correct answer after user selects
    setTimeout(() => {
      const buttons = document.querySelectorAll('.answer-btn');
      buttons.forEach(b => {
        if (b.dataset.key === correctKey) {
          b.classList.add('key-answer');
          // Highlight correct answer with animation
          gsap.fromTo(b,
            { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0)' },
            { boxShadow: '0 0 20px 5px rgba(255, 215, 0, 0.5)', duration: 0.4, ease: 'power2.out' }
          );
        }
      });

      this.updateRevealStep(selectedKey, correctKey, chapter);

      // Allow time to see correct answer, then wait for user tap
      setTimeout(() => {
        this.canAdvance = true;
        this.showReadyToAdvance('question');
      }, 1800);
    }, 600);
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
    // Hide all steps and clean up tap hints
    [this.titleCard, this.quoteStep, this.noteStep, this.gameStep,
    this.questionStep, this.revealStep, this.imageStep].forEach(step => {
      step.classList.remove('active');
      // Remove any existing tap hints
      const hint = step.querySelector('.tap-hint');
      if (hint) hint.remove();
    });

    const stepName = this.stepSequence[stepIndex];
    const stepElement = this.getStepElement(stepName);

    if (stepElement) {
      stepElement.classList.add('active');
      this.animateStepEntrance(stepName, stepElement);
    }

    // Set up advance timing based on step type
    this.setupStepTiming(stepName);

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

  setupStepTiming(stepName) {
    // Different steps have different minimum viewing times
    this.canAdvance = false;

    const timings = {
      'title': 1000,    // Title card - allow time to see chapter info
      'quote': 0,       // Quote - handled by animation completion
      'note': 2500,     // Note - needs time to read the message
      'reveal': 3000,   // Reveal - needs time to compare answers
      'image': 1200,    // Image - wait for images to load and display
      'game': 0,        // Game - controlled by game completion
      'question': 0     // Question - controlled by answer selection
    };

    const delay = timings[stepName] || this.minViewingTimeMs;

    if (delay > 0) {
      setTimeout(() => {
        this.canAdvance = true;
        this.showReadyToAdvance(stepName);
      }, delay);
    }
    // For game, question, and quote - canAdvance is set by their completion handlers
    // Do NOT set canAdvance = true here for these steps
  }

  showReadyToAdvance(stepName) {
    // Add visual hint that user can now continue
    const stepElement = this.getStepElement(stepName);
    if (stepElement && !stepElement.querySelector('.tap-hint')) {
      const hint = document.createElement('div');
      hint.className = 'tap-hint';
      hint.innerHTML = '<span class="tap-hint-text">Enter để tiếp tục</span>';
      stepElement.appendChild(hint);

      gsap.fromTo(hint,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }

  showWaitIndicator() {
    // Visual feedback when user tries to skip too early
    const currentStepName = this.stepSequence[this.currentStep];
    const stepElement = this.getStepElement(currentStepName);

    if (stepElement) {
      gsap.to(stepElement, {
        scale: 1.01,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
      });
    }
  }

  animateStepEntrance(stepName, stepElement) {
    // Smooth step entrance with GPU-friendly transforms
    gsap.from(stepElement.children, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
      force3D: true,
      clearProps: 'transform'
    });
  }

  animateQuote() {
    const quoteText = document.querySelector('.quote-text');
    const text = quoteText.textContent;

    // Split into characters
    quoteText.innerHTML = text.split('').map(char =>
      char === ' ' ? ' ' : `<span class="quote-char">${char}</span>`
    ).join('');

    // Calculate animation duration based on text length
    const charCount = text.replace(/\s/g, '').length;
    // Slower animation for better readability: 35ms per character
    const charDelay = 0.035;
    // Reading time: at least 2.5s, or 50ms per char for comfortable reading
    const minReadTime = Math.max(2500, charCount * 50);

    // Optimized character animation - smoother reveal
    gsap.to('.quote-char', {
      opacity: 1,
      duration: 0.05,
      stagger: charDelay,
      ease: 'power1.out',
      force3D: true,
      onComplete: () => {
        // After animation completes, wait for reading time then allow advance
        setTimeout(() => {
          this.canAdvance = true;
          this.quoteAnimationComplete = true;
          this.showReadyToAdvance('quote');
        }, minReadTime);
      }
    });
  }

  resetGalleryAnimation() {
    const images = document.querySelectorAll('.gallery-image');
    images.forEach(img => {
      img.style.animation = 'none';
      // Force reflow for instant animation reset
      img.offsetHeight;
      img.style.animation = 'slowZoom 8s ease-in-out forwards';
    });
  }

  advanceStep() {
    // Prevent double advance with debounce
    if (this.isAdvancing) return;
    if (this.currentStep >= this.stepSequence.length - 1) return;

    // Check if we can advance (prevents skipping before content is viewed)
    const currentStepName = this.stepSequence[this.currentStep];
    if (!this.canAdvance) {
      // Show visual feedback that user needs to wait
      this.showWaitIndicator();
      return;
    }

    this.isAdvancing = true;
    this.canAdvance = false; // Reset for next step

    // Cleanup GSAP tweens in game area before advancing
    if (currentStepName === 'game') {
      this.cleanupGameArea();
    }

    this.currentStep++;
    this.showStep(this.currentStep);

    // Reset debounce flag after delay
    setTimeout(() => {
      this.isAdvancing = false;
    }, this.advanceDebounceTime);
  }

  cleanupGameArea() {
    // Kill all GSAP tweens in game area to prevent memory leaks
    const gameArea = document.querySelector('.game-area');
    const gameElements = gameArea.querySelectorAll('.game-element, .memory-card, .greeting-container, .memory-card-inner');
    gameElements.forEach(el => {
      gsap.killTweensOf(el);
      // Clear any inline styles that might cause issues
      gsap.set(el, { clearProps: 'all' });
    });
    // Also kill progress bar animations
    const progressBar = document.querySelector('.game-step .progress-bar');
    gsap.killTweensOf(progressBar);

    // Reset game state
    this.memoryCards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
  }

  nextChapter() {
    // Smooth chapter transition
    gsap.to(this.imageStep, {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.out',
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

    // Wait for CSS transition to complete before spawning elements
    // Step transition is 0.3s (300ms), adding buffer for proper rendering
    setTimeout(() => {
      // Spawn elements with staggered timing
      for (let i = 0; i < this.gameTarget; i++) {
        setTimeout(() => {
          this.spawnGameElement(gameArea, gameEmojis, progressBar, useCssHearts);
        }, i * 120);
      }
    }, 400);
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
    this.totalPairs = 3; // 3 pairs = 6 cards
    this.isChecking = false;

    // Use 3 images from the project
    const cardImages = [
      'image/1.jpg',
      'image/2.jpg',
      'image/6.jpg'
    ];

    // Create pairs and shuffle
    const cards = [...cardImages, ...cardImages];
    this.shuffleArray(cards);

    // Wait for CSS transition to complete before rendering cards
    setTimeout(() => {
      cards.forEach((imgSrc, index) => {
        const card = this.createMemoryCard(imgSrc, index, progressBar);
        gameArea.appendChild(card);
        this.memoryCards.push(card);
      });

      // Smooth entrance animation for cards
      gsap.from('.memory-card', {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'back.out(1.2)'
      });
    }, 400);
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

    let lastFlipTime = 0;
    const handleFlip = (e) => {
      // Prevent double trigger from touch and click events
      const now = Date.now();
      if (now - lastFlipTime < 100) return;
      lastFlipTime = now;

      if (this.isChecking || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
      }

      // Flip card
      card.classList.add('flipped');
      this.flippedCards.push(card);

      // Check for match when 2 cards are flipped
      if (this.flippedCards.length === 2) {
        this.isChecking = true;
        this.checkMemoryMatch(progressBar);
      }
    };

    // Click and touch handlers - use debounce to prevent double trigger
    card.addEventListener('click', handleFlip);
    card.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleFlip(e);
    }, { passive: false });

    return card;
  }

  checkMemoryMatch(progressBar) {
    const [card1, card2] = this.flippedCards;
    const isMatch = card1.dataset.image === card2.dataset.image;

    // Delay for flip animation (550ms) + viewing time
    setTimeout(() => {
      if (isMatch) {
        // Match found!
        card1.classList.add('matched');
        card2.classList.add('matched');
        this.matchedPairs++;

        // Update progress smoothly
        const progress = (this.matchedPairs / this.totalPairs) * 100;
        gsap.to(progressBar, {
          width: `${progress}%`,
          duration: 0.3,
          ease: 'power2.out'
        });

        // Smooth celebration animation
        gsap.to([card1, card2], {
          scale: 1.06,
          duration: 0.25,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
          force3D: true
        });

        // Check win condition
        if (this.matchedPairs >= this.totalPairs && !this.gameCompleted) {
          this.gameCompleted = true;
          progressBar.classList.add('completed');

          gsap.to(progressBar, {
            scale: 1.05,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut'
          });

          // Wait for user tap after game completion
          setTimeout(() => {
            this.canAdvance = true;
            this.showReadyToAdvance('game');
          }, 1200);
        }
      } else {
        // No match - flip back with slight delay for viewing
        setTimeout(() => {
          card1.classList.remove('flipped');
          card2.classList.remove('flipped');
        }, 200);
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

    // Wait for CSS transition then animate greeting
    setTimeout(() => {
      gsap.fromTo('.greeting-text',
        { opacity: 0, y: 30, scale: 0.7 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)', force3D: true }
      );

      gsap.fromTo('.greeting-emoji',
        { opacity: 0, scale: 0, rotation: -60 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.5, delay: 0.3, ease: 'back.out(1.8)', force3D: true }
      );

      // Waving animation
      gsap.to('.greeting-emoji', {
        rotation: 20,
        duration: 0.2,
        delay: 0.9,
        repeat: 4,
        yoyo: true,
        ease: 'power2.inOut',
        force3D: true
      });

      // Progress animation - slower auto advance after completion
      gsap.to(progressBar, {
        width: '100%',
        duration: 4, // Increased from 2.5s to 4s for better viewing
        ease: 'power1.inOut',
        onComplete: () => {
          progressBar.classList.add('completed');
          // Wait for user tap after animation completion
          setTimeout(() => {
            this.canAdvance = true;
            this.showReadyToAdvance('game');
          }, 1200);
        }
      });
    }, 400);
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
      return 'Chạm vào thẻ để lật và tìm các cặp hình giống nhau';
    }
    if (gameType === 'greeting') {
      return 'Chờ một chút nhé...';
    }
    return 'Chạm vào các biểu tượng để thu thập!';
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
    const areaWidth = gameArea.offsetWidth || 500;
    const areaHeight = gameArea.offsetHeight || 400;

    // Calculate element size for proper positioning
    const elementSize = 80;
    const padding = 40;
    const maxX = areaWidth - elementSize - padding;
    const maxY = areaHeight - elementSize - padding;

    // Better distribution across the game area
    element.style.left = `${padding + Math.random() * maxX}px`;
    element.style.top = `${padding + Math.random() * maxY}px`;

    // Click handler for web - with debounce to prevent touch/click double trigger
    let lastCollectTime = 0;
    const handleCollect = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Prevent double trigger from touch and click events
      const now = Date.now();
      if (now - lastCollectTime < 100) return;
      lastCollectTime = now;

      if (element.classList.contains('collected')) return;

      // Kill all GSAP animations and reset transform for clean CSS animation
      gsap.killTweensOf(element);
      gsap.set(element, { clearProps: 'transform' });

      // Add collected class after clearing GSAP props
      element.classList.add('collected');
      this.gameCollected++;

      const progress = (this.gameCollected / this.gameTarget) * 100;
      progressBar.style.width = `${progress}%`;

      if (this.gameCollected >= this.gameTarget && !this.gameCompleted) {
        this.gameCompleted = true;
        progressBar.classList.add('completed');

        // Celebration animation
        gsap.to(progressBar, {
          scale: 1.05,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out'
        });

        // Wait for user tap after game completion
          setTimeout(() => {
            this.canAdvance = true;
            this.showReadyToAdvance('game');
          }, 1000);
      }
    };

    // Click and touch handlers
    element.addEventListener('click', handleCollect);
    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleCollect(e);
    }, { passive: false });

    // Hover effect for desktop
    element.addEventListener('mouseenter', () => {
      if (!element.classList.contains('collected')) {
        gsap.to(element, { scale: 1.3, duration: 0.15, ease: 'power2.out' });
      }
    });
    element.addEventListener('mouseleave', () => {
      if (!element.classList.contains('collected')) {
        gsap.to(element, { scale: 1, duration: 0.15, ease: 'power2.out' });
      }
    });

    // Entry animation
    gsap.from(element, {
      scale: 0,
      rotation: -90,
      duration: 0.35,
      ease: 'back.out(1.4)',
      force3D: true
    });

    // Floating animation
    gsap.to(element, {
      y: '+=10',
      duration: 1.4 + Math.random() * 0.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 0.3,
      force3D: true
    });

    // Subtle rotation animation
    gsap.to(element, {
      rotation: '+=6',
      duration: 2.2 + Math.random() * 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      force3D: true
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

    // Optimized collage entrance - faster stagger
    gsap.to('.collage-img', {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      stagger: {
        each: 0.04,
        from: 'random'
      },
      delay: 0.2,
      ease: 'back.out(1.1)',
      force3D: true
    });

    // Optimized ending content animation
    gsap.from('.ending-content', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: 1.5,
      ease: 'power2.out',
      force3D: true
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TwelveMonthsApp();
});
