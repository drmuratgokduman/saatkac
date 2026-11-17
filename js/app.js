// ============================================
// ZAMAN KAŞİFİ — Ana Uygulama Modülü (app.js)
// Faz 1: Temel iskelet + saat render
// ============================================

// =====================
// STATE
// =====================
const state = {
  // Mevcut soru
  currentQuestion: null, // { hour, minute, type, story }
  questionType: 1,       // 1: Wheel Picker, 2: Çoktan Seçmeli

  // Oyun durumu
  totalCorrect: 0,
  streak: 0,
  secondChanceActive: false,
  isFirstAttempt: true,

  // Ödüller
  rewards: {
    tree: false,       // 5 doğru
    smoke: false,      // 10 doğru
    balloon: false,    // 15 doğru
    doghouse: false,   // 20 doğru
  },

  // Çark durumu
  wheelHour: 12,
  wheelMinute: 0,
};

// =====================
// DOM REFERANSLARI
// =====================
const DOM = {
  // Saat
  hourHand: document.getElementById('hour-hand'),
  minuteHand: document.getElementById('minute-hand'),
  clockFrame: document.getElementById('clock-frame'),
  clockWrapper: document.getElementById('clock-wrapper'),
  hourNumbers: document.getElementById('hour-numbers'),
  minuteTicks: document.getElementById('minute-ticks'),
  minuteLabels: document.getElementById('minute-labels'),

  // Sahne
  scene: document.getElementById('scene'),
  app: document.getElementById('app'),
  sun: document.getElementById('sun'),
  moon: document.getElementById('moon'),
  stars: document.getElementById('stars'),
  clouds: document.getElementById('clouds'),
  sunFace: document.getElementById('sun-face'),
  moonFace: document.getElementById('moon-face'),
  chimneySmoke: document.getElementById('chimney-smoke'),
  windowLeft: document.querySelector('#window-left rect'),
  windowRight: document.querySelector('#window-right rect'),

  // Ödüller
  rewardTree: document.getElementById('reward-tree'),
  rewardBalloon: document.getElementById('reward-balloon'),
  rewardDoghouse: document.getElementById('reward-doghouse'),

  // UI
  storyText: document.getElementById('story-text'),
  questionText: document.getElementById('question-text'),
  wheelPickerArea: document.getElementById('wheel-picker-area'),
  multipleChoiceArea: document.getElementById('multiple-choice-area'),
  choicesGrid: document.getElementById('choices-grid'),
  feedbackMessage: document.getElementById('feedback-message'),
  nextQuestionBtn: document.getElementById('next-question-btn'),
  submitWheelBtn: document.getElementById('submit-wheel'),
  totalCorrectEl: document.getElementById('total-correct'),
  currentStreakEl: document.getElementById('current-streak'),

  // Çarklar
  hourWheelTrack: document.getElementById('hour-wheel-track'),
  minuteWheelTrack: document.getElementById('minute-wheel-track'),
  hourWheelViewport: document.getElementById('hour-wheel-viewport'),
  minuteWheelViewport: document.getElementById('minute-wheel-viewport'),
};

// =====================
// MOTOR INSTANSLARI
// =====================
const timeEngine = new TurkishTimeEngine();
const audioEngine = new AudioEngine();

// =====================
// SAAT RENDER
// =====================

/**
 * Saat kadranındaki 1-12 sayılarını ve çizgileri çizer
 */
function renderClockFace() {
  const cx = 100, cy = 100, r = 76;

  // Saat sayıları (1-12)
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

  // Dakika çizgileri (60 adet)
  DOM.minuteTicks.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isHour = i % 5 === 0;
    const outerR = 88;
    const innerR = isHour ? 80 : 84;

    const x1 = cx + outerR * Math.cos(angle);
    const y1 = cy + outerR * Math.sin(angle);
    const x2 = cx + innerR * Math.cos(angle);
    const y2 = cy + innerR * Math.sin(angle);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    if (isHour) {
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke', '#555');
    }
    DOM.minuteTicks.appendChild(line);
  }

  // 5'er dakika gizli etiketleri (ipucu olarak)
  DOM.minuteLabels.innerHTML = '';
  const labelR = 65;
  for (let i = 0; i < 60; i += 5) {
    if (i % 5 !== 0 || (i / 5) === 0) {
      // 0 pozisyonunu atla (12 ile çakışır)
    }
    const val = i === 0 ? 60 : i;
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
 * Saat kollarını belirtilen saate döndürür
 * @param {number} hour - Saat (0-23)
 * @param {number} minute - Dakika (0, 5, 10, ... 55)
 */
function setClock(hour, minute) {
  // Yelkovan açısı: dakika × 6
  const minuteAngle = minute * 6;
  // Akrep açısı: (saat % 12) × 30 + dakika × 0.5
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  DOM.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
  DOM.hourHand.style.transform = `rotate(${hourAngle}deg)`;
}

// =====================
// GÖKYÜZÜ SAHNE YÖNETİMİ
// =====================

/**
 * Hedef saate göre zaman dilimini belirler
 */
function getTimePeriod(hour) {
  if (hour >= 6 && hour <= 10) return 'morning';
  if (hour >= 11 && hour <= 15) return 'noon';
  if (hour >= 16 && hour <= 19) return 'evening';
  return 'night'; // 20-05
}

/**
 * Güneş/Ay pozisyonunu saate göre hesaplar
 */
function updateCelestialPosition(hour) {
  const period = getTimePeriod(hour);

  if (period === 'night') {
    // Güneş gizle, ay göster
    DOM.sun.setAttribute('opacity', '0');
    DOM.moon.setAttribute('opacity', '1');
    DOM.stars.setAttribute('opacity', '1');
    DOM.clouds.setAttribute('opacity', '0.3');
  } else {
    // Ay gizle, güneş göster
    DOM.sun.setAttribute('opacity', '1');
    DOM.moon.setAttribute('opacity', '0');
    DOM.stars.setAttribute('opacity', '0');
    DOM.clouds.setAttribute('opacity', '1');

    // Güneşin x pozisyonu saate göre (sabah sol, öğle orta, akşam sağ)
    let sunX, sunY;
    if (period === 'morning') {
      // 6-10 arası: sol taraftan yükselir
      const progress = (hour - 6) / 4; // 0-1
      sunX = 50 + progress * 120;      // 50 → 170
      sunY = 90 - progress * 50;       // 90 → 40
    } else if (period === 'noon') {
      // 11-15 arası: ortada, en yüksekte
      const progress = (hour - 11) / 4;
      sunX = 170 + progress * 60;      // 170 → 230
      sunY = 35 + Math.abs(progress - 0.5) * 20; // ark
    } else {
      // 16-19 arası: sağa doğru alçalır
      const progress = (hour - 16) / 3;
      sunX = 230 + progress * 120;     // 230 → 350
      sunY = 40 + progress * 60;       // 40 → 100
    }
    DOM.sun.setAttribute('transform', `translate(${sunX}, ${sunY})`);
  }
}

/**
 * Sahneyi hedef saate göre günceller (kopya korumalı)
 */
function updateScene(hour) {
  const period = getTimePeriod(hour);
  DOM.app.setAttribute('data-time-period', period);
  updateCelestialPosition(hour);

  // Pencere ışığı (gece sarı yanar)
  if (period === 'night') {
    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', '#FFD700');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', '#FFD700');
  } else {
    if (DOM.windowLeft) DOM.windowLeft.setAttribute('fill', 'var(--window-color)');
    if (DOM.windowRight) DOM.windowRight.setAttribute('fill', 'var(--window-color)');
  }
}

// =====================
// WHEEL PICKER
// =====================

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3; // viewport'ta görünen öğe sayısı (üst, seçili, alt)

/**
 * Çark itemlerini oluşturur
 */
function initWheelPicker() {
  // Saat çarkı (00-23)
  DOM.hourWheelTrack.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = String(i).padStart(2, '0');
    item.dataset.value = i;
    item.setAttribute('role', 'option');
    DOM.hourWheelTrack.appendChild(item);
  }

  // Dakika çarkı (00, 05, 10, ..., 55)
  DOM.minuteWheelTrack.innerHTML = '';
  for (let i = 0; i < 60; i += 5) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = String(i).padStart(2, '0');
    item.dataset.value = i;
    item.setAttribute('role', 'option');
    DOM.minuteWheelTrack.appendChild(item);
  }

  // Çark etkileşimi
  setupWheelInteraction(DOM.hourWheelViewport, DOM.hourWheelTrack, 24, (val) => {
    state.wheelHour = val;
  });
  setupWheelInteraction(DOM.minuteWheelViewport, DOM.minuteWheelTrack, 12, (val) => {
    state.wheelMinute = val * 5;
  });

  // Varsayılan pozisyon
  scrollWheelTo(DOM.hourWheelTrack, 12, 24);
  scrollWheelTo(DOM.minuteWheelTrack, 0, 12);
}

/**
 * Çarkı belirtilen indekse kaydırır
 */
function scrollWheelTo(track, index, totalItems) {
  const centerOffset = (150 - ITEM_HEIGHT) / 2; // viewport yüksekliğinin ortası
  const offset = -(index * ITEM_HEIGHT) + centerOffset;
  track.style.transform = `translateY(${offset}px)`;
  updateWheelItemStyles(track, index);
}

/**
 * Çark öğelerinin stil güncellemesi (uzaktakiler soluk)
 */
function updateWheelItemStyles(track, selectedIndex) {
  const items = track.querySelectorAll('.wheel-item');
  items.forEach((item, i) => {
    if (Math.abs(i - selectedIndex) > 1) {
      item.classList.add('dimmed');
    } else {
      item.classList.remove('dimmed');
    }
  });
}

/**
 * Çark dokunma/fare etkileşimini kurar
 */
function setupWheelInteraction(viewport, track, totalItems, onChange) {
  let startY = 0;
  let currentOffset = 0;
  let selectedIndex = 0;
  let isDragging = false;
  let lastY = 0;
  let velocity = 0;
  let animationId = null;

  const centerOffset = (150 - ITEM_HEIGHT) / 2;
  const minOffset = -((totalItems - 1) * ITEM_HEIGHT) + centerOffset;
  const maxOffset = centerOffset;

  function getOffset() {
    const transform = track.style.transform;
    const match = transform.match(/translateY\(([^)]+)px\)/);
    return match ? parseFloat(match[1]) : centerOffset;
  }

  function snapToNearest() {
    const raw = getOffset();
    const index = Math.round((centerOffset - raw) / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(totalItems - 1, index));
    selectedIndex = clamped;
    scrollWheelTo(track, clamped, totalItems);
    onChange(clamped);
    // Tık sesi
    audioEngine.playTick();
  }

  function onStart(clientY) {
    isDragging = true;
    startY = clientY;
    currentOffset = getOffset();
    velocity = 0;
    if (animationId) cancelAnimationFrame(animationId);
    track.style.transition = 'none';
  }

  function onMove(clientY) {
    if (!isDragging) return;
    const delta = clientY - startY;
    velocity = clientY - lastY;
    lastY = clientY;
    let newOffset = currentOffset + delta;
    // Elastik sınırlama
    if (newOffset > maxOffset) newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
    if (newOffset < minOffset) newOffset = minOffset + (newOffset - minOffset) * 0.3;
    track.style.transform = `translateY(${newOffset}px)`;

    // Geçen öğeyi güncelle
    const passedIndex = Math.round((centerOffset - newOffset) / ITEM_HEIGHT);
    updateWheelItemStyles(track, Math.max(0, Math.min(totalItems - 1, passedIndex)));
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // Momentum
    if (Math.abs(velocity) > 3) {
      const momentum = velocity * 2;
      const raw = getOffset() + momentum;
      const index = Math.round((centerOffset - raw) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(totalItems - 1, index));
      selectedIndex = clamped;
      scrollWheelTo(track, clamped, totalItems);
      onChange(clamped);
      audioEngine.playTick();
    } else {
      snapToNearest();
    }
  }

  // Dokunma olayları
  viewport.addEventListener('touchstart', (e) => {
    onStart(e.touches[0].clientY);
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    onMove(e.touches[0].clientY);
  }, { passive: true });

  viewport.addEventListener('touchend', onEnd);

  // Fare olayları
  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onStart(e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    onMove(e.clientY);
  });

  window.addEventListener('mouseup', onEnd);
}

// =====================
// SORU ÜRETME
// =====================

/** Bağlamsal hikayeler */
const STORIES = {
  morning: [
    "Günaydın! Kahvaltı hazır! ☀️",
    "Okul servisi kapıya geldi! 🚌",
    "Sabah sporu zamanı! 🏃",
    "Dişlerini fırçalama vakti! 🪥",
    "Kuşlar şarkı söylüyor! 🐦",
    "Okul çantanı hazırla! 🎒",
    "Anneannen seni arıyor! 📞",
    "Parkta sabah yürüyüşü! 🌳",
  ],
  noon: [
    "Öğle yemeği zamanı! 🍽️",
    "Teneffüs zili çaldı! 🔔",
    "Arkadaşlarınla oyun vakti! ⚽",
    "Matematik dersi başlıyor! 📐",
    "Kantinde sıra sende! 🥪",
    "Resim dersi ne güzel! 🎨",
    "Kütüphanede kitap okuma saati! 📚",
    "Müzik dersi başlıyor! 🎵",
  ],
  evening: [
    "Akşam yemeği hazırlanıyor! 🍳",
    "Güneş batmaya başladı! 🌅",
    "Ödevlerini bitirelim mi? 📝",
    "Aile ile çay saati! 🍵",
    "Parktan eve dönme zamanı! 🏠",
    "Annene yardım et! 👩‍👧",
    "Akşam çizgi film saati! 📺",
    "Balkonda gökyüzünü izle! 🌆",
  ],
  night: [
    "Uyku vakti yaklaşıyor! 😴",
    "Pijamalarını giy! 👕",
    "Yatmadan önce masal vakti! 📖",
    "Yıldızlar çıkmaya başladı! ⭐",
    "Dişlerini fırçaladın mı? 🦷",
    "İyi geceler! Tatlı rüyalar! 🌙",
    "Gece lambası yanıyor! 💡",
    "Peluş oyuncağını kucakla! 🧸",
  ],
};

/**
 * Rastgele bir saat-dakika çifti üretir
 */
function generateRandomTime() {
  const hour = Math.floor(Math.random() * 24);
  const minuteIndex = Math.floor(Math.random() * 12);
  const minute = minuteIndex * 5;
  return { hour, minute };
}

/**
 * Yeni soru oluşturur
 */
function generateQuestion() {
  const { hour, minute } = generateRandomTime();
  const period = getTimePeriod(hour);

  // Rastgele tip (1 veya 2)
  const type = Math.random() < 0.5 ? 1 : 2;

  // Rastgele hikaye
  const stories = STORIES[period];
  const story = stories[Math.floor(Math.random() * stories.length)];

  state.currentQuestion = { hour, minute, type, story, period };
  state.isFirstAttempt = true;
  state.secondChanceActive = false;

  return state.currentQuestion;
}

// =====================
// SORU GÖSTERME
// =====================

function showQuestion(question) {
  const { hour, minute, type, story } = question;

  // Saati ayarla
  setClock(hour, minute);

  // Sahneyi güncelle (kopya koruması: sadece yeni soruda)
  updateScene(hour);

  // Hikaye ve soru metnini güncelle
  DOM.storyText.textContent = story;

  // Geri bildirimi temizle
  DOM.feedbackMessage.textContent = '';
  DOM.feedbackMessage.className = 'feedback-message';
  DOM.nextQuestionBtn.style.display = 'none';

  // İpucu etiketlerini gizle
  DOM.minuteLabels.classList.remove('visible');

  if (type === 1) {
    // Tip 1: Wheel Picker
    DOM.questionText.textContent = "Bu saat kaçı gösteriyor? Çarkları çevirerek ayarla!";
    DOM.wheelPickerArea.style.display = 'block';
    DOM.multipleChoiceArea.style.display = 'none';
    // Çarkları rastgele bir başlangıç noktasına ayarla
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinIndex = Math.floor(Math.random() * 12);
    state.wheelHour = randomHour;
    state.wheelMinute = randomMinIndex * 5;
    scrollWheelTo(DOM.hourWheelTrack, randomHour, 24);
    scrollWheelTo(DOM.minuteWheelTrack, randomMinIndex, 12);
  } else {
    // Tip 2: Çoktan Seçmeli
    DOM.questionText.textContent = "Bu saat kaçı gösteriyor?";
    DOM.wheelPickerArea.style.display = 'none';
    DOM.multipleChoiceArea.style.display = 'block';
    renderChoices(hour, minute);
  }
}

/**
 * Çoktan seçmeli şıkları render eder
 */
function renderChoices(hour, minute) {
  const correctText = timeEngine.timeToTurkish(hour, minute);
  const distractors = timeEngine.generateDistractors(hour, minute);

  // Tüm şıkları karıştır
  const allChoices = [
    { text: correctText, correct: true },
    ...distractors.map(d => ({ text: d, correct: false })),
  ];
  shuffleArray(allChoices);

  DOM.choicesGrid.innerHTML = '';
  allChoices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.text;
    btn.type = 'button';
    btn.addEventListener('click', () => handleChoiceClick(btn, choice.correct, hour, minute));
    DOM.choicesGrid.appendChild(btn);
  });
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// =====================
// CEVAP KONTROL
// =====================

function handleChoiceClick(btn, isCorrect, hour, minute) {
  if (isCorrect) {
    onCorrectAnswer(btn);
  } else {
    onWrongAnswer(btn, hour, minute);
  }
}

function handleWheelSubmit() {
  const { hour, minute } = state.currentQuestion;
  if (state.wheelHour === hour && state.wheelMinute === minute) {
    onCorrectAnswer(DOM.submitWheelBtn);
  } else {
    onWrongAnswer(DOM.submitWheelBtn, hour, minute);
  }
}

function onCorrectAnswer(element) {
  state.totalCorrect++;
  state.streak++;
  state.isFirstAttempt = true;

  // localStorage güncelle
  saveProgress();

  // UI güncelle
  DOM.totalCorrectEl.textContent = state.totalCorrect;
  DOM.currentStreakEl.textContent = state.streak;

  // Geri bildirim
  if (element.classList) element.classList.add('correct');
  DOM.feedbackMessage.textContent = getSuccessMessage();
  DOM.feedbackMessage.className = 'feedback-message success';
  DOM.nextQuestionBtn.style.display = 'inline-flex';

  // Ses
  audioEngine.playCorrect();

  // Şıkları/butonu devre dışı bırak
  disableAnswerInputs();

  // Streak kontrol
  checkStreak();

  // Ödül kontrol
  checkRewards();
}

function onWrongAnswer(element, hour, minute) {
  if (state.isFirstAttempt) {
    // İlk yanlış: ikinci şans
    state.isFirstAttempt = false;
    state.secondChanceActive = true;

    if (element.classList) element.classList.add('wrong');

    // İpucu göster
    DOM.minuteLabels.classList.add('visible');
    DOM.feedbackMessage.textContent = "Tekrar dene! İpucu: Kadrandaki dakika sayılarına bak 🔍";
    DOM.feedbackMessage.className = 'feedback-message hint';

    // Ses
    audioEngine.playWrong();

    // Sadece tıklanan şıkkı devre dışı bırak (çoktan seçmelide)
    if (element.classList && element.classList.contains('choice-btn')) {
      element.disabled = true;
    }
  } else {
    // İkinci yanlış: doğruyu göster, streak sıfırla
    state.streak = 0;
    DOM.currentStreakEl.textContent = state.streak;

    if (element.classList) element.classList.add('wrong');

    const correctText = timeEngine.timeToTurkish(hour, minute);
    DOM.feedbackMessage.textContent = `Doğru cevap: ${correctText}`;
    DOM.feedbackMessage.className = 'feedback-message error';
    DOM.nextQuestionBtn.style.display = 'inline-flex';

    // Ses
    audioEngine.playWrong();

    // Tümünü devre dışı bırak ve doğruyu işaretle
    disableAnswerInputs();
    highlightCorrectChoice(hour, minute);

    // Altın çerçeveyi kaldır
    DOM.clockWrapper.classList.remove('golden');
    // Yüz animasyonlarını kapat
    DOM.sunFace.classList.remove('winking');
    DOM.moonFace.classList.remove('winking');
    DOM.sunFace.setAttribute('opacity', '0');
    DOM.moonFace.setAttribute('opacity', '0');
  }
}

function disableAnswerInputs() {
  // Çoktan seçmeli şıkları devre dışı bırak
  DOM.choicesGrid.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
  });
  // Çark submit butonunu devre dışı bırak
  DOM.submitWheelBtn.disabled = true;
}

function highlightCorrectChoice(hour, minute) {
  const correctText = timeEngine.timeToTurkish(hour, minute);
  DOM.choicesGrid.querySelectorAll('.choice-btn').forEach(btn => {
    if (btn.textContent === correctText && !btn.classList.contains('wrong')) {
      btn.classList.add('correct');
    }
  });
}

function getSuccessMessage() {
  const messages = [
    "Harika! 🎉", "Süpersin! ⭐", "Mükemmel! 🏆",
    "Bravo! 👏", "Çok iyi! 🌟", "Doğru! 💪",
    "Aferin! 🎊", "Tam isabet! 🎯",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// =====================
// STREAK & ÖDÜLLER
// =====================

function checkStreak() {
  if (state.streak >= 3) {
    DOM.clockWrapper.classList.add('golden');
  }
  if (state.streak >= 5) {
    // Güneş/ay gülümseme
    const period = getTimePeriod(state.currentQuestion.hour);
    if (period === 'night') {
      DOM.moonFace.setAttribute('opacity', '1');
      DOM.moonFace.classList.add('winking');
    } else {
      DOM.sunFace.setAttribute('opacity', '1');
      DOM.sunFace.classList.add('winking');
    }
    audioEngine.playCelebration();
  }
}

function checkRewards() {
  const tc = state.totalCorrect;

  if (tc >= 5 && !state.rewards.tree) {
    state.rewards.tree = true;
    activateReward(DOM.rewardTree);
  }
  if (tc >= 10 && !state.rewards.smoke) {
    state.rewards.smoke = true;
    DOM.chimneySmoke.setAttribute('opacity', '1');
    activateReward(DOM.chimneySmoke);
  }
  if (tc >= 15 && !state.rewards.balloon) {
    state.rewards.balloon = true;
    activateReward(DOM.rewardBalloon);
  }
  if (tc >= 20 && !state.rewards.doghouse) {
    state.rewards.doghouse = true;
    activateReward(DOM.rewardDoghouse);
  }

  saveProgress();
}

function activateReward(element) {
  element.setAttribute('opacity', '1');
  element.classList.add('active');
  audioEngine.playCelebration();
}

// =====================
// SAHNE MİKRO-ETKİLEŞİMLER
// =====================

function setupSceneInteractions() {
  // Güneşe tıklama
  DOM.sun.addEventListener('click', () => {
    DOM.sun.querySelector('.sun-body').style.transition = 'r 0.3s ease';
    const body = DOM.sun.querySelector('.sun-body');
    const originalR = body.getAttribute('r');
    body.setAttribute('r', '25');
    setTimeout(() => body.setAttribute('r', originalR), 300);
    audioEngine.playTick();
  });

  // Aya tıklama
  DOM.moon.addEventListener('click', () => {
    DOM.moon.style.transition = 'transform 0.5s ease';
    DOM.moon.style.filter = 'brightness(1.5)';
    setTimeout(() => { DOM.moon.style.filter = ''; }, 500);
    audioEngine.playTick();
  });

  // Bulutlara tıklama
  DOM.clouds.addEventListener('click', () => {
    DOM.clouds.style.transition = 'opacity 0.5s ease';
    DOM.clouds.setAttribute('opacity', '0.3');
    setTimeout(() => DOM.clouds.setAttribute('opacity', '1'), 800);
    audioEngine.playTick();
  });

  // Eve tıklama
  document.getElementById('house').addEventListener('click', () => {
    const house = document.getElementById('house');
    house.style.transition = 'transform 0.3s ease';
    house.style.transformOrigin = 'center bottom';
    // Ufak sallanma
    house.animate([
      { transform: 'translate(200px, 155px) rotate(-2deg)' },
      { transform: 'translate(200px, 155px) rotate(2deg)' },
      { transform: 'translate(200px, 155px) rotate(0deg)' },
    ], { duration: 400, easing: 'ease-in-out' });
    audioEngine.playTick();
  });
}

// =====================
// KALICI VERİ (localStorage)
// =====================

function saveProgress() {
  const data = {
    totalCorrect: state.totalCorrect,
    rewards: state.rewards,
  };
  try {
    localStorage.setItem('zamanKasifi', JSON.stringify(data));
  } catch (e) {
    // localStorage kullanılamıyorsa sessizce devam et
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('zamanKasifi');
    if (raw) {
      const data = JSON.parse(raw);
      state.totalCorrect = data.totalCorrect || 0;
      state.rewards = data.rewards || state.rewards;

      // UI güncelle
      DOM.totalCorrectEl.textContent = state.totalCorrect;

      // Ödülleri restore et
      if (state.rewards.tree) {
        DOM.rewardTree.setAttribute('opacity', '1');
        DOM.rewardTree.classList.add('active');
      }
      if (state.rewards.smoke) {
        DOM.chimneySmoke.setAttribute('opacity', '1');
      }
      if (state.rewards.balloon) {
        DOM.rewardBalloon.setAttribute('opacity', '1');
        DOM.rewardBalloon.classList.add('active');
      }
      if (state.rewards.doghouse) {
        DOM.rewardDoghouse.setAttribute('opacity', '1');
        DOM.rewardDoghouse.classList.add('active');
      }
    }
  } catch (e) {
    // localStorage kullanılamıyorsa sessizce devam et
  }
}

// =====================
// OLAY DİNLEYİCİLERİ
// =====================

function setupEventListeners() {
  // Çark submit
  DOM.submitWheelBtn.addEventListener('click', handleWheelSubmit);

  // Sonraki soru
  DOM.nextQuestionBtn.addEventListener('click', () => {
    DOM.submitWheelBtn.disabled = false;
    const question = generateQuestion();
    showQuestion(question);
  });
}

// =====================
// BAŞLATMA
// =====================

function init() {
  // Saat kadranını çiz
  renderClockFace();

  // Çarkları başlat
  initWheelPicker();

  // Kayıtlı ilerlemeyi yükle
  loadProgress();

  // Olay dinleyicileri
  setupEventListeners();

  // Sahne mikro-etkileşimleri
  setupSceneInteractions();

  // İlk soruyu göster
  const question = generateQuestion();
  showQuestion(question);
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
