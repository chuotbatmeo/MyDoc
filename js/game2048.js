/* =========================================================
   MYDOC 2048 - 4x4 MOBILE FRIENDLY
   File tải về dạng txt thì đổi tên thành: game2048.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", function(){
  const openBtn = document.getElementById("open2048Btn");
  const modal = document.getElementById("game2048Modal");
  const closeBtn = document.getElementById("close2048Btn");
  const boardEl = document.getElementById("board2048");
  const scoreEl = document.getElementById("score2048");
  const bestEl = document.getElementById("best2048");
  const statusEl = document.getElementById("status2048");
  const restartBtn = document.getElementById("restart2048Btn");
  const undoBtn = document.getElementById("undo2048Btn");
  const resultPop = document.getElementById("result2048");
  const resultIcon = document.getElementById("result2048Icon");
  const resultTitle = document.getElementById("result2048Title");
  const resultSubtitle = document.getElementById("result2048Subtitle");

  if(!openBtn || !modal || !boardEl) return;

  const SIZE = 4;
  const BEST_KEY = "mydoc_2048_best_v1";

  let board = [];
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let previous = null;
  let won = false;
  let touchX = 0;
  let touchY = 0;

  function empty(){
    return Array.from({length:SIZE}, () => Array(SIZE).fill(0));
  }

  function clone(b){
    return b.map(row => row.slice());
  }

  function status(text){
    if(statusEl) statusEl.textContent = text;
  }

  function updateScore(){
    if(scoreEl) scoreEl.textContent = score;

    if(score > best){
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }

    if(bestEl) bestEl.textContent = best;
  }

  function emptyCells(){
    const arr = [];

    for(let r = 0; r < SIZE; r++){
      for(let c = 0; c < SIZE; c++){
        if(!board[r][c]) arr.push({r,c});
      }
    }

    return arr;
  }

  function addTile(){
    const arr = emptyCells();
    if(!arr.length) return;

    const p = arr[Math.floor(Math.random() * arr.length)];
    board[p.r][p.c] = Math.random() < .9 ? 2 : 4;
  }

  function setup(){
    boardEl.innerHTML = "";

    for(let i = 0; i < SIZE * SIZE; i++){
      const cell = document.createElement("div");
      cell.className = "tile2048";
      boardEl.appendChild(cell);
    }
  }

  function tileClass(value){
    if(!value) return "";
    if(value > 2048) return "vbig";
    return "v" + value;
  }

  function render(merged = [], news = []){
    updateScore();

    const mergedSet = new Set(merged.map(p => p.r + "," + p.c));
    const newSet = new Set(news.map(p => p.r + "," + p.c));

    for(let r = 0; r < SIZE; r++){
      for(let c = 0; c < SIZE; c++){
        const cell = boardEl.children[r * SIZE + c];
        const value = board[r][c];

        cell.className = "tile2048";
        cell.textContent = value || "";

        if(value) cell.classList.add(tileClass(value));
        if(mergedSet.has(r + "," + c)) cell.classList.add("merge");
        if(newSet.has(r + "," + c)) cell.classList.add("new");
      }
    }
  }

  function start(){
    hideResult();
    board = empty();
    score = 0;
    previous = null;
    won = false;
    addTile();
    addTile();
    status("Vuốt để bắt đầu ghép số 🌧");
    render();
  }

  function slide(line){
    const filtered = line.filter(Boolean);
    const result = [];
    let gain = 0;
    const mergedIndexes = [];

    for(let i = 0; i < filtered.length; i++){
      if(filtered[i] === filtered[i + 1]){
        const value = filtered[i] * 2;
        result.push(value);
        gain += value;
        mergedIndexes.push(result.length - 1);
        i++;
      }else{
        result.push(filtered[i]);
      }
    }

    while(result.length < SIZE) result.push(0);

    return { line:result, gain, mergedIndexes };
  }

  function same(a,b){
    return a.every((value, index) => value === b[index]);
  }

  function move(dir){
    if(!board.length) return;

    previous = {
      board: clone(board),
      score,
      won
    };

    let moved = false;
    let gain = 0;
    const merged = [];

    for(let i = 0; i < SIZE; i++){
      const line = [];

      for(let j = 0; j < SIZE; j++){
        if(dir === "left") line.push(board[i][j]);
        if(dir === "right") line.push(board[i][SIZE - 1 - j]);
        if(dir === "up") line.push(board[j][i]);
        if(dir === "down") line.push(board[SIZE - 1 - j][i]);
      }

      const slid = slide(line);
      gain += slid.gain;

      if(!same(line, slid.line)) moved = true;

      for(let j = 0; j < SIZE; j++){
        const value = slid.line[j];

        if(dir === "left") board[i][j] = value;
        if(dir === "right") board[i][SIZE - 1 - j] = value;
        if(dir === "up") board[j][i] = value;
        if(dir === "down") board[SIZE - 1 - j][i] = value;
      }

      slid.mergedIndexes.forEach(idx => {
        if(dir === "left") merged.push({r:i,c:idx});
        if(dir === "right") merged.push({r:i,c:SIZE - 1 - idx});
        if(dir === "up") merged.push({r:idx,c:i});
        if(dir === "down") merged.push({r:SIZE - 1 - idx,c:i});
      });
    }

    if(!moved){
      previous = null;
      status("Không đi được hướng đó rồi 😆");
      return;
    }

    score += gain;

    const before = clone(board);
    addTile();

    const news = [];
    for(let r = 0; r < SIZE; r++){
      for(let c = 0; c < SIZE; c++){
        if(!before[r][c] && board[r][c]){
          news.push({r,c});
        }
      }
    }

    render(merged, news);

    if(has2048() && !won){
      won = true;
      status("Chạm 2048 rồi nha 🏆");
      showResult("win");
      return;
    }

    if(!canMove()){
      status("Hết nước đi rồi 😵");
      showResult("lose");
    }else{
      status("Tiếp tục ghép số nào 🌧");
    }
  }

  function has2048(){
    return board.some(row => row.some(value => value >= 2048));
  }

  function canMove(){
    if(emptyCells().length) return true;

    for(let r = 0; r < SIZE; r++){
      for(let c = 0; c < SIZE; c++){
        const value = board[r][c];
        if(r + 1 < SIZE && board[r + 1][c] === value) return true;
        if(c + 1 < SIZE && board[r][c + 1] === value) return true;
      }
    }

    return false;
  }

  function showResult(type){
    if(!resultPop) return;

    const isWin = type === "win";

    resultIcon.textContent = isWin ? "🏆" : "💀";
    resultTitle.textContent = isWin ? "YOU WIN" : "GAME OVER";
    resultSubtitle.textContent = (isWin ? "Bạn đã chạm tới 2048 · Điểm " : "Mưa đã khép lại · Điểm ") + score;

    resultPop.classList.remove("show", "win", "lose");
    resultPop.style.display = "flex";
    void resultPop.offsetWidth;
    resultPop.classList.add("show", isWin ? "win" : "lose");
    resultPop.setAttribute("aria-hidden", "false");

    setTimeout(hideResult, 2800);
  }

  function hideResult(){
    if(!resultPop) return;
    resultPop.classList.remove("show", "win", "lose");
    resultPop.setAttribute("aria-hidden", "true");
    resultPop.style.display = "none";
  }

  function open(){
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    if(!board.length){
      setup();
      start();
    }else{
      render();
    }
  }

  function close(){
    hideResult();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function undo(){
    if(!previous) return;

    board = clone(previous.board);
    score = previous.score;
    won = previous.won;
    previous = null;
    status("Đã hoàn tác một bước 🌧");
    render();
  }

  openBtn.addEventListener("click", e => {
    e.stopPropagation();
    open();
  });

  if(closeBtn){
    closeBtn.addEventListener("click", e => {
      e.stopPropagation();
      close();
    });
  }

  if(restartBtn){
    restartBtn.addEventListener("click", e => {
      e.stopPropagation();
      start();
    });
  }

  if(undoBtn){
    undoBtn.addEventListener("click", e => {
      e.stopPropagation();
      undo();
    });
  }

  modal.addEventListener("click", e => {
    if(e.target === modal) close();
  });

  boardEl.addEventListener("touchstart", e => {
    if(!e.touches.length) return;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, {passive:true});

  boardEl.addEventListener("touchmove", e => {
    e.preventDefault();
  }, {passive:false});

  boardEl.addEventListener("touchend", e => {
    if(!e.changedTouches.length) return;

    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;

    if(Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;

    if(Math.abs(dx) > Math.abs(dy)){
      move(dx > 0 ? "right" : "left");
    }else{
      move(dy > 0 ? "down" : "up");
    }
  });

  document.addEventListener("keydown", e => {
    if(!modal.classList.contains("show")) return;

    const map = {
      ArrowLeft:"left",
      ArrowRight:"right",
      ArrowUp:"up",
      ArrowDown:"down",
      a:"left",
      d:"right",
      w:"up",
      s:"down",
      A:"left",
      D:"right",
      W:"up",
      S:"down"
    };

    if(e.key === "Escape"){
      close();
      return;
    }

    if(map[e.key]){
      e.preventDefault();
      move(map[e.key]);
    }
  });

  if(bestEl) bestEl.textContent = best;
});;
