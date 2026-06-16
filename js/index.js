window.addEventListener("load", () => {
      setTimeout(() => {
        document.getElementById("loading").classList.add("hide");
      }, 900);
    });

    function INT(d) {
      return Math.floor(d);
    }

    function jdFromDate(dd, mm, yy) {
      const a = INT((14 - mm) / 12);
      const y = yy + 4800 - a;
      const m = mm + 12 * a - 3;
      let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;

      if (jd < 2299161) {
        jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
      }

      return jd;
    }

    function jdToDate(jd) {
      let a, b, c;

      if (jd > 2299160) {
        a = jd + 32044;
        b = INT((4 * a + 3) / 146097);
        c = a - INT((b * 146097) / 4);
      } else {
        b = 0;
        c = jd + 32082;
      }

      const d = INT((4 * c + 3) / 1461);
      const e = c - INT((1461 * d) / 4);
      const m = INT((5 * e + 2) / 153);

      const day = e - INT((153 * m + 2) / 5) + 1;
      const month = m + 3 - 12 * INT(m / 10);
      const year = b * 100 + d - 4800 + INT(m / 10);

      return [day, month, year];
    }

    function getNewMoonDay(k, timeZone) {
      const T = k / 1236.85;
      const T2 = T * T;
      const T3 = T2 * T;
      const dr = Math.PI / 180;

      let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
      Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

      const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
      const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
      const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

      let C1 =
        (0.1734 - 0.000393 * T) * Math.sin(M * dr)
        + 0.0021 * Math.sin(2 * dr * M)
        - 0.4068 * Math.sin(Mpr * dr)
        + 0.0161 * Math.sin(2 * dr * Mpr)
        - 0.0004 * Math.sin(3 * dr * Mpr)
        + 0.0104 * Math.sin(2 * dr * F)
        - 0.0051 * Math.sin((M + Mpr) * dr)
        - 0.0074 * Math.sin((M - Mpr) * dr)
        + 0.0004 * Math.sin((2 * F + M) * dr)
        - 0.0004 * Math.sin((2 * F - M) * dr)
        - 0.0006 * Math.sin((2 * F + Mpr) * dr)
        + 0.0010 * Math.sin((2 * F - Mpr) * dr)
        + 0.0005 * Math.sin((2 * Mpr + M) * dr);

      let deltaT;

      if (T < -11) {
        deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
      } else {
        deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
      }

      const JdNew = Jd1 + C1 - deltaT;

      return INT(JdNew + 0.5 + timeZone / 24);
    }

    function getSunLongitude(jdn, timeZone) {
      const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
      const T2 = T * T;
      const dr = Math.PI / 180;
      const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
      const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

      let DL =
        (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
        + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
        + 0.000290 * Math.sin(dr * 3 * M);

      let L = L0 + DL;
      L = L * dr;
      L = L - Math.PI * 2 * INT(L / (Math.PI * 2));

      return INT(L / Math.PI * 6);
    }

    function getLunarMonth11(yy, timeZone) {
      const off = jdFromDate(31, 12, yy) - 2415021;
      const k = INT(off / 29.530588853);
      let nm = getNewMoonDay(k, timeZone);
      const sunLong = getSunLongitude(nm, timeZone);

      if (sunLong >= 9) {
        nm = getNewMoonDay(k - 1, timeZone);
      }

      return nm;
    }

    function getLeapMonthOffset(a11, timeZone) {
      const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
      let last = 0;
      let i = 1;
      let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

      do {
        last = arc;
        i++;
        arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
      } while (arc !== last && i < 14);

      return i - 1;
    }

    function convertSolar2Lunar(dd, mm, yy, timeZone) {
      const dayNumber = jdFromDate(dd, mm, yy);
      const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
      let monthStart = getNewMoonDay(k + 1, timeZone);

      if (monthStart > dayNumber) {
        monthStart = getNewMoonDay(k, timeZone);
      }

      let a11 = getLunarMonth11(yy, timeZone);
      let b11 = a11;
      let lunarYear;

      if (a11 >= monthStart) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1, timeZone);
      } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1, timeZone);
      }

      const lunarDay = dayNumber - monthStart + 1;
      const diff = INT((monthStart - a11) / 29);
      let lunarLeap = 0;
      let lunarMonth = diff + 11;

      if (b11 - a11 > 365) {
        const leapMonthDiff = getLeapMonthOffset(a11, timeZone);

        if (diff >= leapMonthDiff) {
          lunarMonth = diff + 10;

          if (diff === leapMonthDiff) {
            lunarLeap = 1;
          }
        }
      }

      if (lunarMonth > 12) {
        lunarMonth = lunarMonth - 12;
      }

      if (lunarMonth >= 11 && diff < 4) {
        lunarYear -= 1;
      }

      return [lunarDay, lunarMonth, lunarYear, lunarLeap];
    }

    function getCanChiYear(year) {
      const can = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
      const chi = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];

      return can[year % 10] + " " + chi[year % 12];
    }

    function updateClock(){
      const now = new Date();

      const weekdays = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy"
      ];

      const weekday = weekdays[now.getDay()];
      const time = now.toLocaleTimeString("vi-VN");
      const date = now.toLocaleDateString("vi-VN");

      document.getElementById("clockText").innerHTML =
        `${weekday}, ${date} • ${time}`;

      const lunar = convertSolar2Lunar(now.getDate(), now.getMonth() + 1, now.getFullYear(), 7);
      const lunarDay = String(lunar[0]).padStart(2, "0");
      const lunarMonth = String(lunar[1]).padStart(2, "0");
      const lunarYearName = getCanChiYear(lunar[2]);
      const leapText = lunar[3] === 1 ? " nhuận" : "";

      document.getElementById("lunarText").innerHTML =
        `🌙 Âm lịch: ${lunarDay}/${lunarMonth}${leapText} năm ${lunarYearName}`;
    }

    setInterval(updateClock,1000);
    updateClock();

    const menuBtn = document.getElementById("menuBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    menuBtn.addEventListener("click", () => {
      dropdownMenu.classList.toggle("show");
    });

    window.addEventListener("click", e => {
      if(!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)){
        dropdownMenu.classList.remove("show");
      }
    });

    const hour = new Date().getHours();
    const greeting = document.getElementById("greeting");

    if(hour < 11){
      greeting.innerHTML = "☀️ Chúc bạn một ngày an yên";
    }
    else if(hour < 18){
      greeting.innerHTML = "🌤️ Chúc bạn một ngày an yên";
    }
    else{
      greeting.innerHTML = "🌙 Chúc bạn một buổi tối bình yên";
    }

    let quoteList = [];
    let currentQuoteIndex = -1;

    const quoteCard = document.getElementById("quoteCard");
    const quoteBox = document.getElementById("quoteBox");
    const copyQuoteBtn = document.getElementById("copyQuoteBtn");
    const favQuoteBtn = document.getElementById("favQuoteBtn");
    const newQuoteBtn = document.getElementById("newQuoteBtn");
    const quoteToast = document.getElementById("quoteToast");

    function getFavoriteQuotes() {
      return JSON.parse(localStorage.getItem("favoriteQuotes") || "[]");
    }

    function saveFavoriteQuotes(favorites) {
      localStorage.setItem("favoriteQuotes", JSON.stringify(favorites));
    }

    function showQuoteToast(text) {
      quoteToast.textContent = text;
      quoteToast.classList.add("show");

      setTimeout(() => {
        quoteToast.classList.remove("show");
      }, 1600);
    }

    function updateFavButton() {
      const currentQuote = quoteBox.innerHTML.trim();
      const favorites = getFavoriteQuotes();

      if (favorites.includes(currentQuote)) {
        favQuoteBtn.innerHTML = "❤️";
        favQuoteBtn.classList.add("saved");
      } else {
        favQuoteBtn.innerHTML = "♡";
        favQuoteBtn.classList.remove("saved");
      }
    }

    function showRandomQuote() {
      if (!quoteList.length) return;

      let randomIndex;

      do {
        randomIndex = Math.floor(Math.random() * quoteList.length);
      } while (randomIndex === currentQuoteIndex && quoteList.length > 1);

      currentQuoteIndex = randomIndex;

      quoteCard.classList.add("fade-out");

      setTimeout(() => {
        quoteBox.innerHTML = quoteList[currentQuoteIndex];
        quoteCard.classList.remove("fade-out");
        updateFavButton();
      }, 800);
    }

    fetch("json/quotes.json")
    .then(response => response.json())
    .then(quotes => {
      quoteList = quotes;

      showRandomQuote();

      setInterval(() => {
        showRandomQuote();
      }, 10000);
    })
    .catch(error => {
      console.error("Không tải được quotes.json", error);
      quoteBox.innerHTML = "Bình yên không ở đâu xa, chỉ ở trong lòng";
    });

    copyQuoteBtn.addEventListener("click", e => {
      e.stopPropagation();

      const text = quoteBox.innerText.trim();

      if (!text) return;

      navigator.clipboard.writeText(text)
      .then(() => {
        showQuoteToast("Đã sao chép quote 📋");
      })
      .catch(() => {
        showQuoteToast("Không sao chép được");
      });
    });

    favQuoteBtn.addEventListener("click", e => {
      e.stopPropagation();

      const currentQuote = quoteBox.innerHTML.trim();

      if (!currentQuote) return;

      let favorites = getFavoriteQuotes();

      if (favorites.includes(currentQuote)) {
        favorites = favorites.filter(item => item !== currentQuote);
        showQuoteToast("Đã bỏ khỏi yêu thích");
      } else {
        favorites.push(currentQuote);
        showQuoteToast("Đã lưu quote yêu thích ❤️");
      }

      saveFavoriteQuotes(favorites);
      updateFavButton();
    });

    newQuoteBtn.addEventListener("click", e => {
      e.stopPropagation();
      showRandomQuote();
      quoteCard.classList.add("peace-pulse");

      setTimeout(() => {
        quoteCard.classList.remove("peace-pulse");
      }, 850);
    });

    fetch("json/imageshome.json")
    .then(response => response.json())
    .then(images => {
      const slideTrack = document.getElementById("slideTrack");
      const duplicated = [...images, ...images];

      duplicated.forEach(src => {
        const slide = document.createElement("div");
        slide.className = "slide";
        slide.innerHTML = `<img src="${src}">`;
        slideTrack.appendChild(slide);
      });
    });

    const bgMusic = document.getElementById("bgMusic");
    const rainSound = document.getElementById("rainSound");

    const focusModeBtn = document.getElementById("focusModeBtn");
    const miniPlayBtn = document.getElementById("miniPlayBtn");
    const miniPrevBtn = document.getElementById("miniPrevBtn");
    const miniNextBtn = document.getElementById("miniNextBtn");
    const miniShuffleBtn = document.getElementById("miniShuffleBtn");
    const miniRepeatBtn = document.getElementById("miniRepeatBtn");
    const rainSoundBtn = document.getElementById("rainSoundBtn");
    const currentSongLabel = document.getElementById("currentSongLabel");
    const miniSongTitle = document.getElementById("miniSongTitle");
    const miniSongStatus = document.getElementById("miniSongStatus");
    const miniVolumeBtn = document.getElementById("miniVolumeBtn");
    const miniVolumeSlider = document.getElementById("miniVolumeSlider");
    const volumePopup = document.getElementById("volumePopup");

    let musicList = [];
    let currentMusicIndex = 0;
    let isMiniPlaying = false;
    let isMiniShuffle = false;
    let isMiniRepeat = false;
    let isRainPlaying = false;
    let isFocusMode = false;

    bgMusic.volume = 1;
    rainSound.volume = 1;

    let lastMiniVolume = 1;

    function updateMiniVolumeIcon(){
      if (!miniVolumeBtn) return;

      if (bgMusic.muted || bgMusic.volume === 0) {
        miniVolumeBtn.innerHTML = "🔇";
      } else if (bgMusic.volume < 0.5) {
        miniVolumeBtn.innerHTML = "🔉";
      } else {
        miniVolumeBtn.innerHTML = "🔊";
      }
    }

    if (miniVolumeSlider) {
      miniVolumeSlider.value = "100";

      miniVolumeSlider.addEventListener("input", () => {
        const value = Number(miniVolumeSlider.value) / 100;
        bgMusic.volume = value;
        bgMusic.muted = value === 0;

        if (value > 0) {
          lastMiniVolume = value;
        }

        updateMiniVolumeIcon();
      });
    }

    if (miniVolumeBtn && volumePopup) {
      miniVolumeBtn.addEventListener("click", e => {
        e.stopPropagation();
        volumePopup.classList.toggle("show");
      });

      volumePopup.addEventListener("click", e => {
        e.stopPropagation();
      });

      document.addEventListener("click", () => {
        volumePopup.classList.remove("show");
      });
    }

    updateMiniVolumeIcon();

    async function loadMusicList() {
      try {
        const response = await fetch("json/music-list.json");

        if (!response.ok) {
          throw new Error("Không tải được music-list.json");
        }

        musicList = await response.json();

        if (!Array.isArray(musicList) || musicList.length === 0) {
          currentSongLabel.textContent = "🎵 Chưa có danh sách nhạc";
          miniSongTitle.textContent = "Chưa có nhạc";
          miniSongStatus.textContent = "Danh sách trống";
          return;
        }

        bgMusic.src = "audio/lists/" + musicList[currentMusicIndex].file;
        bgMusic.load();
        updateCurrentSongLabel();
      }
      catch(error){
        console.error(error);
        currentSongLabel.textContent = "🎵 Không tải được nhạc";
        miniSongTitle.textContent = "Không tải được nhạc";
        miniSongStatus.textContent = "Kiểm tra music-list.json";
      }
    }

    function updateCurrentSongLabel() {
      if (!musicList.length) {
        currentSongLabel.textContent = "🎵 Chưa có nhạc";
        miniSongTitle.textContent = "Chưa có nhạc";
        miniSongStatus.textContent = "Danh sách trống";
        return;
      }

      const currentTitle =
        musicList[currentMusicIndex].title || musicList[currentMusicIndex].file;

      currentSongLabel.textContent = "🎵 " + currentTitle;
      miniSongTitle.textContent = currentTitle;
      miniSongStatus.textContent = isMiniPlaying ? "Đang phát..." : "Sẵn sàng";
    }

    function loadMiniSong(index) {
      if (!musicList.length) return;

      currentMusicIndex = index;
      bgMusic.src = "audio/lists/" + musicList[currentMusicIndex].file;
      bgMusic.load();
      updateCurrentSongLabel();
    }

    function playMiniMusic() {
      if (!musicList.length) return;

      bgMusic.play()
      .then(() => {
        isMiniPlaying = true;
        miniPlayBtn.innerHTML = "Ⅱ";
        miniSongStatus.textContent = "Đang phát...";
      })
      .catch(error => {
        console.log("Trình duyệt chặn phát nhạc:", error);
      });
    }

    function pauseMiniMusic() {
      bgMusic.pause();
      isMiniPlaying = false;
      miniPlayBtn.innerHTML = "▶";
      miniSongStatus.textContent = "Tạm dừng";
    }

    function getRandomMusicIndex() {
      if (!musicList.length) return 0;
      if (musicList.length <= 1) return currentMusicIndex;

      let randomIndex;

      do {
        randomIndex = Math.floor(Math.random() * musicList.length);
      } while (randomIndex === currentMusicIndex);

      return randomIndex;
    }

    function nextMiniSong() {
      if (!musicList.length) return;

      if (isMiniShuffle) {
        currentMusicIndex = getRandomMusicIndex();
      } else {
        currentMusicIndex = (currentMusicIndex + 1) % musicList.length;
      }

      loadMiniSong(currentMusicIndex);
      playMiniMusic();
    }

    function prevMiniSong() {
      if (!musicList.length) return;

      currentMusicIndex = (currentMusicIndex - 1 + musicList.length) % musicList.length;
      loadMiniSong(currentMusicIndex);
      playMiniMusic();
    }

    focusModeBtn.addEventListener("click", e => {
      e.stopPropagation();

      isFocusMode = !isFocusMode;

      document.body.classList.toggle("focus-mode", isFocusMode);
      focusModeBtn.classList.toggle("active-mini", isFocusMode);
    });

    miniPlayBtn.addEventListener("click", e => {
      e.stopPropagation();

      if (isMiniPlaying) {
        pauseMiniMusic();
      } else {
        playMiniMusic();
      }
    });

    miniNextBtn.addEventListener("click", e => {
      e.stopPropagation();
      nextMiniSong();
    });

    miniPrevBtn.addEventListener("click", e => {
      e.stopPropagation();
      prevMiniSong();
    });

    miniShuffleBtn.addEventListener("click", e => {
      e.stopPropagation();
      isMiniShuffle = !isMiniShuffle;
      miniShuffleBtn.classList.toggle("active-mini", isMiniShuffle);
    });

    miniRepeatBtn.addEventListener("click", e => {
      e.stopPropagation();
      isMiniRepeat = !isMiniRepeat;
      miniRepeatBtn.classList.toggle("active-mini", isMiniRepeat);
    });

    rainSoundBtn.addEventListener("click", e => {
      e.stopPropagation();

      if (isRainPlaying) {
        rainSound.pause();
        isRainPlaying = false;
        rainSoundBtn.classList.remove("active-mini");
      } else {
        rainSound.play()
        .then(() => {
          isRainPlaying = true;
          rainSoundBtn.classList.add("active-mini");
        })
        .catch(error => {
          console.log("Không phát được tiếng mưa:", error);
        });
      }
    });

    bgMusic.addEventListener("ended", () => {
      if (isMiniRepeat) {
        bgMusic.currentTime = 0;
        playMiniMusic();
      } else {
        nextMiniSong();
      }
    });

    loadMusicList();

    for(let i = 0; i < 80; i++){
      const r = document.createElement("div");
      r.className = "rain";
      r.style.left = Math.random() * 100 + "vw";
      r.style.animationDuration = (0.7 + Math.random() * 1.2) + "s";
      r.style.opacity = Math.random();
      document.body.appendChild(r);
    }

    for(let i = 0; i < 14; i++){
      const f = document.createElement("div");
      f.className = "firefly";
      f.style.left = Math.random() * 100 + "vw";
      f.style.top = Math.random() * 100 + "vh";
      f.style.animationDelay = Math.random() * 8 + "s";
      document.body.appendChild(f);
    }

    document.addEventListener("mousemove", e => {
      if(Math.random() > 0.94){
        const p = document.createElement("div");
        p.innerText = "🪷";
        p.style.position = "fixed";
        p.style.left = e.clientX + "px";
        p.style.top = e.clientY + "px";
        p.style.pointerEvents = "none";
        p.style.zIndex = "999999";
        p.style.animation = "petalMove 1.2s forwards";

        document.body.appendChild(p);

        setTimeout(() => {
          p.remove();
        }, 1200);
      }
    });

    const style = document.createElement("style");

    style.innerHTML = `
      @keyframes petalMove{
        to{
          transform:translateY(-60px) rotate(80deg);
          opacity:0;
        }
      }
    `;

    document.head.appendChild(style);
    const themeBtn = document.getElementById("themeBtn");

const themes = [
  {
    name: "theme-rain",
    icon: "🌧️"
  },
  {
    name: "theme-night",
    icon: "🌙"
  },
  {
    name: "theme-flower",
    icon: "🌸"
  },
  {
    name: "theme-sun",
    icon: "☀️"
  }
];

let currentThemeIndex =
Number(localStorage.getItem("mydocThemeIndex") || 0);

function applyTheme(index){

  themes.forEach(theme => {
    document.body.classList.remove(theme.name);
  });

  document.body.classList.add(
    themes[index].name
  );

  themeBtn.innerHTML =
    themes[index].icon;

  localStorage.setItem(
    "mydocThemeIndex",
    index
  );
}

themeBtn.addEventListener("click", e => {

  e.stopPropagation();

  currentThemeIndex =
    (currentThemeIndex + 1) %
    themes.length;

  applyTheme(currentThemeIndex);

});

  applyTheme(currentThemeIndex);

    document.addEventListener("click", e => {
      const ripple = document.createElement("div");
      ripple.className = "ripple";
      ripple.style.left = e.clientX + "px";
      ripple.style.top = e.clientY + "px";

      document.body.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      },800);
    });



    /* HOME SECRET RANDOM */
    const openSecretBtn = document.getElementById("openSecretBtn");
    const secretModal = document.getElementById("secretModal");
    const secretCloseBtn = document.getElementById("secretCloseBtn");
    const secretNextBtn = document.getElementById("secretNextBtn");
    const secretIcon = document.getElementById("secretIcon");
    const secretTitle = document.getElementById("secretTitle");
    const secretContent = document.getElementById("secretContent");

    let secretList = [];
    let secretBag = [];
    let secretBagIndex = 0;

    function shuffleSecrets(list){
      const arr = [...list];

      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      return arr;
    }

    function resetSecretBag(){
      secretBag = shuffleSecrets(secretList);
      secretBagIndex = 0;
    }

    function showRandomSecret(){
      if(!secretList.length){
        secretIcon.innerHTML = "🔐";
        secretTitle.innerHTML = "Kho Bí Mật";
        secretContent.innerHTML = "Chưa tải được dữ liệu bí mật.";
        return;
      }

      if(!secretBag.length || secretBagIndex >= secretBag.length){
        resetSecretBag();
      }

      const item = secretBag[secretBagIndex];
      secretBagIndex++;

      secretIcon.innerHTML = item.icon || "🔎";
      secretTitle.innerHTML = item.title || "Bí mật nhỏ";
      secretContent.innerHTML = item.content || item.short || "Bí mật này đang trốn mất tiêu rồi.";
    }

    fetch("json/khobimat.json")
    .then(response => response.json())
    .then(data => {
      secretList = Array.isArray(data) ? data : [];
      resetSecretBag();
    })
    .catch(error => {
      console.error("Không tải được json/khobimat.json", error);
      secretList = [];
      secretBag = [];
      secretBagIndex = 0;
    });

    openSecretBtn.addEventListener("click", event => {
      event.stopPropagation();
      showRandomSecret();
      secretModal.classList.add("show");
      secretModal.setAttribute("aria-hidden", "false");
    });

    secretNextBtn.addEventListener("click", event => {
      event.stopPropagation();
      showRandomSecret();
    });

    secretCloseBtn.addEventListener("click", event => {
      event.stopPropagation();
      secretModal.classList.remove("show");
      secretModal.setAttribute("aria-hidden", "true");
    });

    secretModal.addEventListener("click", event => {
      if(event.target === secretModal){
        secretModal.classList.remove("show");
        secretModal.setAttribute("aria-hidden", "true");
      }
    });

    /* HOME PET POPUP */
    const openPetHomeBtn = document.getElementById("openPetHomeBtn");
    const petHomeModal = document.getElementById("petHomeModal");
    const petHomeCloseBtn = document.getElementById("petHomeCloseBtn");
    const petHomeEmpty = document.getElementById("petHomeEmpty");
    const petHomeWindow = document.getElementById("petHomeWindow");
    const petHomeTrack = document.getElementById("petHomeTrack");
    const petHomePrevBtn = document.getElementById("petHomePrevBtn");
    const petHomeNextBtn = document.getElementById("petHomeNextBtn");
    const petHomeFullscreen = document.getElementById("petHomeFullscreen");
    const petHomeFullImg = document.getElementById("petHomeFullImg");
    const petHomeViewClose = document.getElementById("petHomeViewClose");

    let petHomeImages = [];
    let petHomeCards = [];
    let petHomePosition = 0;
    let petHomeStep = 290;
    let petHomeSpeed = 0.10;
    let petHomeLastTime = null;
    let petHomePauseUntil = 0;
    let petHomeFrame = null;
    let petHomeLoaded = false;

    function normalizeHomePetItem(item, index){
      if(typeof item === "string"){
        return {
          name:`Thú cưng ${index + 1}`,
          src:item.includes("/") ? item : `images/thucung/${item}`
        };
      }

      const rawSrc = item.image || item.file || item.src || "";

      return {
        name:item.name || item.title || `Thú cưng ${index + 1}`,
        src:rawSrc.includes("/") ? rawSrc : `images/thucung/${rawSrc}`
      };
    }

    function shuffleHomePets(array){
      const cloned = [...array];
      for(let i = cloned.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
      }
      return cloned;
    }

    function getHomePetStep(){
      if(window.innerWidth <= 430) return window.innerWidth * 0.54;
      if(window.innerWidth <= 768) return window.innerWidth * 0.46;
      return 285;
    }

    function createPetHomeHearts(x, y){
      const icons = ["💗","💖","💕","🐾"];
      for(let i = 0; i < 6; i++){
        const heart = document.createElement("div");
        heart.className = "pet-home-heart";
        heart.textContent = icons[Math.floor(Math.random() * icons.length)];
        heart.style.left = (x + (Math.random() * 56 - 28)) + "px";
        heart.style.top = (y + (Math.random() * 24 - 12)) + "px";
        heart.style.animationDelay = (Math.random() * .16) + "s";
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1300);
      }
    }

    function buildPetHomeCards(){
      petHomeTrack.innerHTML = "";
      petHomeCards = [];
      petHomeStep = getHomePetStep();

      const shuffled = shuffleHomePets(petHomeImages);
      const repeated = [];
      const loops = Math.max(5, Math.ceil(22 / Math.max(1, shuffled.length)));

      for(let i = 0; i < loops; i++){
        shuffled.forEach(item => repeated.push(item));
      }

      repeated.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pet-home-card";
        button.dataset.index = index;
        button.dataset.src = item.src;
        button.dataset.name = item.name;
        button.innerHTML = `<img src="${item.src}" alt="${item.name}">`;

        button.addEventListener("click", event => {
          event.stopPropagation();
          createPetHomeHearts(event.clientX, event.clientY);

          if(button.classList.contains("is-center")){
            openPetHomeFullscreen(item.src, item.name);
          }else{
            focusPetHomeCard(index);
          }
        });

        petHomeTrack.appendChild(button);
        petHomeCards.push(button);
      });

      petHomePosition = Math.floor(petHomeCards.length / 2) * petHomeStep;
      updatePetHomeFlow();
    }

    function updatePetHomeFlow(){
      if(!petHomeCards.length) return;

      const totalWidth = petHomeCards.length * petHomeStep;
      const centerLoop = totalWidth / 2;

      if(petHomePosition > totalWidth - petHomeStep * 6){
        petHomePosition -= centerLoop;
      }

      if(petHomePosition < petHomeStep * 4){
        petHomePosition += centerLoop;
      }

      let closestCard = null;
      let closestDistance = Infinity;

      petHomeCards.forEach((card, index) => {
        let x = index * petHomeStep - petHomePosition;

        while(x < -totalWidth / 2) x += totalWidth;
        while(x > totalWidth / 2) x -= totalWidth;

        const normalized = Math.min(Math.abs(x) / petHomeStep, 2.6);
        const centerStrength = Math.max(0, 1 - normalized);
        const scale = 0.72 + centerStrength * 0.48;
        const opacity = Math.max(0, 1 - Math.max(0, normalized - .2) * .35);
        const blur = Math.min(2.2, normalized * .75);
        const rotate = Math.max(-10, Math.min(10, x / petHomeStep * -5));
        const translateY = centerStrength * -10;

        card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${translateY}px)) scale(${scale}) rotateY(${rotate}deg)`;
        card.style.opacity = opacity;
        card.style.filter = `saturate(${0.88 + centerStrength * .26}) brightness(${0.92 + centerStrength * .1}) blur(${blur}px)`;
        card.style.zIndex = String(Math.round(10 + centerStrength * 100));

        if(Math.abs(x) < closestDistance){
          closestDistance = Math.abs(x);
          closestCard = card;
        }
      });

      petHomeCards.forEach(card => card.classList.remove("is-center"));
      if(closestCard){
        closestCard.classList.add("is-center");
      }
    }

    function animatePetHomeFlow(time){
      if(petHomeLastTime === null) petHomeLastTime = time;
      const delta = Math.min(40, time - petHomeLastTime);
      petHomeLastTime = time;

      if(time > petHomePauseUntil){
        petHomePosition += petHomeSpeed * delta;
      }

      updatePetHomeFlow();
      petHomeFrame = requestAnimationFrame(animatePetHomeFlow);
    }

    function focusPetHomeCard(index){
      petHomePosition = index * petHomeStep;
      petHomePauseUntil = performance.now() + 1800;
      updatePetHomeFlow();
    }

    function movePetHome(direction){
      petHomePosition += direction * petHomeStep;
      petHomePauseUntil = performance.now() + 1600;
      updatePetHomeFlow();
    }

    function openPetHomeFullscreen(src, alt){
      if(!src) return;
      petHomeFullImg.src = src;
      petHomeFullImg.alt = alt || "Thú cưng phóng to";
      petHomeFullscreen.classList.add("show");
      petHomeFullscreen.setAttribute("aria-hidden", "false");
      petHomePauseUntil = performance.now() + 2600;
    }

    function closePetHomeFullscreen(){
      petHomeFullscreen.classList.remove("show");
      petHomeFullscreen.setAttribute("aria-hidden", "true");
      petHomeFullImg.removeAttribute("src");
    }

    function loadPetHomeImages(){
      if(petHomeLoaded) return;
      petHomeLoaded = true;

      fetch("json/thuvienthucung.json")
      .then(response => response.json())
      .then(data => {
        petHomeImages = data
          .map(normalizeHomePetItem)
          .filter(item => item.src && item.src !== "images/thucung/");

        if(!petHomeImages.length){
          petHomeEmpty.innerHTML = "🐾<div>Chưa có ảnh trong thư viện</div>";
          return;
        }

        petHomeEmpty.style.display = "none";
        petHomeWindow.style.display = "flex";
        buildPetHomeCards();

        if(petHomeFrame) cancelAnimationFrame(petHomeFrame);
        petHomeFrame = requestAnimationFrame(animatePetHomeFlow);
      })
      .catch(error => {
        console.error("Không tải được json/thuvienthucung.json", error);
        petHomeEmpty.innerHTML = "🐾<div>Không tải được json/thuvienthucung.json</div>";
      });
    }

    openPetHomeBtn.addEventListener("click", event => {
      event.stopPropagation();
      petHomeModal.classList.add("show");
      petHomeModal.setAttribute("aria-hidden", "false");
      loadPetHomeImages();
    });

    petHomeCloseBtn.addEventListener("click", event => {
      event.stopPropagation();
      petHomeModal.classList.remove("show");
      petHomeModal.setAttribute("aria-hidden", "true");
    });

    petHomeModal.addEventListener("click", event => {
      if(event.target === petHomeModal){
        petHomeModal.classList.remove("show");
        petHomeModal.setAttribute("aria-hidden", "true");
      }
    });

    petHomePrevBtn.addEventListener("click", event => {
      event.stopPropagation();
      movePetHome(-1);
      createPetHomeHearts(event.clientX, event.clientY);
    });

    petHomeNextBtn.addEventListener("click", event => {
      event.stopPropagation();
      movePetHome(1);
      createPetHomeHearts(event.clientX, event.clientY);
    });

    petHomeViewClose.addEventListener("click", event => {
      event.stopPropagation();
      closePetHomeFullscreen();
    });

    petHomeFullscreen.addEventListener("click", event => {
      if(event.target === petHomeFullscreen){
        closePetHomeFullscreen();
      }
    });

    window.addEventListener("resize", () => {
      if(!petHomeCards.length) return;
      const centerRatio = petHomePosition / petHomeStep;
      petHomeStep = getHomePetStep();
      petHomePosition = centerRatio * petHomeStep;
      updatePetHomeFlow();
    });

    document.addEventListener("keydown", event => {
      if(event.key === "Escape"){
      if(jokeModal && jokeModal.classList.contains("show")){
        closeJokeModal();
        return;
      }

      if(quizModal && quizModal.classList.contains("show")){
        closeQuizModal();
        return;
      }

        if(secretModal.classList.contains("show")){
          secretModal.classList.remove("show");
          secretModal.setAttribute("aria-hidden", "true");
        }
        if(petHomeFullscreen.classList.contains("show")){
          closePetHomeFullscreen();
        }else if(petHomeModal.classList.contains("show")){
          petHomeModal.classList.remove("show");
          petHomeModal.setAttribute("aria-hidden", "true");
        }
      }
    });

    const openQuizBtn = document.getElementById("openQuizBtn");
    const openJokeBtn = document.getElementById("openJokeBtn");

    const quizModal = document.getElementById("quizModal");
    const quizCloseBtn = document.getElementById("quizCloseBtn");
    const quizTitle = document.getElementById("quizTitle");
    const quizQuestion = document.getElementById("quizQuestion");
    const quizAnswerBox = document.getElementById("quizAnswerBox");
    const quizAnswer = document.getElementById("quizAnswer");
    const quizShowAnswerBtn = document.getElementById("quizShowAnswerBtn");
    const quizNextBtn = document.getElementById("quizNextBtn");

    const jokeModal = document.getElementById("jokeModal");
    const jokeCloseBtn = document.getElementById("jokeCloseBtn");
    const jokeTitle = document.getElementById("jokeTitle");
    const jokeContent = document.getElementById("jokeContent");
    const jokeNextBtn = document.getElementById("jokeNextBtn");

    let jokeList = [];
    let jokeBag = [];
    let jokeBagIndex = 0;

    function shuffleJokes(list){
      const arr = [...list];

      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      return arr;
    }

    function resetJokeBag(){
      jokeBag = shuffleJokes(jokeList);
      jokeBagIndex = 0;
    }

    async function loadJokeList(){
      const paths = [
        "json/truyencuoi.json",
        "truyencuoi.json",
        "json/truyencuoi_bien_soan.json",
        "truyencuoi_bien_soan.json"
      ];

      for(const path of paths){
        try{
          const response = await fetch(path);
          if(!response.ok) continue;

          const data = await response.json();
          jokeList = Array.isArray(data) ? data : [];

          if(jokeList.length){
            resetJokeBag();
            return;
          }
        }catch(error){
          console.warn("Không tải được file truyện cười:", path, error);
        }
      }

      jokeList = [];
      jokeBag = [];
      jokeBagIndex = 0;
    }

    function normalizeJoke(item){
      return {
        title: item.title || item.tieude || "Cười xíu",
        content: item.content || item.noidung || item.joke || item.truyen || "Truyện này đang trốn mất tiêu rồi 😆"
      };
    }

    function showRandomJoke(){
      if(!jokeList.length){
        jokeTitle.textContent = "Cười xíu";
        jokeContent.textContent = "Chưa tải được dữ liệu truyện cười. Kiểm tra file json/truyencuoi.json nha.";
        return;
      }

      if(!jokeBag.length || jokeBagIndex >= jokeBag.length){
        resetJokeBag();
      }

      const item = normalizeJoke(jokeBag[jokeBagIndex]);
      jokeBagIndex++;

      jokeTitle.textContent = item.title;
      jokeContent.textContent = item.content;

      jokeModal.classList.remove("joke-pop");
      void jokeModal.offsetWidth;
      jokeModal.classList.add("joke-pop");
    }

    function openJokeModal(){
      showRandomJoke();
      jokeModal.classList.add("show");
      jokeModal.setAttribute("aria-hidden", "false");
    }

    function closeJokeModal(){
      jokeModal.classList.remove("show");
      jokeModal.setAttribute("aria-hidden", "true");
    }

    loadJokeList();

    if(openJokeBtn){
      openJokeBtn.addEventListener("click", event => {
        event.stopPropagation();
        openJokeModal();
      });
    }

    if(jokeNextBtn){
      jokeNextBtn.addEventListener("click", event => {
        event.stopPropagation();
        showRandomJoke();
      });
    }

    if(jokeCloseBtn){
      jokeCloseBtn.addEventListener("click", event => {
        event.stopPropagation();
        closeJokeModal();
      });
    }

    if(jokeModal){
      jokeModal.addEventListener("click", event => {
        if(event.target === jokeModal){
          closeJokeModal();
        }
      });
    }

    let quizList = [];
    let lastQuizIndex = -1;

    async function loadQuizList(){
      const paths = [
        "json/caudovui.json",
        "json/cau_do_vui.json",
        "caudovui.json",
        "cau_do_vui.json"
      ];

      for(const path of paths){
        try{
          const response = await fetch(path);
          if(!response.ok) continue;

          const data = await response.json();
          quizList = Array.isArray(data) ? data : [];
          if(quizList.length) return;
        }catch(error){
          console.warn("Không tải được file câu đố:", path, error);
        }
      }

      quizList = [];
    }

    function normalizeQuiz(item){
      return {
        question: item.question || item.cauhoi || item.title || "Câu đố này đang trốn mất tiêu rồi.",
        answer: item.answer || item.dapan || item.content || "Đáp án cũng trốn luôn rồi 😆"
      };
    }

    function showRandomQuiz(){
      if(!quizList.length){
        quizTitle.innerHTML = "Đố vui";
        quizQuestion.innerHTML = "Chưa tải được dữ liệu câu đố. Kiểm tra file json/caudovui.json hoặc json/cau_do_vui.json nha.";
        quizAnswer.innerHTML = "Không có đáp án để mở rồi 😅";
        quizAnswerBox.classList.remove("show");
        quizShowAnswerBtn.innerHTML = "Xem đáp án 👀";
        return;
      }

      let randomIndex;

      do{
        randomIndex = Math.floor(Math.random() * quizList.length);
      }while(randomIndex === lastQuizIndex && quizList.length > 1);

      lastQuizIndex = randomIndex;
      const item = normalizeQuiz(quizList[randomIndex]);

      quizTitle.innerHTML = "Đố vui";
      quizQuestion.innerHTML = item.question;
      quizAnswer.innerHTML = item.answer;

      quizAnswerBox.classList.remove("show");
      quizShowAnswerBtn.innerHTML = "Hiện đáp án 👀";

      quizModal.classList.remove("quiz-pop");
      void quizModal.offsetWidth;
      quizModal.classList.add("quiz-pop");
    }

    function openQuizModal(){
      showRandomQuiz();
      quizModal.classList.add("show");
      quizModal.setAttribute("aria-hidden", "false");
    }

    function closeQuizModal(){
      quizModal.classList.remove("show");
      quizModal.setAttribute("aria-hidden", "true");
      quizAnswerBox.classList.remove("show");
    }

    loadQuizList();

    if(openQuizBtn){
      openQuizBtn.addEventListener("click", event => {
        event.stopPropagation();
        openQuizModal();
      });
    }

    if(quizNextBtn){
      quizNextBtn.addEventListener("click", event => {
        event.stopPropagation();
        showRandomQuiz();
      });
    }

    if(quizShowAnswerBtn){
      quizShowAnswerBtn.addEventListener("click", event => {
        event.stopPropagation();
        const isShowing = quizAnswerBox.classList.toggle("show");
        quizShowAnswerBtn.innerHTML = isShowing ? "Ẩn đáp án 🙈" : "Xem đáp án 👀";
      });
    }


    if(quizAnswerBox){
      quizAnswerBox.addEventListener("click", event => {
        event.stopPropagation();
        const isShowing = quizAnswerBox.classList.toggle("show");
        quizShowAnswerBtn.innerHTML = isShowing ? "Ẩn đáp án 🙈" : "Xem đáp án 👀";
      });
    }

    if(quizCloseBtn){
      quizCloseBtn.addEventListener("click", event => {
        event.stopPropagation();
        closeQuizModal();
      });
    }

    if(quizModal){
      quizModal.addEventListener("click", event => {
        if(event.target === quizModal){
          closeQuizModal();
        }
      });
    }