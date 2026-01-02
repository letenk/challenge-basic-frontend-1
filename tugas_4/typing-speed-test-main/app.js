const state = {
  // Test states
  isTestActive: false,
  isTestComplete: false,

  // setting
  difficulty: 'easy',
  mode: 'timed',

  // Passages
  passages: [],
  currentPassage: null,

  // Typing data
  typedCharacters: [],
  currentCharIndex: 0,
  correctChars: 0,
  incorrectChars: 0,

  // Timer
  timeRemaining: 60,
  timeElapsed: 0,
  timeInterval: null,

  wpm: 0,
  accuracy: 100,

  personalBest: 0
};

const elements = {
  // Stats
  wpmDisplay: document.getElementById('wpm'),
  accuracyDisplay: document.getElementById('accuracy'),
  timeDisplay: document.getElementById('time'),
  personalBestDisplay: document.getElementById('personalBest'),

  // Passage
  passageContainer: document.getElementById('passageContainer'),
  passageText: document.getElementById('passageText'),

  // Buttons
  startBtn: document.getElementById('startBtn'),
  startOverlay: document.getElementById('startOverlay'),
  restartBtn: document.getElementById('restartBtn'),
  difficultyBtns: document.querySelectorAll('.difficulty-btn'),
  modeBtns: document.querySelectorAll('.mode-btn'),

  // Results Modal
  resultsModal: document.getElementById('resultsModal'),
  resultTitle: document.getElementById('resultTitle'),
  resultSubtitle: document.getElementById('resultSubtitle'),
  resultWpm: document.getElementById('resultWpm'),
  resultAccuracy: document.getElementById('resultAccuracy'),
  resultCorrect: document.getElementById('resultCorrect'),
  resultIncorrect: document.getElementById('resultIncorrect'),
  closeResultsBtn: document.getElementById('closeResultsBtn'),

  // Confetti
  confettiCanvas: document.getElementById('confettiCanvas')
};

const confettiConfig = {
  particleCount: 100,
  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  gravity: 0.5,
  wind: 0.1
};

// Confetti particle class
class ConfettiParticle {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 4;
    this.speedY = Math.random() * 3 + 2;
    this.speedX = Math.random() * 2 - 1;
    this.color = confettiConfig.colors[
      Math.floor(Math.random() * confettiConfig.colors.length)
    ];
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 10 - 5;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
    this.speedY += confettiConfig.gravity * 0.1;

    // Check if out of bounds
    if (this.y > this.canvas.height) {
      return false; // Particle should be removed
    }
    return true; // Particle still active
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// Trigger confetti animation
function triggerConfetti() {
  const canvas = elements.confettiCanvas;
  const ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Adjust particle count for mobile
  const isMobile = window.innerWidth < 640;
  const particleCount = isMobile ? 50 : confettiConfig.particleCount;

  // Create particles
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new ConfettiParticle(canvas));
  }

  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw all particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      const isAlive = particle.update();

      if (!isAlive) {
        particles.splice(i, 1); // Remove dead particle
      } else {
        particle.draw(ctx);
      }
    }

    // Continue animation if particles still exist
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      // Clear canvas when done
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Start animation
  animate();
}

// Handle window resize
window.addEventListener('resize', () => {
  elements.confettiCanvas.width = window.innerWidth;
  elements.confettiCanvas.height = window.innerHeight;
});

async function loadPassages() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    state.passages = data.passages;
    console.log('Passages loaded:', state.passages.length);
  } catch (error) {
    console.log('Error loading passages:', error);
    // Fallback if fail
    state.passages = [
      {
        id: 'easy-1',
        difficulty: 'easy',
        text: 'The sun rose over the quiet town. Birds sang in the trees as people woke up and started their day.'
      }
    ];
  }
}

// Selected random passage by difficulty
function selectRandomPassage(difficulty) {
  const filteredPassages = state.passages.filter(
    p => p.difficulty === difficulty
  );

  if (filteredPassages.length === 0) {
    console.error('No passages found for difficulty:', difficulty);
    return null;
  }

  // Random index
  const randomIndex = Math.floor(Math.random() * filteredPassages.length);
  return filteredPassages[randomIndex];
}

// Load personal best dari localStorage
function loadPersonalBest() {
  const saved = localStorage.getItem('typingTestPersonalBest');
  if (saved) {
    state.personalBest = parseInt(saved);
    elements.personalBestDisplay.textContent = `${state.personalBest} WPM`;
  }
}

function updateTimerDisplay() {
  let displayTime;

  if (state.mode === 'timed') {
    // Format: 0:60, 0:59, ... 0:00
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    // Format: 0:01, 0:02, ... untuk passage mode
    const minutes = Math.floor(state.timeElapsed / 60);
    const seconds = state.timeElapsed % 60;
    displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  elements.timeDisplay.textContent = displayTime;

  // Warning color if time < 10 seconds (timed mode)
  if (state.mode === 'timed' && state.timeRemaining <= 10) {
    elements.timeDisplay.classList.remove('text-yellow-400');
    elements.timeDisplay.classList.add('text-red-500');
  } else {
    elements.timeDisplay.classList.remove('text-red-500');
    elements.timeDisplay.classList.add('text-yellow-400');
  }
}

function startTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }

  if (state.mode === 'timed') {
    state.timeRemaining = 60;
    state.timeElapsed = 0;
  } else {
    state.timeRemaining = 0;
    state.timeElapsed = 0;
  }

  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    if (state.mode === 'timed') {
      // Countdown mode (timed)
      state.timeRemaining--;
      state.timeElapsed++;

      if (state.timeRemaining <= 0) {
        endTest();
        return;
      }
    } else {
      // Count up mode (passage)
      state.timeElapsed++;
    }

    updateTimerDisplay();
  }, 1000); // 1000ms = 1 seconds
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function displayPassage() {
  state.currentPassage = selectRandomPassage(state.difficulty);

  if (!state.currentPassage) {
    console.error('❌ Failed to select passage');
    return;
  }

  // Clear existing content
  elements.passageText.innerHTML = '';

  // Reset typed characters array
  state.typedCharacters = [];
  state.currentCharIndex = 0;

  // Break text to character array and create span for each character
  const chars = state.currentPassage.text.split('');

  chars.forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.classList.add('char');
    span.setAttribute('data-index', index);

    // Highlight the first character
    if (index === 0) {
      span.classList.add('current');
    }

    elements.passageText.appendChild(span);
  });

  console.log('✅ Passage displayed:', state.currentPassage.id);
}

function handleKeyPress(event) {
  // If test hasn't started yet and user typing in the passage area, auto-start
  if (!state.isTestActive && !state.isTestComplete) {
    startTest();
  }

  // If test already done, ignore input
  if (state.isTestComplete) {
    return;
  }

  const key = event.key;

  // Handle backspace
  if (key === 'Backspace') {
    handleBackspace();
    return;
  }

  // Ignore special keys
  if (key.length > 1) { // Arrow keys, Shift, Ctrl, dll
    return;
  }

  // Get expected character
  const expectedChar = state.currentPassage.text[state.currentCharIndex];

  // Validate input
  const isCorrect = key === expectedChar;

  // Update state
  state.typedCharacters.push({
    expected: expectedChar,
    typed: key,
    correct: isCorrect
  });

  if (isCorrect) {
    state.correctChars++;
  } else {
    state.incorrectChars++;
  }

  // Update visual
  updateCharacterDisplay();

  // Move to next character
  state.currentCharIndex++;

  // Update stats
  updateStats();

  // Check if passage completed
  if (state.currentCharIndex >= state.currentPassage.text.length) {
    endTest();
  }
}

// Handle backspace
function handleBackspace() {
  if (state.currentCharIndex === 0) {
    return; // already at the beginning, can't backspace anymore
  }

  // Move back one character
  state.currentCharIndex--;

  // Get last typed character
  const lastTyped = state.typedCharacters.pop();

  // Update stats
  if (lastTyped) {
    if (lastTyped.correct) {
      state.correctChars--;
    } else {
      state.incorrectChars--;
    }
  }

  // Update visual
  updateCharacterDisplay();
  updateStats();
}

// Update character display (visual feedback)
function updateCharacterDisplay() {
  const allChars = elements.passageText.querySelectorAll('.char');

  allChars.forEach((span, index) => {
    // Reset classes
    span.classList.remove('correct', 'incorrect', 'current');

    if (index < state.currentCharIndex) {
      // Character already typed 
      const typedChar = state.typedCharacters[index];
      if (typedChar.correct) {
        span.classList.add('correct');
      } else {
        span.classList.add('incorrect');
      }
    } else if (index === state.currentCharIndex) {
      // Current character (cursor position)
      span.classList.add('current');
    }
  });
}

// Calculate WPM (Words Per Minute)
function calculateWPM()
{
  const timeInSeconds = state.mode === 'timed'
    ? state.timeElapsed
    : state.timeElapsed;

    if (timeInSeconds === 0) {
      return 0;
    }

    // WPM = (characters typed / 5) / (time in minutes)
    // Divide by 5 because on average 1 word = 5 characters
    const words = state.correctChars / 5;
    const minutes = timeInSeconds / 60;
    const wpm = Math.round(words / minutes);

    return wpm > 0 ? wpm : 0;
}

function calculateAccuracy() {
  const totalChars = state.correctChars + state.incorrectChars;

  if (totalChars === 0) {
    return 100;
  }

  const accuracy = (state.correctChars / totalChars) * 100;
  return Math.round(accuracy);
}

function updateStats(){
  state.wpm = calculateWPM();
  state.accuracy = calculateAccuracy();

  elements.wpmDisplay.textContent = state.wpm;
  elements.accuracyDisplay.textContent = `${state.accuracy}%`;

  // Color coding for accuracy
  if (state.accuracy >= 95) {
    elements.accuracyDisplay.classList.remove('text-red-500', 'text-yellow-400');
    elements.accuracyDisplay.classList.add('text-green-500');
  } else if (state.accuracy >= 80) {
    elements.accuracyDisplay.classList.remove('text-red-500', 'text-green-500');
    elements.accuracyDisplay.classList.add('text-yellow-400');
  } else {
    elements.accuracyDisplay.classList.remove('text-green-500', 'text-yellow-400');
    elements.accuracyDisplay.classList.add('text-red-500');
  }
}

function startTest() {
  console.log('Starting test...');

  state.isTestActive = true;
  state.isTestComplete = false;

  // Hide start overlay
  elements.startOverlay.classList.add('hidden');

  // Show restart button
  elements.restartBtn.classList.remove('hidden');

  // Start timer
  startTimer();

  // Focus on passage area untuk capture keyboard
  elements.passageContainer.focus();
  elements.passageContainer.tabIndex = 0; // Make focusable
}

function endTest() {
  console.log('Ending test...');

  state.isTestActive = false;
  state.isTestComplete = true;

  stopTimer();

  updateStats();

  showResults();
}

function restartTest() {
  console.log('Restarting test...');

  // Reset state
  state.isTestActive = false;
  state.isTestComplete = false;
  state.currentCharIndex = 0;
  state.correctChars = 0;
  state.incorrectChars = 0;
  state.typedCharacters = [];
  state.wpm = 0;
  state.accuracy = 100;
  state.timeElapsed = 0;

  // Stop timer
  stopTimer();

  // Reset display
  elements.wpmDisplay.textContent = '0';
  elements.accuracyDisplay.textContent = '100%';
  elements.accuracyDisplay.className = 'text-neutral-0 font-bold ml-2';

  if (state.mode === 'timed') {
    elements.timeDisplay.textContent = '0:60';
  } else {
    elements.timeDisplay.textContent = '0:00';
  }

  // Show start overlay
  elements.startOverlay.classList.remove('hidden');

  // Hide restart button
  elements.restartBtn.classList.add('hidden');

  // Load new passage
  displayPassage();
}

function showResults() {
  // Determine result type
  let resultType = 'normal'; // 'baseline', 'highscore', 'normal'

  if (state.personalBest === 0) {
    // First test ever
    resultType = 'baseline';
    state.personalBest = state.wpm;
    savePersonalBest();
  } else if (state.wpm > state.personalBest) {
    // Beat high score!
    resultType = 'highscore';
    state.personalBest = state.wpm;
    savePersonalBest();
  }

  // Update modal content based on result type
  updateResultsModal(resultType);

  // Show modal with animation
  elements.resultsModal.classList.remove('hidden');
  elements.resultsModal.querySelector('> div').classList.add('modal-enter');

  // Trigger confetti if high score
  if (resultType === 'highscore') {
    setTimeout(() => {
      triggerConfetti();
    }, 300);
  }
}

function updateResultsModal(resultType) {
  // Update stats
  elements.resultWpm.textContent = state.wpm;
  elements.resultAccuracy.textContent = `${state.accuracy}%`;
  elements.resultCorrect.textContent = state.correctChars;
  elements.resultIncorrect.textContent = state.incorrectChars;

  // Update title and subtitle based on result type
  if (resultType === 'baseline') {
    elements.resultTitle.textContent = 'Baseline Established!';
    elements.resultSubtitle.textContent = "You've set the bar. Now the real challenge begins—time to beat it.";
    elements.closeResultsBtn.textContent = 'Beat This Score';
  } else if (resultType === 'highscore') {
    elements.resultTitle.textContent = 'High Score Smashed!';
    elements.resultSubtitle.textContent = "You're getting faster. That was incredible typing.";
    elements.closeResultsBtn.textContent = 'Go Again';
  } else {
    elements.resultTitle.textContent = 'Test Complete!';
    elements.resultSubtitle.textContent = 'Solid run. Keep pushing to beat your high score.';
    elements.closeResultsBtn.textContent = 'Go Again';
  }

  // Update personal best display
  elements.personalBestDisplay.textContent = `${state.personalBest} WPM`;
}

function hideResults() {
  elements.resultsModal.classList.add('hidden');
  restartTest();
}

function setupEventListeners() {
  // Start button
  elements.startBtn.addEventListener('click', startTest);

  // Restart button
  elements.restartBtn.addEventListener('click', restartTest);

  // Close results button
  elements.closeResultsBtn.addEventListener('click', hideResults);

  // Difficulty buttons
  elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      elements.difficultyBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update state
      state.difficulty = btn.getAttribute('data-difficulty');

      // Restart test jika sedang aktif
      if (state.isTestActive) {
        restartTest();
      } else {
        displayPassage();
      }
    });
  });

  // Mode buttons
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      elements.modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update state
      state.mode = btn.getAttribute('data-mode');

      // Update time display
      if (state.mode === 'timed') {
        elements.timeDisplay.textContent = '0:60';
      } else {
        elements.timeDisplay.textContent = '0:00';
      }

      // Restart test jika sedang aktif
      if (state.isTestActive) {
        restartTest();
      }
    });
  });

  // Keyboard input - global listener
  document.addEventListener('keydown', (event) => {
    // Only process if test is active or can be started
    if (state.isTestActive || (!state.isTestActive && !state.isTestComplete)) {
      handleKeyPress(event);
    }
  });

  // Click on passage to start
  elements.passageContainer.addEventListener('click', () => {
    if (!state.isTestActive && !state.isTestComplete) {
      elements.passageContainer.focus();
    }
  });
}

function savePersonalBest() {
  try {
    localStorage.setItem('typingTestPersonalBest', state.personalBest.toString());
    console.log('Personal best saved:', state.personalBest);
  } catch (error) {
    console.error('Failed to save personal best:', error);
  }
}

function clearPersonalBest() {
  localStorage.removeItem('typingTestPersonalBest');
  state.personalBest = 0;
  elements.personalBestDisplay.textContent = '0 WPM';
  console.log('🗑️ Personal best cleared');
}

async function init() {
  console.log('Initializing Typing Speed Test...');

  await loadPassages();

  loadPersonalBest();

  setupEventListeners();

  displayPassage();

  console.log('App initialized successfully!');
}

window.clearPersonalBest = clearPersonalBest;

init();