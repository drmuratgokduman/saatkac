// ==========================================================================
// ZAMAN KAŞİFİ — Modern EdTech Uygulama Orkestratörü
// app.js — UI, State, Ses, Sahne ve Otomatik Akış
// ==========================================================================

// =====================
// STATE (UYGULAMA DURUMU)
// =====================
const state = {
  currentQuestion: null, // { hour, minute, type, story, period }
  totalCorrect: 0,
  streak: 0,
  secondChanceActive: false,
  isFirstAttempt: true,
  isTransitioning: false, // Yeni soruya geçiş koruması

  // Ödül Eşikleri
  rewards: {
    tree: false,     // 5 Doğru
    smoke: false,    // 10 Doğru
    balloon: false,  // 15 Doğru
    doghouse: false, // 20 Doğru
  },

  // Wheel Picker Seçimleri
  wheelHour: 12,
  wheelMinute: 0,
};

// =====================
// DOM REFERANSLARI
// =====================
const DOM = {
  app: document.getElementById('app'),
  body: document.body,
  
  // Saat Öğeleri
  hourHandGroup: document.getElementById('hour-hand-group'),
  minuteHandGroup: document.getElementById('minute-hand-group'),
  clockWrapper: document.getElementById('clock-wrapper'),
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

  // İlerleme ve Rozetler
  totalCorrectEl: document.getElementById('total-correct'),
  currentStreakEl: document.getElementById('current-streak'),
  rewardProgressBar: document.getElementById('reward-progress-bar'),
  rewardProgressText: document.getElementById('reward-progress-text'),
  nextRewardIcon: document.getElementById('next-reward-icon'),
  mascotFace: document.getElementById('mascot-face'),

  // Soru ve Yanıt Alanları
  storyText: document.getElementById('story-text'),
  questionText: document.getElementById('question-text'),
  wheelPickerArea: document.getElementById('wheel-picker-area'),
  multipleChoiceArea: document.getElementById('multiple-choice-area'),
  choicesGrid: document.getElementById('choices-grid'),
  submitWheelBtn: document.getElementById('submit-wheel'),
  feedbackMessage: document.getElementById('feedback-message'),
  nextQuestionBtn: document.getElementById('next-question-btn'),

  // Wheel Picker Çarkları
  hourWheelTrack: document.getElementById('hour-wheel-track'),
  minuteWheelTrack: document.getElementById('minute-wheel-track'),
  hourWheelViewport: document.getElementById('hour-wheel-viewport'),
  minuteWheelViewport: document.getElementById('minute-wheel-viewport'),
};

// =====================
// MOTORLARI BAŞLAT
// =====================
const timeEngine = new TurkishTimeEngine();
const audioEngine = new AudioEngine();

// ==========================================================================
// 1. ANALOG SAAT KADRANI ÇİZİMİ & DÖNDÜRME
// ==========================================================================

function renderClockFace() {
  const cx = 120, cy = 120, r = 78;

  // 1'den 12'ye Sayıları Çiz
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

  // 60 Adet Dakika Çentiği Çiz
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

  // 5'er Dakikalık Gizli İpucu Sayıları
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

/**
 * Saati verilen saat ve dakikaya döndürür
 * Gerçekçi Akrep formülü: (saat % 12) * 30 + dakika * 0.5
 */
function setClock(hour, minute) {
  const minuteAngle = minute * 6;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  DOM.minuteHandGroup.style.transform = `rotate(${minuteAngle}deg)`;
  DOM.hourHandGroup.style.transform = `rotate(${hourAngle}deg)`;
}

// ==========================================================================
// 2. TÜM EKRAN DİNAMİK GÖKYÜZÜ (ATMOSFER YÖNETİMİ)
// ==========================================================================

function getTimePeriod(hour) {
  if (hour >= 6 && hour <= 10) return 'morning';
  if (hour >= 11 && hour <= 15) return 'noon';
  if (hour >= 16 && hour <= 19) return 'evening';
  return 'night';
}

function updateScene(hour) {
  const period = getTimePeriod(hour);
  
  // TÜM SAYFA (BODY & APP) ATMOSFERE BÜRÜNÜR
  DOM.body.setAttribute('data-time-period', period);
  DOM.app.setAttribute('data-time-period', period);

  // VAKİT ROZETİ (Görsel kafa karıştırmasın diye açık metin)
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

    // Pencere Işıkları Gece Parlak Sarı
    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', '#FBBF24');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', '#FBBF24');
  } else {
    DOM.sun.setAttribute('opacity', '1');
    DOM.moon.setAttribute('opacity', '0');
    DOM.stars.setAttribute('opacity', '0');
    DOM.clouds.setAttribute('opacity', '1');

    // Güneş Konumu
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

    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', 'var(--window-light)');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', 'var(--window-light)');
  }
}

// ==========================================================================
// 3. WHEEL PICKER (iOS 3D SİLİNDİR ETKİLEŞİMİ)
// ==========================================================================

const WHEEL_ITEM_H = 36; // Mobilde kompakt 36px

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
  const centerOffset = (110 - WHEEL_ITEM_H) / 2;
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
  const centerOffset = (110 - WHEEL_ITEM_H) / 2;
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

  // Mobil Dokunma
  viewport.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientY), { passive: true });
  viewport.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientY), { passive: true });
  viewport.addEventListener('touchend', endDrag);

  // Masaüstü Fare
  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag(e.clientY);
  });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientY));
  window.addEventListener('mouseup', endDrag);

  // Scroll Tekerleği
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
// 4. BAĞLAMSAL HİKAYELER VE PEDAGOJİK SORU MOTORU
// ==========================================================================

const STORIES = {
  morning: [
    "Güneş doğdu, taze simit kokuları geliyor! ☀️",
    "Servisin kornası çaldı, okula gitme vakti! 🚌",
    "Kuşlar cıvıldıyor, sabah kahvaltısı hazır! 🥞",
    "Dişlerini fırçala, harika bir gün seni bekliyor! 🪥",
  ],
  noon: [
    "Teneffüs zili çaldı, bahçede oyun zamanı! ⚽",
    "Öğle yemeğinde lezzetli köfteler var! 🍽️",
    "Matematik dersinde yeni bir keşif yaptık! 📐",
    "Kütüphanede macera dolu bir kitap okuyoruz! 📚",
  ],
  evening: [
    "Güneş kızıla boyandı, parktan dönme saati! 🌅",
    "Akşam yemeği kokusu tüm evi sardı! 🍲",
    "Ödevler bitti, şimdi sevdiğin oyunu oynama vakti! 🎮",
    "Balkonda gökyüzünün renklerini izliyoruz! 🌇",
  ],
  night: [
    "Pencerelerden sarı ışıklar yanıyor, masal saati! 📖",
    "Yıldızlar pırıl pırıl parlıyor, pijama partisi! 🌟",
    "Sıcacık yatağına gir ve tatlı rüyalara dal! 😴",
    "Bilge baykuş nöbette, iyi geceler zaman kaşifi! 🦉",
  ],
};

function generateQuestion() {
  const hour = Math.floor(Math.random() * 24);
  const minuteIndex = Math.floor(Math.random() * 12);
  const minute = minuteIndex * 5;
  const period = getTimePeriod(hour);

  const stories = STORIES[period];
  const story = stories[Math.floor(Math.random() * stories.length)];
  const type = Math.random() < 0.5 ? 1 : 2;

  state.currentQuestion = { hour, minute, type, story, period };
  state.isFirstAttempt = true;
  state.secondChanceActive = false;
  state.isTransitioning = false;

  return state.currentQuestion;
}

function showQuestion(q) {
  setClock(q.hour, q.minute);
  updateScene(q.hour);

  DOM.storyText.textContent = q.story;
  DOM.feedbackMessage.className = 'feedback-banner';
  DOM.feedbackMessage.style.display = 'none';
  DOM.nextQuestionBtn.style.display = 'none';
  DOM.minuteLabels.classList.remove('visible');

  DOM.mascotFace.textContent = q.period === 'night' ? '🦉' : '🦊';

  if (q.type === 1) {
    DOM.questionText.textContent = "Çarkları çevir ve dijital saati ayarla!";
    DOM.wheelPickerArea.style.display = 'block';
    DOM.multipleChoiceArea.style.display = 'none';
    DOM.submitWheelBtn.disabled = false;

    const randH = Math.floor(Math.random() * 24);
    const randMIdx = Math.floor(Math.random() * 12);
    state.wheelHour = randH;
    state.wheelMinute = randMIdx * 5;
    scrollWheelTo(DOM.hourWheelTrack, randH);
    scrollWheelTo(DOM.minuteWheelTrack, randMIdx);
  } else {
    DOM.questionText.textContent = "Bu saat nasıl okunur?";
    DOM.wheelPickerArea.style.display = 'none';
    DOM.multipleChoiceArea.style.display = 'block';
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
// 5. CEVAP KONTROLÜ & OTOMATİK SONRAKİ SORU GEÇİŞİ
// ==========================================================================

function handleAnswer(isCorrect, element, hour, minute) {
  if (state.isTransitioning) return; // Geçiş sırasında çift tıklamayı önler

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
  saveProgress();
  updateStatsDisplay();

  if (element && element.classList) {
    element.classList.add('is-correct');
  }

  showBanner('Harika bildin! Süper bir zaman kaşifisin! 🌟', 'success');
  audioEngine.playCorrect();
  disableAnswerArea();
  checkGamificationRewards();

  // OTOMATİK GEÇİŞ: Ses efekti ve tebrikten hemen sonra kendiliğinden yeni soruya geçer!
  setTimeout(() => {
    const nextQ = generateQuestion();
    showQuestion(nextQ);
  }, 1350);
}

function onWrong(element, hour, minute) {
  if (state.isFirstAttempt) {
    // İKİNCİ ŞANS: Ceza yok, kadranda 5'er dakika sayıları belirir
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
    // İkinci Yanlış: Doğru gösterilir, streak sıfırlanır, öğrencinin incelemesi için buton çıkar
    state.streak = 0;
    updateStatsDisplay();

    if (element && element.classList) {
      element.classList.add('is-wrong');
    }

    const correct = timeEngine.timeToTurkish(hour, minute);
    showBanner(`Doğru okunuş: "${correct}" ✨`, 'error');
    audioEngine.playWrong();

    highlightCorrectChoice(correct);
    disableAnswerArea();

    DOM.clockWrapper.classList.remove('golden-streak');
    // Doğruyu inceledikten sonra devam etmek için manuel buton gösterilir
    DOM.nextQuestionBtn.style.display = 'flex';
  }
}

function disableAnswerArea() {
  DOM.choicesGrid.querySelectorAll('.choice-card-btn').forEach(b => b.disabled = true);
  DOM.submitWheelBtn.disabled = true;
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
// 6. OYUNLAŞTIRMA & İLERLEME
// ==========================================================================

function updateStatsDisplay() {
  DOM.totalCorrectEl.textContent = state.totalCorrect;
  DOM.currentStreakEl.textContent = state.streak;

  const tc = state.totalCorrect;
  let target = 5;
  let icon = '🌳';

  if (tc < 5) { target = 5; icon = '🌳'; }
  else if (tc < 10) { target = 10; icon = '💨'; }
  else if (tc < 15) { target = 15; icon = '🎈'; }
  else if (tc < 20) { target = 20; icon = '🐕'; }
  else { target = 25; icon = '👑'; }

  const currentLevelProgress = tc >= 20 ? 100 : ((tc % 5) / 5) * 100;
  DOM.rewardProgressBar.style.width = `${currentLevelProgress}%`;
  DOM.rewardProgressText.textContent = `${tc}/${target}`;
  DOM.nextRewardIcon.textContent = icon;
}

function checkGamificationRewards() {
  if (state.streak >= 3) {
    DOM.clockWrapper.classList.add('golden-streak');
  }

  const tc = state.totalCorrect;

  if (tc >= 5 && !state.rewards.tree) {
    state.rewards.tree = true;
    unlockReward(DOM.rewardTree, '🌳 Bahçene ağaç dikildi!');
  }
  if (tc >= 10 && !state.rewards.smoke) {
    state.rewards.smoke = true;
    unlockReward(DOM.chimneySmoke, '💨 Evin bacasından duman tütüyor!');
  }
  if (tc >= 15 && !state.rewards.balloon) {
    state.rewards.balloon = true;
    unlockReward(DOM.rewardBalloon, '🎈 Sıcak hava balonu süzülüyor!');
  }
  if (tc >= 20 && !state.rewards.doghouse) {
    state.rewards.doghouse = true;
    unlockReward(DOM.rewardDoghouse, '🐕 Sevimli bir köpek kulübesi geldi!');
  }

  saveProgress();
}

function unlockReward(el, msg) {
  el.classList.add('unlocked');
  el.setAttribute('opacity', '1');
  showBanner(`Tebrikler! ${msg}`, 'success');
  audioEngine.playCelebration();
}

// ==========================================================================
// 7. MİKRO-ETKİLEŞİMLER & LOCALSTORAGE
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
      { transform: 'translate(240px, 150px) scale(1)' },
      { transform: 'translate(240px, 145px) scale(1.08, 0.95)' },
      { transform: 'translate(240px, 150px) scale(1)' },
    ], { duration: 350, easing: 'ease-in-out' });
    audioEngine.playTick();
  });

  DOM.clouds.addEventListener('click', () => {
    DOM.clouds.style.opacity = '0.3';
    setTimeout(() => { DOM.clouds.style.opacity = '1'; }, 600);
    audioEngine.playTick();
  });
}

function saveProgress() {
  try {
    localStorage.setItem('zamanKasifiData', JSON.stringify({
      totalCorrect: state.totalCorrect,
      rewards: state.rewards,
    }));
  } catch (e) {}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('zamanKasifiData');
    if (raw) {
      const data = JSON.parse(raw);
      state.totalCorrect = data.totalCorrect || 0;
      state.rewards = data.rewards || state.rewards;

      if (state.rewards.tree) DOM.rewardTree.classList.add('unlocked');
      if (state.rewards.smoke) DOM.chimneySmoke.classList.add('unlocked');
      if (state.rewards.balloon) DOM.rewardBalloon.classList.add('unlocked');
      if (state.rewards.doghouse) DOM.rewardDoghouse.classList.add('unlocked');
    }
  } catch (e) {}
  updateStatsDisplay();
}

// ==========================================================================
// 8. BAŞLATICI (INITIALIZER)
// ==========================================================================

function init() {
  renderClockFace();
  initWheelPicker();
  loadProgress();
  setupMicroInteractions();

  // Wheel Submit Butonu
  DOM.submitWheelBtn.addEventListener('click', () => {
    const q = state.currentQuestion;
    const isCorrect = state.wheelHour === q.hour && state.wheelMinute === q.minute;
    handleAnswer(isCorrect, DOM.submitWheelBtn, q.hour, q.minute);
  });

  // Sonraki Soru Butonu (Yanlış cevap durumunda inceleyip geçmek için)
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
