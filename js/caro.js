/* =========================================================
   MYDOC CARO 15x15 - RAIN LEVEL MODE
   File gốc nên lưu là: caro.js
   Nếu tải về dạng TXT, đổi tên file này thành caro.js
   ========================================================= */

(function () {
  const SIZE = 15;
  const WIN_COUNT = 5;
  const EMPTY = "";
  const PLAYER = "X";
  const BOT = "O";
  const SCORE_KEY = "mydoc_caro_score_rain_giong_15x15";
  const LEVEL_KEY = "mydoc_caro_level_rain_giong_15x15";

  const LEVELS = {
    rain: {
      label: "🌧 Mưa",
      delay: 1000,
      mistakeRate: 0.12,
      defendWeight: 1.05,
      blockWinRate: 0.95,
      topPick: 4
    },
    storm: {
      label: "⛈ Giông",
      delay: 620,
      mistakeRate: 0,
      defendWeight: 1.42,
      blockWinRate: 1,
      topPick: 1
    }
  };

  const openBtn = document.getElementById("openCaroBtn");
  const modal = document.getElementById("caroModal");
  const closeBtn = document.getElementById("closeCaroBtn");
  const boardEl = document.getElementById("caroBoard");
  const statusEl = document.getElementById("caroStatus");
  const resetBtn = document.getElementById("resetCaroBtn");
  const clearScoreBtn = document.getElementById("clearCaroScoreBtn");
  const playerScoreEl = document.getElementById("caroPlayerScore");
  const botScoreEl = document.getElementById("caroBotScore");
  const levelBtns = document.querySelectorAll("[data-caro-level]");
  const resultPop = document.getElementById("caroResultPop");
  const resultIcon = document.getElementById("caroResultIcon");
  const resultTitle = document.getElementById("caroResultTitle");
  const resultSubtitle = document.getElementById("caroResultSubtitle");

  if (!openBtn || !modal || !closeBtn || !boardEl || !statusEl) {
    return;
  }

  let board = [];
  let cells = [];
  let gameOver = false;
  let botThinking = false;
  let score = loadScore();
  let currentLevel = loadLevel();

  function loadScore() {
    try {
      return JSON.parse(localStorage.getItem(SCORE_KEY)) || { player: 0, bot: 0 };
    } catch (e) {
      return { player: 0, bot: 0 };
    }
  }

  function saveScore() {
    localStorage.setItem(SCORE_KEY, JSON.stringify(score));
  }

  function loadLevel() {
    const saved = localStorage.getItem(LEVEL_KEY);
    return LEVELS[saved] ? saved : "rain";
  }

  function saveLevel() {
    localStorage.setItem(LEVEL_KEY, currentLevel);
  }

  function getLevelConfig() {
    return LEVELS[currentLevel] || LEVELS.rain;
  }

  function updateLevelButtons() {
    levelBtns.forEach(function (btn) {
      const active = btn.dataset.caroLevel === currentLevel;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setLevel(level) {
    if (!LEVELS[level]) return;

    currentLevel = level;
    saveLevel();
    updateLevelButtons();

    if (!gameOver && !botThinking) {
      setStatus("Đã chọn " + getLevelConfig().label + " · Tới lượt bạn đi X");
    }
  }

  function updateScore() {
    if (playerScoreEl) playerScoreEl.textContent = score.player || 0;
    if (botScoreEl) botScoreEl.textContent = score.bot || 0;
    saveScore();
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function hideResultPop() {
    if (!resultPop) return;
    resultPop.classList.remove("show", "win", "lose", "draw");
    resultPop.setAttribute("aria-hidden", "true");
    resultPop.style.display = "none";
  }

  function showResultPop(type) {
    if (!resultPop || !resultIcon || !resultTitle || !resultSubtitle) return;

    const levelLabel = getLevelConfig().label;
    let data = {
      icon: "🤝",
      title: "DRAW",
      subtitle: levelLabel + " · Trận mưa cân bằng"
    };

    if (type === "win") {
      data = {
        icon: "🏆",
        title: "YOU WIN",
        subtitle: levelLabel + " · Chiến thắng thuộc về bạn"
      };
    }

    if (type === "lose") {
      data = {
        icon: "⚡",
        title: "YOU LOSE",
        subtitle: levelLabel + " · Máy vừa gọi sấm sét"
      };
    }

    resultIcon.textContent = data.icon;
    resultTitle.textContent = data.title;
    resultSubtitle.textContent = data.subtitle;

    resultPop.classList.remove("show", "win", "lose", "draw");
    resultPop.style.display = "flex";
    void resultPop.offsetWidth;
    resultPop.classList.add("show", type);
    resultPop.setAttribute("aria-hidden", "false");

    setTimeout(function () {
      hideResultPop();
    }, 3000);
  }

  function initGame() {
    hideResultPop();
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    cells = Array.from({ length: SIZE }, () => []);
    gameOver = false;
    botThinking = false;
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = "repeat(" + SIZE + ", 1fr)";
    boardEl.style.gridTemplateRows = "repeat(" + SIZE + ", 1fr)";

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "caro-cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute("aria-label", "Ô caro " + (r + 1) + "-" + (c + 1));
        cell.addEventListener("click", function () {
          playerMove(r, c);
        });

        boardEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    currentLevel = loadLevel();
    updateScore();
    updateLevelButtons();
    setStatus(getLevelConfig().label + " · Tới lượt bạn đi X");
  }

  function openCaro() {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    currentLevel = loadLevel();
    updateLevelButtons();

    if (!board.length) {
      initGame();
    }
  }

  function closeCaro() {
    hideResultPop();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function playerMove(r, c) {
    if (gameOver || botThinking || board[r][c] !== EMPTY) return;

    placeMove(r, c, PLAYER);

    const playerWin = checkWin(r, c, PLAYER);
    if (playerWin.win) {
      finishGame("Bạn thắng rồi nha 😎", playerWin.line, PLAYER);
      return;
    }

    if (isBoardFull()) {
      finishDraw();
      return;
    }

    botThinking = true;
    setStatus("Máy đang suy nghĩ...");
    setTimeout(botMove, getLevelConfig().delay);
  }

  function botMove() {
    if (gameOver) return;

    const move = findBestMove();

    if (move) {
      placeMove(move.r, move.c, BOT);

      const botWin = checkWin(move.r, move.c, BOT);
      if (botWin.win) {
        finishGame("Máy thắng rồi, phục thù đi 😤", botWin.line, BOT);
        botThinking = false;
        return;
      }
    }

    if (isBoardFull()) {
      finishDraw();
      botThinking = false;
      return;
    }

    botThinking = false;
    setStatus(getLevelConfig().label + " · Tới lượt bạn đi X");
  }

  function placeMove(r, c, mark) {
    board[r][c] = mark;
    cells[r][c].textContent = mark;
    cells[r][c].classList.add(mark.toLowerCase());
    cells[r][c].disabled = true;
  }

  function finishGame(message, line, winner) {
    gameOver = true;
    setStatus(message);

    line.forEach(function (pos) {
      const r = pos[0];
      const c = pos[1];
      cells[r][c].classList.add("win");
    });

    if (winner === PLAYER) score.player = (score.player || 0) + 1;
    if (winner === BOT) score.bot = (score.bot || 0) + 1;

    updateScore();
    disableBoard();
    showResultPop(winner === PLAYER ? "win" : "lose");
  }

  function finishDraw() {
    gameOver = true;
    setStatus("Hòa rồi nha 🤝");
    disableBoard();
    showResultPop("draw");
  }

  function disableBoard() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        cells[r][c].disabled = true;
      }
    }
  }

  function isBoardFull() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === EMPTY) return false;
      }
    }
    return true;
  }

  function isInside(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function checkWin(r, c, mark) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];

    for (const dir of dirs) {
      const dr = dir[0];
      const dc = dir[1];
      const line = [[r, c]];

      let nr = r + dr;
      let nc = c + dc;
      while (isInside(nr, nc) && board[nr][nc] === mark) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }

      nr = r - dr;
      nc = c - dc;
      while (isInside(nr, nc) && board[nr][nc] === mark) {
        line.unshift([nr, nc]);
        nr -= dr;
        nc -= dc;
      }

      if (line.length >= WIN_COUNT) {
        return {
          win: true,
          line: line.slice(0, WIN_COUNT)
        };
      }
    }

    return { win: false, line: [] };
  }

  function findBestMove() {
    const candidates = getCandidateCells();

    if (!candidates.length) {
      return {
        r: Math.floor(SIZE / 2),
        c: Math.floor(SIZE / 2)
      };
    }

    const cfg = getLevelConfig();

    // Bot có nước thắng ngay thì đánh luôn.
    const botWinMove = findImmediateMove(BOT, candidates);
    if (botWinMove) return botWinMove;

    // Người chơi sắp thắng ngay thì tùy chế độ mà chặn.
    const playerWinMove = findImmediateMove(PLAYER, candidates);
    if (playerWinMove && Math.random() < cfg.blockWinRate) {
      return playerWinMove;
    }

    const scored = candidates.map(function (move) {
      const attackScore = evaluatePoint(move.r, move.c, BOT);
      const defendScore = evaluatePoint(move.r, move.c, PLAYER);

      const centerR = (SIZE - 1) / 2;
      const centerC = (SIZE - 1) / 2;
      const centerBonus = 18 - Math.abs(move.r - centerR) - Math.abs(move.c - centerC);

      return {
        r: move.r,
        c: move.c,
        score: Math.max(attackScore, defendScore * cfg.defendWeight) + centerBonus
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    // Mưa phùn có thể chọn lệch khá nhiều, Mưa vừa ít lệch, Giông tố gần như tối ưu.
    if (Math.random() < cfg.mistakeRate) {
      const topCount = Math.min(scored.length, cfg.topPick);
      const pickIndex = Math.floor(Math.random() * topCount);
      return scored[pickIndex];
    }

    return scored[0];
  }

  function findImmediateMove(mark, candidates) {
    for (const move of candidates) {
      board[move.r][move.c] = mark;
      const result = checkWin(move.r, move.c, mark);
      board[move.r][move.c] = EMPTY;

      if (result.win) return move;
    }

    return null;
  }

  function getCandidateCells() {
    const set = new Set();
    let hasAnyMove = false;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== EMPTY) {
          hasAnyMove = true;

          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;

              if (isInside(nr, nc) && board[nr][nc] === EMPTY) {
                set.add(nr + "," + nc);
              }
            }
          }
        }
      }
    }

    if (!hasAnyMove) {
      return [{
        r: Math.floor(SIZE / 2),
        c: Math.floor(SIZE / 2)
      }];
    }

    return Array.from(set).map(function (key) {
      const parts = key.split(",").map(Number);
      return { r: parts[0], c: parts[1] };
    });
  }

  function evaluatePoint(r, c, mark) {
    if (board[r][c] !== EMPTY) return -Infinity;

    const opponent = mark === BOT ? PLAYER : BOT;
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];

    let total = 0;

    for (const dir of dirs) {
      const dr = dir[0];
      const dc = dir[1];

      let count = 1;
      let openEnds = 0;
      let opponentBlock = 0;

      let nr = r + dr;
      let nc = c + dc;
      while (isInside(nr, nc) && board[nr][nc] === mark) {
        count++;
        nr += dr;
        nc += dc;
      }

      if (isInside(nr, nc) && board[nr][nc] === EMPTY) openEnds++;
      if (isInside(nr, nc) && board[nr][nc] === opponent) opponentBlock++;

      nr = r - dr;
      nc = c - dc;
      while (isInside(nr, nc) && board[nr][nc] === mark) {
        count++;
        nr -= dr;
        nc -= dc;
      }

      if (isInside(nr, nc) && board[nr][nc] === EMPTY) openEnds++;
      if (isInside(nr, nc) && board[nr][nc] === opponent) opponentBlock++;

      total += patternScore(count, openEnds, opponentBlock);
    }

    return total;
  }

  function patternScore(count, openEnds, blocked) {
    if (count >= 5) return 10000000;
    if (count === 4 && openEnds === 2) return 720000;
    if (count === 4 && openEnds === 1) return 98000;
    if (count === 3 && openEnds === 2) return 12000;
    if (count === 3 && openEnds === 1) return 1800;
    if (count === 2 && openEnds === 2) return 260;
    if (count === 2 && openEnds === 1) return 60;
    if (count === 1 && openEnds === 2) return 18;
    if (blocked >= 2) return 1;
    return 4;
  }

  openBtn.addEventListener("click", openCaro);
  closeBtn.addEventListener("click", closeCaro);

  levelBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLevel(btn.dataset.caroLevel);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", initGame);
  }

  if (clearScoreBtn) {
    clearScoreBtn.addEventListener("click", function () {
      score = { player: 0, bot: 0 };
      updateScore();
      setStatus("Đã xóa điểm · " + getLevelConfig().label + " · Tới lượt bạn đi X");
    });
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeCaro();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("show")) {
      closeCaro();
    }
  });

  updateScore();
  updateLevelButtons();
})();