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

    // Timing controls - prevent skipping before content is viewed
    this.canAdvance = true;
    this.quoteAnimationComplete = false;
    this.minViewingTimeMs = 1000; // Minimum time to view any step

    // Gallery swipe controls - prevent swiping before image displays
    this.galleryImageLoaded = [];  // Track which images have loaded
    this.gallerySwiping = false;   // Prevent rapid swiping
    this.gallerySwipeCooldown = 150; // ms between swipes

    // Event handler references for cleanup (prevent memory leaks)
    this.keydownHandler = null;
    this.greetingHeartInterval = null;

    // Transition flags to prevent double-trigger
    this.isTransitioningChapter = false;
    this.isOpeningTransition = false;

    // DOM Elements
    this.app = document.querySelector('.app');
    this.openingScreen = document.querySelector('.opening-screen');
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
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgress = document.querySelector('.loading-progress');

    try {
      // Update loading progress
      if (loadingProgress) loadingProgress.style.width = '30%';

      await this.loadAllChapters();

      if (loadingProgress) loadingProgress.style.width = '70%';

      if (this.chapters.length === 0) {
        this.hideLoadingScreen(loadingScreen);
        this.showError('Không thể tải dữ liệu. Vui lòng tải lại trang.');
        return;
      }

      this.setupEventListeners();
      this.updateTotalChapters();

      if (loadingProgress) loadingProgress.style.width = '100%';

      // Hide loading screen and show opening screen
      setTimeout(() => {
        this.hideLoadingScreen(loadingScreen);
        this.openingScreen.classList.add('active');
      }, 500);

    } catch (error) {
      console.error('Error loading data:', error);
      this.hideLoadingScreen(loadingScreen);
      this.showError('Đã xảy ra lỗi. Vui lòng tải lại trang.');
    }
  }

  hideLoadingScreen(loadingScreen) {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      // Remove from DOM after CSS transition completes (600ms)
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 650);
    }
  }

  showError(message) {
    const introContent = document.querySelector('.intro-content');
    if (introContent) {
      // Clear existing content safely
      introContent.innerHTML = '';

      // Create elements safely to prevent XSS
      const title = document.createElement('h1');
      title.className = 'intro-title';
      title.textContent = 'Oops!';

      const subtitle = document.createElement('p');
      subtitle.className = 'intro-subtitle';
      subtitle.textContent = message; // Safe: textContent doesn't execute HTML

      const btn = document.createElement('button');
      btn.className = 'start-btn';
      btn.textContent = 'Tải Lại';
      btn.addEventListener('click', () => location.reload());

      introContent.appendChild(title);
      introContent.appendChild(subtitle);
      introContent.appendChild(btn);
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
    // Helper function to add both click and touch handlers with instant response
    const addClickAndTouch = (element, handler) => {
      if (!element) return; // Safety check

      let lastEventTime = 0;
      const debounceTime = 150; // Balanced for responsiveness and preventing double-trigger

      const wrappedHandler = (e) => {
        // Prevent double-trigger from touch + click
        const now = Date.now();
        if (now - lastEventTime < debounceTime) return;
        lastEventTime = now;
        handler(e);
      };

      element.addEventListener('click', wrappedHandler);
      // Use touchstart for instant response on mobile
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        wrappedHandler(e);
      }, { passive: false });
    };

    // Opening button - triggers curtain animation
    addClickAndTouch(document.querySelector('.opening-btn'), () => this.startCurtainAnimation());

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

    // Image step click to go to next chapter
    addClickAndTouch(this.imageStep, (e) => {
      // Don't trigger if clicking gallery navigation buttons
      if (!e.target.closest('.gallery-prev') && !e.target.closest('.gallery-next')) {
        this.nextChapter();
      }
    });

    // Gallery navigation
    addClickAndTouch(document.querySelector('.gallery-prev'), () => this.galleryPrev());
    addClickAndTouch(document.querySelector('.gallery-next'), () => this.galleryNext());

    // Mouse drag and touch swipe for gallery
    this.setupGalleryInteractions();

    // Keyboard navigation
    this.setupKeyboardNavigation();

    // Gift button - show special message
    addClickAndTouch(document.querySelector('.gift-btn'), () => {
      this.showGiftMessage();
    });
  }

  showGiftMessage() {
    // Create gift message overlay
    const overlay = document.createElement('div');
    overlay.className = 'gift-overlay';
    overlay.innerHTML = `
      <div class="gift-message-box">
        <div class="gift-emoji">🎁</div>
        <h2 class="gift-title">Quà Dành Cho Em</h2>
        <p class="gift-text">Món quà lớn nhất là tình yêu anh dành cho em mỗi ngày. Cảm ơn em đã bên anh suốt hành trình này!</p>
        <div class="gift-hearts">💕 💗 💖 💝 ❤️</div>
        <button class="gift-close-btn">Anh cũng yêu em! 💕</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate entrance
    gsap.fromTo(overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 }
    );

    gsap.fromTo('.gift-message-box',
      { scale: 0.8, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
    );

    // Close button
    const closeBtn = overlay.querySelector('.gift-close-btn');
    closeBtn.addEventListener('click', () => {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => overlay.remove()
      });
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => overlay.remove()
        });
      }
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
    // Balanced threshold - prevents accidental swipes while staying responsive
    const threshold = 50;
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
    // Store handler reference for cleanup (prevent memory leaks)
    this.keydownHandler = (e) => {
      // Get current active screen
      const openingActive = this.openingScreen.classList.contains('active') && !this.openingScreen.classList.contains('hidden');
      const introActive = this.introScreen.classList.contains('active');
      const chapterActive = this.chapterScreen.classList.contains('active');
      const endingActive = this.endingScreen.classList.contains('active');

      // Opening screen - Enter or Space to start curtain animation
      if (openingActive) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.startCurtainAnimation();
        }
        return;
      }

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
          document.querySelector('.gift-btn')?.click();
        }
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  updateTotalChapters() {
    const el = document.querySelector('.total-chapters');
    if (el) el.textContent = this.chapters.length;
  }

  startCurtainAnimation() {
    // Prevent multiple clicks during transition
    if (this.isOpeningTransition) return;
    this.isOpeningTransition = true;

    // Fade out opening content with elegant animation
    gsap.to('.opening-content', {
      opacity: 0,
      scale: 0.95,
      y: -15,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: () => {
        // Show curtain with fade-in (CSS transition handles this)
        this.openingScreen.classList.add('curtain-ready');

        // Wait for curtain to fully appear, then open with GSAP for smooth draping motion
        setTimeout(() => {
          const curtainContainer = document.querySelector('.curtain-container');
          const curtainLeft = curtainContainer.querySelector('.curtain-left');
          const curtainRight = curtainContainer.querySelector('.curtain-right');

          curtainContainer.classList.add('open');

          // Animate curtains with GSAP for silky-smooth draping motion
          const curtainTl = gsap.timeline();

          // Slight gather (fabric bunching) before opening
          curtainTl.to(curtainLeft, {
            scaleX: 1.04,
            duration: 0.25,
            ease: 'power1.in'
          }, 0);
          curtainTl.to(curtainRight, {
            scaleX: 1.04,
            duration: 0.25,
            ease: 'power1.in'
          }, 0);

          // Main opening - smooth silk-like slide
          curtainTl.to(curtainLeft, {
            x: '-102%',
            scaleX: 0.85,
            duration: 1.8,
            ease: 'power2.inOut',
            force3D: true
          }, 0.2);
          curtainTl.to(curtainRight, {
            x: '102%',
            scaleX: 0.85,
            duration: 1.8,
            ease: 'power2.inOut',
            force3D: true
          }, 0.2);

          // Subtle sway at the end - fabric settling
          curtainTl.to(curtainLeft, {
            x: '-100%',
            scaleX: 0.9,
            duration: 0.5,
            ease: 'power1.out'
          }, 1.9);
          curtainTl.to(curtainRight, {
            x: '100%',
            scaleX: 0.9,
            duration: 0.5,
            ease: 'power1.out'
          }, 1.9);

          // Show intro screen as curtains pass the halfway point
          curtainTl.call(() => {
            this.introScreen.classList.add('active');
            this.animateIntro();
          }, null, 0.9);

          // Hide opening screen after curtains fully open
          curtainTl.call(() => {
            this.openingScreen.classList.remove('active');
            this.openingScreen.classList.add('hidden');
            this.isOpeningTransition = false;
          }, null, 2.2);
        }, 600);
      }
    });
  }

  animateIntro() {
    // Elegant intro animations synced with curtain reveal
    gsap.from('.intro-title', {
      opacity: 0,
      y: 30,
      scale: 0.95,
      duration: 0.8,
      delay: 0.2,
      ease: 'power3.out'
    });

    gsap.from('.intro-subtitle', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: 0.5,
      ease: 'power2.out'
    });

    gsap.from('.intro-hearts .heart', {
      opacity: 0,
      scale: 0,
      rotation: -15,
      duration: 0.4,
      stagger: 0.1,
      delay: 0.7,
      ease: 'back.out(1.7)'
    });

    gsap.from('.start-btn', {
      opacity: 0,
      y: 20,
      scale: 0.9,
      duration: 0.6,
      delay: 1.0,
      ease: 'back.out(1.2)'
    });
  }

  startJourney() {
    // Smooth exit from intro screen with GSAP then switch to chapter
    gsap.to('.intro-content', {
      opacity: 0,
      y: -15,
      scale: 0.97,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set('.intro-content', { clearProps: 'opacity,y,scale' });
        this.introScreen.classList.remove('active');
        this.chapterScreen.classList.add('active');
        this.progressContainer.classList.add('visible');
        this.loadChapter(0);
      }
    });
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

    // Reset state flags for new chapter
    this.canAdvance = false;
    this.quoteAnimationComplete = false;
    this.isAdvancing = false;
    this.isTransitioningChapter = false;

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

    // Check if chapter has valid images
    const hasValidImages = (chapter.image || []).some(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (isAnimateType) {
      // Animate type: show quote animation
      if (chapter.text && chapter.text !== '') {
        this.stepSequence.push('quote');
      }
      // Show note if exists (or caption when no images)
      if (chapter.myNote && chapter.myNote !== '') {
        this.stepSequence.push('note');
      } else if (!hasValidImages && chapter.caption && chapter.caption !== '') {
        this.stepSequence.push('note');
      }
    } else {
      // Question type: game -> question -> reveal
      this.stepSequence.push('game');
      this.stepSequence.push('question');
      this.stepSequence.push('reveal');
      // Show note if exists (or caption when no images)
      if (chapter.myNote && chapter.myNote !== '') {
        this.stepSequence.push('note');
      } else if (!hasValidImages && chapter.caption && chapter.caption !== '') {
        this.stepSequence.push('note');
      }
    }

    // Only add image step if chapter has valid images
    if (hasValidImages) {
      this.stepSequence.push('image');
    }
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
    const currentEl = document.querySelector('.current-chapter');
    const progressEl = document.querySelector('.progress-fill');

    if (currentEl) currentEl.textContent = this.currentChapter + 1;
    if (progressEl) progressEl.style.width = `${progress}%`;
  }

  populateChapterData(chapter) {
    // Helper for safe text content setting
    const setText = (selector, text) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = text;
    };

    // Title Card
    setText('.chapter-number', this.currentChapter + 1);
    setText('.chapter-month', chapter.month || '');

    // Quote
    setText('.quote-text', chapter.text || '');

    // Note - merge caption into note when chapter has no valid images
    const hasValidImages = (chapter.image || []).some(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (!hasValidImages && chapter.caption) {
      const noteText = [chapter.myNote, chapter.caption].filter(t => t && t !== '').join('\n\n');
      setText('.note-text', noteText);
    } else {
      setText('.note-text', chapter.myNote || '');
    }

    // Game text and hint - dynamic based on game type
    setText('.game-text', chapter.text || this.getGameText(chapter.minigameType));
    setText('.game-hint', this.getGameHint(chapter.minigameType));

    // Question
    setText('.question-text', chapter.question || '');
    this.populateAnswers(chapter);

    // Caption
    setText('.image-caption', chapter.caption || '');

    // Images
    this.populateGallery(chapter);

    // Update next button text for last chapter
    const nextBtn = document.querySelector('.next-chapter-btn');
    if (nextBtn) {
      nextBtn.textContent = this.currentChapter === this.chapters.length - 1
        ? 'Xem Kết Thúc 💕'
        : 'Tiếp Theo →';
    }
  }

  populateAnswers(chapter) {
    const grid = document.querySelector('.answers-grid');
    if (!grid) return;

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
    if (!container) return;

    container.innerHTML = '';
    container.style.transform = 'translateX(0%)';
    this.currentGalleryIndex = 0;

    // Filter out video and HEIC files (not supported in most browsers)
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    // Handle case where no valid images exist
    if (validImages.length === 0) {
      container.innerHTML = '';
      this.galleryImageLoaded = [];
      return;
    }

    // Reset image loaded tracking and swipe state
    this.galleryImageLoaded = new Array(validImages.length).fill(false);
    this.gallerySwiping = false;

    // OPTIMIZATION: Preload ALL images immediately in background
    this.preloadAllChapterImages(validImages);

    validImages.forEach((imgPath, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'gallery-image-wrapper';

      // Add skeleton placeholder for better UX
      const skeleton = document.createElement('div');
      skeleton.className = 'image-skeleton';
      wrapper.appendChild(skeleton);

      const img = document.createElement('img');
      img.className = 'gallery-image';
      img.alt = `Kỷ niệm ${index + 1}`;
      img.style.opacity = '0';

      // Track if this image has already been handled
      let imageHandled = false;

      const handleImageLoad = () => {
        if (imageHandled) return;
        imageHandled = true;

        if (skeleton.parentNode) skeleton.remove();
        this.galleryImageLoaded[index] = true;
        // Quick fade in
        gsap.to(img, {
          opacity: 1,
          duration: 0.2,
          ease: 'power2.out',
          force3D: true
        });
      };

      const handleImageError = () => {
        if (imageHandled) return;
        imageHandled = true;

        // Show error placeholder instead of hiding
        if (skeleton.parentNode) {
          skeleton.classList.add('image-error');
          skeleton.innerHTML = '<span class="error-icon">😢</span><span class="error-text">Không tải được</span>';
        }
        this.galleryImageLoaded[index] = true;
        img.style.display = 'none';
      };

      img.onload = handleImageLoad;
      img.onerror = handleImageError;

      // Timeout fallback - if image takes too long, show error
      setTimeout(() => {
        if (!imageHandled && !img.complete) {
          handleImageError();
        }
      }, 15000); // 15 second timeout

      // Set src after creating element
      img.src = `image/${imgPath}`;

      wrapper.appendChild(img);
      container.appendChild(wrapper);
    });

    this.updateGalleryNav(validImages.length);

    // Preload next chapter images for smoother transitions
    this.preloadNextChapterImages();
  }

  preloadAllChapterImages(validImages) {
    // Preload first 4 images immediately, rest progressively
    // This balances speed with memory usage on mobile devices
    const immediatePreload = Math.min(4, validImages.length);

    validImages.slice(0, immediatePreload).forEach((imgPath, index) => {
      if (!this.galleryImageLoaded[index]) {
        const preloadImg = new Image();
        preloadImg.src = `image/${imgPath}`;
      }
    });

    // Preload remaining images with delay to reduce memory pressure
    if (validImages.length > immediatePreload) {
      validImages.slice(immediatePreload).forEach((imgPath, index) => {
        setTimeout(() => {
          const actualIndex = immediatePreload + index;
          if (!this.galleryImageLoaded[actualIndex]) {
            const preloadImg = new Image();
            preloadImg.src = `image/${imgPath}`;
          }
        }, (index + 1) * 500); // Stagger by 500ms
      });
    }
  }

  preloadNextChapterImages() {
    // Preload first 2 images of next chapter for smooth transition
    const nextChapterIndex = this.currentChapter + 1;
    if (nextChapterIndex < this.chapters.length) {
      const nextChapter = this.chapters[nextChapterIndex];
      if (nextChapter.image && nextChapter.image.length > 0) {
        const validImages = nextChapter.image.filter(img => {
          const ext = img.toLowerCase().split('.').pop();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });
        // Preload first 2 images of next chapter
        validImages.slice(0, 2).forEach(imgPath => {
          const preloadImg = new Image();
          preloadImg.src = `image/${imgPath}`;
        });
      }
    }
  }

  updateGalleryNav(total) {
    const counter = document.querySelector('.gallery-counter');
    const prevBtn = document.querySelector('.gallery-prev');
    const nextBtn = document.querySelector('.gallery-next');
    const nav = document.querySelector('.gallery-nav');
    const swipeHint = document.querySelector('.swipe-hint');
    const nextChapterBtn = document.querySelector('.next-chapter-btn');

    if (total <= 1) {
      // Hide navigation and swipe hint when only 1 or 0 images
      if (nav) nav.style.display = 'none';
      if (swipeHint) swipeHint.style.display = 'none';
      // Single image - show continue button immediately
      if (nextChapterBtn) {
        nextChapterBtn.style.opacity = '1';
        nextChapterBtn.style.pointerEvents = 'auto';
      }
    } else {
      // Show navigation and swipe hint when multiple images
      if (nav) nav.style.display = 'flex';
      if (swipeHint) swipeHint.style.display = 'block';
      if (counter) counter.textContent = `${this.currentGalleryIndex + 1} / ${total}`;
      if (prevBtn) prevBtn.disabled = this.currentGalleryIndex === 0;
      if (nextBtn) nextBtn.disabled = this.currentGalleryIndex === total - 1;

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
    // Prevent rapid swiping - reduced cooldown for responsiveness
    if (this.gallerySwiping) return;

    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    const targetIndex = this.currentGalleryIndex - 1;
    if (targetIndex < 0) return;

    // Navigate immediately - skeleton handles loading UX
    this.gallerySwiping = true;
    this.currentGalleryIndex = targetIndex;
    this.slideGallery();
    this.updateGalleryNav(validImages.length);

    // Shorter cooldown for faster navigation
    setTimeout(() => {
      this.gallerySwiping = false;
    }, 150);
  }

  galleryNext() {
    // Prevent rapid swiping - reduced cooldown for responsiveness
    if (this.gallerySwiping) return;

    const chapter = this.chapters[this.currentChapter];
    const validImages = (chapter.image || []).filter(img => {
      const ext = img.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    const targetIndex = this.currentGalleryIndex + 1;
    if (targetIndex >= validImages.length) return;

    // Navigate immediately - skeleton handles loading UX
    this.gallerySwiping = true;
    this.currentGalleryIndex = targetIndex;
    this.slideGallery();
    this.updateGalleryNav(validImages.length);

    // Shorter cooldown for faster navigation
    setTimeout(() => {
      this.gallerySwiping = false;
    }, 150);
  }

  slideGallery() {
    const container = document.querySelector('.gallery-container');
    if (!container) return;

    const offset = -this.currentGalleryIndex * 100;
    container.style.transform = `translate3d(${offset}%, 0, 0)`;
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
      }, 1200);
    }, 500);
  }

  updateRevealStep(selectedKey, correctKey, chapter) {
    const herChoiceBox = document.querySelector('.her-choice .choice-box');
    const myChoiceBox = document.querySelector('.my-choice .choice-box');

    if (herChoiceBox) {
      herChoiceBox.textContent = chapter.answers?.[selectedKey] || '';
    }

    if (myChoiceBox) {
      // Safe DOM manipulation to prevent XSS
      myChoiceBox.textContent = '';
      const answerText = document.createTextNode(chapter.answers?.[correctKey] || '');
      const heartSpan = document.createElement('span');
      heartSpan.className = 'heart-icon';
      heartSpan.textContent = '💛';
      myChoiceBox.appendChild(answerText);
      myChoiceBox.appendChild(heartSpan);
    }
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
    const allSteps = [this.titleCard, this.quoteStep, this.noteStep, this.gameStep,
    this.questionStep, this.revealStep, this.imageStep];

    const stepName = this.stepSequence[stepIndex];
    const stepElement = this.getStepElement(stepName);

    // Remove tap hints from all steps
    allSteps.forEach(step => {
      const hint = step.querySelector('.tap-hint');
      if (hint) hint.remove();
    });

    // Find currently active step to animate out first
    const currentActive = allSteps.find(s => s.classList.contains('active'));

    const enterNewStep = () => {
      // Ensure all steps are hidden and pushed behind
      allSteps.forEach(step => {
        step.classList.remove('active');
        step.style.zIndex = '0';
      });

      requestAnimationFrame(() => {
        if (stepElement) {
          // Ensure new step is on top before making visible
          stepElement.style.zIndex = '5';
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
      });
    };

    if (currentActive && currentActive !== stepElement) {
      // Fade out current step completely, THEN enter new step
      gsap.to(currentActive, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          currentActive.classList.remove('active');
          currentActive.style.zIndex = '0';
          gsap.set(currentActive, { clearProps: 'opacity' });
          enterNewStep();
        }
      });
    } else {
      // No current active step (first step of chapter), enter directly
      enterNewStep();
    }
  }

  setupStepTiming(stepName) {
    // Different steps have different minimum viewing times
    this.canAdvance = false;

    const timings = {
      'title': 300,     // Title card - allow time to see chapter info
      'quote': 0,       // Quote - handled by animation completion
      'note': 800,      // Note - needs time to read the message
      'reveal': 1000,   // Reveal - needs time to compare answers
      'image': 400,     // Image - wait for images to load and display
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

      // Safe DOM construction - responsive text for mobile vs desktop
      const hintText = document.createElement('span');
      hintText.className = 'tap-hint-text';

      // Detect if touch device
      const isTouchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia('(pointer: coarse)').matches);

      hintText.textContent = isTouchDevice ? 'Chạm để tiếp tục' : 'Nhấn Enter để tiếp tục';
      hint.appendChild(hintText);

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
        ease: 'power2.inOut',
        clearProps: 'scale'
      });
    }
  }

  animateStepEntrance(stepName, stepElement) {
    // Complement CSS transition with subtle GSAP child animations for polish
    // All animations use clearProps to prevent stale inline styles
    switch (stepName) {
      case 'title': {
        const num = stepElement.querySelector('.chapter-number');
        const month = stepElement.querySelector('.chapter-month');
        if (num) {
          gsap.fromTo(num, { opacity: 0, scale: 0.8 },
            {
              opacity: 0.1, scale: 1, duration: 0.6, ease: 'power2.out', force3D: true,
              clearProps: 'scale,force3D'
            });
        }
        if (month) {
          gsap.fromTo(month, { opacity: 0, y: 15 },
            {
              opacity: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'power3.out', force3D: true,
              clearProps: 'y,force3D'
            });
        }
        break;
      }
      case 'note': {
        const container = stepElement.querySelector('.note-container');
        if (container) {
          gsap.fromTo(container, { opacity: 0, y: 20, scale: 0.97 },
            {
              opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        const icon = stepElement.querySelector('.note-icon');
        if (icon) {
          gsap.fromTo(icon, { opacity: 0, scale: 0.5, rotation: -15 },
            {
              opacity: 1, scale: 1, rotation: 0, duration: 0.4, delay: 0.2, ease: 'back.out(1.5)', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        break;
      }
      case 'reveal': {
        const title = stepElement.querySelector('.reveal-title');
        const herChoice = stepElement.querySelector('.her-choice');
        const heartsIcon = stepElement.querySelector('.hearts-icon');
        const myChoice = stepElement.querySelector('.my-choice');
        if (title) {
          gsap.fromTo(title, { opacity: 0, y: 12 },
            {
              opacity: 0.8, y: 0, duration: 0.4, ease: 'power2.out', force3D: true,
              clearProps: 'y,force3D'
            });
        }
        if (herChoice) {
          gsap.fromTo(herChoice, { opacity: 0, x: -20, scale: 0.95 },
            {
              opacity: 1, x: 0, scale: 1, duration: 0.45, delay: 0.15, ease: 'power3.out', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        if (heartsIcon) {
          gsap.fromTo(heartsIcon, { opacity: 0, scale: 0.3 },
            {
              opacity: 1, scale: 1, duration: 0.4, delay: 0.3, ease: 'back.out(1.7)', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        if (myChoice) {
          gsap.fromTo(myChoice, { opacity: 0, x: 20, scale: 0.95 },
            {
              opacity: 1, x: 0, scale: 1, duration: 0.45, delay: 0.25, ease: 'power3.out', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        break;
      }
      case 'question': {
        const qText = stepElement.querySelector('.question-text');
        if (qText) {
          gsap.fromTo(qText, { opacity: 0, y: 12 },
            {
              opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', force3D: true,
              clearProps: 'y,force3D'
            });
        }
        const buttons = stepElement.querySelectorAll('.answer-btn');
        if (buttons.length > 0) {
          gsap.fromTo(buttons, { opacity: 0, y: 15, scale: 0.95 },
            {
              opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.08, delay: 0.15, ease: 'power3.out', force3D: true,
              clearProps: 'transform,force3D'
            });
        }
        break;
      }
      case 'image': {
        const gallery = stepElement.querySelector('.image-gallery');
        if (gallery) {
          gsap.fromTo(gallery, { opacity: 0, y: 12 },
            {
              opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', force3D: true,
              clearProps: 'y,force3D'
            });
        }
        const caption = stepElement.querySelector('.image-caption');
        if (caption) {
          gsap.fromTo(caption, { opacity: 0 },
            {
              opacity: 1, duration: 0.4, delay: 0.2, ease: 'power2.out',
              clearProps: 'opacity'
            });
        }
        break;
      }
    }
  }

  animateQuote() {
    const quoteText = document.querySelector('.quote-text');
    if (!quoteText) {
      // If element not found, allow advancing immediately
      this.canAdvance = true;
      this.quoteAnimationComplete = true;
      return;
    }

    const text = quoteText.textContent || '';

    // Handle empty text case
    if (!text.trim()) {
      this.canAdvance = true;
      this.quoteAnimationComplete = true;
      this.showReadyToAdvance('quote');
      return;
    }

    // Split into characters - escape HTML entities for safety
    const escapeHtml = (str) => str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    quoteText.innerHTML = text.split('').map(char =>
      char === ' ' ? ' ' : `<span class="quote-char">${escapeHtml(char)}</span>`
    ).join('');

    // Calculate animation duration based on text length
    const charCount = text.replace(/\s/g, '').length;
    // Slower animation for better readability: 35ms per character
    const charDelay = 0.035;
    // Reading time: at least 2.5s, or 50ms per char for comfortable reading
    const minReadTime = Math.max(2500, charCount * 50);

    // Smoother character animation with subtle Y transform for each char
    // Use batch: true for better performance with many elements
    const chars = document.querySelectorAll('.quote-char');
    gsap.fromTo(chars,
      { opacity: 0, y: 4 },
      {
        opacity: 1,
        y: 0,
        duration: 0.08,
        stagger: charDelay,
        ease: 'power2.out',
        force3D: true,
        onComplete: () => {
          // Clean up will-change from all chars to free GPU memory
          chars.forEach(c => c.style.willChange = 'auto');
          // After animation completes, wait for reading time then allow advance
          setTimeout(() => {
            this.canAdvance = true;
            this.quoteAnimationComplete = true;
            this.showReadyToAdvance('quote');
          }, minReadTime);
        }
      }
    );
  }

  resetGalleryAnimation() {
    const images = document.querySelectorAll('.gallery-image');
    // Remove animation in one frame, re-apply in next frame (avoids forced reflow)
    images.forEach(img => {
      img.style.animation = 'none';
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        images.forEach(img => {
          img.style.animation = 'slowZoom 8s ease-in-out forwards';
        });
      });
    });
  }

  advanceStep() {
    // Prevent double advance with debounce
    if (this.isAdvancing) return;

    // Check if we can advance (prevents skipping before content is viewed)
    const currentStepName = this.stepSequence[this.currentStep];
    if (!this.canAdvance) {
      this.showWaitIndicator();
      return;
    }

    // If at the last step, advance to next chapter
    if (this.currentStep >= this.stepSequence.length - 1) {
      this.nextChapter();
      return;
    }

    this.isAdvancing = true;
    this.canAdvance = false;

    // Cleanup game area before advancing
    if (currentStepName === 'game') {
      this.cleanupGameArea();
    }

    this.currentStep++;
    this.showStep(this.currentStep);

    // Reset debounce after CSS transition completes (350ms CSS transition)
    setTimeout(() => {
      this.isAdvancing = false;
    }, 380);
  }

  cleanupGameArea() {
    // Clear any running intervals first
    if (this.greetingHeartInterval) {
      clearInterval(this.greetingHeartInterval);
      this.greetingHeartInterval = null;
    }

    // Clear catch falling timeout (now uses setTimeout chain)
    if (this.catchFallingInterval) {
      clearTimeout(this.catchFallingInterval);
      this.catchFallingInterval = null;
    }

    // Clear bubble pop interval
    if (this.bubblePopInterval) {
      clearInterval(this.bubblePopInterval);
      this.bubblePopInterval = null;
    }

    // Kill all GSAP tweens in game area to prevent memory leaks
    const gameArea = document.querySelector('.game-area');
    if (!gameArea) return;

    const gameElements = gameArea.querySelectorAll('.game-element, .memory-card, .greeting-container, .memory-card-inner, .heart-burst-container, .heart-burst-main, .burst-heart, .love-meter-container, .love-meter-heart, .catch-falling-container, .falling-heart, .bubble-pop-container, .pop-bubble');
    gameElements.forEach(el => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'all' });
    });

    // Also kill progress bar animations
    const progressBar = document.querySelector('.game-step .progress-bar');
    if (progressBar) gsap.killTweensOf(progressBar);

    // Clean up game area classes
    gameArea.classList.remove('memory-match-grid', 'heart-burst-grid', 'love-meter-grid', 'catch-falling-grid', 'bubble-pop-grid');

    // Reset game state
    this.memoryCards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
  }

  nextChapter() {
    // Prevent double-trigger during transition
    if (this.isTransitioningChapter) return;
    this.isTransitioningChapter = true;

    // Animate the currently active step out (not always imageStep)
    const currentStepName = this.stepSequence[this.currentStep];
    const currentStepEl = this.getStepElement(currentStepName);

    const tl = gsap.timeline();

    tl.to(currentStepEl, {
      opacity: 0,
      scale: 0.97,
      duration: 0.35,
      ease: 'power2.inOut'
    });

    tl.call(() => {
      // Remove active FIRST to prevent flash, then clear GSAP inline styles
      currentStepEl.classList.remove('active');
      gsap.set(currentStepEl, { clearProps: 'opacity,scale' });
      this.loadChapter(this.currentChapter + 1);
      this.isTransitioningChapter = false;
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

    // Check if this is a Simple Greeting (no animation)
    if (chapter.minigameType === 'simple_greeting') {
      this.startSimpleGreeting();
      return;
    }

    // Check if this is a Love Meter game
    if (chapter.minigameType === 'love_meter') {
      this.startLoveMeterGame();
      return;
    }

    // Check if this is a Catch Falling game
    if (chapter.minigameType === 'catch_falling') {
      this.startCatchFallingGame();
      return;
    }

    // Check if this is a Bubble Pop game
    if (chapter.minigameType === 'bubble_pop') {
      this.startBubblePopGame();
      return;
    }

    // Fallback for unrecognized game types - use simple greeting
    console.warn(`Unknown game type: ${chapter.minigameType}, using simple greeting`);
    this.startSimpleGreeting();
  }

  // ===== Memory Match Game (Find matching pairs) =====
  startMemoryMatch() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('heart-burst-grid', 'love-meter-grid', 'catch-falling-grid');
    gameArea.classList.add('memory-match-grid');
    this.gameCompleted = false;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    // Memory match state
    this.memoryCards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 4;
    this.memoryLocked = false;

    // Create pairs of emojis
    const emojis = ['💕', '💖', '💗', '❤️'];
    const cardPairs = [...emojis, ...emojis];
    this.shuffleArray(cardPairs);

    // Create container
    const container = document.createElement('div');
    container.className = 'memory-match-container';

    const title = document.createElement('p');
    title.className = 'memory-match-text';
    title.textContent = 'Tìm các cặp trái tim giống nhau!';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'memory-grid';

    cardPairs.forEach((emoji, index) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.emoji = emoji;
      card.dataset.index = index;

      const inner = document.createElement('div');
      inner.className = 'memory-card-inner';

      const front = document.createElement('div');
      front.className = 'memory-card-front';
      front.textContent = '?';

      const back = document.createElement('div');
      back.className = 'memory-card-back';
      back.textContent = emoji;

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      // Click handler - instant response
      const handleCardClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.flipMemoryCard(card);
      };

      // Multiple event types for best responsiveness
      card.addEventListener('click', handleCardClick);
      card.addEventListener('touchstart', handleCardClick, { passive: false });
      card.addEventListener('pointerdown', handleCardClick);

      grid.appendChild(card);
      this.memoryCards.push(card);
    });

    container.appendChild(grid);
    gameArea.appendChild(container);

    // Entrance animation - staggered reveal with 3D perspective
    setTimeout(() => {
      gsap.fromTo('.memory-card',
        { opacity: 0, scale: 0.3, rotationY: 180, y: 20 },
        {
          opacity: 1,
          scale: 1,
          rotationY: 0,
          y: 0,
          duration: 0.5,
          stagger: { each: 0.06, from: 'random' },
          ease: 'back.out(1.7)',
          force3D: true,
          clearProps: 'y,rotation'
        }
      );
    }, 250);
  }

  flipMemoryCard(card) {
    // Prevent flipping if locked, already flipped, or matched
    if (this.memoryLocked ||
      card.classList.contains('flipped') ||
      card.classList.contains('matched') ||
      this.gameCompleted) {
      return;
    }

    // Flip the card
    card.classList.add('flipped');
    this.flippedCards.push(card);

    // Smooth flip animation with elastic bounce
    gsap.to(card, {
      scale: 1.08,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'elastic.out(1, 0.5)',
      force3D: true,
      clearProps: 'scale'
    });

    // Check for match when 2 cards are flipped
    if (this.flippedCards.length === 2) {
      this.memoryLocked = true;
      this.checkMemoryMatch();
    }
  }

  checkMemoryMatch() {
    const [card1, card2] = this.flippedCards;
    const match = card1.dataset.emoji === card2.dataset.emoji;
    const progressBar = document.querySelector('.game-step .progress-bar');

    if (match) {
      // Match found!
      this.matchedPairs++;
      card1.classList.add('matched');
      card2.classList.add('matched');

      // Match animation - satisfying bounce
      gsap.to([card1, card2], {
        scale: 1.15,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'elastic.out(1, 0.3)',
        force3D: true,
        onComplete: () => gsap.set([card1, card2], { clearProps: 'scale' })
      });

      // Update progress
      const progress = (this.matchedPairs / this.totalPairs) * 100;
      progressBar.style.width = `${progress}%`;

      this.flippedCards = [];
      this.memoryLocked = false;

      // Check completion
      if (this.matchedPairs >= this.totalPairs) {
        progressBar.classList.add('completed');

        const textEl = document.querySelector('.memory-match-text');
        if (textEl) textEl.textContent = 'Ghép xong rồi! 💕';

        setTimeout(() => {
          this.gameCompleted = true;
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }, 600);
      }
    } else {
      // No match - flip back after delay
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        this.flippedCards = [];
        this.memoryLocked = false;
      }, 800);
    }
  }

  // ===== Heart Burst Game (Simple one-tap game) =====

  startHeartBurstGame() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid', 'love-tap-grid');
    gameArea.classList.add('heart-burst-grid');
    this.gameCompleted = false;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    // Create heart burst container
    const container = document.createElement('div');
    container.className = 'heart-burst-container';
    container.innerHTML = `
      <div class="heart-burst-main">💖</div>
      <p class="heart-burst-text">Chạm vào trái tim!</p>
    `;

    gameArea.appendChild(container);

    // Wait for CSS transition then setup handlers
    setTimeout(() => {
      const mainHeart = document.querySelector('.heart-burst-main');
      const textEl = document.querySelector('.heart-burst-text');

      // Entrance animation
      gsap.fromTo(mainHeart,
        { opacity: 0, scale: 0.3 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );

      gsap.fromTo(textEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3 }
      );

      // Gentle pulse animation
      gsap.to(mainHeart, {
        scale: 1.1,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      let tapped = false;

      const handleTap = (e) => {
        e.preventDefault();
        if (tapped || this.gameCompleted) return;
        tapped = true;

        // Stop pulse
        gsap.killTweensOf(mainHeart);

        // Create burst of hearts
        this.createHeartBurst(gameArea);

        // Animate main heart
        gsap.to(mainHeart, {
          scale: 1.5,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out'
        });

        // Update text
        textEl.textContent = 'Yêu em! 💕';
        gsap.fromTo(textEl,
          { scale: 0.8 },
          { scale: 1, duration: 0.3, ease: 'back.out(2)' }
        );

        // Fill progress bar
        gsap.to(progressBar, {
          width: '100%',
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            progressBar.classList.add('completed');
          }
        });

        // Complete game
        setTimeout(() => {
          this.gameCompleted = true;
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }, 800);
      };

      mainHeart.addEventListener('click', handleTap);
      mainHeart.addEventListener('touchend', handleTap, { passive: false });
    }, 250);
  }

  createHeartBurst(container) {
    const hearts = ['💕', '💗', '💖', '💝', '❤️', '🩷', '🧡', '💛'];
    const burstCount = 12;

    for (let i = 0; i < burstCount; i++) {
      const heart = document.createElement('span');
      heart.className = 'burst-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      container.appendChild(heart);

      // Random direction
      const angle = (i / burstCount) * Math.PI * 2;
      const distance = 80 + Math.random() * 60;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      gsap.fromTo(heart,
        {
          opacity: 1,
          scale: 0.5,
          x: 0,
          y: 0
        },
        {
          opacity: 0,
          scale: 1.2,
          x: x,
          y: y,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => heart.remove()
        }
      );
    }
  }

  // ===== Love Meter Game (Tap to fill heart with love) =====
  startLoveMeterGame() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid', 'heart-burst-grid');
    gameArea.classList.add('love-meter-grid');
    this.gameCompleted = false;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    const gameDuration = 6000; // 6 seconds to tap
    let currentTaps = 0;

    const container = document.createElement('div');
    container.className = 'love-meter-container';
    container.innerHTML = `
      <div class="love-meter-heart">
        <div class="love-meter-fill"></div>
        <span class="love-meter-emoji">🤍</span>
      </div>
      <p class="love-meter-text">chạm để gửi tình iu tới ảnh</p>
      <p class="love-meter-count">💕 <span class="tap-count">0</span></p>
    `;

    gameArea.appendChild(container);

    setTimeout(() => {
      const heart = document.querySelector('.love-meter-heart');
      const fill = document.querySelector('.love-meter-fill');
      const emoji = document.querySelector('.love-meter-emoji');
      const textEl = document.querySelector('.love-meter-text');
      const countEl = document.querySelector('.tap-count');

      gsap.fromTo(heart,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );

      gsap.fromTo(textEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3 }
      );

      // Progress bar fills over time
      gsap.to(progressBar, {
        width: '100%',
        duration: gameDuration / 1000,
        ease: 'none'
      });

      // Fill animation over time
      gsap.to(fill, {
        height: '100%',
        duration: gameDuration / 1000,
        ease: 'power1.in'
      });

      // Milestone messages for feedback
      const milestones = {
        5: 'Tiếp tục nào! 💖',
        10: 'Tuyệt lắm! 💗',
        15: 'Yêu quá! ❤️',
        20: 'Siêu yêu! 💕',
        25: 'Phi thường! ✨'
      };

      // Tap handler - instant response
      const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.gameCompleted) return;

        currentTaps++;
        if (countEl) countEl.textContent = currentTaps;

        // Instant pulse animation on tap
        gsap.fromTo(heart,
          { scale: 1.2 },
          { scale: 1, duration: 0.1, ease: 'power2.out' }
        );

        // Change emoji color and show milestone feedback
        if (currentTaps >= 15) {
          emoji.textContent = '❤️';
        } else if (currentTaps >= 10) {
          emoji.textContent = '💗';
        } else if (currentTaps >= 5) {
          emoji.textContent = '💖';
        } else if (currentTaps >= 2) {
          emoji.textContent = '🩷';
        }

        // Show milestone message with animation
        if (milestones[currentTaps]) {
          textEl.textContent = milestones[currentTaps];
          gsap.fromTo(textEl,
            { scale: 1.1, opacity: 0.8 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }
          );
        }

        // Create small heart burst on each tap
        this.createMiniHeartBurst(heart);
      };

      // Multiple event types for best responsiveness
      heart.addEventListener('click', handleTap);
      heart.addEventListener('touchstart', handleTap, { passive: false });
      heart.addEventListener('pointerdown', handleTap);

      // End game after duration
      setTimeout(() => {
        if (this.gameCompleted) return;

        this.gameCompleted = true;
        progressBar.classList.add('completed');
        emoji.textContent = '❤️';

        // Friendly message regardless of score
        if (currentTaps > 0) {
          textEl.textContent = `Tuyệt vời! Đã gửi ${currentTaps} yêu thương! 💕`;
        } else {
          textEl.textContent = `Xong rồi! 💕`;
        }

        gsap.to(heart, {
          scale: 1.2,
          duration: 0.3,
          ease: 'back.out(2)'
        });

        setTimeout(() => {
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }, 600);
      }, gameDuration);
    }, 250);
  }

  createMiniHeartBurst(parent) {
    const hearts = ['💕', '💗', '💖'];
    const burstCount = 3;

    for (let i = 0; i < burstCount; i++) {
      const heart = document.createElement('span');
      heart.className = 'mini-burst-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      parent.appendChild(heart);

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      gsap.fromTo(heart,
        { opacity: 1, scale: 0.3, x: 0, y: 0 },
        {
          opacity: 0,
          scale: 0.8,
          x: x,
          y: y - 20,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => heart.remove()
        }
      );
    }
  }

  // ===== Catch Falling Game =====
  startCatchFallingGame() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid', 'heart-burst-grid', 'love-meter-grid');
    gameArea.classList.add('catch-falling-grid');
    this.gameCompleted = false;
    this.gameCollected = 0;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    const gameDuration = 10000; // 10 seconds game duration
    const maxSpawns = 25;

    const container = document.createElement('div');
    container.className = 'catch-falling-container';
    container.innerHTML = `
      <p class="catch-falling-text">Bắt những trái tim rơi!</p>
      <p class="catch-falling-score">Đã bắt: <span class="score-count">0</span> 💖</p>
      <div class="catch-falling-area"></div>
    `;

    gameArea.appendChild(container);

    setTimeout(() => {
      const textEl = document.querySelector('.catch-falling-text');
      const scoreEl = document.querySelector('.score-count');
      const scoreContainer = document.querySelector('.catch-falling-score');
      const fallingArea = document.querySelector('.catch-falling-area');

      // Elegant text entrance
      gsap.fromTo(textEl,
        { opacity: 0, y: -15, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }
      );

      gsap.fromTo(scoreContainer,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.2, ease: 'power2.out' }
      );

      // Smooth progress bar fills over game duration
      gsap.to(progressBar, {
        width: '100%',
        duration: gameDuration / 1000,
        ease: 'power1.in'
      });

      // Create particle burst on catch
      const createCatchBurst = (x, y) => {
        const particles = ['✨', '💫', '🌟', '💗', '💖'];
        const burstCount = 6;
        for (let i = 0; i < burstCount; i++) {
          const particle = document.createElement('span');
          particle.className = 'catch-burst-particle';
          particle.textContent = particles[Math.floor(Math.random() * particles.length)];
          particle.style.left = `${x}px`;
          particle.style.top = `${y}px`;
          fallingArea.appendChild(particle);

          const angle = (i / burstCount) * Math.PI * 2 + (Math.random() * 0.5);
          const distance = 35 + Math.random() * 30;
          const px = Math.cos(angle) * distance;
          const py = Math.sin(angle) * distance;

          gsap.fromTo(particle,
            { opacity: 1, scale: 0.3, x: 0, y: 0 },
            {
              opacity: 0,
              scale: 1.2,
              x: px,
              y: py,
              duration: 0.5 + Math.random() * 0.2,
              ease: 'power2.out',
              force3D: true,
              onComplete: () => particle.remove()
            }
          );
        }
      };

      // Spawn falling hearts with improved effects
      const spawnHeart = () => {
        if (this.gameCompleted) return;

        const heart = document.createElement('div');
        heart.className = 'falling-heart';
        const emojis = ['💖', '💗', '💕', '❤️', '🩷'];
        heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];

        // Varied sizes for depth
        const sizeScale = 0.7 + Math.random() * 0.6;
        heart.style.fontSize = `${2.8 * sizeScale}rem`;
        heart.style.opacity = `${0.7 + sizeScale * 0.3}`;

        // Get actual width, with better fallback
        const areaRect = fallingArea.getBoundingClientRect();
        const areaWidth = areaRect.width > 0 ? areaRect.width : (fallingArea.offsetWidth || 300);

        // Ensure hearts spawn within visible area
        const padding = 30;
        const maxLeft = Math.max(padding, areaWidth - padding - 40);
        const startLeft = padding + Math.random() * (maxLeft - padding);
        heart.style.left = `${startLeft}px`;
        heart.style.top = '-50px';

        fallingArea.appendChild(heart);

        // Fall with gentle sway - using timeline for combined effects
        const fallDuration = 2.5 + Math.random() * 2;
        const areaHeight = fallingArea.offsetHeight || 300;
        const swayAmount = 20 + Math.random() * 30;
        const swayDirection = Math.random() > 0.5 ? 1 : -1;

        // Main fall animation
        const fallTl = gsap.timeline();

        // Gentle entrance
        fallTl.fromTo(heart,
          { scale: 0.3, rotation: -15 * swayDirection },
          { scale: sizeScale, rotation: 0, duration: 0.3, ease: 'back.out(1.5)' }
        );

        // Fall with easing (slower at start, natural gravity feel)
        fallTl.to(heart, {
          y: areaHeight + 50,
          duration: fallDuration,
          ease: 'power1.in',
          force3D: true,
          onComplete: () => {
            if (!heart.classList.contains('caught')) {
              // Fade out missed hearts
              gsap.to(heart, {
                opacity: 0,
                scale: 0.5,
                duration: 0.2,
                onComplete: () => heart.remove()
              });
            }
          }
        }, 0.15);

        // Sinusoidal sway while falling
        gsap.to(heart, {
          x: swayAmount * swayDirection,
          duration: 0.8 + Math.random() * 0.4,
          repeat: Math.ceil(fallDuration / 0.8),
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true
        });

        // Gentle rotation while falling
        gsap.to(heart, {
          rotation: 15 * swayDirection,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        // Catch handler - instant response
        const handleCatch = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (heart.classList.contains('caught') || this.gameCompleted) return;

          heart.classList.add('caught');
          this.gameCollected++;

          // Update score with pulse animation
          if (scoreEl) {
            scoreEl.textContent = this.gameCollected;
            gsap.fromTo(scoreEl,
              { scale: 1.5, color: '#FF4D6D' },
              { scale: 1, color: 'inherit', duration: 0.3, ease: 'elastic.out(1, 0.4)' }
            );
          }

          // Get heart position for burst
          const heartRect = heart.getBoundingClientRect();
          const areaR = fallingArea.getBoundingClientRect();
          const burstX = heartRect.left - areaR.left + heartRect.width / 2;
          const burstY = heartRect.top - areaR.top + heartRect.height / 2;

          // Create particle burst at catch position
          createCatchBurst(burstX, burstY);

          // Kill all animations and play catch effect
          gsap.killTweensOf(heart);
          gsap.to(heart, {
            scale: 2,
            opacity: 0,
            y: '-=50',
            rotation: 360,
            duration: 0.4,
            ease: 'power3.out',
            force3D: true,
            onComplete: () => heart.remove()
          });
        };

        // Multiple event types for best mobile responsiveness
        heart.addEventListener('click', handleCatch);
        heart.addEventListener('touchstart', handleCatch, { passive: false });
        heart.addEventListener('pointerdown', handleCatch);
      };

      // Spawn hearts at intervals — start slow, then faster
      let spawnCount = 0;
      const baseInterval = 500;
      const scheduleNextSpawn = () => {
        if (this.gameCompleted || spawnCount >= maxSpawns) return;

        // Gradually spawn faster as game progresses
        const speedUp = Math.max(250, baseInterval - spawnCount * 10);
        this.catchFallingInterval = setTimeout(() => {
          spawnHeart();
          spawnCount++;
          scheduleNextSpawn();
        }, speedUp);
      };

      // Initial spawns
      spawnHeart();
      setTimeout(() => spawnHeart(), 200);
      spawnCount = 2;
      scheduleNextSpawn();

      // End game after duration - celebration
      setTimeout(() => {
        if (this.gameCompleted) return;

        this.gameCompleted = true;
        if (this.catchFallingInterval) {
          clearTimeout(this.catchFallingInterval);
        }
        progressBar.classList.add('completed');

        // Celebration with cascading hearts
        const celebrationEmojis = ['💖', '💗', '💕', '🎉', '✨', '🌟'];
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            const areaRect = fallingArea.getBoundingClientRect();
            const x = Math.random() * (areaRect.width || 300);
            const y = Math.random() * (areaRect.height || 300) * 0.6;
            createCatchBurst(x, y);
          }, i * 100);
        }

        // Friendly message with animation
        gsap.to(textEl, {
          opacity: 0,
          y: -10,
          duration: 0.2,
          onComplete: () => {
            if (this.gameCollected > 0) {
              textEl.textContent = `Tuyệt vời! Bắt được ${this.gameCollected} trái tim! 💕`;
            } else {
              textEl.textContent = `Xong rồi! 💕`;
            }
            gsap.fromTo(textEl,
              { opacity: 0, y: 10, scale: 0.9 },
              { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
            );
          }
        });

        setTimeout(() => {
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }, 800);
      }, gameDuration);
    }, 250);
  }


  // ===== Bubble Pop Game (Pop floating bubbles) =====
  startBubblePopGame() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid', 'heart-burst-grid', 'love-meter-grid', 'catch-falling-grid');
    gameArea.classList.add('bubble-pop-grid');
    this.gameCompleted = false;
    this.gameCollected = 0;
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    const gameDuration = 8000; // 8 seconds
    const maxBubbles = 15;

    const container = document.createElement('div');
    container.className = 'bubble-pop-container';
    container.innerHTML = `
      <p class="bubble-pop-text">Bấm vỡ những bong bóng!</p>
      <p class="bubble-pop-score">Đã bấm: <span class="bubble-score-count">0</span> 🫧</p>
      <div class="bubble-pop-area"></div>
    `;

    gameArea.appendChild(container);

    setTimeout(() => {
      const textEl = document.querySelector('.bubble-pop-text');
      const scoreEl = document.querySelector('.bubble-score-count');
      const bubbleArea = document.querySelector('.bubble-pop-area');

      gsap.fromTo(textEl,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4 }
      );

      // Progress bar fills over game duration
      gsap.to(progressBar, {
        width: '100%',
        duration: gameDuration / 1000,
        ease: 'none'
      });

      // Spawn floating bubbles
      const spawnBubble = () => {
        if (this.gameCompleted) return;

        const bubble = document.createElement('div');
        bubble.className = 'pop-bubble';

        // Random bubble emoji/style
        const bubbleTypes = ['🫧', '💭', '🔮', '💜', '💗'];
        bubble.textContent = bubbleTypes[Math.floor(Math.random() * bubbleTypes.length)];

        // Get area dimensions
        const areaRect = bubbleArea.getBoundingClientRect();
        const areaWidth = areaRect.width > 0 ? areaRect.width : (bubbleArea.offsetWidth || 300);
        const areaHeight = areaRect.height > 0 ? areaRect.height : (bubbleArea.offsetHeight || 250);

        // Random position within area
        const padding = 40;
        const maxLeft = Math.max(padding, areaWidth - padding - 50);
        const maxTop = Math.max(padding, areaHeight - padding - 50);

        bubble.style.left = `${padding + Math.random() * (maxLeft - padding)}px`;
        bubble.style.top = `${padding + Math.random() * (maxTop - padding)}px`;

        bubbleArea.appendChild(bubble);

        // Random size variation
        const scale = 0.8 + Math.random() * 0.6;

        // Entrance animation, then start combined float loop
        gsap.fromTo(bubble,
          { opacity: 0, scale: 0 },
          {
            opacity: 1, scale: scale, duration: 0.3, ease: 'back.out(1.5)',
            force3D: true,
            onComplete: () => {
              // Combined floating + pulsing in single tween for better perf
              gsap.to(bubble, {
                y: '+=15',
                x: '+=' + (Math.random() * 10 - 5),
                scale: scale * 1.15,
                duration: 1.2 + Math.random() * 0.8,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                force3D: true
              });
            }
          }
        );

        // Auto-remove after some time if not popped
        const autoRemoveTimer = setTimeout(() => {
          if (!bubble.classList.contains('popped')) {
            gsap.to(bubble, {
              opacity: 0,
              scale: 0,
              duration: 0.3,
              onComplete: () => bubble.remove()
            });
          }
        }, 4000 + Math.random() * 2000);

        // Pop handler - instant response
        const handlePop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (bubble.classList.contains('popped') || this.gameCompleted) return;

          bubble.classList.add('popped');
          clearTimeout(autoRemoveTimer);
          this.gameCollected++;

          // Update score immediately
          if (scoreEl) scoreEl.textContent = this.gameCollected;

          // Instant visual feedback + pop animation
          gsap.killTweensOf(bubble);

          // Create mini burst particles
          this.createBubbleBurst(bubble, bubbleArea);

          gsap.to(bubble, {
            scale: 2,
            opacity: 0,
            duration: 0.2,
            ease: 'power2.out',
            force3D: true,
            onComplete: () => bubble.remove()
          });
        };

        // Multiple event types for best mobile responsiveness
        bubble.addEventListener('click', handlePop);
        bubble.addEventListener('touchstart', handlePop, { passive: false });
        bubble.addEventListener('pointerdown', handlePop);
      };

      // Spawn bubbles at intervals
      let spawnCount = 0;
      this.bubblePopInterval = setInterval(() => {
        if (this.gameCompleted || spawnCount >= maxBubbles) {
          clearInterval(this.bubblePopInterval);
          return;
        }
        spawnBubble();
        spawnCount++;
      }, 500);

      // Initial spawns
      spawnBubble();
      setTimeout(spawnBubble, 200);

      // End game after duration
      setTimeout(() => {
        if (this.gameCompleted) return;

        this.gameCompleted = true;
        clearInterval(this.bubblePopInterval);
        progressBar.classList.add('completed');

        // Friendly message regardless of score
        if (this.gameCollected > 0) {
          textEl.textContent = `Tuyệt vời! Bấm được ${this.gameCollected} bong bóng! 🫧`;
        } else {
          textEl.textContent = `Xong rồi! 🫧`;
        }

        setTimeout(() => {
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }, 600);
      }, gameDuration);
    }, 250);
  }

  createBubbleBurst(bubble, container) {
    const particles = ['✨', '💫', '🌟', '💗'];
    const burstCount = 4;
    const rect = bubble.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate position relative to container
    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;

    for (let i = 0; i < burstCount; i++) {
      const particle = document.createElement('span');
      particle.className = 'bubble-burst-particle';
      particle.textContent = particles[Math.floor(Math.random() * particles.length)];
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      container.appendChild(particle);

      const angle = (i / burstCount) * Math.PI * 2;
      const distance = 25 + Math.random() * 20;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      gsap.fromTo(particle,
        { opacity: 1, scale: 0.5, x: 0, y: 0 },
        {
          opacity: 0,
          scale: 0.8,
          x: x,
          y: y,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => particle.remove()
        }
      );
    }
  }

  // ===== Greeting Animation =====
  startGreetingAnimation() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid');
    progressBar.style.width = '0%';
    progressBar.classList.remove('completed');

    // Create greeting container with floating hearts
    const greetingContainer = document.createElement('div');
    greetingContainer.className = 'greeting-container';
    greetingContainer.innerHTML = `
      <div class="greeting-hearts"></div>
      <div class="greeting-text">Xin chào!</div>
      <div class="greeting-emoji">👋</div>
    `;

    gameArea.appendChild(greetingContainer);

    // Wait for CSS transition then animate greeting
    setTimeout(() => {
      // Smooth text entrance
      gsap.fromTo('.greeting-text',
        { opacity: 0, y: 25, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', force3D: true }
      );

      // Emoji entrance with bounce
      gsap.fromTo('.greeting-emoji',
        { opacity: 0, scale: 0.3, rotation: -30 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.6, delay: 0.4, ease: 'back.out(2)', force3D: true }
      );

      // Gentle waving animation
      gsap.to('.greeting-emoji', {
        rotation: 15,
        duration: 0.25,
        delay: 1.1,
        repeat: 5,
        yoyo: true,
        ease: 'sine.inOut',
        force3D: true
      });

      // Add floating hearts decoration
      this.spawnFloatingHearts();

      // Progress animation
      gsap.to(progressBar, {
        width: '100%',
        duration: 3.5,
        ease: 'power2.inOut',
        onComplete: () => {
          progressBar.classList.add('completed');
          // Allow advancement
          setTimeout(() => {
            this.gameCompleted = true;
            this.canAdvance = true;
            this.showReadyToAdvance('game');
          }, 800);
        }
      });
    }, 250);
  }

  spawnFloatingHearts() {
    const heartsContainer = document.querySelector('.greeting-hearts');
    if (!heartsContainer) return;

    // Clear any existing interval first
    if (this.greetingHeartInterval) {
      clearInterval(this.greetingHeartInterval);
      this.greetingHeartInterval = null;
    }

    const hearts = ['💕', '💗', '💖', '💝', '❤️'];
    const spawnHeart = () => {
      // Safety check - don't spawn if container is gone
      if (!document.contains(heartsContainer)) {
        if (this.greetingHeartInterval) {
          clearInterval(this.greetingHeartInterval);
          this.greetingHeartInterval = null;
        }
        return;
      }

      const heart = document.createElement('span');
      heart.className = 'greeting-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      heart.style.left = `${10 + Math.random() * 80}%`;
      heart.style.bottom = '10%';
      heart.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      heartsContainer.appendChild(heart);

      // Remove heart after animation
      setTimeout(() => heart.remove(), 3500);
    };

    // Spawn hearts periodically
    for (let i = 0; i < 3; i++) {
      setTimeout(spawnHeart, i * 400);
    }
    this.greetingHeartInterval = setInterval(spawnHeart, 600);

    // Stop spawning after animation completes
    setTimeout(() => {
      if (this.greetingHeartInterval) {
        clearInterval(this.greetingHeartInterval);
        this.greetingHeartInterval = null;
      }
    }, 3000);
  }

  // ===== Simple Greeting (No Animation) =====
  startSimpleGreeting() {
    const gameArea = document.querySelector('.game-area');
    const progressBar = document.querySelector('.game-step .progress-bar');

    gameArea.innerHTML = '';
    gameArea.classList.remove('memory-match-grid');

    // Create simple greeting container
    const greetingContainer = document.createElement('div');
    greetingContainer.className = 'greeting-container';
    greetingContainer.innerHTML = `
      <div class="greeting-hearts"></div>
      <div class="greeting-text">Xin chào!</div>
      <div class="greeting-emoji">👋</div>
    `;

    gameArea.appendChild(greetingContainer);

    // Gentle fade in animation
    setTimeout(() => {
      gsap.fromTo('.greeting-text',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );

      gsap.fromTo('.greeting-emoji',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4, delay: 0.2, ease: 'power2.out' }
      );

      // Quick progress fill
      gsap.to(progressBar, {
        width: '100%',
        duration: 1,
        ease: 'power2.out',
        onComplete: () => {
          progressBar.classList.add('completed');
          this.gameCompleted = true;
          this.canAdvance = true;
          this.showReadyToAdvance('game');
        }
      });
    }, 200);
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
      'greeting': 'hè lô em bé!',
      'simple_greeting': 'hè lô em bé!',
      'love_meter': 'Đổ đầy trái tim yêu thương',
      'catch_falling': 'Bắt những trái tim rơi',
      'bubble_pop': 'Bấm vỡ những bong bóng tình yêu',
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
      'memory_match': 'Gửi yêu thương đến nhau'
    };
    return gameTexts[gameType] || 'Thu thập các biểu tượng';
  }

  getGameHint(gameType) {
    if (gameType === 'memory_match') {
      return 'Chạm vào trái tim nào!';
    }
    if (gameType === 'greeting') {
      return 'chuẩn bị tinh thần đi nhìn lại một năm trước với tui chưa';
    }
    if (gameType === 'simple_greeting') {
      return '';
    }
    if (gameType === 'love_meter') {
      return 'Chạm nhiều lần để đổ đầy!';
    }
    if (gameType === 'catch_falling') {
      return 'Chạm vào trái tim khi chúng rơi xuống!';
    }
    if (gameType === 'bubble_pop') {
      return 'Chạm vào bong bóng để bấm vỡ!';
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

    // Click handler - instant response with debounce
    let lastCollectTime = 0;
    const handleCollect = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Prevent double trigger from multiple event types
      const now = Date.now();
      if (now - lastCollectTime < 50) return;
      lastCollectTime = now;

      if (element.classList.contains('collected') || this.gameCompleted) return;

      // Kill all GSAP animations for instant response
      gsap.killTweensOf(element);
      gsap.set(element, { clearProps: 'transform' });

      // Add collected class and update score
      element.classList.add('collected');
      this.gameCollected++;
    };

    // Multiple event types for best responsiveness
    element.addEventListener('click', handleCollect);
    element.addEventListener('touchstart', handleCollect, { passive: false });
    element.addEventListener('pointerdown', handleCollect);

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

    // Entry animation, then start float loop
    gsap.from(element, {
      scale: 0,
      rotation: -90,
      duration: 0.35,
      ease: 'back.out(1.4)',
      force3D: true,
      onComplete: () => {
        // Combined floating + rotation in single tween for better perf
        gsap.to(element, {
          y: '+=10',
          rotation: '+=6',
          duration: 1.4 + Math.random() * 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true
        });
      }
    });

    gameArea.appendChild(element);
  }

  // ===== Ending Experience =====
  showEnding() {
    // Dramatic transition to ending screen - fade + scale down current view
    const tl = gsap.timeline();

    // Fade out current image step
    tl.to(this.imageStep, {
      opacity: 0,
      scale: 0.95,
      duration: 0.5,
      ease: 'power2.inOut'
    });

    // Fade out progress indicator
    tl.to(this.progressContainer, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    }, '-=0.3');

    tl.call(() => {
      gsap.set(this.imageStep, { clearProps: 'opacity,scale' });
      this.chapterScreen.classList.remove('active');
      this.progressContainer.classList.remove('visible');
      gsap.set(this.progressContainer, { clearProps: 'opacity' });
      this.endingScreen.classList.add('active');
      this.createCollage();
    });
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

    // Dramatic collage entrance with cascading reveal
    const collageImgs = document.querySelectorAll('.collage-img');
    gsap.to(collageImgs, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      stagger: {
        each: 0.05,
        from: 'random'
      },
      delay: 0.3,
      ease: 'back.out(1.2)',
      force3D: true,
      onComplete: () => {
        // Release GPU layers after entrance animation
        collageImgs.forEach(img => img.style.willChange = 'auto');
      }
    });

    // Elegant ending content entrance
    const endingTl = gsap.timeline({ delay: 1.2 });

    endingTl.fromTo('.ending-content',
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', force3D: true }
    );

    endingTl.fromTo('.ending-message',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    );

    endingTl.fromTo('.ending-note',
      { opacity: 0, y: 10 },
      { opacity: 0.8, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.2'
    );

    endingTl.fromTo('.gift-btn',
      { opacity: 0, y: 15, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' },
      '-=0.1'
    );
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TwelveMonthsApp();
});
