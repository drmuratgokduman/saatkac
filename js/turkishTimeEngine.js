// ============================================
// ZAMAN KAŞİFİ — Türkçe Zaman Motoru
// turkishTimeEngine.js
// ============================================

/**
 * Türkçe zaman ifadesi üretimi ve çeldirici algoritması.
 * 
 * Kurallar:
 * - Tam saat: "Saat on iki" (12:00)
 * - Buçuk: "On ikiyi buçuk geçiyor" → "On iki buçuk"
 * - Çeyrek geçiyor: "On ikiyi çeyrek geçiyor"
 * - Çeyrek var: "Bire çeyrek var"
 * - X geçiyor: "On ikiyi beş/on/yirmi/yirmi beş geçiyor"
 * - X var: "Bire beş/on/yirmi/yirmi beş var"
 */
class TurkishTimeEngine {

  constructor() {
    // Saat isimleri (1-12 arası)
    this.HOUR_NAMES = {
      1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört', 5: 'beş', 6: 'altı',
      7: 'yedi', 8: 'sekiz', 9: 'dokuz', 10: 'on', 11: 'on bir', 12: 'on iki',
    };

    // Dakika isimleri
    this.MINUTE_NAMES = {
      5: 'beş', 10: 'on', 15: 'çeyrek', 20: 'yirmi', 25: 'yirmi beş', 30: 'buçuk',
    };

    // Türkçe ünlü uyumu: -i hali ekleri (accusative)
    // Kalın ünlü (a, ı, o, u) → -ı/-yı; İnce ünlü (e, i, ö, ü) → -i/-yi
    this.HOUR_ACCUSATIVE = {
      1: 'biri',       // bir → bir-i
      2: 'ikiyi',      // iki → iki-yi (ünlüyle biter → kaynaştırma y)
      3: 'üçü',        // üç → üç-ü
      4: 'dördü',      // dört → dörd-ü (ünsüz yumuşaması)
      5: 'beşi',       // beş → beş-i
      6: 'altıyı',     // altı → altı-yı (ünlüyle biter → kaynaştırma y)
      7: 'yediyi',     // yedi → yedi-yi
      8: 'sekizi',     // sekiz → sekiz-i
      9: 'dokuzu',     // dokuz → dokuz-u
      10: 'onu',       // on → on-u
      11: 'on biri',   // on bir → on bir-i
      12: 'on ikiyi',  // on iki → on iki-yi
    };

    // Türkçe -e hali ekleri (dative) — "X'e var" için
    this.HOUR_DATIVE = {
      1: 'bire',        // bir → bir-e
      2: 'ikiye',       // iki → iki-ye
      3: 'üçe',         // üç → üç-e
      4: 'dörde',       // dört → dörd-e
      5: 'beşe',        // beş → beş-e
      6: 'altıya',      // altı → altı-ya
      7: 'yediye',      // yedi → yedi-ye
      8: 'sekize',      // sekiz → sekiz-e
      9: 'dokuza',      // dokuz → dokuz-a
      10: 'ona',        // on → on-a
      11: 'on bire',    // on bir → on bir-e
      12: 'on ikiye',   // on iki → on iki-ye
    };
  }

  /**
   * 24 saatlik formatı 12 saatlik formata çevirir
   */
  to12Hour(hour24) {
    let h = hour24 % 12;
    if (h === 0) h = 12;
    return h;
  }

  /**
   * Bir sonraki saati döndürür (12 saatlik)
   */
  nextHour12(hour24) {
    let next = (hour24 + 1) % 24;
    return this.to12Hour(next);
  }

  /**
   * Verilen saat ve dakikayı Türkçe ifadeye çevirir
   * @param {number} hour - Saat (0-23)
   * @param {number} minute - Dakika (0, 5, 10, ..., 55)
   * @returns {string} Türkçe saat ifadesi
   */
  timeToTurkish(hour, minute) {
    const h12 = this.to12Hour(hour);

    if (minute === 0) {
      // Tam saat
      return this._capitalize(`Saat ${this.HOUR_NAMES[h12]}`);
    }

    if (minute === 30) {
      // Buçuk
      return this._capitalize(`${this.HOUR_NAMES[h12]} buçuk`);
    }

    if (minute < 30) {
      // Geçiyor
      const minName = this.MINUTE_NAMES[minute];
      const hourAcc = this.HOUR_ACCUSATIVE[h12];
      return this._capitalize(`${hourAcc} ${minName} geçiyor`);
    }

    // minute > 30 → var
    const nextH = this.nextHour12(hour);
    const remaining = 60 - minute;
    const minName = this.MINUTE_NAMES[remaining];
    const hourDat = this.HOUR_DATIVE[nextH];
    return this._capitalize(`${hourDat} ${minName} var`);
  }

  /**
   * İlk harfi büyük yapar
   */
  _capitalize(str) {
    if (!str) return str;
    // Türkçe i → İ
    const first = str.charAt(0);
    const upper = first === 'i' ? 'İ' : first.toUpperCase();
    return upper + str.slice(1);
  }

  /**
   * Bilinçli çeldiriciler üretir
   * @param {number} hour - Hedef saat (0-23)
   * @param {number} minute - Hedef dakika
   * @returns {string[]} 3 adet çeldirici
   */
  generateDistractors(hour, minute) {
    const distractors = new Set();
    const correctText = this.timeToTurkish(hour, minute);
    const h12 = this.to12Hour(hour);

    // Strateji 1: Akrep-yelkovan karıştırma
    // Dakikayı saat gibi, saati dakika gibi oku
    if (minute !== 0 && minute <= 12) {
      const swapped = this.timeToTurkish(minute, h12 * 5 <= 55 ? h12 * 5 : 0);
      if (swapped !== correctText) distractors.add(swapped);
    }

    // Strateji 2: var/geçiyor yanılgısı
    if (minute > 0 && minute < 60) {
      if (minute <= 30) {
        // Geçiyor → var olarak söyle (yanlış yön)
        const remaining = 60 - minute;
        if (this.MINUTE_NAMES[remaining]) {
          const nextH = this.nextHour12(hour);
          const fake = this._capitalize(`${this.HOUR_DATIVE[nextH]} ${this.MINUTE_NAMES[minute]} var`);
          if (fake !== correctText) distractors.add(fake);
        }
        // Veya aynı dakikayla ama farklı saat
        const fakeHour2 = this._capitalize(`${this.HOUR_DATIVE[h12]} ${this.MINUTE_NAMES[minute] || this.MINUTE_NAMES[60 - minute]} var`);
        if (fakeHour2 !== correctText) distractors.add(fakeHour2);
      } else {
        // Var → geçiyor olarak söyle (yanlış yön)
        const remaining = 60 - minute;
        if (this.MINUTE_NAMES[remaining]) {
          const fake = this._capitalize(`${this.HOUR_ACCUSATIVE[h12]} ${this.MINUTE_NAMES[remaining]} geçiyor`);
          if (fake !== correctText) distractors.add(fake);
        }
      }
    }

    // Strateji 3: ±1 saat kayma
    const prevHour = (hour + 23) % 24;
    const nextHour = (hour + 1) % 24;
    const shiftedPrev = this.timeToTurkish(prevHour, minute);
    const shiftedNext = this.timeToTurkish(nextHour, minute);
    if (shiftedPrev !== correctText) distractors.add(shiftedPrev);
    if (shiftedNext !== correctText) distractors.add(shiftedNext);

    // Strateji 4: ±5 dakika kayma
    const prevMin = (minute + 55) % 60;
    const nextMin = (minute + 5) % 60;
    if (prevMin % 5 === 0) {
      const shiftedMinPrev = this.timeToTurkish(hour, prevMin);
      if (shiftedMinPrev !== correctText) distractors.add(shiftedMinPrev);
    }
    if (nextMin % 5 === 0) {
      const shiftedMinNext = this.timeToTurkish(hour, nextMin);
      if (shiftedMinNext !== correctText) distractors.add(shiftedMinNext);
    }

    // 3 çeldirici seç
    const result = Array.from(distractors).slice(0, 3);

    // Yeterli çeldirici yoksa rastgele saat ekle
    while (result.length < 3) {
      const rHour = Math.floor(Math.random() * 24);
      const rMinIndex = Math.floor(Math.random() * 12);
      const rMin = rMinIndex * 5;
      const text = this.timeToTurkish(rHour, rMin);
      if (text !== correctText && !result.includes(text)) {
        result.push(text);
      }
    }

    return result;
  }
}
