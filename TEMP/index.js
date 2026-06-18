const $ = (selector) => document.querySelector(selector);

    const els = {
      quoteText: $("#quoteText"),
      quoteSource: $("#quoteSource"),
      clockText: $("#clockText"),
      dateText: $("#dateText"),
      lunarText: $("#lunarText"),
      bgAudio: $("#bgAudio"),
      rainAudio: $("#rainAudio"),
      trackTitle: $("#trackTitle"),
      trackTime: $("#trackTime"),
      trackSub: $("#trackSub"),
      playBtn: $("#playBtn"),
      prevBtn: $("#prevBtn"),
      nextBtn: $("#nextBtn"),
      shuffleBtn: $("#shuffleBtn"),
      rainBtn: $("#rainBtn"),
      openMusicPage: $("#openMusicPage"),
      currentTime: $("#currentTime"),
      durationTime: $("#durationTime"),
      progressFill: $("#progressFill"),
      seekBar: $("#seekBar"),
      toast: $("#toast")
    };

    let quotes = [];
    let quoteIndex = 0;
    let playlist = [];
    let currentTrack = 0;
    let isPlaying = false;
    let isShuffle = false;
    let toastTimer = null;

    const fallbackQuotes = [
      { text: "Hôm nay mình đi thật chậm thôi.", source: "Mưa Tĩnh Lặng" },
      { text: "Có những ngày chỉ cần bình yên là đủ.", source: "Mưa Tĩnh Lặng" },
      { text: "Mưa ngoài kia cứ để mưa, lòng mình cứ nhẹ lại.", source: "Mưa Tĩnh Lặng" }
    ];

    const fallbackPlaylist = [
      { title: "Mưa rơi nhẹ", src: "audio/nhacnen/nhacthien0.mp3" },
      { title: "Nhạc thiền nhẹ", src: "audio/nhacnen/nhacthien.mp3" }
    ];

    const playerIcons = {
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l9 6-9 6z"/></svg>',
      pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8z"/><path d="M13 6h3v12h-3z"/></svg>'
    };

    function setPlayButtonIcon(playing) {
      if (!els.playBtn) return;
      els.playBtn.innerHTML = playing ? playerIcons.pause : playerIcons.play;
    }


    function pad(num) {
      return String(num).padStart(2, "0");
    }

    function showToast(message) {
      if (!els.toast) return;
      els.toast.textContent = message;
      els.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
    }

    function formatAudioTime(seconds) {
      if (!Number.isFinite(seconds)) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${pad(mins)}:${pad(secs)}`;
    }

    const PI = Math.PI;

    function jdFromDate(dd, mm, yy) {
      const a = Math.floor((14 - mm) / 12);
      const y = yy + 4800 - a;
      const m = mm + 12 * a - 3;
      let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
      if (jd < 2299161) {
        jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
      }
      return jd;
    }

    function getNewMoonDay(k, timeZone) {
      const T = k / 1236.85;
      const T2 = T * T;
      const T3 = T2 * T;
      const dr = PI / 180;
      let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
      Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
      const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
      const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
      const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
      let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
      C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
      C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
      C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
      C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
      C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
      C1 += 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
      const deltaT = T < -11
        ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
        : -0.000278 + 0.000265 * T + 0.000262 * T2;
      return Math.floor(Jd1 + C1 - deltaT + 0.5 + timeZone / 24);
    }

    function getSunLongitude(jdn, timeZone) {
      const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
      const T2 = T * T;
      const dr = PI / 180;
      const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
      const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
      let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
      DL += (0.019993 - 0.000101 * T) * Math.sin(2 * dr * M) + 0.000290 * Math.sin(3 * dr * M);
      let L = (L0 + DL) * dr;
      L = L - PI * 2 * Math.floor(L / (PI * 2));
      return Math.floor(L / PI * 6);
    }

    function getLunarMonth11(yy, timeZone) {
      const off = jdFromDate(31, 12, yy) - 2415021;
      const k = Math.floor(off / 29.530588853);
      let nm = getNewMoonDay(k, timeZone);
      if (getSunLongitude(nm, timeZone) >= 9) nm = getNewMoonDay(k - 1, timeZone);
      return nm;
    }

    function getLeapMonthOffset(a11, timeZone) {
      const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
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

    function solarToLunar(dd, mm, yy, timeZone = 7) {
      const dayNumber = jdFromDate(dd, mm, yy);
      const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
      let monthStart = getNewMoonDay(k + 1, timeZone);
      if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
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
      const diff = Math.floor((monthStart - a11) / 29);
      let lunarLeap = 0;
      let lunarMonth = diff + 11;

      if (b11 - a11 > 365) {
        const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
        if (diff >= leapMonthDiff) {
          lunarMonth = diff + 10;
          if (diff === leapMonthDiff) lunarLeap = 1;
        }
      }

      if (lunarMonth > 12) lunarMonth -= 12;
      if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

      return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
    }

    function canChiYear(year) {
      const can = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
      const chi = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];
      return `${can[year % 10]} ${chi[year % 12]}`;
    }

    function updateDateTime() {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dd = now.getDate();
      const mm = now.getMonth() + 1;
      const yy = now.getFullYear();
      const lunar = solarToLunar(dd, mm, yy, 7);

      els.clockText.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      els.dateText.textContent = `${days[now.getDay()]}, ${pad(dd)}/${pad(mm)}/${yy}`;
      els.lunarText.textContent = `Âm lịch: ${String(lunar.day).padStart(2,'0')}/${String(lunar.month).padStart(2,'0')}${lunar.leap ? " nhuận" : ""} ${canChiYear(lunar.year)}`;;
    }

    function normalizeQuote(item) {

        if (typeof item === "string") {
          return {
            text: item,
            author: ""
          };
        }

        if (!item || typeof item !== "object") return null;

        return {
          text:
            item.text ||
            item.quote ||
            item.content ||
            "",

          author:
            item.author ||
            item.tacgia ||
            ""
  };
}

    async function loadQuotes() {
      try {
        const response = await fetch("json/quotes.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Không tải được quotes.json");
        const data = await response.json();
        const raw = Array.isArray(data) ? data : (data.quotes || data.data || data.items || []);
        quotes = raw.map(normalizeQuote).filter(q => q && q.text);
      } catch (error) {
        quotes = fallbackQuotes;
      }

      if (!quotes.length) quotes = fallbackQuotes;
      quoteIndex = Math.floor(Math.random() * quotes.length);
      renderQuote();
      setInterval(nextQuote, 6000);
    }

    function renderQuote() {
  const quote = quotes[quoteIndex] || fallbackQuotes[0];

  els.quoteText.style.opacity = "0";
  els.quoteText.style.transform = "translateY(15px)";
  els.quoteText.style.filter = "blur(8px)";

  setTimeout(() => {

    els.quoteText.innerHTML = `${quote.text}`;
    els.quoteSource.textContent =
      quote.author ? `— ${quote.author} —` : "";

    els.quoteText.style.opacity = "1";
    els.quoteText.style.transform = "translateY(0)";
    els.quoteText.style.filter = "blur(0)";

  }, 400);
}

    function nextQuote() {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      renderQuote();
    }

    function normalizeTrack(item, index) {
      if (typeof item === "string") {
        return {
          title: item.replace(/\.mp3$/i, "").replace(/[-_]/g, " "),
          src: item
        };
      }

      if (!item || typeof item !== "object") return null;

      return {
        title: item.title || item.name || item.ten || `Bài nhạc ${index + 1}`,
        src: item.src || item.file || item.url || item.path || item.link || ""
      };
    }

    function resolveMusicPath(src) {
      if (!src) return "";
      if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return src;
      if (src.includes("/")) return src;
      return `audio/nhacnen/${src}`;
    }

    async function loadPlaylist() {
      try {
        const response = await fetch("json/music-list.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Không tải được danh sách nhạc!");
        const data = await response.json();
        const raw = Array.isArray(data) ? data : (data.songs || data.music || data.data || data.items || []);
        playlist = raw.map(normalizeTrack).filter(track => track && track.src);
      } catch (error) {
        playlist = fallbackPlaylist;
      }

      if (!playlist.length) playlist = fallbackPlaylist;
      currentTrack = Math.floor(Math.random() * playlist.length);
      setTrack(currentTrack, false);
    }

    function setTrack(index, autoplay = isPlaying) {
      if (!playlist.length) return;
      currentTrack = (index + playlist.length) % playlist.length;
      const track = playlist[currentTrack];

      els.bgAudio.src = resolveMusicPath(track.src);
      if (els.trackTitle) els.trackTitle.textContent = track.title || "Nhạc nền";
      if (els.trackSub) els.trackSub.textContent = "Nhạc nền thư giãn";
      if (els.trackTime) {
        els.trackTime.textContent = "00:00 / 00:00";
      }
      if (els.currentTime) els.currentTime.textContent = "00:00";
      if (els.durationTime) els.durationTime.textContent = "00:00";
      if (els.seekBar) els.seekBar.value = "0";
      if (els.progressFill) els.progressFill.style.width = "0%";

      if (autoplay) playMusic();
    }

    async function playMusic() {
      try {
        if (!els.bgAudio.src) setTrack(currentTrack, false);
        await els.bgAudio.play();
        isPlaying = true;
        setPlayButtonIcon(true);
      } catch (error) {
        showToast("Không phát được nhạc, vui lòng kiểm tra lại!");
      }
    }

    function pauseMusic() {
      els.bgAudio.pause();
      isPlaying = false;
      if (els.playBtn) setPlayButtonIcon(false);
    }

    function toggleMusic() {
      isPlaying ? pauseMusic() : playMusic();
    }

    function getRandomTrackIndex() {
      if (playlist.length <= 1) return currentTrack;

      let nextIndex = currentTrack;
      while (nextIndex === currentTrack) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
      return nextIndex;
    }

    function nextTrack() {
      setTrack(isShuffle ? getRandomTrackIndex() : currentTrack + 1, true);
    }

    function prevTrack() {
      setTrack(isShuffle ? getRandomTrackIndex() : currentTrack - 1, true);
    }

    function toggleShuffle() {
      isShuffle = !isShuffle;
      window.myDocShuffleMode = isShuffle;
      els.shuffleBtn?.classList.toggle("active", isShuffle);
      showToast(isShuffle ? "Đã bật phát ngẫu nhiên" : "Đã tắt phát ngẫu nhiên");
    }

    async function toggleRain() {
      if (els.rainAudio.paused) {
        try {
          els.rainAudio.volume = .45;
          await els.rainAudio.play();
          showToast("Đã bật tiếng mưa");
        } catch (error) {
          showToast("Không phát được âm thanh!");
        }
      } else {
        els.rainAudio.pause();
        showToast("Đã tắt tiếng mưa");
      }
    }

    let isSeekingTrack = false;

    function updateProgress() {
      const audio = els.bgAudio;
      if (!audio) return;

      const current = audio.currentTime || 0;
      const duration = audio.duration || 0;
      const percent = duration ? Math.min(100, (current / duration) * 100) : 0;

      if (els.trackTime) {
        els.trackTime.textContent = `${formatAudioTime(current)} / ${formatAudioTime(duration)}`;
      }
      if (els.currentTime) els.currentTime.textContent = formatAudioTime(current);
      if (els.durationTime) els.durationTime.textContent = formatAudioTime(duration);
      if (els.progressFill) els.progressFill.style.width = percent + "%";
      if (els.seekBar && !isSeekingTrack) els.seekBar.value = String(Math.round(percent * 10));
    }

    els.seekBar?.addEventListener("input", () => {
      const audio = els.bgAudio;
      if (!audio || !audio.duration) return;
      isSeekingTrack = true;
      const percent = Number(els.seekBar.value || 0) / 1000;
      if (els.progressFill) els.progressFill.style.width = (percent * 100) + "%";
      if (els.currentTime) els.currentTime.textContent = formatAudioTime(audio.duration * percent);
      if (els.trackTime) els.trackTime.textContent = `${formatAudioTime(audio.duration * percent)} / ${formatAudioTime(audio.duration)}`;
    });

    els.seekBar?.addEventListener("change", () => {
      const audio = els.bgAudio;
      if (audio && audio.duration) {
        audio.currentTime = audio.duration * (Number(els.seekBar.value || 0) / 1000);
      }
      isSeekingTrack = false;
      updateProgress();
    });

    els.playBtn?.addEventListener("click", toggleMusic);
    els.prevBtn?.addEventListener("click", prevTrack);
    els.nextBtn?.addEventListener("click", nextTrack);
    els.shuffleBtn?.addEventListener("click", toggleShuffle);
    els.rainBtn?.addEventListener("click", toggleRain);
    els.openMusicPage?.addEventListener("click", () => {
      location.href = "nghenhac.html";
    });

    els.bgAudio?.addEventListener("timeupdate", updateProgress);
    els.bgAudio?.addEventListener("loadedmetadata", updateProgress);
    els.bgAudio?.addEventListener("ended", nextTrack);



    /* HOME POPUPS: KHO BÍ MẬT / CƯỜI XÍU / THÚ CƯNG */
    const openSecretBtn = $("#openSecretBtn");
    const secretModal = $("#secretModal");
    const secretCloseBtn = $("#secretCloseBtn");
    const secretNextBtn = $("#secretNextBtn");
    const secretIcon = $("#secretIcon");
    const secretTitle = $("#secretTitle");
    const secretContent = $("#secretContent");

    const openJokeBtn = $("#openJokeBtn");
    const jokeModal = $("#jokeModal");
    const jokeCloseBtn = $("#jokeCloseBtn");
    const jokeTitle = $("#jokeTitle");
    const jokeContent = $("#jokeContent");
    const jokeNextBtn = $("#jokeNextBtn");

    const openPetHomeBtn = $("#openPetHomeBtn");
    const petHomeModal = $("#petHomeModal");
    const petHomeCloseBtn = $("#petHomeCloseBtn");
    const petHomeEmpty = $("#petHomeEmpty");
    const petHomeWindow = $("#petHomeWindow");
    const petHomeTrack = $("#petHomeTrack");
    const petHomePrevBtn = $("#petHomePrevBtn");
    const petHomeNextBtn = $("#petHomeNextBtn");
    const petHomeFullscreen = $("#petHomeFullscreen");
    const petHomeFullImg = $("#petHomeFullImg");
    const petHomeViewClose = $("#petHomeViewClose");

    let secretList = [];
    let secretBag = [];
    let jokeList = [];
    let jokeBag = [];
    let petHomeImages = [];
    let petHomeCards = [];
    let petHomePosition = 0;
    let petHomeStep = 220;
    let petHomeSpeed = .075;
    let petHomeFrame = null;
    let petHomeLastTime = null;
    let petHomePauseUntil = 0;

    function shuffleList(list){
      const arr = [...list];
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function closeModal(modal){
      if(!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    }

    function openModal(modal){
      if(!modal) return;
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    }

    async function loadSecretList(){
      try{
        const response = await fetch("json/khobimat.json", { cache:"no-store" });
        if(!response.ok) throw new Error("Không tải được khobimat.json");
        const data = await response.json();
        secretList = Array.isArray(data) ? data : [];
        secretBag = shuffleList(secretList);
      }catch(error){
        console.warn(error);
        secretList = [];
        secretBag = [];
      }
    }

    function showRandomSecret(){
      if(!secretBag.length) secretBag = shuffleList(secretList);

      if(!secretBag.length){
        secretIcon.textContent = "🔐";
        secretTitle.textContent = "Kho Bí Mật";
        secretContent.textContent = "Chưa tải được dữ liệu bí mật. Kiểm tra file json/khobimat.json nha.";
        return;
      }

      const item = secretBag.shift();
      secretIcon.innerHTML = item.icon || "🔎";
      secretTitle.innerHTML = item.title || item.name || "Bí mật nhỏ";
      secretContent.innerHTML = item.content || item.short || item.noidung || "Bí mật này đang trốn mất tiêu rồi.";
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
          const response = await fetch(path, { cache:"no-store" });
          if(!response.ok) continue;
          const data = await response.json();
          jokeList = Array.isArray(data) ? data : [];
          if(jokeList.length){
            jokeBag = shuffleList(jokeList);
            return;
          }
        }catch(error){
          console.warn("Không tải được file truyện cười:", path, error);
        }
      }

      jokeList = [];
      jokeBag = [];
    }

    function normalizeJoke(item){
      return {
        title: item.title || item.tieude || item.name || "Cười xíu",
        content: item.content || item.noidung || item.joke || item.truyen || item.text || "Truyện này đang trốn mất tiêu rồi 😆"
      };
    }

    function showRandomJoke(){
      if(!jokeBag.length) jokeBag = shuffleList(jokeList);

      if(!jokeBag.length){
        jokeTitle.textContent = "Cười xíu";
        jokeContent.textContent = "Chưa tải được dữ liệu truyện cười. Kiểm tra file json/truyencuoi.json nha.";
        return;
      }

      const item = normalizeJoke(jokeBag.shift());
      jokeTitle.textContent = item.title;
      jokeContent.textContent = item.content;
    }

    function normalizePetItem(item, index){
      if(typeof item === "string"){
        return {
          name: `Thú cưng ${index + 1}`,
          src: item.includes("/") ? item : `images/thucung/${item}`
        };
      }

      const rawSrc = item.image || item.file || item.src || item.url || "";
      return {
        name: item.name || item.title || `Thú cưng ${index + 1}`,
        src: rawSrc.includes("/") ? rawSrc : `images/thucung/${rawSrc}`
      };
    }

    async function loadPetHomeImages(){
      const paths = [
        "json/thuvienthucung.json",
        "thuvienthucung.json"
      ];

      for(const path of paths){
        try{
          const response = await fetch(path, { cache:"no-store" });
          if(!response.ok) continue;
          const data = await response.json();
          const raw = Array.isArray(data) ? data : (data.items || data.images || data.data || []);
          petHomeImages = raw.map(normalizePetItem).filter(item => item.src);
          if(petHomeImages.length) return;
        }catch(error){
          console.warn("Không tải được thú cưng:", path, error);
        }
      }

      petHomeImages = [];
    }

    function getPetHomeStep(){
      if(window.innerWidth <= 390) return 196;
      return 220;
    }

    function buildPetHomeCards(){
      petHomeTrack.innerHTML = "";
      petHomeCards = [];
      petHomeStep = getPetHomeStep();

      if(!petHomeImages.length){
        petHomeEmpty.style.display = "flex";
        petHomeWindow.style.display = "none";
        petHomeEmpty.textContent = "Chưa tải được dữ liệu thú cưng. Kiểm tra file json/thuvienthucung.json nha.";
        return;
      }

      petHomeEmpty.style.display = "none";
      petHomeWindow.style.display = "flex";

      const shuffled = shuffleList(petHomeImages);
      const repeated = [];
      const loops = Math.max(5, Math.ceil(22 / Math.max(1, shuffled.length)));
      for(let i = 0; i < loops; i++){
        shuffled.forEach(item => repeated.push(item));
      }

      repeated.forEach((item, index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "pet-home-card";
        card.dataset.src = item.src;
        card.dataset.name = item.name;
        card.innerHTML = `<img src="${item.src}" alt="${item.name}">`;

        card.addEventListener("click", event => {
          event.stopPropagation();
          if(card.classList.contains("is-center")){
            openPetHomeFullscreen(item.src, item.name);
          }else{
            petHomePosition = index * petHomeStep;
            petHomePauseUntil = performance.now() + 1200;
            updatePetHomeFlow();
          }
        });

        petHomeTrack.appendChild(card);
        petHomeCards.push(card);
      });

      petHomePosition = Math.floor(petHomeCards.length / 2) * petHomeStep;
      updatePetHomeFlow();
    }

    function updatePetHomeFlow(){
      if(!petHomeCards.length) return;

      const totalWidth = petHomeCards.length * petHomeStep;
      const centerLoop = totalWidth / 2;

      if(petHomePosition > totalWidth - petHomeStep * 6) petHomePosition -= centerLoop;
      if(petHomePosition < petHomeStep * 4) petHomePosition += centerLoop;

      let closestCard = null;
      let closestDistance = Infinity;

      petHomeCards.forEach((card, index) => {
        let x = index * petHomeStep - petHomePosition;

        while(x < -totalWidth / 2) x += totalWidth;
        while(x > totalWidth / 2) x -= totalWidth;

        const normalized = Math.min(Math.abs(x) / petHomeStep, 2.6);
        const centerStrength = Math.max(0, 1 - normalized);
        const scale = .68 + centerStrength * .48;
        const opacity = Math.max(0, 1 - Math.max(0, normalized - .2) * .38);
        const blur = Math.min(2.2, normalized * .75);
        const rotate = Math.max(-8, Math.min(8, x / petHomeStep * -4));
        const translateY = centerStrength * -8;

        card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${translateY}px)) scale(${scale}) rotateY(${rotate}deg)`;
        card.style.opacity = opacity;
        card.style.filter = `saturate(${.86 + centerStrength * .28}) brightness(${.88 + centerStrength * .12}) blur(${blur}px)`;
        card.style.zIndex = String(Math.round(10 + centerStrength * 100));

        if(Math.abs(x) < closestDistance){
          closestDistance = Math.abs(x);
          closestCard = card;
        }
      });

      petHomeCards.forEach(card => card.classList.remove("is-center"));
      if(closestCard) closestCard.classList.add("is-center");
    }

    function animatePetHome(now){
      if(!petHomeLastTime) petHomeLastTime = now;
      const delta = now - petHomeLastTime;
      petHomeLastTime = now;

      if(now > petHomePauseUntil){
        petHomePosition += delta * petHomeSpeed;
        updatePetHomeFlow();
      }

      petHomeFrame = requestAnimationFrame(animatePetHome);
    }

    function openPetHomeFullscreen(src, name){
      petHomeFullImg.src = src;
      petHomeFullImg.alt = name || "Thú cưng";
      openModal(petHomeFullscreen);
    }

    function closePetHomeFullscreen(){
      closeModal(petHomeFullscreen);
      petHomeFullImg.src = "";
    }

    openSecretBtn?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      showRandomSecret();
      openModal(secretModal);
    });

    secretNextBtn?.addEventListener("click", event => {
      event.stopPropagation();
      showRandomSecret();
    });

    secretCloseBtn?.addEventListener("click", event => {
      event.stopPropagation();
      closeModal(secretModal);
    });

    secretModal?.addEventListener("click", event => {
      if(event.target === secretModal) closeModal(secretModal);
    });

    openJokeBtn?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      showRandomJoke();
      openModal(jokeModal);
    });

    jokeNextBtn?.addEventListener("click", event => {
      event.stopPropagation();
      showRandomJoke();
    });

    jokeCloseBtn?.addEventListener("click", event => {
      event.stopPropagation();
      closeModal(jokeModal);
    });

    jokeModal?.addEventListener("click", event => {
      if(event.target === jokeModal) closeModal(jokeModal);
    });

    openPetHomeBtn?.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();

      if(!petHomeImages.length){
        await loadPetHomeImages();
        buildPetHomeCards();
      }

      openModal(petHomeModal);
      petHomeLastTime = null;
      cancelAnimationFrame(petHomeFrame);
      petHomeFrame = requestAnimationFrame(animatePetHome);
    });

    petHomePrevBtn?.addEventListener("click", event => {
      event.stopPropagation();
      petHomePosition -= petHomeStep;
      petHomePauseUntil = performance.now() + 1200;
      updatePetHomeFlow();
    });

    petHomeNextBtn?.addEventListener("click", event => {
      event.stopPropagation();
      petHomePosition += petHomeStep;
      petHomePauseUntil = performance.now() + 1200;
      updatePetHomeFlow();
    });

    petHomeCloseBtn?.addEventListener("click", event => {
      event.stopPropagation();
      closeModal(petHomeModal);
      cancelAnimationFrame(petHomeFrame);
    });

    petHomeModal?.addEventListener("click", event => {
      if(event.target === petHomeModal){
        closeModal(petHomeModal);
        cancelAnimationFrame(petHomeFrame);
      }
    });

    petHomeViewClose?.addEventListener("click", event => {
      event.stopPropagation();
      closePetHomeFullscreen();
    });

    petHomeFullscreen?.addEventListener("click", event => {
      if(event.target === petHomeFullscreen) closePetHomeFullscreen();
    });

    window.addEventListener("keydown", event => {
      if(event.key !== "Escape") return;
      closeModal(secretModal);
      closeModal(jokeModal);
      closePetHomeFullscreen();
      closeModal(petHomeModal);
      cancelAnimationFrame(petHomeFrame);
    });

    loadSecretList();
    loadJokeList();
    // GAME POPUP ROBUST CLICK FIX
    document.addEventListener("click", function(event) {
      const gameLink = event.target.closest && event.target.closest("#gameBtn");
      if (!gameLink) return;
      event.preventDefault();

      const gameModalFix = document.getElementById("gameModal");
      if (gameModalFix) {
        gameModalFix.classList.add("show");
      } else {
        showToast("Chưa tìm thấy popup Game trong file.");
      }
    });


    document.addEventListener("click", function(event) {
      if (event.target.closest && (event.target.closest("#openCaroBtn") || event.target.closest("#open2048Btn"))) {
        const choose = document.getElementById("gameModal");
        if (choose) choose.classList.remove("show");
      }
    }, true);


    // GAME POPUP CLOSE FIX
    (function(){
      const gameModal = document.getElementById("gameModal");
      const gameCloseBtn = document.getElementById("gameCloseBtn");

      function closeGameModal(){
        if(!gameModal) return;
        gameModal.classList.remove("show");
        gameModal.setAttribute("aria-hidden", "true");
      }

      gameCloseBtn?.addEventListener("click", function(event){
        event.preventDefault();
        event.stopPropagation();
        closeGameModal();
      });

      gameModal?.addEventListener("click", function(event){
        if(event.target === gameModal){
          closeGameModal();
        }
      });

      window.addEventListener("keydown", function(event){
        if(event.key === "Escape" && gameModal?.classList.contains("show")){
          closeGameModal();
        }
      });
    })();



    document.getElementById("open2048HomeBtn")?.addEventListener("click", function(event){
      event.preventDefault();
      document.getElementById("gameModal")?.classList.remove("show");
      document.getElementById("game2048Modal")?.classList.add("show");
    });

    document.getElementById("zenBtn")?.addEventListener("click", async function(event){
      event.preventDefault();
      if (chantFloatBtn) chantFloatBtn.click();
    });

        setPlayButtonIcon(false);
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadQuotes();
    loadPlaylist();


/* KINH PHÁP CÚ POPUP MOBILE */
(function(){
  const openBtn = document.getElementById("openKpcBtn");
  const modal = document.getElementById("kpcMobileModal");
  const closeBtn = document.getElementById("kpcCloseBtn");
  const introEl = document.getElementById("kpcIntroText");
  const searchInput = document.getElementById("kpcSearchInput");
  const grid = document.getElementById("kpcGrid");
  const reader = document.getElementById("kpcReader");
  const readerTitle = document.getElementById("kpcReaderTitle");
  const readerContent = document.getElementById("kpcReaderContent");
  const readerBack = document.getElementById("kpcReaderBack");
  const readerClose = document.getElementById("kpcReaderClose");

  if(!openBtn || !modal || !grid) return;

  let kpcItems = [];
  let kpcKeyword = "";
  let kpcLoaded = false;

  const kpcColors = [
    "linear-gradient(135deg, rgba(255,154,158,.24), rgba(250,208,196,.10))",
    "linear-gradient(135deg, rgba(161,140,209,.26), rgba(251,194,235,.10))",
    "linear-gradient(135deg, rgba(246,211,101,.22), rgba(253,160,133,.10))",
    "linear-gradient(135deg, rgba(132,250,176,.20), rgba(143,211,244,.10))",
    "linear-gradient(135deg, rgba(252,203,144,.22), rgba(213,126,235,.10))",
    "linear-gradient(135deg, rgba(48,207,208,.20), rgba(51,8,103,.16))",
    "linear-gradient(135deg, rgba(240,147,251,.20), rgba(245,87,108,.12))",
    "linear-gradient(135deg, rgba(79,172,254,.20), rgba(0,242,254,.10))"
  ];

  function escapeHTML(text){
    return String(text ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function escapeRegExp(text){
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeKpcItem(item, index){
    if(typeof item === "string"){
      return { title:`Bài ${index + 1}`, content:item };
    }

    return {
      title:item?.title || item?.name || item?.ten || `Bài ${index + 1}`,
      content:item?.content || item?.text || item?.noidung || item?.body || ""
    };
  }

  function applyColorTags(html){
    return html
      .replace(/&lt;red&gt;(.*?)&lt;\/red&gt;/gis, '<span style="color:#ff8d8d">$1</span>')
      .replace(/&lt;blue&gt;(.*?)&lt;\/blue&gt;/gis, '<span style="color:#8fc7ff">$1</span>')
      .replace(/&lt;green&gt;(.*?)&lt;\/green&gt;/gis, '<span style="color:#9cffc0">$1</span>')
      .replace(/&lt;purple&gt;(.*?)&lt;\/purple&gt;/gis, '<span style="color:#d9a8ff">$1</span>')
      .replace(/&lt;orange&gt;(.*?)&lt;\/orange&gt;/gis, '<span style="color:#ffc06d">$1</span>');
  }

  function highlightHTML(text){
    let html = escapeHTML(text);
    if(kpcKeyword){
      const pattern = new RegExp(`(${escapeRegExp(kpcKeyword)})`, "gi");
      html = html.replace(pattern, "<mark>$1</mark>");
    }
    return applyColorTags(html).replace(/\n/g,"<br>");
  }

  function setKpcLoading(message){
    grid.innerHTML = `<div class="kpc-loading">${escapeHTML(message)}</div>`;
  }

  async function fetchKpcData(){
    const paths = [
      "json/kinhphapcu.json",
      "json/jsonkpc2.json",
      "json/jsonkpc.json"
    ];

    for(const path of paths){
      try{
        const res = await fetch(path, { cache:"no-store" });
        if(!res.ok) continue;
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.items || data.data || data.list || []);
        const items = raw.map(normalizeKpcItem).filter(item => item.title && item.content);

        if(data?.intro){
          introEl.innerHTML = data.intro.content || data.intro.text || data.intro || "Kinh Pháp Cú";
        }else{
          introEl.textContent = "Những câu kệ ngắn gọn để đọc chậm, nghĩ sâu và giữ lòng bình an.";
        }

        if(items.length){
          kpcItems = items;
          kpcLoaded = true;
          renderKpcCards(kpcItems);
          return;
        }
      }catch(error){
        console.warn("Không tải được Kinh Pháp Cú:", path, error);
      }
    }

    kpcLoaded = true;
    kpcItems = [];
    introEl.textContent = "Không tải được dữ liệu Kinh Pháp Cú.";
    setKpcLoading("Chưa tải được dữ liệu. Kiểm tra file json/kinhphapcu.json hoặc json/jsonkpc2.json nha.");
  }

  function renderKpcCards(list){
    grid.innerHTML = "";

    if(!list.length){
      grid.innerHTML = '<div class="kpc-empty">Không tìm thấy bài phù hợp.</div>';
      return;
    }

    list.forEach((item, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "kpc-card";
      card.style.background = kpcColors[index % kpcColors.length];
      card.innerHTML = highlightHTML(item.title);
      card.addEventListener("click", () => openKpcReader(item));
      grid.appendChild(card);
    });
  }

  function filterKpc(){
    const key = kpcKeyword.toLowerCase();
    if(!key){
      renderKpcCards(kpcItems);
      return;
    }

    const filtered = kpcItems.filter(item => {
      return item.title.toLowerCase().includes(key) || item.content.toLowerCase().includes(key);
    });

    renderKpcCards(filtered);
  }

  function openKpcReader(item){
    if(!reader) return;
    readerTitle.innerHTML = highlightHTML(item.title);
    readerContent.innerHTML = highlightHTML(item.content);
    reader.classList.add("show");
    reader.setAttribute("aria-hidden", "false");
  }

  function closeKpcReader(){
    if(!reader) return;
    reader.classList.remove("show");
    reader.setAttribute("aria-hidden", "true");
  }

  function openKpcModal(event){
    event?.preventDefault();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("kpc-open");

    if(!kpcLoaded){
      setKpcLoading("Đang mở Kinh Pháp Cú...");
      fetchKpcData();
    }

    setTimeout(() => searchInput?.focus(), 120);
  }

  function closeKpcModal(){
    closeKpcReader();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("kpc-open");
  }

  openBtn.addEventListener("click", openKpcModal);
  closeBtn?.addEventListener("click", closeKpcModal);
  readerBack?.addEventListener("click", closeKpcReader);
  readerClose?.addEventListener("click", closeKpcModal);

  modal.addEventListener("click", event => {
    if(event.target === modal) closeKpcModal();
  });

  searchInput?.addEventListener("input", event => {
    kpcKeyword = event.target.value.trim();
    filterKpc();
  });

  window.addEventListener("keydown", event => {
    if(event.key !== "Escape" || !modal.classList.contains("show")) return;
    if(reader?.classList.contains("show")){
      closeKpcReader();
    }else{
      closeKpcModal();
    }
  });
})();
const themeFloatBtn = document.getElementById("themeFloatBtn");
const roomApp = document.querySelector(".room-app");

const myDocThemes = [
  { name: "rain", icon: "🌙" },
  { name: "blue", icon: "💧" },
  { name: "purple", icon: "🌑" }
];

let myDocThemeIndex = Number(localStorage.getItem("myDocThemeIndex") || 0);

function applyMyDocTheme(){
  if(!roomApp) return;

  const theme = myDocThemes[myDocThemeIndex] || myDocThemes[0];

  roomApp.dataset.theme = theme.name;
  document.body.dataset.theme = theme.name;

  if(themeFloatBtn){
    themeFloatBtn.innerHTML = `<span class="top-action-icon">${theme.icon}</span><span class="top-action-label">Đổi giao diện</span>`;
    themeFloatBtn.title = `Đổi giao diện: ${theme.name}`;
  }

  localStorage.setItem("myDocThemeIndex", String(myDocThemeIndex));
}

themeFloatBtn?.addEventListener("click", () => {
  myDocThemeIndex = (myDocThemeIndex + 1) % myDocThemes.length;
  applyMyDocTheme();
});

applyMyDocTheme();

const chantFloatBtn = document.getElementById("chantFloatBtn");
const chantAudio = document.getElementById("chantAudio");

let isChantPlaying = false;

chantFloatBtn?.addEventListener("click", async () => {
  if (!chantAudio) return;

  if (isChantPlaying) {
    chantAudio.pause();
    isChantPlaying = false;
    chantFloatBtn.classList.remove("active");
    return;
  }

  try {
    chantAudio.volume = 0.8;
    await chantAudio.play();
    isChantPlaying = true;
    chantFloatBtn.classList.add("active");
  } catch (error) {
    showToast?.("Không phát được Nhạc Niệm Phật.");
  }
});