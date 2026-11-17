// ==========================================================================
// ZAMAN KAŞİFİ — Modern EdTech Uygulama Orkestratörü
// app.js — Mod Yönetimi, Dijitalden Analoga (Ters Mod), Konfeti & UI
// ==========================================================================

// ==========================================================================
// 1. HAFİF SENTETİK KONFETİ MOTORU (Micro-Canvas)
// ==========================================================================
class ConfettiCannon {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire(count = 60) {
    const colors = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#E040FB', '#FFAB40'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() * 80 - 40),
        y: this.canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.9) * 16,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    if (!this.animationId) {
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Yerçekimi
      p.rotation += p.vr;
      p.alpha -= 0.012;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      if (p.alpha <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.loop());
    } else {
      this.animationId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// ==========================================================================
// 2. STATE (UYGULAMA DURUMU)
// ==========================================================================
const state = {
  activeGameMode: 'random', // 'random', 'digital-to-analog', 'analog-to-digital', 'analog-to-speech'
  currentQuestion: null,    // { hour, minute, type, period, ... }
  lastQuestionType: null,   // Rastgele modda ardışık tip takibi
  sameTypeCount: 0,         // Hiçbir soru tipi ardışık 3'ten fazla olmasın
  totalCorrect: 0,
  streak: 0,
  secondChanceActive: false,
  isFirstAttempt: true,
  isTransitioning: false,

  // Ödül Eşikleri
  rewards: {
    tree: false,
    smoke: false,
    balloon: false,
    doghouse: false,
    rainbow: false,
    birds: false,
    flowers: false,
    pond: false,
    butterfly: false,
    castle: false,
    moat: false,
    garden: false,
    dragon: false,
    fireworks: false,
    grandCastle: false,
  },

  // Wheel Picker Seçimleri
  wheelHour: 12,
  wheelMinute: 0,

  // Dijitalden Analoga Kullanıcı Seçimleri
  userHandHour: 12,
  userHandMinute: 0,
};

// ==========================================================================
// 3. DOM REFERANSLARI
// ==========================================================================
const DOM = {
  app: document.getElementById('app'),
  body: document.body,
  confettiCanvas: document.getElementById('confetti-canvas'),

  // Mod Dropdown
  modeDropdownTrigger: document.getElementById('mode-dropdown-trigger'),
  modeDropdownMenu: document.getElementById('mode-dropdown-menu'),
  activeModeIcon: document.getElementById('active-mode-icon'),
  activeModeLabel: document.getElementById('active-mode-label'),
  modeOptionBtns: document.querySelectorAll('.mode-option-btn'),

  // Saat Öğeleri
  clockWrapper: document.getElementById('clock-wrapper'),
  hourHandGroup: document.getElementById('hour-hand-group'),
  minuteHandGroup: document.getElementById('minute-hand-group'),
  hourNumbers: document.getElementById('hour-numbers'),
  minuteTicks: document.getElementById('minute-ticks'),
  minuteLabels: document.getElementById('minute-labels'),
  clockGoldRim: document.getElementById('clock-gold-rim'),

  // Sahne Öğeleri
  scene: document.getElementById('scene'),
  periodIcon: document.getElementById('period-icon'),
  periodLabel: document.getElementById('period-label'),
  sun: document.getElementById('sun'),
  moon: document.getElementById('moon'),
  stars: document.getElementById('stars'),
  clouds: document.getElementById('clouds'),
  house: document.getElementById('house'),
  chimneySmoke: document.getElementById('chimney-smoke'),
  windowLeft: document.querySelector('#window-left rect'),
  windowRight: document.querySelector('#window-right rect'),

  // Açılabilir Ödüller
  rewardTree: document.getElementById('reward-tree'),
  rewardBalloon: document.getElementById('reward-balloon'),
  rewardDoghouse: document.getElementById('reward-doghouse'),
  rewardRainbow: document.getElementById('reward-rainbow'),
  rewardBirds: document.getElementById('reward-birds'),
  rewardFlowers: document.getElementById('reward-flowers'),
  rewardPond: document.getElementById('reward-pond'),
  rewardButterfly: document.getElementById('reward-butterfly'),
  rewardCastle: document.getElementById('reward-castle'),
  rewardMoat: document.getElementById('reward-moat'),
  rewardGarden: document.getElementById('reward-garden'),
  rewardDragon: document.getElementById('reward-dragon'),
  rewardFireworks: document.getElementById('reward-fireworks'),
  rewardGrandCastle: document.getElementById('reward-grand-castle'),

  // İlerleme ve Rozetler
  totalCorrectEl: document.getElementById('total-correct'),
  currentStreakEl: document.getElementById('current-streak'),
  rewardProgressBox: document.querySelector('.reward-progress-box'),
  rewardProgressBar: document.getElementById('reward-progress-bar'),
  rewardProgressText: document.getElementById('reward-progress-text'),
  nextRewardIcon: document.getElementById('next-reward-icon'),

  // Soru ve Yanıt Alanları
  questionText: document.getElementById('question-text'),
  feedbackMessage: document.getElementById('feedback-message'),
  wrongAnswerPanel: document.getElementById('wrong-answer-panel'),
  wrongQuestion: document.getElementById('wrong-question'),
  wrongAnswer: document.getElementById('wrong-answer'),
  wrongDigitalCard: document.getElementById('wrong-digital-card'),
  wrongDigitalClock: document.getElementById('wrong-digital-clock'),
  wrongAnalogLabel: document.getElementById('wrong-analog-label'),
  wrongAnalogClock: document.getElementById('wrong-analog-clock'),
  analogClock: document.getElementById('analog-clock'),
  nextQuestionBtn: document.getElementById('next-question-btn'),

  // MOD 1: Dijitalden Analoga
  digitalToAnalogArea: document.getElementById('digital-to-analog-area'),
  targetDigitalClock: document.getElementById('target-digital-clock'),
  submitAnalogHandBtn: document.getElementById('submit-analog-hand'),

  // MOD 2: Wheel Picker
  wheelPickerArea: document.getElementById('wheel-picker-area'),
  hourWheelTrack: document.getElementById('hour-wheel-track'),
  minuteWheelTrack: document.getElementById('minute-wheel-track'),
  hourWheelViewport: document.getElementById('hour-wheel-viewport'),
  minuteWheelViewport: document.getElementById('minute-wheel-viewport'),
  submitWheelBtn: document.getElementById('submit-wheel'),

  // MOD 3: Çoktan Seçmeli
  multipleChoiceArea: document.getElementById('multiple-choice-area'),
  choicesGrid: document.getElementById('choices-grid'),
};

// Motorlar
const timeEngine = new TurkishTimeEngine();
const audioEngine = new AudioEngine();
const confetti = new ConfettiCannon(DOM.confettiCanvas);

// ==========================================================================
// 4. ANALOG SAAT KADRANI ÇİZİMİ & İNTERAKTİF ÇEVİRME
// ==========================================================================

function renderClockFace() {
  const cx = 120, cy = 120, r = 78;

  DOM.hourNumbers.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.textContent = i;
    DOM.hourNumbers.appendChild(text);
  }

  DOM.minuteTicks.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isMajor = i % 5 === 0;
    const outerR = 98;
    const innerR = isMajor ? 88 : 93;

    const x1 = cx + outerR * Math.cos(angle);
    const y1 = cy + outerR * Math.sin(angle);
    const x2 = cx + innerR * Math.cos(angle);
    const y2 = cy + innerR * Math.sin(angle);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', isMajor ? '#475569' : '#CBD5E1');
    line.setAttribute('stroke-width', isMajor ? '2.5' : '1.2');
    line.setAttribute('stroke-linecap', 'round');
    DOM.minuteTicks.appendChild(line);
  }

  DOM.minuteLabels.innerHTML = '';
  const labelR = 64;
  for (let i = 0; i < 60; i += 5) {
    const displayVal = i === 0 ? '00' : String(i).padStart(2, '0');
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.textContent = displayVal;
    DOM.minuteLabels.appendChild(text);
  }
}

function setClock(hour, minute, animated = true) {
  const minuteAngle = minute * 6;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  if (!animated) {
    DOM.minuteHandGroup.classList.add('dragging');
    DOM.hourHandGroup.classList.add('dragging');
  } else {
    DOM.minuteHandGroup.classList.remove('dragging');
    DOM.hourHandGroup.classList.remove('dragging');
  }

  DOM.minuteHandGroup.style.transform = `rotate(${minuteAngle}deg)`;
  DOM.hourHandGroup.style.transform = `rotate(${hourAngle}deg)`;
}

// ==========================================================================
// 5. İNTERAKTİF SAAT SÜRÜKLEME (Dijitalden Analoga Modu)
// ==========================================================================
function setupInteractiveClock() {
  const svg = document.getElementById('analog-clock');
  let isDragging = false;
  let lastAngle = null;

  function getAngleFromEvent(e) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = (rad * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  }

  function onStart(e) {
    if (state.currentQuestion?.type !== 'digital-to-analog' || e.button > 0) return;
    e.preventDefault();
    isDragging = true;
    svg.setPointerCapture(e.pointerId);
    lastAngle = getAngleFromEvent(e);
    onMove(e);
  }

  function onMove(e) {
    if (!isDragging) return;
    const deg = getAngleFromEvent(e);

    // Yelkovanı 5 dakikalık aralıklara oturt; 12'yi geçişi saat değişimiyle aynı anda işle.
    const previousAngle = lastAngle;
    const previousMinute = state.userHandMinute;
    let angleDelta = deg - previousAngle;
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;
    const minuteVal = (Math.round(deg / 30) % 12) * 5;
    if (angleDelta === 0 && minuteVal !== previousMinute) {
      let minuteDelta = minuteVal - previousMinute;
      if (minuteDelta > 30) minuteDelta -= 60;
      if (minuteDelta < -30) minuteDelta += 60;
      angleDelta = minuteDelta * 6;
    }
    let hourChanged = false;

    if (angleDelta > 0 && previousMinute >= 50 && minuteVal <= 5) {
      state.userHandHour = (state.userHandHour + 1) % 24;
      hourChanged = true;
    } else if (angleDelta < 0 && previousMinute <= 5 && minuteVal >= 50) {
      state.userHandHour = (state.userHandHour + 23) % 24;
      hourChanged = true;
    }
    lastAngle = deg;

    if (minuteVal !== state.userHandMinute || hourChanged) {
      state.userHandMinute = minuteVal;
      setClock(state.userHandHour, state.userHandMinute, false);
      audioEngine.playTick();
    }
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    lastAngle = null;
    DOM.minuteHandGroup.classList.remove('dragging');
    DOM.hourHandGroup.classList.remove('dragging');
    setClock(state.userHandHour, state.userHandMinute, true);
  }

  svg.addEventListener('pointerdown', onStart);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onEnd);
  svg.addEventListener('pointercancel', onEnd);
}

// ==========================================================================
// 6. TÜM EKRAN DİNAMİK GÖKYÜZÜ
// ==========================================================================
function getTimePeriod(hour) {
  if (hour >= 6 && hour <= 10) return 'morning';
  if (hour >= 11 && hour <= 15) return 'noon';
  if (hour >= 16 && hour <= 19) return 'evening';
  return 'night';
}

function updateScene(hour) {
  const period = getTimePeriod(hour);

  DOM.body.setAttribute('data-time-period', period);
  DOM.app.setAttribute('data-time-period', period);

  const periodData = {
    morning: { icon: '☀️', label: 'SABAH' },
    noon: { icon: '🌤️', label: 'ÖĞLE' },
    evening: { icon: '🌅', label: 'AKŞAM' },
    night: { icon: '🌙', label: 'GECE' }
  };
  if (DOM.periodIcon && DOM.periodLabel) {
    DOM.periodIcon.textContent = periodData[period].icon;
    DOM.periodLabel.textContent = periodData[period].label;
  }

  if (period === 'night') {
    DOM.sun.setAttribute('opacity', '0');
    DOM.moon.setAttribute('opacity', '1');
    DOM.stars.setAttribute('opacity', '1');
    DOM.clouds.setAttribute('opacity', '0.25');

    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', '#FDE047');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', '#FDE047');
  } else {
    DOM.sun.setAttribute('opacity', '1');
    DOM.moon.setAttribute('opacity', '0');
    DOM.stars.setAttribute('opacity', '0');
    DOM.clouds.setAttribute('opacity', '1');

    let sunX, sunY;
    if (period === 'morning') {
      const prog = (hour - 6) / 4;
      sunX = 80 + prog * 100;
      sunY = 85 - prog * 40;
    } else if (period === 'noon') {
      const prog = (hour - 11) / 4;
      sunX = 180 + prog * 90;
      sunY = 40 + Math.abs(prog - 0.5) * 15;
    } else {
      const prog = (hour - 16) / 3;
      sunX = 270 + prog * 120;
      sunY = 45 + prog * 50;
    }
    DOM.sun.setAttribute('transform', `translate(${sunX}, ${sunY})`);

    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', 'var(--window-warm)');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', 'var(--window-warm)');
  }
}

// ==========================================================================
// 7. WHEEL PICKER (iOS 3D SİLİNDİR)
// ==========================================================================
const WHEEL_ITEM_H = 33;

function initWheelPicker() {
  DOM.hourWheelTrack.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = String(i).padStart(2, '0');
    item.dataset.value = i;
    DOM.hourWheelTrack.appendChild(item);
  }

  DOM.minuteWheelTrack.innerHTML = '';
  for (let i = 0; i < 60; i += 5) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = String(i).padStart(2, '0');
    item.dataset.value = i;
    DOM.minuteWheelTrack.appendChild(item);
  }

  setupWheelScroll(DOM.hourWheelViewport, DOM.hourWheelTrack, 24, (val) => {
    state.wheelHour = val;
  });

  setupWheelScroll(DOM.minuteWheelViewport, DOM.minuteWheelTrack, 12, (val) => {
    state.wheelMinute = val * 5;
  });
}

function scrollWheelTo(track, index) {
  const centerOffset = (95 - WHEEL_ITEM_H) / 2;
  const targetY = -(index * WHEEL_ITEM_H) + centerOffset;
  track.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
  track.style.transform = `translateY(${targetY}px)`;
  updateDimmedItems(track, index);
}

function updateDimmedItems(track, activeIndex) {
  const items = track.querySelectorAll('.wheel-item');
  items.forEach((item, i) => {
    if (Math.abs(i - activeIndex) > 1) {
      item.classList.add('dimmed');
    } else {
      item.classList.remove('dimmed');
    }
  });
}

function setupWheelScroll(viewport, track, totalItems, onChange) {
  let isDragging = false;
  let startY = 0;
  let currentY = 0;
  let velocity = 0;
  let lastY = 0;
  const centerOffset = (95 - WHEEL_ITEM_H) / 2;
  const minY = -((totalItems - 1) * WHEEL_ITEM_H) + centerOffset;
  const maxY = centerOffset;

  function getCurrentY() {
    const match = track.style.transform.match(/translateY\(([^)]+)px\)/);
    return match ? parseFloat(match[1]) : centerOffset;
  }

  function snap() {
    const y = getCurrentY();
    const idx = Math.round((centerOffset - y) / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(totalItems - 1, idx));
    scrollWheelTo(track, clamped);
    onChange(clamped);
    audioEngine.playTick();
  }

  function startDrag(clientY) {
    isDragging = true;
    startY = clientY;
    currentY = getCurrentY();
    velocity = 0;
    track.style.transition = 'none';
  }

  function moveDrag(clientY) {
    if (!isDragging) return;
    const delta = clientY - startY;
    velocity = clientY - lastY;
    lastY = clientY;
    let nextY = currentY + delta;

    if (nextY > maxY) nextY = maxY + (nextY - maxY) * 0.3;
    if (nextY < minY) nextY = minY + (nextY - minY) * 0.3;

    track.style.transform = `translateY(${nextY}px)`;
    const approxIdx = Math.round((centerOffset - nextY) / WHEEL_ITEM_H);
    updateDimmedItems(track, Math.max(0, Math.min(totalItems - 1, approxIdx)));
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (Math.abs(velocity) > 3) {
      const projected = getCurrentY() + velocity * 2.2;
      const idx = Math.round((centerOffset - projected) / WHEEL_ITEM_H);
      const clamped = Math.max(0, Math.min(totalItems - 1, idx));
      scrollWheelTo(track, clamped);
      onChange(clamped);
      audioEngine.playTick();
    } else {
      snap();
    }
  }

  viewport.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientY), { passive: true });
  viewport.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientY), { passive: true });
  viewport.addEventListener('touchend', endDrag);

  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag(e.clientY);
  });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientY));
  window.addEventListener('mouseup', endDrag);

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const curr = Math.round((centerOffset - getCurrentY()) / WHEEL_ITEM_H);
    const delta = e.deltaY > 0 ? 1 : -1;
    const clamped = Math.max(0, Math.min(totalItems - 1, curr + delta));
    scrollWheelTo(track, clamped);
    onChange(clamped);
    audioEngine.playTick();
  }, { passive: false });
}

// ==========================================================================
// 8. PEDAGOJİK MOD YÖNETİMİ & SORU ÜRETİMİ
// ==========================================================================

function determineQuestionType() {
  const mode = state.activeGameMode;

  if (mode === 'digital-to-analog') return 'digital-to-analog';
  if (mode === 'analog-to-digital') return 'analog-to-digital';
  if (mode === 'analog-to-speech') return 'analog-to-speech';

  // RASTGELE MOD: Sadece 'analog-to-digital' ve 'analog-to-speech' arasında döner.
  // KURAL: Hiçbir soru tipi ardışık 3'ten fazla olamaz!
  let candidates = ['analog-to-digital', 'analog-to-speech'];

  if (state.sameTypeCount >= 3 && state.lastQuestionType) {
    // 3 kez aynı tip geldiyse diğer tipi zorunlu yap
    return state.lastQuestionType === 'analog-to-digital'
      ? 'analog-to-speech'
      : 'analog-to-digital';
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen;
}

function generateQuestion() {
  const hour = Math.floor(Math.random() * 24);
  const minuteIndex = Math.floor(Math.random() * 12);
  const minute = minuteIndex * 5;
  const period = getTimePeriod(hour);

  const type = determineQuestionType();

  // Ardışık tip takibi
  if (type === state.lastQuestionType) {
    state.sameTypeCount++;
  } else {
    state.lastQuestionType = type;
    state.sameTypeCount = 1;
  }

  state.currentQuestion = { hour, minute, type, period };
  state.isFirstAttempt = true;
  state.secondChanceActive = false;
  state.isTransitioning = false;

  return state.currentQuestion;
}

function showQuestion(q) {
  updateScene(q.hour);

  DOM.feedbackMessage.className = 'feedback-banner';
  DOM.feedbackMessage.style.display = 'none';
  DOM.wrongAnswerPanel.style.display = 'none';
  DOM.minuteLabels.classList.remove('visible');

  // Alanları Gizle
  DOM.digitalToAnalogArea.style.display = 'none';
  DOM.wheelPickerArea.style.display = 'none';
  DOM.multipleChoiceArea.style.display = 'none';

  if (q.type === 'digital-to-analog') {
    // MOD 1: DİJİTALDEN ANALOGA (Ters Mod)
    DOM.questionText.textContent = "Kolları çevirerek hedef saati ayarla!";
    DOM.digitalToAnalogArea.style.display = 'flex';
    DOM.clockWrapper.classList.add('interactive-mode');

    // Hedef dijital saati göster (24 saatlik)
    const hStr = String(q.hour).padStart(2, '0');
    const mStr = String(q.minute).padStart(2, '0');
    DOM.targetDigitalClock.textContent = `${hStr}:${mStr}`;

    // Saatin kollarını rastgele bir başlangıç pozisyonuna ayarla
    state.userHandHour = q.hour; // Akrep hedef saat civarında
    state.userHandMinute = (q.minute + 30) % 60; // Yelkovan farklı yerde
    setClock(state.userHandHour, state.userHandMinute, true);
    DOM.submitAnalogHandBtn.disabled = false;

  } else if (q.type === 'analog-to-digital') {
    // MOD 2: ANALOGDAN DİJİTALE (Wheel Picker)
    DOM.questionText.textContent = "Çarkları çevir ve dijital saati ayarla!";
    DOM.wheelPickerArea.style.display = 'block';
    DOM.clockWrapper.classList.remove('interactive-mode');
    setClock(q.hour, q.minute, true);

    const randH = Math.floor(Math.random() * 24);
    const randMIdx = Math.floor(Math.random() * 12);
    state.wheelHour = randH;
    state.wheelMinute = randMIdx * 5;
    scrollWheelTo(DOM.hourWheelTrack, randH);
    scrollWheelTo(DOM.minuteWheelTrack, randMIdx);
    DOM.submitWheelBtn.disabled = false;

  } else {
    // MOD 3: KONUŞMA DİLİ (4 Şık)
    DOM.questionText.textContent = "Bu saat nasıl okunur?";
    DOM.multipleChoiceArea.style.display = 'block';
    DOM.clockWrapper.classList.remove('interactive-mode');
    setClock(q.hour, q.minute, true);

    renderChoices(q.hour, q.minute);
  }
}

function renderChoices(hour, minute) {
  const correctText = timeEngine.timeToTurkish(hour, minute);
  const distractors = timeEngine.generateDistractors(hour, minute);

  const choices = [
    { text: correctText, isCorrect: true },
    ...distractors.map(d => ({ text: d, isCorrect: false })),
  ];

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  const letters = ['A', 'B', 'C', 'D'];
  DOM.choicesGrid.innerHTML = '';

  choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice-card-btn';
    btn.type = 'button';

    btn.innerHTML = `
      <span class="choice-badge">${letters[index]}</span>
      <span class="choice-text">${choice.text}</span>
    `;

    btn.addEventListener('click', () => handleAnswer(choice.isCorrect, btn, hour, minute));
    DOM.choicesGrid.appendChild(btn);
  });
}

// ==========================================================================
// 9. CEVAP KONTROLÜ, SES & KONFETİ
// ==========================================================================

function handleAnswer(isCorrect, element, hour, minute) {
  if (state.isTransitioning) return;

  if (isCorrect) {
    onCorrect(element);
  } else {
    onWrong(element, hour, minute);
  }
}

function onCorrect(element) {
  state.isTransitioning = true;
  state.totalCorrect++;
  state.streak++;
  updateStatsDisplay();

  if (element && element.classList) {
    element.classList.add('is-correct');
  }

  showBanner('Harika bildin! Süper bir zaman kaşifisin! 🌟', 'success');
  audioEngine.playCorrect();
  disableAnswerArea();

  // 5'Lİ STREAK VEYA 20 DOĞRUDA KONFETİ PATLAMASI! 🎊
  if (state.streak % 5 === 0 || state.totalCorrect === 20) {
    confetti.fire(75);
    audioEngine.playCelebration();
  }

  checkGamificationRewards();

  // 1.3 sn sonra otomatik yeni soru
  setTimeout(() => {
    const nextQ = generateQuestion();
    showQuestion(nextQ);
  }, 1300);
}

function onWrong(element, hour, minute) {
  if (state.isFirstAttempt) {
    // İKİNCİ ŞANS: Ceza yok, kadrandaki gizli dakikalar belirir
    state.isFirstAttempt = false;
    state.secondChanceActive = true;

    if (element && element.classList) {
      element.classList.add('is-wrong');
      if (element.classList.contains('choice-card-btn')) {
        element.disabled = true;
      }
    }

    DOM.minuteLabels.classList.add('visible');
    showBanner('Tekrar dene! Kadrandaki renkli dakika sayılarına bak 🔍', 'hint');
    audioEngine.playWrong();
  } else {
    // İkinci Yanlış: Doğru gösterilir
    state.streak = 0;
    updateStatsDisplay();

    if (element && element.classList) {
      element.classList.add('is-wrong');
    }

    let correctAnswer = '';
    if (state.currentQuestion.type === 'digital-to-analog') {
      const q = state.currentQuestion;
      const hFormatted = String(q.hour).padStart(2, '0');
      const mFormatted = String(q.minute).padStart(2, '0');
      const hourOnClock = q.hour % 12 || 12;
      const nextHourOnClock = hourOnClock === 12 ? 1 : hourOnClock + 1;
      const minuteTick = q.minute === 0 ? 12 : q.minute / 5;
      correctAnswer = q.minute === 0
        ? `${hFormatted}:${mFormatted} — Yelkovan 12’de, akrep ${hourOnClock} rakamını gösterir.`
        : `${hFormatted}:${mFormatted} — Yelkovan ${minuteTick} rakamının üzerinde, akrep ${hourOnClock} ile ${nextHourOnClock} arasındadır.`;
      setClock(state.currentQuestion.hour, state.currentQuestion.minute, true);
    } else if (state.currentQuestion.type === 'analog-to-digital') {
      const targetH = state.currentQuestion.hour;
      const targetMIndex = Math.floor(state.currentQuestion.minute / 5);
      state.wheelHour = targetH;
      state.wheelMinute = state.currentQuestion.minute;

      scrollWheelTo(DOM.hourWheelTrack, targetH);
      scrollWheelTo(DOM.minuteWheelTrack, targetMIndex);

      const hFormatted = String(targetH).padStart(2, '0');
      const mFormatted = String(state.currentQuestion.minute).padStart(2, '0');
      correctAnswer = `${hFormatted}:${mFormatted}`;
    } else {
      correctAnswer = timeEngine.timeToTurkish(hour, minute);
      highlightCorrectChoice(correctAnswer);
    }

    audioEngine.playWrong();

    disableAnswerArea();
    DOM.clockWrapper.classList.remove('golden-streak');
    openWrongAnswerPanel(state.currentQuestion, correctAnswer);
  }
}

function openWrongAnswerPanel(question, answer) {
  const hFormatted = String(question.hour).padStart(2, '0');
  const mFormatted = String(question.minute).padStart(2, '0');
  const time = `${hFormatted}:${mFormatted}`;

  if (question.type === 'digital-to-analog') {
    DOM.wrongQuestion.textContent = `Dijital saatteki ${time} analog kadranda nasıl gösterilir?`;
    DOM.wrongDigitalClock.textContent = time;
    DOM.wrongDigitalCard.style.display = 'flex';
    DOM.wrongAnalogLabel.textContent = 'DOĞRU ANALOG SAAT';
  } else if (question.type === 'analog-to-digital') {
    DOM.wrongQuestion.textContent = 'Kadrandaki saat dijitalde kaçtır?';
    DOM.wrongDigitalCard.style.display = 'none';
    DOM.wrongAnalogLabel.textContent = 'SAAT SORUSU';
  } else {
    DOM.wrongQuestion.textContent = 'Kadrandaki saat nasıl okunur?';
    DOM.wrongDigitalCard.style.display = 'none';
    DOM.wrongAnalogLabel.textContent = 'SAAT SORUSU';
  }

  DOM.wrongAnswer.textContent = answer;
  const clockCopy = DOM.analogClock.cloneNode(true);
  const copiedElements = [clockCopy, ...clockCopy.querySelectorAll('[id]')];
  copiedElements.forEach((element) => {
    if (element.id) element.id = `wrong-${element.id}`;
  });
  [clockCopy, ...clockCopy.querySelectorAll('*')].forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const value = attribute.value.replace(/url\(#([^)]+)\)/g, 'url(#wrong-$1)');
      if (value !== attribute.value) element.setAttribute(attribute.name, value);
    });
  });
  clockCopy.id = 'wrong-answer-clock-svg';
  clockCopy.classList.add('wrong-answer-clock-svg');
  clockCopy.setAttribute('aria-label', 'Sorudaki analog saatin gösterimi');
  DOM.wrongAnalogClock.replaceChildren(clockCopy);
  DOM.feedbackMessage.style.display = 'none';
  DOM.wrongAnswerPanel.style.display = 'flex';
  DOM.nextQuestionBtn.focus({ preventScroll: true });
}

function disableAnswerArea() {
  DOM.choicesGrid.querySelectorAll('.choice-card-btn').forEach(b => b.disabled = true);
  DOM.submitWheelBtn.disabled = true;
  DOM.submitAnalogHandBtn.disabled = true;
}

function highlightCorrectChoice(correctText) {
  DOM.choicesGrid.querySelectorAll('.choice-card-btn').forEach(btn => {
    if (btn.querySelector('.choice-text').textContent.trim() === correctText) {
      btn.classList.add('is-correct');
    }
  });
}

function showBanner(text, type) {
  DOM.feedbackMessage.textContent = text;
  DOM.feedbackMessage.className = `feedback-banner show ${type}`;
}

// ==========================================================================
// 10. OYUNLAŞTIRMA & İLERLEME
// ==========================================================================

const REWARD_STEPS = [
  { total: 5, icon: '🌳' }, { total: 10, icon: '💨' },
  { total: 15, icon: '🎈' }, { total: 20, icon: '🐕' },
  { total: 25, icon: '🌈' }, { total: 30, icon: '🐦' },
  { total: 35, icon: '🌷' }, { total: 40, icon: '🐸' },
  { total: 45, icon: '🦋' }, { total: 50, icon: '🏰' },
  { total: 60, icon: '🌉' }, { total: 70, icon: '🎏' },
  { total: 80, icon: '🐉' }, { total: 90, icon: '🎆' },
  { total: 100, icon: '👑' },
];

function updateStatsDisplay() {
  DOM.totalCorrectEl.textContent = state.totalCorrect;
  DOM.currentStreakEl.textContent = state.streak;

  const tc = state.totalCorrect;
  const nextReward = REWARD_STEPS.find((step) => tc < step.total);
  const stepIndex = nextReward ? REWARD_STEPS.indexOf(nextReward) : REWARD_STEPS.length;
  const previousTotal = stepIndex > 0 ? REWARD_STEPS[stepIndex - 1].total : 0;
  const target = nextReward?.total ?? 100;
  const icon = nextReward?.icon ?? '👑';
  const currentLevelProgress = nextReward
    ? ((tc - previousTotal) / (target - previousTotal)) * 100
    : 100;
  DOM.rewardProgressBar.style.width = `${currentLevelProgress}%`;
  DOM.rewardProgressText.textContent = nextReward
    ? `${target - tc} doğru kaldı`
    : 'Tamamlandı!';
  DOM.rewardProgressBox.title = nextReward
    ? `Sıradaki ödüle ${target - tc} doğru kaldı`
    : 'Tüm ödüller açıldı!';
  DOM.nextRewardIcon.textContent = icon;
}

function checkGamificationRewards() {
  if (state.streak >= 3) {
    DOM.clockWrapper.classList.add('golden-streak');
  }

  const tc = state.totalCorrect;

  const rewards = [
    [5, 'tree', DOM.rewardTree, '🌳 Bahçene elma ağacı geldi!'],
    [10, 'smoke', DOM.chimneySmoke, '💨 Evin bacasından duman tütüyor!'],
    [15, 'balloon', DOM.rewardBalloon, '🎈 Sıcak hava balonu süzülüyor!'],
    [20, 'doghouse', DOM.rewardDoghouse, '🐕 Bahçeye köpek kulübesi geldi!'],
    [25, 'rainbow', DOM.rewardRainbow, '🌈 Bahçenin üzerinde gökkuşağı belirdi!'],
    [30, 'birds', DOM.rewardBirds, '🐦 Bahçene kuşlar kondu!'],
    [35, 'flowers', DOM.rewardFlowers, '🌷 Bahçende rengârenk çiçekler açtı!'],
    [40, 'pond', DOM.rewardPond, '🐸 Kurbağalı göletin hazır!'],
    [45, 'butterfly', DOM.rewardButterfly, '🦋 Bahçene bir kelebek geldi!'],
    [50, 'castle', DOM.rewardCastle, '🏰 Masal evin şatoya dönüştü! Yeni şato aşaman başladı!'],
    [60, 'moat', DOM.rewardMoat, '🌉 Şatonun çevresine su hendeği ve köprü eklendi!'],
    [70, 'garden', DOM.rewardGarden, '🎏 Şatonun bahçesine kraliyet sancakları ve çiçekler geldi!'],
    [80, 'dragon', DOM.rewardDragon, '🐉 Şatonu dost canlısı bir ejderha koruyor!'],
    [90, 'fireworks', DOM.rewardFireworks, '🎆 Şatonda büyük bir kutlama başladı!'],
  ];

  rewards.forEach(([threshold, key, element, message]) => {
    if (tc < threshold || state.rewards[key]) return;
    state.rewards[key] = true;
    if (key === 'castle') DOM.app.classList.add('chateau-world');
    unlockReward(element, message);
  });

  if (tc >= 100 && !state.rewards.grandCastle) {
    state.rewards.grandCastle = true;
    DOM.rewardCastle.classList.remove('unlocked');
    DOM.rewardCastle.setAttribute('opacity', '0');
    unlockReward(DOM.rewardGrandCastle, '👑 100 doğru! Daha büyük ve sancaklı şaton açıldı!');
  }
}

function unlockReward(el, msg) {
  el.classList.add('unlocked');
  el.setAttribute('opacity', '1');
  showBanner(`Tebrikler! ${msg}`, 'success');
  audioEngine.playCelebration();
  confetti.fire(80);
}

// ==========================================================================
// 11. MİKRO-ETKİLEŞİMLER
// ==========================================================================

function setupMicroInteractions() {
  DOM.sun.addEventListener('click', () => {
    DOM.sun.animate([
      { transform: `${DOM.sun.getAttribute('transform')} scale(1)` },
      { transform: `${DOM.sun.getAttribute('transform')} scale(1.2)` },
      { transform: `${DOM.sun.getAttribute('transform')} scale(1)` },
    ], { duration: 400, easing: 'ease-out' });
    audioEngine.playTick();
  });

  DOM.house.addEventListener('click', () => {
    DOM.house.animate([
      { transform: 'translate(250px, 108px) scale(1)' },
      { transform: 'translate(250px, 104px) scale(1.08, 0.95)' },
      { transform: 'translate(250px, 108px) scale(1)' },
    ], { duration: 350, easing: 'ease-in-out' });
    audioEngine.playTick();
  });

  DOM.clouds.addEventListener('click', () => {
    DOM.clouds.style.opacity = '0.3';
    setTimeout(() => { DOM.clouds.style.opacity = '1'; }, 600);
    audioEngine.playTick();
  });
}

// ==========================================================================
// 12. BAŞLATICI (INITIALIZER)
// ==========================================================================

function init() {
  renderClockFace();
  initWheelPicker();
  setupInteractiveClock();
  updateStatsDisplay();
  setupMicroInteractions();

  // Mod Dropdown Mantığı (Tıklayınca Açılır/Kapanır)
  const modeData = {
    'random': { icon: '🎲', label: 'Rastgele' },
    'digital-to-analog': { icon: '🎯', label: 'Dijitalden Analoga' },
    'analog-to-digital': { icon: '🎡', label: 'Analogdan Dijitale' },
    'analog-to-speech': { icon: '💬', label: 'Konuşma Dili' },
  };

  DOM.modeDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = DOM.modeDropdownMenu.style.display === 'flex';
    DOM.modeDropdownMenu.style.display = isOpen ? 'none' : 'flex';
    DOM.modeDropdownTrigger.classList.toggle('open', !isOpen);
    audioEngine.playTick();
  });

  // Dışarı tıklayınca dropdown kapansın
  window.addEventListener('click', () => {
    DOM.modeDropdownMenu.style.display = 'none';
    DOM.modeDropdownTrigger.classList.remove('open');
  });

  // Seçenek seçimi
  DOM.modeOptionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedMode = btn.dataset.mode;
      state.activeGameMode = selectedMode;
      state.sameTypeCount = 0;

      // UI güncelle
      DOM.modeOptionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      DOM.activeModeIcon.textContent = modeData[selectedMode].icon;
      DOM.activeModeLabel.textContent = modeData[selectedMode].label;

      DOM.modeDropdownMenu.style.display = 'none';
      DOM.modeDropdownTrigger.classList.remove('open');

      audioEngine.playTick();
      const q = generateQuestion();
      showQuestion(q);
    });
  });

  // MOD 1 Submit (Dijitalden Analoga)
  DOM.submitAnalogHandBtn.addEventListener('click', () => {
    const q = state.currentQuestion;
    // Yelkovan hedef dakikaya eşit mi?
    const isCorrect = state.userHandMinute === q.minute
      && state.userHandHour % 12 === q.hour % 12;
    handleAnswer(isCorrect, DOM.submitAnalogHandBtn, q.hour, q.minute);
  });

  // MOD 2 Submit (Wheel Picker)
  DOM.submitWheelBtn.addEventListener('click', () => {
    const q = state.currentQuestion;
    const isCorrect = state.wheelHour === q.hour && state.wheelMinute === q.minute;
    handleAnswer(isCorrect, DOM.submitWheelBtn, q.hour, q.minute);
  });

  // Sonraki Soru Butonu
  DOM.nextQuestionBtn.addEventListener('click', () => {
    const nextQ = generateQuestion();
    showQuestion(nextQ);
  });

  // İlk Soruyu Başlat
  const firstQ = generateQuestion();
  showQuestion(firstQ);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
