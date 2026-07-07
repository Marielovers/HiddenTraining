const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const uiHpBar = document.getElementById('hp-bar');
const uiHpText = document.getElementById('hp-text');
const uiXpBar = document.getElementById('xp-bar');
const uiXpText = document.getElementById('xp-text');
const uiBossUi = document.getElementById('boss-ui'); 
const uiBossHpBar = document.getElementById('boss-hp-bar');
const uiBossHpText = document.getElementById('boss-hp-text');
const uiScore = document.getElementById('scoreBoard');
const bombContainer = document.getElementById('bomb-container'); 

const titleScreen = document.getElementById('title-screen');
const loadoutScreen = document.getElementById('loadout-screen');
const gameUI = document.getElementById('ui');
const missionStartBtn = document.getElementById('mission-start-btn');

const modal = document.getElementById('upgrade-modal');
const selectUi = document.getElementById('select-ui');
const replaceUi = document.getElementById('replace-ui');
const cardList = document.getElementById('card-list');

const IMAGES = {};
let minimiList = [];

let audioCtx;
let bgmAudio = null;
let lobbyAudio = null;
let savedGameState = "playing";

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gainNode.gain.setValueAtTime(0.10, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'explode') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'massive_explode') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 1.5);
        gainNode.gain.setValueAtTime(0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    }
}

function playLobbyMusic() {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
    if (!lobbyAudio) {
        try {
            lobbyAudio = new Audio('lobby.wav');
            lobbyAudio.loop = true;
            lobbyAudio.volume = 0.1;
        } catch(e) {}
    }
    if (lobbyAudio) {
        lobbyAudio.play().catch(()=>{});
    }
}

function playBgmMusic() {
    if (lobbyAudio) {
        lobbyAudio.pause();
        lobbyAudio.currentTime = 0;
    }
    if (!bgmAudio) {
        try {
            bgmAudio = new Audio('bgm.wav');
            bgmAudio.loop = true;
            bgmAudio.volume = 0.1;
        } catch(e) {}
    }
    if (bgmAudio) {
        bgmAudio.play().catch(()=>{});
    }
}

function stopAllMusic() {
    if (lobbyAudio) {
        lobbyAudio.pause();
        lobbyAudio.currentTime = 0;
    }
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
}

let launchTimer = 0;
let launchY = 0;
let launchVy = 0;

async function preloadAssets() {
    const response = await fetch('minimi_list.json');
    const data = await response.json();
    minimiList = data.minimi_images;

    const imgSources = [
        'images/forest.webp',
        'images/올림.png',
        'images/내림.png',
        'minimi/우로스.png',
        'minimi/림(혼돈).png',
        'minimi/네르.png',
        'minimi/에르핀.png',
        'minimi/키디언.png',
        'minimi/엘레나.png',
        'minimi/바리에.png',
        'minimi/마리.png',
        'minimi/드론.png',
        'minimi/불꽃.png',
        'minimi/물총.png',
        'images/경험치.webp',
        'images/boss1.png',
        'images/boss2.png',
        'images/boss3.png',
        'images/bg.png'
    ];

    Object.keys(PARTS_INFO).forEach(key => {
        imgSources.push(`minimi/${PARTS_INFO[key].name}.png`);
    });
    
    minimiList.forEach(img => {
        let path = `minimi/${img}`;
        if (!imgSources.includes(path)) imgSources.push(path);
    });

    let loaded = 0;
    for (let src of imgSources) {
        let img = new Image();
        img.src = src;
        img.onload = () => { loaded++; };
        IMAGES[src] = img;
    }
}

function getPartImageKey(partObj, side) {
    if (!partObj.id) return null;
    let partnerId = side === 'left' ? player.rightPart.id : player.leftPart.id;
    let id = partObj.id;

    if (id === 'suro' && partnerId === 'diana') return 'minimi/우로스.png';
    if (id === 'rim' && player.invincible) return 'minimi/림(혼돈).png';
    if (id === 'ner' && partnerId === 'erpin') return 'minimi/네르.png';
    if (id === 'erpin' && partnerId === 'ner') return 'minimi/에르핀.png';

    return `minimi/${PARTS_INFO[id].name}.png`;
}

let gameState = "title"; 
let fps = 60;
let fpsInterval = 1000 / fps;
let now, then, elapsed;
let score = 0;
let frame = 0;
let nextSpawnFrame = 0;
let flashTimer = 0; 
let bossCooldown = 0; 
let bossMaxHp = 100;
let stage = 1;
let fadeAlpha = 0;
let displayStageTextTimer = 0;
let displayClearTextTimer = 0;

let selectedLoadoutLeft = null;
let selectedLoadoutRight = null;

const player = {
    x: 187.5, y: 620, width: 75, height: 60, 
    vx: 0, tilt: 0, 
    speed: 7.5, hp: 100, maxHp: 100, bombs: 3, level: 1, currentExp: 0, maxExp: 50, 
    invincible: false, invincibleTimer: 0,
    leftPart: { id: null, level: 1 }, rightPart: { id: null, level: 1 },
    leftCooldown: 0, rightCooldown: 0, 
    IfritOrbs: [], IfritRotation: 0, elenaDrones: [],
    leftLaser: { active: false, timer: 0 }, rightLaser: { active: false, timer: 0 }
};

let lastTouchX = null;
let lastTouchY = null;
let lastTapTime = 0;
let touchAccX = 0; 
let touchAccY = 0; 

let bosses = [];
let totalBossMaxHp = 0;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let expOrbs = [];
let particles = [];

let upgradeSelectedIndex = 0;
let replaceSelection = 'left';
let currentUpgradeChoices = [];
let selectedNewPartId = null;

const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false, KeyZ: false };

function initGame() {
    document.addEventListener('keydown', e => { 
        if(keys.hasOwnProperty(e.code)) keys[e.code]=true; 
        if (gameState === "playing") { if (e.code === 'KeyZ' && !e.repeat) useBomb(); }
        if (gameState === "paused") { handleUpgradeKey(e.code); }
    });
    document.addEventListener('keyup', e => { if(keys.hasOwnProperty(e.code)) keys[e.code]=false; });

    const gameContainer = document.getElementById('game-container');

    gameContainer.addEventListener('touchstart', (e) => {
        if (gameState !== "playing") return;
        e.preventDefault(); 
        const touch = e.changedTouches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        touchAccX = 0;
        touchAccY = 0;
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { 
            useBomb();
        }
        lastTapTime = currentTime;
    }, {passive: false});

    gameContainer.addEventListener('touchmove', (e) => {
        if (gameState !== "playing") return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const dx = touch.clientX - lastTouchX;
        const dy = touch.clientY - lastTouchY;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        touchAccX += dx * scaleX;
        touchAccY += dy * scaleY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
    }, {passive: false});

    gameContainer.addEventListener('touchend', (e) => {
        if (gameState === "playing") {
            e.preventDefault();
            lastTouchX = null;
            lastTouchY = null;
            touchAccX = 0;
            touchAccY = 0;
        }
    });

    createRankingButton();
    
    document.body.addEventListener('click', () => {
        if (gameState === "title" || gameState === "loadout") {
            initAudio();
            playLobbyMusic();
        }
    }, { once: true });
}

function createRankingButton() {
    const existingBtn = document.getElementById('ranking-view-btn');
    if (existingBtn) return;
    const rankBtn = document.createElement('button');
    rankBtn.id = 'ranking-view-btn';
    rankBtn.className = 'start-btn';
    rankBtn.style.marginTop = '15px';
    rankBtn.innerText = '랭킹 보기';
    rankBtn.onclick = () => window.showRankingBoard();
    titleScreen.appendChild(rankBtn);
}


function resetToTitle() {
    stopAllMusic();
    playLobbyMusic();
    gameState = "title";
    gameUI.style.display = "none";
    loadoutScreen.style.display = "none";
    titleScreen.style.display = "flex";
    
    player.leftPart = { id: null, level: 1 };
    player.rightPart = { id: null, level: 1 };
    selectedLoadoutLeft = null;
    selectedLoadoutRight = null;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


let currentSelectionTarget = 'left';

function goToLoadout() {
    initAudio();
    playLobbyMusic();
    gameState = "loadout";
    titleScreen.style.display = "none";
    loadoutScreen.style.display = "flex";
    selectedLoadoutLeft = null;
    selectedLoadoutRight = null;
    setSelectionTarget('left'); 
    renderLoadoutUI();
}

function setSelectionTarget(side) {
    currentSelectionTarget = side;
    document.getElementById('slot-left').classList.remove('active');
    document.getElementById('slot-right').classList.remove('active');
    document.getElementById(`slot-${side}`).classList.add('active');

    const guide = document.getElementById('selection-guide');
    guide.innerText = side === 'left' ? "◀ 왼쪽 파츠 선택" : "오른쪽 파츠 선택 ▶";
    guide.style.color = side === 'left' ? "#00f0ff" : "#ff00ff";
    renderLoadoutUI();
}

function renderLoadoutUI() {
    const grid = document.getElementById('unified-part-grid');
    grid.innerHTML = '';

    Object.keys(PARTS_INFO).forEach(key => {
        let info = PARTS_INFO[key];
        let div = document.createElement('div');
        div.className = 'mini-card';
        if (currentSelectionTarget === 'left' && selectedLoadoutRight === key) {
            div.classList.add('in-use');
        } else if (currentSelectionTarget === 'right' && selectedLoadoutLeft === key) {
            div.classList.add('in-use');
        }

        if (currentSelectionTarget === 'left' && selectedLoadoutLeft === key) {
            div.classList.add('selected');
        }
        if (currentSelectionTarget === 'right' && selectedLoadoutRight === key) {
            div.classList.add('selected');
        }

        div.onclick = () => selectPart(key); 
        div.innerHTML = `<img src="minimi/${info.name}.png" style="width: 8vmin; height: 8vmin; object-fit: contain;">`;
        grid.appendChild(div);
    });

    updateSlotVisuals(); 
    checkStartButton(); 
}

function selectPart(key) {
    if (currentSelectionTarget === 'left') {
        selectedLoadoutLeft = key;
        if (selectedLoadoutRight === null) {
            setSelectionTarget('right');
        }
    } else {
        selectedLoadoutRight = key;
    }
    updateSlotVisuals();
    checkStartButton();
    renderLoadoutUI();
}

function updateSlotVisuals() {
    updateSingleSlot('left', selectedLoadoutLeft);
    updateSingleSlot('right', selectedLoadoutRight);
}

function updateSingleSlot(side, key) {
    const slot = document.getElementById(`slot-${side}`);
    const iconDiv = document.getElementById(`preview-${side}-icon`);
    const nameDiv = document.getElementById(`preview-${side}-name`);

    if (key) {
        let info = PARTS_INFO[key];
        slot.classList.add('filled');
        iconDiv.style.background = 'transparent';
        iconDiv.innerHTML = `<img src="minimi/${info.name}.png" style="width:100%; height:100%; object-fit:contain;">`;
        nameDiv.innerText = info.name;
        nameDiv.style.color = info.color;
    } else {
        slot.classList.remove('filled');
        iconDiv.style.background = '#333';
        iconDiv.innerHTML = '';
        nameDiv.innerText = (side === 'left' && currentSelectionTarget === 'left') ? "선택" : "대기 중...";
        nameDiv.style.color = '#aaa';
    }
}

function checkStartButton() {
    if (selectedLoadoutLeft && selectedLoadoutRight) {
        missionStartBtn.disabled = false;
        missionStartBtn.style.borderColor = "#00f0ff";
        missionStartBtn.style.color = "white";
        missionStartBtn.style.boxShadow = "0 0 20px #00f0ff";
        document.getElementById('selection-guide').innerText = "출격 준비 완료!";
        document.getElementById('selection-guide').style.color = "#fff";
    } else {
        missionStartBtn.disabled = true;
        missionStartBtn.style.borderColor = "#555";
        missionStartBtn.style.color = "#555";
        missionStartBtn.style.boxShadow = "none";
    }
}

function startGame() {
    initAudio();
    playBgmMusic();
    loadoutScreen.style.display = "none";
    gameUI.style.display = "block";

    player.leftPart = { id: selectedLoadoutLeft, level: 1 };
    player.rightPart = { id: selectedLoadoutRight, level: 1 };
    
    score = 0; 
    frame = 0; 
    nextSpawnFrame = 0; 
    flashTimer = 0;    
    
    player.hp = 100; 
    player.bombs = 3; 
    player.level = 1; 
    player.currentExp = 0; 
    player.maxExp = 50;
    player.rerolls = 3;
    stage = 1;
    
    player.invincible = false;  
    player.invincibleTimer = 0; 
    player.deathTimer = 0;      
    
    player.elenaDrones = []; 
    player.IfritOrbs = []; 
    player.barieDrones = []; 
    player.naiaDrones = []; 
    player.barieNaiaDrones = []; 
    player.naiaRotation = 0;
    player.naiaTimer = 0;  
    player.naiaCurrentCount = 2; 
    player.silphirTimer = 0; 
    player.nerOrbs = [];

    player.leftLaser = {active: false, timer: 0, angle: -Math.PI / 2}; 
    player.rightLaser = {active: false, timer: 0, angle: -Math.PI / 2};

    player.gabiaShield = 0;
    player.gabiaMaxShield = 0;
    player.gabiaState = 'active'; 
    player.gabiaHitTimer = 0; 

    player.leftCooldown = 0;
    player.rightCooldown = 6;
    player.totalHitCount = 0; 
    player.suroTimer = 0;     

    enemies = []; 
    bullets = []; 
    enemyBullets = []; 
    expOrbs = []; 
    particles = []; 
    bosses = [];
    totalBossMaxHp = 0;
    bossCooldown = 1800; 
    bossMaxHp = 100;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height + 50;

    gameState = "launch_sequence";
    launchTimer = 0;
    launchY = canvas.height - player.height - 200;
    launchVy = 0;
    
    fadeAlpha = 1;
    displayStageTextTimer = 120;
    displayClearTextTimer = 0;

    fadeAlpha = 1;
    displayStageTextTimer = 120;
    displayClearTextTimer = 0;

    updatePlayerStats();
    if (player.gabiaMaxShield > 0) {
        player.gabiaShield = player.gabiaMaxShield;
    }
    
    then = Date.now();
    updateUI();
    
}

function handleUpgradeKey(code) {
    if (selectUi.style.display !== 'none') {
        if (code === 'ArrowRight') {
            if(upgradeSelectedIndex < 2) upgradeSelectedIndex++;
            else if(upgradeSelectedIndex === 3) upgradeSelectedIndex = 4;
            else if(upgradeSelectedIndex === 5) upgradeSelectedIndex = 6;
        }
        if (code === 'ArrowLeft') {
            if(upgradeSelectedIndex > 0 && upgradeSelectedIndex <= 2) upgradeSelectedIndex--;
            else if(upgradeSelectedIndex === 4) upgradeSelectedIndex = 3;
            else if(upgradeSelectedIndex === 6) upgradeSelectedIndex = 5;
        }
        if (code === 'ArrowDown') {
            if(upgradeSelectedIndex <= 1) upgradeSelectedIndex = 3;
            else if(upgradeSelectedIndex === 2) upgradeSelectedIndex = 4;
            else if(upgradeSelectedIndex === 3) upgradeSelectedIndex = 5;
            else if(upgradeSelectedIndex === 4) upgradeSelectedIndex = 6;
        }
        if (code === 'ArrowUp') {
            if(upgradeSelectedIndex === 3) upgradeSelectedIndex = 1;
            else if(upgradeSelectedIndex === 4) upgradeSelectedIndex = 2;
            else if(upgradeSelectedIndex === 5) upgradeSelectedIndex = 3;
            else if(upgradeSelectedIndex === 6) upgradeSelectedIndex = 4;
        }
        if (code === 'KeyZ') confirmSelection();
        updateUpgradeVisuals();
    } else {
        if (code === 'ArrowLeft') { if(replaceSelection === 'right') replaceSelection = 'left'; }
        if (code === 'ArrowRight') { if(replaceSelection === 'left') replaceSelection = 'right'; }
        if (code === 'ArrowDown') { if(replaceSelection === 'left' || replaceSelection === 'right') replaceSelection = 'cancel'; }
        if (code === 'ArrowUp') { if(replaceSelection === 'cancel') replaceSelection = 'left'; }
        if (code === 'KeyZ') { if (replaceSelection === 'cancel') cancelReplace(); else replacePart(replaceSelection); }
        if (code === 'Escape') cancelReplace();
        updateReplaceVisuals();
    }
}

function updateUpgradeVisuals() {
    const cards = document.querySelectorAll('.card');
    const btnHeal = document.getElementById('btn-heal');
    const btnBomb = document.getElementById('btn-bomb');
    const btnReroll = document.getElementById('btn-reroll');
    const btnSkip = document.getElementById('btn-skip');

    cards.forEach(c => c.classList.remove('highlighted'));
    btnHeal.classList.remove('highlighted');
    btnBomb.classList.remove('highlighted');
    if (btnReroll) btnReroll.classList.remove('highlighted');
    if (btnSkip) btnSkip.classList.remove('highlighted');

    if (upgradeSelectedIndex <= 2) { if(cards[upgradeSelectedIndex]) cards[upgradeSelectedIndex].classList.add('highlighted'); } 
    else if (upgradeSelectedIndex === 3) { btnHeal.classList.add('highlighted'); } 
    else if (upgradeSelectedIndex === 4) { btnBomb.classList.add('highlighted'); }
    else if (upgradeSelectedIndex === 5 && btnReroll) { btnReroll.classList.add('highlighted'); }
    else if (upgradeSelectedIndex === 6 && btnSkip) { btnSkip.classList.add('highlighted'); }
}
function updateReplaceVisuals() {
    const btnLeft = document.getElementById('btn-replace-left');
    const btnRight = document.getElementById('btn-replace-right');
    const btnCancel = document.getElementById('btn-replace-cancel');

    btnLeft.classList.remove('highlighted');
    btnRight.classList.remove('highlighted');
    btnCancel.classList.remove('highlighted');

    if(replaceSelection === 'left') btnLeft.classList.add('highlighted');
    else if(replaceSelection === 'right') btnRight.classList.add('highlighted');
    else if(replaceSelection === 'cancel') btnCancel.classList.add('highlighted');
}

function confirmSelection() {
    if (upgradeSelectedIndex <= 2) {
        let partId = currentUpgradeChoices[upgradeSelectedIndex];
        let isOwned = (player.leftPart.id === partId || player.rightPart.id === partId);
        let currentLevel = 0;
        if(player.leftPart.id === partId) currentLevel = player.leftPart.level;
        else if(player.rightPart.id === partId) currentLevel = player.rightPart.level;
        if (!(isOwned && currentLevel >= 5)) { selectUpgradePart(partId); }
    } else if (upgradeSelectedIndex === 3) { selectFixedUpgrade('heal'); } 
    else if (upgradeSelectedIndex === 4 && player.bombs < 3) { selectFixedUpgrade('bomb'); }
    else if (upgradeSelectedIndex === 5 && player.rerolls > 0) { rerollUpgrade(); }
    else if (upgradeSelectedIndex === 6) { skipUpgrade(); }
}

function animate() {
    requestAnimationFrame(animate);

    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);

        if (gameState !== "playing" && gameState !== "gameover_sequence" && gameState !== "gameover" && gameState !== "stage_clear_sequence" && gameState !== "stage_start_sequence" && gameState !== "launch_sequence") return;

        if (gameState === "launch_sequence") {
            if (IMAGES['images/forest.webp']) {
                ctx.drawImage(IMAGES['images/forest.webp'], 0, 0, canvas.width, canvas.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            updateParticles(); 

            let scale = 3;
            let shipW = player.width * scale;
            let shipX = canvas.width / 2 - shipW / 2;
            let ratio = IMAGES['images/올림.png'] ? IMAGES['images/올림.png'].height / IMAGES['images/올림.png'].width : 1;
let shipH = shipW * ratio;

            if (launchTimer < 90) { 
                let shakeX = (Math.random() - 0.5) * 12;
                let shakeY = (Math.random() - 0.5) * 12;
                if (IMAGES['images/내림.png']) {
                    ctx.drawImage(IMAGES['images/내림.png'], shipX + shakeX, launchY + shakeY, shipW, shipH);
                }
            } else { 
                if (launchTimer === 90) playSound('massive_explode'); 
                
                launchVy += 0.15; 
                launchY -= launchVy;

                for (let i = 0; i < 15; i++) {
                    particles.push({
                        x: shipX + shipW / 2 + (Math.random() - 0.5) * 60,
                        y: launchY + shipH,
                        vx: (Math.random() - 0.5) * 8,
                        vy: Math.random() * 6 + 2, 
                        life: 40 + Math.random() * 30,
                        maxLife: 70,
                        color: Math.random() > 0.5 ? 'rgba(230, 230, 230, 0.8)' : 'rgba(150, 150, 150, 0.8)',
                        size: 20 + Math.random() * 40
                    });
                }

                if (IMAGES['images/올림.png']) {
                    ctx.drawImage(IMAGES['images/올림.png'], shipX, launchY, shipW, shipH);
                }

                if (launchY < -200) {
                    gameState = "stage_start_sequence";
                    player.x = canvas.width / 2 - player.width / 2;
                    player.y = canvas.height + 50; 
                    fadeAlpha = 1;
                    displayStageTextTimer = 120;
                }
            }
            
            launchTimer++;
            frame++;
            return; 
        }

        if (gameState === "stage_clear_sequence") {
            player.y -= 6;
            if (player.y < -player.height) {
                fadeAlpha += 0.02;
                if (fadeAlpha >= 1) {
                    fadeAlpha = 1;
                    stage++;
                    gameState = "stage_start_sequence";
                    player.x = canvas.width / 2 - player.width / 2;
                    player.y = canvas.height + 50;
                    displayStageTextTimer = 120;
                    displayClearTextTimer = 0;
                    enemies = [];
                    bullets = [];
                    enemyBullets = [];
                    player.nerOrbs = [];
                    player.IfritOrbs = [];
                    bosses = [];
                    totalBossMaxHp = 0;
                    bossCooldown = 1800;
                    bossMaxHp = 100 + (stage - 1) * 50;
                }
            }
        }

        if (gameState === "stage_start_sequence") {
            if (fadeAlpha > 0) fadeAlpha -= 0.02;
            if (fadeAlpha < 0) fadeAlpha = 0;
            player.y -= 4;
            if (player.y <= canvas.height - 80) {
                player.y = canvas.height - 80;
                if (fadeAlpha === 0 && displayStageTextTimer <= 0) {
                    gameState = "playing";
                }
            }
            if (displayStageTextTimer > 0) displayStageTextTimer--;
        }

        if (gameState === "playing" && player.hp > 0) {
            if (frame % 2 === 0) {
                particles.push({
                    x: player.x + player.width/2 + (Math.random()-0.5)*10,
                    y: player.y + player.height - 10,
                    vx: 0, vy: 3 + Math.random()*2,
                    life: 20, maxLife: 20,
                    color: 'rgba(200, 230, 255, 0.5)',
                    size: 3 + Math.random()*3
                });
            }
            if (player.hp / player.maxHp <= 0.3 && frame % 3 === 0) {
                particles.push({
                    x: player.x + player.width/2 + (Math.random()-0.5)*20,
                    y: player.y + player.height/2 + (Math.random()-0.5)*20,
                    vx: (Math.random()-0.5)*2, vy: -1 - Math.random()*2,
                    life: 40, maxLife: 40,
                    color: 'rgba(100, 100, 100, 0.8)',
                    size: 6 + Math.random()*6
                });
            }
        }

        if (gameState === "playing" && frame % 60 === 0) {
            let totalRegen = 0;
            if (player.leftPart.id === 'asana' && !player.invincible) { totalRegen += ((player.leftPart.level) * 0.1); }
            if (player.rightPart.id === 'asana' && !player.invincible) { totalRegen += ((player.rightPart.level) * 0.1); }
            if (totalRegen > 0) {
                player.hp = Math.min(player.maxHp, player.hp + totalRegen);
                updateUI();
                createParticles(player.x + player.width/2, player.y + player.height/2, '#44ff44');
            }
        }

        let hasSilphir = (player.leftPart.id === 'silphir' || player.rightPart.id === 'silphir' ||
                        (player.leftPart.id === 'barie' && player.rightPart.id === 'silphir') ||
                        (player.rightPart.id === 'barie' && player.leftPart.id === 'silphir'));
        
        if (gameState === "playing") {
            if (hasSilphir) { player.silphirTimer++; } 
            else { player.silphirTimer = 0; }
        }

        let hasSuro = (player.leftPart.id === 'suro' || player.rightPart.id === 'suro');
        let hasDiana = (player.leftPart.id === 'diana' || player.rightPart.id === 'diana');

        if (hasSuro && hasDiana && gameState === "playing") {
            player.suroTimer++;
            if (player.suroTimer >= 600) {
                player.suroTimer = 0;
                if (player.hp > 0) {
                    player.hp -= 1;
                    player.totalHitCount++;
                    createParticles(player.x + player.width/2, player.y + player.height/2, '#800000');
                    updateUI();
                }
            }
        }

        try {
            if (IMAGES['images/bg.png']) {
                ctx.drawImage(IMAGES['images/bg.png'], 0, 0, canvas.width, canvas.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (flashTimer > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${flashTimer / 20})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                flashTimer--;
            }

            updateExpOrbs();
            updateParticles();

            if (player.hp <= 0 && gameState === "playing") {
                gameState = "gameover_sequence";
                player.deathTimer = 180;
                playSound('massive_explode');
                stopAllMusic();
                for(let i = 0; i < 150; i++) {
                    particles.push({
                        x: player.x + player.width/2, y: player.y + player.height/2,
                        vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
                        life: 60, maxLife: 60, color: 'red', size: 5 + Math.random()*5
                    });
                }
            }

            if (gameState === "gameover_sequence") {
                player.deathTimer--;
                drawDyingPlayer(player.deathTimer);
                if (player.deathTimer % 15 === 0) {
                     createParticles(player.x + player.width/2 + (Math.random()-0.5)*80, player.y + player.height/2 + (Math.random()-0.5)*80, 'orange');
                     playSound('explode');
                }
                if (player.deathTimer <= 0) {
                gameState = "gameover";
                const pName = prompt(`게임 오버! 당신의 점수: ${score}\n랭킹에 등록할 이름을 입력하세요:`);
                if (pName) {
    window.uploadScore(pName, score, stage, player.leftPart.id, player.rightPart.id).then(() => { 
        window.showRankingBoard();  
    });
} else {
    window.showRankingBoard(); 
}
            }
            } else if (gameState === "gameover") {
                drawGameOver();
                return;
            } else if (gameState === "playing") {
                updatePlayerMove();
                updatePlayerAction(); 
                updateElenaDrones(); 
                drawPlayer();
                drawElenaDrones();    
            } else if (gameState === "stage_clear_sequence" || gameState === "stage_start_sequence") {
                drawPlayer();
                drawElenaDrones();
            }

            updateEnemies();
            updateBoss();
            updateGabiaShield();

            updateBullets();
            updateNerOrbs();
            updateElenaDrones();
            updateNaiaDrones();
            drawNaiaDrones();

            if (gameState === "playing" || gameState === "stage_clear_sequence" || gameState === "stage_start_sequence") {
                checkCollisions();
            }

            if (gameState === "stage_clear_sequence") {
                ctx.save();
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.font = "bold 35px Arial";
                ctx.shadowColor = "black";
                ctx.shadowBlur = 4;
                ctx.fillText("스테이지 클리어!", canvas.width / 2, canvas.height / 2);
                ctx.restore();
            }

            if (gameState === "stage_start_sequence") {
                ctx.save();
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.font = "bold 35px Arial";
                ctx.shadowColor = "black";
                ctx.shadowBlur = 4;
                ctx.fillText(`스테이지 ${stage} 시작!`, canvas.width / 2, canvas.height / 2);
                ctx.restore();
            }

            if (fadeAlpha > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            frame++;
        } catch (err) { console.error(err); }
    }
}

function updatePlayerAction() {
    processPartAction(player.leftPart, 'left'); 
    processPartAction(player.rightPart, 'right');
    
    player.IfritRotation += 0.075; 
    const count = player.IfritOrbs.length;

    if (count > 0) {
        let ameliaLevel = 0;
        if (player.leftPart.id === 'amelia ') ameliaLevel += player.leftPart.level;
        if (player.rightPart.id === 'amelia ') ameliaLevel += player.rightPart.level;

        const detectionRange = 200 + (ameliaLevel * 50);

        let targets = [...enemies, ...bosses.filter(b => b.state !== 'dying')];

        for (let i = player.IfritOrbs.length - 1; i >= 0; i--) {
            let orb = player.IfritOrbs[i];

            if (orb.homing) {
                orb.x += orb.vx;
                orb.y += orb.vy;

                if (orb.x < -50 || orb.x > canvas.width + 50 || orb.y < -50 || orb.y > canvas.height + 50) {
                    player.IfritOrbs.splice(i, 1);
                }
                continue; 
            }

            let angleOffset = (Math.PI * 2 / count) * i;
            let currentAngle = player.IfritRotation + angleOffset;
            let orbitRadius = (orb.source === 'barie') ? 80 : 60;
            
            let orbitX = (player.x + player.width/2) + Math.cos(currentAngle) * orbitRadius;
            let orbitY = (player.y + player.height/2) + Math.sin(currentAngle) * orbitRadius;

            let launched = false;
            if (targets.length > 0) {
                let closest = null;
                let minDist = Infinity;

                targets.forEach(t => {
                    let dist = Math.hypot((t.x + t.width/2) - orbitX, (t.y + t.height/2) - orbitY);
                    if (dist < minDist) { minDist = dist; closest = t; }
                });

                if (closest && minDist <= detectionRange) {
                    orb.homing = true; 
                    let angle = Math.atan2((closest.y + closest.height/2) - orbitY, (closest.x + closest.width/2) - orbitX);
                    let speed = 12; 
                    orb.vx = Math.cos(angle) * speed;
                    orb.vy = Math.sin(angle) * speed;
                    orb.x = orbitX;
                    orb.y = orbitY;
                    launched = true;
                }
            }

            if (!launched) {
                orb.x = orbitX;
                orb.y = orbitY;
            }
        }
    }
}

function processPartAction(part, side) {
    let runPart = part;
    let partner = (side === 'left') ? player.rightPart : player.leftPart;

    if (part.id === 'barie') {
        if (partner.id === 'lethe') return;
        runPart = { id: partner.id, level: part.level };
    }
    if(runPart.id === 'elena') return;

    let hasLeets = (player.leftPart.id === 'leets' || player.rightPart.id === 'leets');
    let haleyLevel = 0;
    if(player.leftPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.leftPart.level);
    if(player.rightPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.rightPart.level);
    
    let isBerserk = hasLeets && player.invincible;
    let isOffmask = (player.leftPart.id === 'rim' || player.rightPart.id === 'rim') && player.invincible;

    if (runPart.id === 'lethe') {
        let laser = (side === 'left') ? player.leftLaser : player.rightLaser;
        let cdKey = side + 'Cooldown';
        let isBoosted = (partner.id === 'barie');
        
        if (typeof laser.angle === 'undefined') laser.angle = -Math.PI / 2;
        let ameliaLevel = 0;
        if (player.leftPart.id === 'amelia') ameliaLevel += player.leftPart.level;
        if (player.rightPart.id === 'amelia') ameliaLevel += player.rightPart.level;
        
        let ox = isBoosted ? (player.x + player.width/2) : (side === 'left' ? player.x + player.width/2 - 14 : player.x + player.width/2 + 14);
        let oy = player.y;

        if (laser.active) {
            laser.timer--;
            if (!laser.acc) laser.acc = 0;

            let currentSpeedMult = 0;
            if (isOffmask) currentSpeedMult = 1;
            if (isBoosted) currentSpeedMult = 1;

            laser.acc += Math.max(1, 1+currentSpeedMult);
            
            if (ameliaLevel > 0) {
                let closest = null;
                let minDist = Infinity;
                let targets = [...enemies, ...bosses.filter(b => b.state !== 'dying')];

                targets.forEach(t => {
                    let dx = (t.x + t.width/2) - (player.x + player.width/2);
                    let dy = (t.y + t.height/2) - (player.y + player.height/2);
                    let dist = dx*dx + dy*dy;
                    if (dist < minDist) { minDist = dist; closest = t; }
                });

                let targetAngle = -Math.PI / 2;
                if (closest) {
                    let tx = closest.x + closest.width/2;
                    let ty = closest.y + closest.height/2;
                    targetAngle = Math.atan2(ty - (player.y + player.height/2), tx - (player.x + player.width/2));
                }

                let turnSpeed = 0.02 + (ameliaLevel * 0.01);
                let diff = targetAngle - laser.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < 0.01) laser.angle = targetAngle;
                else laser.angle += diff * turnSpeed

            } else {
                laser.angle = -Math.PI / 2;
            }

            if (laser.acc >= 6) {
                laser.acc -= 6;
                let baseW = 2 + (runPart.level - 1) * 0.5; 
                let lw = isBoosted ? baseW * 1.5 : baseW;
                let damageMultiplier = 1.0;
                let damageAdd = 0;
                if (player.leftPart.id === 'leets') damageMultiplier += 0.20 + (player.leftPart.level - 1) * 0.2;
                if (player.rightPart.id === 'leets') damageMultiplier += 0.20 + (player.rightPart.level - 1) * 0.2;
                if (isBerserk) damageAdd = 1 ;
                let damage = (2 + (runPart.level - 1) * 0.5) * damageMultiplier*getSilphirMultiplier() + damageAdd; 

                const checkLaserHit = (target, lx, ly, angle, width, range) => {
                    let tx = target.x + target.width/2;
                    let ty = target.y + target.height/2;
                    let vx = Math.cos(angle);
                    let vy = Math.sin(angle);
                    let pdx = tx - lx;
                    let pdy = ty - ly;
                    let dot = pdx * vx + pdy * vy;
                    if (dot < 0 || dot > range) return false;
                    let distSq = (pdx*pdx + pdy*pdy) - (dot*dot);
                    let targetRadius = target.width / 2;
                    let hitDist = (width/2) + targetRadius;
                    return distSq < (hitDist * hitDist);
                };

                let lx = player.x + player.width/2; 
                let ly = player.y + player.height/2; 
                let range = 1000;       

                enemies.forEach((e, idx) => {
                    if (checkLaserHit(e, ox, oy, laser.angle, lw, range)) {
                        e.hp -= damage; playSound('hit'); e.hitTimer = 5;
                        createParticles(e.x + e.width/2, e.y + e.height/2, 'red');
                        applyDianaLifesteal(damage);
                        if (e.hp <= 0) { enemies.splice(idx, 1); score += 100; spawnExpOrb(e.x, e.y); }
                    }
                });

                bosses.forEach(b => {
                    if (b.state !== 'dying' && checkLaserHit(b, lx, ly, laser.angle, lw, range)) {
                        b.hp -= damage; playSound('hit'); b.hitTimer = 5; createParticles(b.x + b.width/2, b.y + b.height/2, 'red');
                        applyDianaLifesteal(damage);
                        if (b.hp <= 0) killBoss(b);
                    }
                });
                
                for (let i = enemyBullets.length - 1; i >= 0; i--) {
                    let eb = enemyBullets[i];
                    let ebObj = {x: eb.x - 5, y: eb.y - 5, width: 10, height: 10}; 
                    if (checkLaserHit(ebObj, lx, ly, laser.angle, lw, range)) {
                        enemyBullets.splice(i, 1);
                        createParticles(eb.x, eb.y, 'orange');
                    }
                }
            }

            if (laser.timer <= 0) {
                laser.active = false;
                laser.acc = 0;
                player[cdKey] = isOffmask ? 0 : (300 - 40*(haleyLevel));
            }
            return; 
        } else {
            if (isOffmask) player[cdKey] = 0;
            if (player[cdKey] > 0) { player[cdKey]--; return; } 
            else { laser.active = true; laser.timer = 300; return; }
        }
    }

    let cdKey = side + 'Cooldown'; if (player[cdKey] > 0) player[cdKey]--;
    
    if (player[cdKey] <= 0) {
        let baseCd = 0;
        let bx = side === 'left' ? player.x + player.width/2 - 14 : player.x + player.width/2 + 14;
        
        if (runPart.id === 'tig') {
            baseCd = Math.floor(6 / (1 + (runPart.level - 1) * 0.25)); 
            let x1 = side === 'left' ? bx - 5 : bx - 5; 
            let x2 = side === 'left' ? bx + 5 : bx + 5;
            spawnBullet(x1, player.y, 0, -22, 6, 6, 'dimgray', 0.5); spawnBullet(x2, player.y, 0, -22, 6, 6, 'dimgray', 0.5); 
        } else if (runPart.id === 'leets') {
            baseCd = 12; spawnBullet(bx, player.y, 0, -22, 8, 8, '#a020f0', 1, 'circle');
        } else if (runPart.id === 'Ifrit') {
            let currentSource = (part.id === 'barie') ? 'barie' : 'Ifrit';
            let myOrbCount = player.IfritOrbs.filter(orb => orb.source === currentSource).length;
            let maxOrbs = 5 + (runPart.level * 2);
            if (myOrbCount < maxOrbs) { 
                let baseDmg = 5 * (1 + (runPart.level - 1) * 0.25);
                let damageMultiplier = 1.0;
                let damageAdd = 0;
                if (player.leftPart.id === 'leets') damageMultiplier += 0.20 + (player.leftPart.level - 1) * 0.2;
                if (player.rightPart.id === 'leets') damageMultiplier += 0.20 + (player.rightPart.level - 1) * 0.2;
                if (isBerserk) damageAdd = 1 ;
                let orbColor = '#333'; 
                if (part.id === 'barie') {
                    orbColor = '#d000ff'; 
                }
                player.IfritOrbs.push({ w:25, h:25, color: orbColor, damage: baseDmg * damageMultiplier * getSilphirMultiplier() + damageAdd, x:0, y:0, source: currentSource}); 
                baseCd = 20; 
            } 
        } else if (runPart.id === 'pira') { spawnBullet(bx, player.y, 0, -22, 8, 8, '#ffd700', 1, 'circle'); baseCd = 12; } 
        else if (runPart.id === 'diana') { spawnBullet(bx, player.y, 0, -22, 8, 8, '#8b4513', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'asana') { spawnBullet(bx, player.y, 0, -22, 8, 8, 'green', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'shady') { spawnBullet(bx, player.y, 0, -22, 8, 8, 'grey', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'haley') { spawnBullet(bx, player.y, 0, -22, 8, 8, 'green', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'gabia') { spawnBullet(bx, player.y, 0, -20, 8, 8, '#8B4513', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'amelia') { spawnBullet(bx, player.y, 0, -20, 8, 8, 'grey', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'silphir') { spawnBullet(bx, player.y, 0, -20, 8, 8, 'blue', 1, 'circle'); baseCd = 12; }
        else if (runPart.id === 'barie') { 
            spawnBullet(bx, player.y, 0, -20, 6, 8, 'purple', 1, 'circle'); baseCd = 12; 
        }
        else if (runPart.id === 'shasha') {
            let bulletCount = 5 + (runPart.level - 1) * 1; 
            let dmg = 0.5; 
            let maxSpread = Math.PI / 4; 
            let startAngle = -Math.PI / 2 - maxSpread / 2;
            let totalArc = maxSpread;
            for (let i = 0; i < bulletCount; i++) {
                let angle = -Math.PI / 2;
                if (bulletCount > 1) { angle = startAngle + (totalArc * i / (bulletCount - 1)); }
                let vx = Math.cos(angle) * 15; let vy = Math.sin(angle) * 15;
                spawnBullet(bx, player.y, vx, vy, 6, 6, 'navy', dmg, 'circle');
            }
            baseCd = 12; 
        } else if (runPart.id === 'rim') {
            let count = 3 + (runPart.level - 1); 
            let spacing = 12; 
            let startX = bx - ((count - 1) * spacing) / 2; 
            for (let i = 0; i < count; i++) {
                spawnBullet(startX + (i * spacing), player.y, 0, -22, 5, 10, 'red', 0.5);
            }
            baseCd = 12; 
        }
        else if (runPart.id === 'Belita') {
            let hpRatio = player.hp / 100;
            let baseDmg = Math.max(1, 3 * (hpRatio * hpRatio) * (1+(runPart.level - 1) * 0.25));    
            let bulletSize = Math.max(3,  8 * hpRatio* (1+(runPart.level - 1) * 0.25));
            spawnBullet(bx, player.y, 0, -18, bulletSize, bulletSize, 'red', baseDmg, 'circle');  
            baseCd = 12; 
        }
        else if (runPart.id === 'kidian') {
            let levelBonus = runPart.level * player.level * 0.01;
            let piraBonus = 1;
            if (partner.id === 'pira') {
                piraBonus = 1 + partner.level*0.3; 
            }
            let finalBaseDmg = Math.max(0.2, levelBonus) * piraBonus ; 

            let startX = bx - 12; 
            for (let i = 0; i < 3; i++) {
                spawnBullet(startX + (i * 12), player.y, 0, -22, 5, 10, 'black', finalBaseDmg,'circle');
            }
            for (let i = 0; i < 2; i++) {
                let angle = -Math.PI / 2;
                angle = -Math.PI * 5 / 8 + (Math.PI / 4 * i );
                let vx = Math.cos(angle) * 15; let vy = Math.sin(angle) * 15;
                spawnBullet(bx, player.y, vx, vy, 6, 6, 'black', finalBaseDmg);
            }
            baseCd = 12; 
        }
        else if (runPart.id === 'suro') {
            let hitBonus = Math.min(1.0, player.totalHitCount * 0.01);
            let baseDmg = 0.5 * (1 + (runPart.level - 1) * 0.25);
            let finalDmg = baseDmg * (1 + hitBonus);
            let speedY = -20; 
            spawnBullet(bx, player.y, 0, speedY, 6, 10, 'black', finalDmg);
            let bLeft = spawnBullet(bx - 10, player.y, -0.5, speedY, 6, 10, 'black', finalDmg);
            bLeft.trajectory = 'sine'; bLeft.timer = 10; bLeft.sidePhase = 1; 
            let bRight = spawnBullet(bx + 10, player.y, 0.5, speedY, 6, 10, 'black', finalDmg);
            bRight.trajectory = 'sine'; bRight.timer = 10; bRight.sidePhase = -1;       
            baseCd = 12; 
        }
        else if (runPart.id === 'erpin') {
            let hasNer = (partner.id === 'ner');
            let lazyChance = 0.2; 
            if (hasNer) lazyChance = 0.4; 

            if (Math.random() < lazyChance) {
                if (hasNer && lazyChance < 0.2) {
                    if (hasNer && lazyChance < 0.002) {
                        player.bombs = Math.min(5, player.bombs + 1);
                        createParticles(bx, player.y, '#00ff00'); 
                        updateUI();
                    }
                } else {
                    player.hp = Math.min(player.maxHp, player.hp + 1);
                }
                createParticles(bx, player.y, '#00ff00');
                updateUI(); 
            } else {
                let count = 8 + (runPart.level - 1) * 2;
                for (let i = 0; i < count; i++) {
                    let angle = (Math.random()-0.5- Math.PI) / 2; 
                    let speed = 10 + Math.random() * 10;
                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    spawnBullet(bx, player.y, vx, vy, 5, 5, '#FFD700', 0.4, 'circle');
                }
            }
            baseCd = 20; 
        }
        else if (runPart.id === 'ner') {
            let hasErpin = (partner.id === 'erpin');
            let traitorChance = 0.2;
            if (hasErpin) traitorChance = 0;
            let isTraitor = (Math.random() < traitorChance);

            player.nerOrbs.push({
                x: bx, y: player.y,
                vx: (Math.random() - 0.5) * 2, vy: -5, 
                width: 20, height: 20,
                isEnemy: isTraitor, timer: 0,
                level: runPart.level,
                explodeTime: 60 + Math.random() * 60 
            });
            baseCd = 60; 
        }

        let speedMult = 1 + (haleyLevel) * 0.1;
        if (isOffmask && baseCd > 0) {
            speedMult *= 2;
        }
        baseCd = Math.floor(baseCd / speedMult);
        if (baseCd > 0) player[cdKey] = baseCd;
    }
}

function updateElenaDrones() {
    let elenaTargetCount = 0;
    let barieTargetCount = 0;

    if (player.leftPart.id === 'elena') elenaTargetCount += player.leftPart.level;
    if (player.rightPart.id === 'elena') elenaTargetCount += player.rightPart.level;

    if (player.leftPart.id === 'barie' && player.rightPart.id === 'elena') {
        barieTargetCount += player.leftPart.level;
    }
    if (player.rightPart.id === 'barie' && player.leftPart.id === 'elena') {
        barieTargetCount += player.rightPart.level;
    }
    let isOffmask = (player.leftPart.id === 'rim' || player.rightPart.id === 'rim') && player.invincible;

    while (player.elenaDrones.length < elenaTargetCount) player.elenaDrones.push({ x: player.x, y: player.y, cooldown: 0 });
    while (player.elenaDrones.length > elenaTargetCount) player.elenaDrones.pop();

    while (player.barieDrones.length < barieTargetCount) player.barieDrones.push({ x: player.x, y: player.y, cooldown: 0 });
    while (player.barieDrones.length > barieTargetCount) player.barieDrones.pop();

    let ameliaLevel = 0;
    if (player.leftPart.id === 'amelia') ameliaLevel += player.leftPart.level;
    if (player.rightPart.id === 'amelia') ameliaLevel += player.rightPart.level;
    if (player.leftPart.id === 'barie' && player.rightPart.id === 'amelia') ameliaLevel += player.leftPart.level;
    if (player.rightPart.id === 'barie' && player.leftPart.id === 'amelia') ameliaLevel += player.rightPart.level;

    let haleyLevel = 0;
    if (player.leftPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.leftPart.level);
    if (player.rightPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.rightPart.level);

    const processDroneGroup = (drones, bulletColor, yOffset) => {
        let targetedEnemyIds = new Set();
        const getDist = (o1, o2) => Math.hypot(o1.x - o2.x, o1.y - o2.y);
        const spacing = 25; 
        let targetGroups = {}; 
        let playerKey = 'player_pos';

        drones.forEach((drone) => {
            let target = null;
            let bestDist = Infinity;
            let candidates = [...enemies, ...bosses.filter(b => b.state !== 'dying')];

            candidates.forEach(e => {
                if (!targetedEnemyIds.has(e.id)) {
                    let d = getDist(drone, e);
                    if (d < bestDist) { bestDist = d; target = e; }
                }
            });
            
            if (!target) {
                bestDist = Infinity;
                candidates.forEach(e => {
                    let d = getDist(drone, e);
                    if (d < bestDist) { bestDist = d; target = e; }
                });
            }

            if (target) {
                targetedEnemyIds.add(target.id);
                if (!targetGroups[target.id]) targetGroups[target.id] = { targetObj: target, drones: [] };
                targetGroups[target.id].drones.push(drone);
            } else {
                if (!targetGroups[playerKey]) targetGroups[playerKey] = { targetObj: null, drones: [] };
                targetGroups[playerKey].drones.push(drone);
            }
        });

        Object.values(targetGroups).forEach(group => {
            let target = group.targetObj;
            let dronesInGroup = group.drones;
            let groupSize = dronesInGroup.length;

            dronesInGroup.forEach((drone, localIndex) => {
                let offset = (localIndex - (groupSize - 1) / 2) * spacing;
                let destX, destY;
                if (target) {
                    destX = target.x + target.width / 2 + offset;
                    destY = target.y + target.height + 60 + yOffset;
                } else {
                    destX = player.x + player.width / 2 + offset;
                    destY = player.y + player.height / 2 + yOffset;
                }

                let dx = destX - drone.x;
                let dy = destY - drone.y;
                let dist = Math.hypot(dx, dy);
                let droneSpeed = 5 + (ameliaLevel * 2);

                if (dist > droneSpeed) {
                    drone.x += (dx / dist) * droneSpeed;
                    drone.y += (dy / dist) * droneSpeed;
                } else {
                    drone.x = destX;
                    drone.y = destY;
                }

                if (target && drone.cooldown <= 0) {
                    if (Math.abs(drone.x - destX) < 20) {
                        spawnBullet(drone.x, drone.y, 0, -25, 4, 10, bulletColor, 0.5); 
                        let droneCd = 10;
                        let speedMult = 1;
                        if (haleyLevel > 0 && !player.invincible) {
                            speedMult = 1 + haleyLevel * 0.1;
                            droneCd = Math.floor(droneCd / speedMult);
                        } else if (isOffmask) {
                            speedMult = 2;
                            droneCd = Math.floor(droneCd / speedMult);
                        }
                        drone.cooldown = droneCd; 
                    }
                }
                if (drone.cooldown > 0) drone.cooldown--;
            });
        });
    };

    if (player.elenaDrones.length > 0) processDroneGroup(player.elenaDrones, 'cyan', 0);
    if (player.barieDrones.length > 0) processDroneGroup(player.barieDrones, 'purple', 30);
}

function updateNaiaDrones() {
    let radius = 60; 
    let haleyLevel = 0;
    if (player.leftPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.leftPart.level);
    if (player.rightPart.id === 'haley') haleyLevel = Math.max(haleyLevel, player.rightPart.level);
    let isOffmask = (player.leftPart.id === 'rim' || player.rightPart.id === 'rim') && player.invincible;

    let speedMult = 1.0;
    if (haleyLevel > 0 && !player.invincible) speedMult += haleyLevel * 0.1;
    if (isOffmask) speedMult *= 2;

    let finalCooldown = Math.floor(6 / speedMult);

    let naiaLevel = 0;
    if (player.leftPart.id === 'naia') naiaLevel = Math.max(naiaLevel, player.leftPart.level);
    if (player.rightPart.id === 'naia') naiaLevel = Math.max(naiaLevel, player.rightPart.level);

    let barieLevel = 0;
    if (player.leftPart.id === 'barie' && player.rightPart.id === 'naia') barieLevel = player.leftPart.level;
    if (player.rightPart.id === 'barie' && player.leftPart.id === 'naia') barieLevel = player.rightPart.level;

    let hasSilphir = (player.leftPart.id === 'silphir' || player.rightPart.id === 'silphir');

    let hasNaia = (player.leftPart.id === 'naia' || player.rightPart.id === 'naia' ||
                    (player.leftPart.id === 'barie' && player.rightPart.id === 'naia') ||
                    (player.rightPart.id === 'barie' && player.leftPart.id === 'naia'));

    if (hasNaia) {
        player.naiaTimer++;
        if (player.naiaTimer >= 300) {
            player.naiaTimer = 0;
            player.naiaCurrentCount = Math.floor(Math.random() * 3) + 1;
            if (hasSilphir) player.naiaCurrentCount = Math.max(2 , player.naiaCurrentCount);
            createParticles(player.x + player.width/2, player.y + player.height/2, 'royalblue');
        }
    } else {
        player.naiaTimer = 0;
    }

    let naiaTarget = 0;
    let barieTarget = 0;
    if (player.leftPart.id === 'naia') {naiaTarget += player.naiaCurrentCount; player.naiaRotation += 0.07;}
    if (player.rightPart.id === 'naia') {naiaTarget += player.naiaCurrentCount; player.naiaRotation -= 0.07;}
    if (player.leftPart.id === 'barie' && player.rightPart.id === 'naia') barieTarget += player.naiaCurrentCount;
    if (player.rightPart.id === 'barie' && player.leftPart.id === 'naia') barieTarget += player.naiaCurrentCount;

    const updateDroneGroup = (dronesArray, targetCount, bulletColor, angleModifier, damageLevel, naiadronrotation) => {
        while (dronesArray.length < targetCount) {
            dronesArray.push({ x: player.x, y: player.y, cooldown: Math.random() * 20, phase: Math.random() * Math.PI * 2 });
        }
        while (dronesArray.length > targetCount) {
            dronesArray.pop();
        }

        dronesArray.forEach((drone, index) => {
            let spacingAngle = (Math.PI * 2) / dronesArray.length;
            let currentAngle = naiadronrotation + (spacingAngle * index) + angleModifier;
            if (drone.phase === undefined) drone.phase = Math.random() * Math.PI * 2;
            let wobbleX = Math.sin(frame * 0.1 + drone.phase) * 15; 

            drone.x = (player.x + player.width/2) + Math.cos(currentAngle) * radius + wobbleX;
            drone.y = (player.y + player.height/2) + Math.sin(currentAngle) * radius;

            if (drone.cooldown > 0) drone.cooldown--;
            else {
                let finalDmg = 0.5 + (damageLevel - 1) * 0.125; 
                spawnBullet(drone.x, drone.y, 0, -20, 4, 12, bulletColor, finalDmg, 'rect'); 
                drone.cooldown = finalCooldown; 
            }
        });
    };

    if (naiaTarget > 0) updateDroneGroup(player.naiaDrones, naiaTarget, 'royalblue', 0, naiaLevel, player.naiaRotation);
    if (barieTarget > 0) updateDroneGroup(player.barieNaiaDrones, barieTarget, 'purple', Math.PI / 4, barieLevel, player.naiaRotation*(-1));
}

function drawNaiaDrones() {
    const renderDrone = (drone, index, imageKey) => {
        ctx.save();
        ctx.translate(drone.x, drone.y);
        ctx.rotate(player.naiaRotation + (index * 1.5)); 

        if (IMAGES[imageKey]) {
            let img = IMAGES[imageKey];
            let drawH = 40; 
            let drawW = drawH * (img.width / img.height);
            ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        } else {
            ctx.fillStyle = 'royalblue';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    };

    player.naiaDrones.forEach((d, i) => {
        renderDrone(d, i, 'minimi/나이아.png');
    });
    
    player.barieNaiaDrones.forEach((d, i) => {
        renderDrone(d, i, 'minimi/나이아.png');
    });
}

function drawElenaDrones() {
    player.elenaDrones.forEach(d => {
        if (IMAGES['minimi/드론.png']) {
            ctx.drawImage(IMAGES['minimi/드론.png'], d.x - 15, d.y - 15, 30, 30);
        }
    });
    player.barieDrones.forEach(d => {
        if (IMAGES['minimi/드론.png']) {
            ctx.drawImage(IMAGES['minimi/드론.png'], d.x - 15, d.y - 15, 30, 30);
        }
    });
}

function spawnBullet(x, y, vx, vy, w, h, color, dmg, shape='rect') {
    let hasLeets = (player.leftPart.id === 'leets' || player.rightPart.id === 'leets');
    let isBerserk = hasLeets && player.invincible;
    let damageMultiplier = 1.0;
    let damageAdd = 0;
    if (player.leftPart.id === 'leets') damageMultiplier += 0.20 + (player.leftPart.level - 1) * 0.2;
    if (player.rightPart.id === 'leets') damageMultiplier += 0.20 + (player.rightPart.level - 1) * 0.2;
    if (isBerserk) damageAdd = 1;
    let silphirMult = getSilphirMultiplier();

    let finalDamage = dmg * damageMultiplier * silphirMult + damageAdd ;
    let newBullet = { x, y, vx, vy, width: w * 2, height: h * 2, color, damage: finalDamage, shape };
    bullets.push(newBullet);
    return newBullet; 
}

function updateBullets() {
    let homingStrength = 0;
    if (player.leftPart.id === 'amelia' && player.rightPart.id !== 'ner') homingStrength += (player.leftPart.level * 0.01);
    if (player.rightPart.id === 'amelia' && player.leftPart.id !== 'ner') homingStrength += (player.rightPart.level * 0.01);
    
    let targets = [...enemies, ...bosses.filter(b => b.state !== 'dying')];

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; 
        if (b.trajectory === 'sine') {
            b.timer += 0.15; 
            b.x += Math.cos(b.timer) * 5 * b.sidePhase;
        }
        if (homingStrength > 0 && targets.length > 0) {
            let closest = null;
            let minDist = Infinity;

            targets.forEach(t => {
                let dx = (t.x + t.width/2) - b.x;
                let dy = (t.y + t.height/2) - b.y;
                let dist = dx*dx + dy*dy; 
                if (dist < minDist) {
                    minDist = dist;
                    closest = t;
                }
            });

            if (closest) {
                let targetX = closest.x + closest.width/2;
                let targetY = closest.y + closest.height/2;
                let angle = Math.atan2(targetY - b.y, targetX - b.x);
                let speed = Math.hypot(b.vx, b.vy);
                let desiredVx = Math.cos(angle) * speed;
                b.vx += (desiredVx - b.vx) * homingStrength;
            }
        }

        b.x += b.vx; b.y += b.vy; 
        
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = b.color;
        ctx.fillStyle = "white"; 
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;

        if (b.shape === 'circle') { 
            ctx.beginPath(); 
            ctx.arc(b.x, b.y, b.width/2, 0, Math.PI*2); 
            ctx.fill(); 
            ctx.stroke();
        } else { 
            ctx.beginPath(); 
            if (ctx.roundRect) {
                ctx.roundRect(b.x - b.width/2, b.y, b.width, b.height, b.width/2);
            } else {
                ctx.rect(b.x - b.width/2, b.y, b.width, b.height);
            }
            ctx.fill(); 
            ctx.stroke();
        }
        ctx.restore();
        if (b.y < -20) bullets.splice(i, 1);
    }

    player.IfritOrbs.forEach(orb => { 
        if (IMAGES['minimi/불꽃.png']) {
            ctx.drawImage(IMAGES['minimi/불꽃.png'], orb.x - orb.w/2, orb.y - orb.h/2, orb.w, orb.h);
        } else {
            ctx.fillStyle = orb.color; 
            ctx.fillRect(orb.x - orb.w/2, orb.y - orb.h/2, orb.w, orb.h);
        }
    });

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i]; eb.x += eb.vx; eb.y += eb.vy; 
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = eb.color || 'red';
        ctx.fillStyle = "white";
        ctx.strokeStyle = eb.color || 'red';
        ctx.lineWidth = 2;
        
        ctx.beginPath(); 
        ctx.arc(eb.x, eb.y, eb.radius || 6, 0, Math.PI*2); 
        ctx.fill(); 
        ctx.stroke();
        ctx.restore();

        if (eb.y > canvas.height + 20 || eb.y < -20 || eb.x < -20 || eb.x > canvas.width + 20) enemyBullets.splice(i, 1);
    }
}

function fireRing(source, count, speed, bulletColor) {
    let angleStep = (Math.PI * 2) / count;
    for(let i=0; i<count; i++) {
        let angle = angleStep * i;
        enemyBullets.push({ x: source.x + source.width/2, y: source.y + source.height/2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 6, color: bulletColor });
    }
}
function fireSpiral(source, angleOffset, speed, bulletColor) {
    for(let i=0; i<2; i++) {
        let angle = angleOffset + (Math.PI * i); 
        enemyBullets.push({ x: source.x + source.width/2, y: source.y + source.height/2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 6, color: bulletColor });
    }
}
function fireAimedFan(source, count, spreadAngle, speed, bulletColor) {
    let px = player.x + player.width/2; let py = player.y + player.height/2;
    let bx = source.x + source.width/2; let by = source.y + source.height/2;
    let baseAngle = Math.atan2(py - by, px - bx);
    let startAngle = baseAngle - (spreadAngle / 2);
    let step = spreadAngle / (count - 1);
    for(let i=0; i<count; i++) {
        let angle = startAngle + step * i;
        enemyBullets.push({ x: bx, y: by, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 6, color: bulletColor });
    }
}

function spawnBoss() {
    enemies.forEach(e => spawnExpOrb(e.x, e.y));
    enemies = [];
    
    let numBosses = 1;
    if (stage >= 10) numBosses = 3;
    else if (stage >= 5) numBosses = 2;

    let availableTypes = [1, 2, 3];
    availableTypes.sort(() => Math.random() - 0.5);

    totalBossMaxHp = 0;
    bosses = [];

    for (let i = 0; i < numBosses; i++) {
        let bType = availableTypes[i];
        let calculatedHp = bossMaxHp;
        let bW = 100, bH = 100;
        let bColor = '#ff00ff';
        let bSpeed = 3;

        if (bType === 1) {
            bW = 60; bH = 60; calculatedHp *= 0.7; bColor = '#00fffa'; bSpeed = 5.5;
        } else if (bType === 2) {
            bW = 100; bH = 100; calculatedHp *= 1.1; bColor = '#ffea00'; bSpeed = 2.2;
        } else if (bType === 3) {
            bW = 120; bH = 120; calculatedHp *= 2.5; bColor = '#ff003c'; bSpeed = 2.5;
        }

        let startX = (canvas.width / (numBosses + 1)) * (i + 1) - bW / 2;

        let newBoss = {
            id: 'boss_' + frame + '_' + i,
            bossType: bType,
            x: startX, y: -100, width: bW, height: bH,
            hp: calculatedHp, maxHp: calculatedHp, 
            color: bColor, speed: bSpeed,
            state: 'entering', patternTimer: Math.floor(Math.random()*100), moveAngle: 0, hitTimer: 0,
            targetX: startX, targetY: 100, moveTimer: 0, deathTimer: 0,
            startX: startX
        };
        bosses.push(newBoss);
        totalBossMaxHp += calculatedHp;
    }
    uiBossUi.style.display = 'block';
}

function updateBoss() {
    if (bosses.length === 0) {
        if (gameState === "playing" && bossCooldown > 0) { 
            bossCooldown--; 
        } else if (gameState === "playing") { 
            if (player.level >= 2 || stage > 1) spawnBoss(); 
        }
        return;
    }
    
    let currentTotalHp = 0;
    let activeBossCount = 0;

    for (let i = bosses.length - 1; i >= 0; i--) {
        let b = bosses[i];
        
        if (b.state === 'dying') {
            b.deathTimer--;
            b.x += (Math.random() - 0.5) * 15;
            b.y += (Math.random() - 0.5) * 15;
            
            if (b.deathTimer % 10 === 0) {
                createParticles(b.x + Math.random() * b.width, b.y + Math.random() * b.height, 'orange');
                playSound('explode');
            }
            
            if (b.deathTimer <= 0) {
                playSound('massive_explode');
                for(let k = 0; k < 150; k++) { 
                    particles.push({
                        x: b.x + b.width/2, y: b.y + b.height/2,
                        vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30,
                        life: 60, maxLife: 60, color: 'white', size: 5 + Math.random()*10
                    });
                }
                score += 5000; 
                for(let k=0; k<20; k++) spawnExpOrb(b.x + Math.random()*100, b.y + Math.random()*100);
                bosses.splice(i, 1);
                continue; 
            } else {
                let imgKey = 'images/boss' + b.bossType + '.png';
                let isFlash = b.deathTimer % 10 < 5;
                
                if (IMAGES[imgKey]) {
                    ctx.save();
                    if (isFlash) ctx.globalAlpha = 0.5;
                    ctx.drawImage(IMAGES[imgKey], b.x, b.y, b.width, b.height);
                    if (isFlash) {
                        ctx.globalAlpha = 0.5;
                        ctx.fillStyle = 'red';
                        ctx.fillRect(b.x, b.y, b.width, b.height);
                    }
                    ctx.restore();
                } else {
                    ctx.fillStyle = isFlash ? 'white' : 'red';
                    ctx.beginPath(); ctx.moveTo(b.x + b.width/2, b.y); ctx.lineTo(b.x + b.width, b.y + b.height/3); ctx.lineTo(b.x + b.width, b.y + b.height); ctx.lineTo(b.x, b.y + b.height); ctx.lineTo(b.x, b.y + b.height/3); ctx.closePath(); ctx.fill();
                }
            }
            activeBossCount++;
        } else {
            activeBossCount++;
            currentTotalHp += Math.max(0, b.hp);

            if (b.state === 'entering') {
                b.y += 3; if (b.y >= 100) { b.y = 100; b.state = 'phase1'; }
            } else {
                if (b.bossType === 1) {
                    if (b.moveTimer <= 0) {
                        b.targetX = Math.random() * (canvas.width - b.width);
                        b.targetY = 70 + Math.random() * 150;
                        b.moveTimer = 30 + Math.random() * 40; 
                    }
                    b.moveTimer--;
                    let dx = b.targetX - b.x;
                    let dy = b.targetY - b.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > b.speed) {
                        b.x += (dx / dist) * b.speed;
                        b.y += (dy / dist) * b.speed;
                    }
                } else {
                    b.moveAngle += 0.03 * (b.speed / 3); 
                    b.x = b.startX + Math.sin(b.moveAngle) * 60;
                }

                b.patternTimer++;
                let cycle = b.patternTimer % 450; 
                
                if (b.bossType === 1) {
                    if (cycle % 3 === 0) fireSpiral(b, b.patternTimer * 0.25, 7.5, '#00fffa');
                    if (cycle % 45 === 0) fireAimedFan(b, 3, Math.PI/6, 9, '#fff');
                } else if (b.bossType === 2) {
                    if (cycle % 5 === 0) fireSpiral(b, b.patternTimer * 0.1, 4.5, '#ffea00');
                    if (cycle % 15 === 0) fireRing(b, 18, 4, '#ff0000');
                } else {
                    if (cycle < 150) { if (cycle % 4 === 0) fireSpiral(b, b.patternTimer * 0.15, 6, '#ff99ff'); }
                    else if (cycle < 300) { if (cycle % 30 === 0) fireRing(b, 18, 4.5, '#ff0000'); }
                    else { if (cycle % 20 === 0) fireAimedFan(b, 5, Math.PI/3, 7.5, '#ffff00'); }
                }
            }

            if (b.hitTimer > 0) b.hitTimer--; 
            
            let imgKey = 'images/boss' + b.bossType + '.png';
            if (IMAGES[imgKey]) {
                ctx.save();
                if (b.hitTimer > 0) ctx.globalAlpha = 0.5; 
                ctx.drawImage(IMAGES[imgKey], b.x, b.y, b.width, b.height);
                if (b.hitTimer > 0) {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(b.x, b.y, b.width, b.height);
                }
                ctx.restore();
            } else {
                ctx.fillStyle = b.hitTimer > 0 ? "white" : b.color;
                ctx.beginPath(); ctx.moveTo(b.x + b.width/2, b.y); ctx.lineTo(b.x + b.width, b.y + b.height/3); ctx.lineTo(b.x + b.width, b.y + b.height); ctx.lineTo(b.x, b.y + b.height); ctx.lineTo(b.x, b.y + b.height/3); ctx.closePath(); ctx.fill();
            }
        }
    }

    if (activeBossCount === 0) {
        uiBossUi.style.display = 'none'; 
        gameState = "stage_clear_sequence";
        fadeAlpha = 0;
        displayClearTextTimer = 120;
    } else {
        uiBossHpBar.style.width = (currentTotalHp / totalBossMaxHp * 100) + "%";
        uiBossHpText.innerText = `총 보스 체력: ${Math.floor(currentTotalHp)}/${Math.floor(totalBossMaxHp)}`;
    }
}

function killBoss(b) {
    if (b.state === 'dying') return;
    b.state = 'dying';     
    b.deathTimer = 180;    
    b.hitTimer = 0;
}

function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; let bulletHit = false;
        
        for (let k = 0; k < bosses.length; k++) {
            let bossObj = bosses[k];
            if (bossObj.state !== 'dying' && rectIntersect(b.x-b.width/2, b.y, b.width, b.height, bossObj.x, bossObj.y, bossObj.width, bossObj.height)) {
                bossObj.hp -= b.damage; playSound('hit'); bossObj.hitTimer = 3; createParticles(b.x, b.y, 'purple'); 
                applyDianaLifesteal(b.damage);
                bulletHit = true; if (bossObj.hp <= 0) killBoss(bossObj);
                break; 
            }
        }
        
        if (!bulletHit) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (rectIntersect(b.x-b.width/2, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) {
                    e.hp -= b.damage; playSound('hit'); e.hitTimer = 3; createParticles(e.x+e.width/2, e.y+e.height/2, 'red'); 
                    applyDianaLifesteal(b.damage);
                    bulletHit = true; if (e.hp <= 0) killEnemy(e, j); break;
                }
            }
        }
        if(bulletHit) bullets.splice(i, 1);
    }
    
    for (let i = player.IfritOrbs.length - 1; i >= 0; i--) {
        let k = player.IfritOrbs[i]; let hit = false;
        for (let idx = 0; idx < bosses.length; idx++) {
            let bossObj = bosses[idx];
            if (bossObj.state !== 'dying' && Math.hypot(k.x - (bossObj.x+bossObj.width/2), k.y - (bossObj.y+bossObj.height/2)) < 60) {
                bossObj.hp -= k.damage; bossObj.hitTimer = 3; createParticles(k.x, k.y, '#333');
                applyDianaLifesteal(k.damage);
                hit = true; if (bossObj.hp <= 0) killBoss(bossObj);
                break;
            }
        }
        if(!hit) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (Math.hypot(k.x - (e.x+e.width/2), k.y - (e.y+e.height/2)) < 30) {
                    e.hp -= k.damage; playSound('hit'); e.hitTimer = 3; createParticles(k.x, k.y, '#333'); hit = true; 
                    applyDianaLifesteal(k.damage);
                    if (e.hp <= 0) killEnemy(e, j); break;
                }
            }
        }
        if(hit) player.IfritOrbs.splice(i, 1);
    }
    
    if (!player.invincible && gameState === "playing") {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let eb = enemyBullets[i];
            if (Math.hypot(eb.x - (player.x+player.width/2), eb.y - (player.y+player.height/2)) < (20 + (eb.radius||0))) {
                takeDamage(10); enemyBullets.splice(i, 1);
            }
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            if (rectIntersect(player.x, player.y, player.width, player.height, e.x, e.y, e.width, e.height)) {
                takeDamage(10);
            }
        }
        bosses.forEach(b => {
            if (b.state !== 'dying' && rectIntersect(player.x, player.y, player.width, player.height, b.x, b.y, b.width, b.height)) {
                takeDamage(20);
            }
        });
    }
}

function updatePlayerMove() {
    let speedMultiple = 1;
    if (player.leftPart.id === 'haley') speedMultiple += (player.leftPart.level * 0.1);
    else if (player.rightPart.id === 'haley') speedMultiple += (player.rightPart.level * 0.1);
    
    if (player.leftPart.id === 'lethe') speedMultiple -= (player.leftPart.level * 0.1);
    else if (player.rightPart.id === 'lethe') speedMultiple -= (player.rightPart.level * 0.1);
    
    let maxSpeed = player.speed * speedMultiple;
    let finalDx = 0;
    let finalDy = 0;
    let keyDx = 0;
    let keyDy = 0;

    if (keys.ArrowUp) keyDy -= 1;
    if (keys.ArrowDown) keyDy += 1;
    if (keys.ArrowLeft) keyDx -= 1;
    if (keys.ArrowRight) keyDx += 1;

    if (keyDx !== 0 || keyDy !== 0) {
        let len = Math.hypot(keyDx, keyDy);
        finalDx += (keyDx / len) * maxSpeed;
        finalDy += (keyDy / len) * maxSpeed;
    }

    if (touchAccX !== 0 || touchAccY !== 0) {
        let dist = Math.hypot(touchAccX, touchAccY);
        if (dist > 0) {
            let step = Math.min(dist, maxSpeed);
            let angle = Math.atan2(touchAccY, touchAccX);
            let moveStepX = Math.cos(angle) * step;
            let moveStepY = Math.sin(angle) * step;
            finalDx += moveStepX;
            finalDy += moveStepY;
            touchAccX -= moveStepX;
            touchAccY -= moveStepY;
            if (dist > 100) {
                let factor = 100 / dist;
                touchAccX *= factor;
                touchAccY *= factor;
            }
            if (Math.abs(touchAccX) < 0.1) touchAccX = 0;
            if (Math.abs(touchAccY) < 0.1) touchAccY = 0;
        }
    }

    player.vx = finalDx;

    if (finalDx !== 0 || finalDy !== 0) {
        player.x += finalDx;
        player.y += finalDy;
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
    }

    if (player.invincible) { 
        player.invincibleTimer--; 
        if (player.invincibleTimer <= 0) player.invincible = false; 
    }
}

function drawPlayer() {
    let w = player.width, h = player.height, x = player.x, y = player.y;
    let bodyImgKey = player.invincible ? 'images/내림.png' : 'images/올림.png';
    if (IMAGES[bodyImgKey]) {
        let img = IMAGES[bodyImgKey];
        let ratio = img.height / img.width;
        let drawW = w;
        let drawH = w * ratio; 
        let targetTilt = (player.vx / 10) * (Math.PI / 8); 
        player.tilt = (player.tilt || 0) * 0.8 + targetTilt * 0.2; 

        if (player.invincible && gameState === "playing") {
            ctx.globalAlpha = (frame % 10 >= 5) ? 0.4 : 1.0;
        }

        ctx.save();
        ctx.translate(x + w/2, y + h/2); 
        ctx.rotate(player.tilt);
        ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();
        ctx.globalAlpha = 1.0; 
    }

    let leftImgKey = getPartImageKey(player.leftPart, 'left');
    let rightImgKey = getPartImageKey(player.rightPart, 'right');
    let centerX = x + w / 2;
    let centerY = y + h / 2;
    let offsetX = 50; 

    if (leftImgKey && IMAGES[leftImgKey]) {
        let img = IMAGES[leftImgKey];
        let targetH = 30; 
        let drawH = targetH;
        let drawW = targetH * (img.width / img.height);
        ctx.drawImage(img, centerX - offsetX - drawW/2, centerY - drawH/2, drawW, drawH);
        ctx.fillStyle = "white"; 
        ctx.font = "10px Arial"; 
        ctx.fillText(`L${player.leftPart.level}`, centerX - offsetX - 5, centerY + drawH/2 + 10);
    }

    if (rightImgKey && IMAGES[rightImgKey]) {
        let img = IMAGES[rightImgKey];
        let targetH = 30; 
        let drawH = targetH;
        let drawW = targetH * (img.width / img.height);
        ctx.drawImage(img, centerX + offsetX - drawW/2, centerY - drawH/2, drawW, drawH);
        ctx.fillStyle = "white"; 
        ctx.font = "10px Arial";
        ctx.fillText(`L${player.rightPart.level}`, centerX + offsetX - 5, centerY + drawH/2 + 10);
    }

    if (player.gabiaState === 'active' && player.gabiaShield > 0 && gameState === "playing") {
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 50, 0, Math.PI * 2);
        let opacity = 0.3 + (player.gabiaShield / player.gabiaMaxShield) * 0.7;
        
        if (player.gabiaHitTimer > 170) {
            ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
            ctx.strokeStyle = `rgba(255, 255, 255, 1.0)`;
        } else {
            ctx.fillStyle = `rgba(139, 69, 19, 0.1)`;
            ctx.strokeStyle = `rgba(139, 69, 19, ${opacity})`; 
        }
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
    }
    
    const drawLaser = (laser, partLevel, side) => {
        if (!laser.active) return;
        let partner = (side === 'left') ? player.rightPart : player.leftPart;
        let isBoosted = (partner.id === 'barie');
        let baseW = 15 + (partLevel - 1) * 5;
        let laserW = isBoosted ? baseW * 1.5 : baseW;
        let ox;
        if (isBoosted) {
            ox = player.x + player.width/2;
        } else {
            ox = (side === 'left') ? player.x + player.width/2 - 14 : player.x + player.width/2 + 14;
        }
        let oy = player.y ;

        ctx.save();
        ctx.translate(ox, oy); 
        ctx.rotate(laser.angle + Math.PI / 2); 
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(-laserW / 2, -1000, laserW, 1000); 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-laserW / 4, -1000, laserW / 2, 1000);
        ctx.restore();
    };

    drawLaser(player.leftLaser, player.leftPart.level, 'left');
    drawLaser(player.rightLaser, player.rightPart.level, 'right');
}

function drawDyingPlayer(deathTimer) {
    let w = player.width, h = player.height, x = player.x, y = player.y;
    let alpha = Math.max(0, deathTimer / 180); 
    let shakeIntensity = 5; 
    let shakeX = (Math.random() - 0.5) * shakeIntensity;
    let shakeY = (Math.random() - 0.5) * shakeIntensity;

    let centerX = x + w / 2 + shakeX;
    let centerY = y + h / 2 + shakeY;

    ctx.save(); 
    ctx.globalAlpha = alpha;

    let bodyImgKey = 'images/내림.png'; 
    if (IMAGES[bodyImgKey]) {
        let img = IMAGES[bodyImgKey];
        let ratio = img.height / img.width;
        let drawW = w;
        let drawH = w * ratio; 
        let targetTilt = (player.vx / 10) * (Math.PI / 8); 
        player.tilt = (player.tilt || 0) * 0.8 + targetTilt * 0.2;

        ctx.save();
        ctx.translate(centerX, centerY); 
        ctx.rotate(player.tilt);
        ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();
    }

    let leftImgKey = getPartImageKey(player.leftPart, 'left');
    let rightImgKey = getPartImageKey(player.rightPart, 'right');
    let offsetX = 50; 

    if (leftImgKey && IMAGES[leftImgKey]) {
        let img = IMAGES[leftImgKey];
        let targetH = 30; 
        let drawH = targetH;
        let drawW = targetH * (img.width / img.height);
        ctx.drawImage(img, centerX - offsetX - drawW/2, centerY - drawH/2, drawW, drawH);
        ctx.save();
        ctx.fillStyle = "white"; 
        ctx.font = "10px Arial"; 
        ctx.fillText(`L${player.leftPart.level}`, centerX - offsetX - 5, centerY + drawH/2 + 10);
        ctx.restore();
    }

    if (rightImgKey && IMAGES[rightImgKey]) {
        let img = IMAGES[rightImgKey];
        let targetH = 30; 
        let drawH = targetH;
        let drawW = targetH * (img.width / img.height);
        ctx.drawImage(img, centerX + offsetX - drawW/2, centerY - drawH/2, drawW, drawH);
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText(`L${player.rightPart.level}`, centerX + offsetX - 5, centerY + drawH/2 + 10);
        ctx.restore();
    }

    ctx.restore();
}

function updateEnemies() {
    if (gameState !== "playing") return;

    let spawnRate = Math.max(10, 60 - (player.level * 3) - (stage * 2)); 
    if (frame >= nextSpawnFrame) { spawnEnemy(); nextSpawnFrame = frame + spawnRate; }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (e.state === 'entering') {
            e.y += 3; 
            e.x += Math.sin(frame * 0.05 + e.phase) * e.amp * 0.5;
            if (e.y >= e.destY) { e.y = e.destY; e.state = 'idle'; }
        } else if (e.state === 'idle') {
            e.x += Math.sin(frame * 0.05 + e.phase) * e.amp;
            e.age++; if (e.age > 400) e.state = 'retreating'; 
        } else if (e.state === 'retreating') {
            e.y -= 4.5; 
            e.x += Math.sin(frame * 0.05 + e.phase) * e.amp;
            if (e.y < -50) { enemies.splice(i, 1); continue; } 
        }

        if (e.x < 0) e.x = 0;
        if (e.x > canvas.width - e.width) e.x = canvas.width - e.width;

        if (e.state === 'entering' || e.state === 'idle') {
            let attackProb = 0.02 + (player.level * 0.003) + (stage * 0.002); 
            if (Math.random() < attackProb) fireRandomBullet(e);
        }

        if (e.hitTimer > 0) {
            ctx.globalAlpha = 0.5;
            e.hitTimer--;
        }

        if (e.imgSrc && IMAGES[e.imgSrc]) {
            ctx.drawImage(IMAGES[e.imgSrc], e.x, e.y, e.width, e.height);
        } else {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x, e.y, e.width, e.height);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "red"; ctx.fillRect(e.x, e.y - 6, e.width * (e.hp / e.maxHp), 4);
    }
}

function fireRandomBullet(enemy) {
    let ex = enemy.x + enemy.width / 2; 
    let ey = enemy.y + enemy.height / 2;
    let angle = (Math.random() * Math.PI / 2) + (Math.PI / 4); 
    let speed = 4 + Math.random() * 3 + (stage * 0.5); 
    enemyBullets.push({ x: ex, y: ey, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 5 });
}

function spawnEnemy() {
    let hp = Math.min(10, Math.max(1, 2.5 + (stage - 1) * 0.5)); 
    let destY = 50 + Math.random() * 250;
    
    let randomImg = minimiList.length > 0 
                    ? `minimi/${minimiList[Math.floor(Math.random() * minimiList.length)]}` 
                    : null;

    let targetH = 60; 
    let w = targetH;  
    let h = targetH;

    if (randomImg && IMAGES[randomImg]) {
        let img = IMAGES[randomImg];
        let ratio = img.width / img.height; 
        h = targetH;
        w = targetH * ratio; 
    }

    enemies.push({ 
        id: 'e_'+frame+Math.random(), 
        x: Math.random() * (canvas.width - w), 
        y: -50, 
        destY: destY, 
        width: w, height: h, 
        hp: hp, maxHp: hp, 
        color: '#ff4444', 
        imgSrc: randomImg,
        phase: Math.random() * Math.PI * 2, 
        amp: 1 + Math.random() * 2,         
        state: 'entering', age: 0, hitTimer: 0 
    });
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) { return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1; }

function killEnemy(enemy, index) {
    playSound('explode');
    for(let p = 0; p < 15; p++) { 
        particles.push({
            x: enemy.x + enemy.width / 2, 
            y: enemy.y + enemy.height / 2, 
            vx: (Math.random() - 0.5) * 12, 
            vy: (Math.random() - 0.5) * 12, 
            life: 15 + Math.random() * 15,  
            maxLife: 30,
            color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00', 
            size: 3 + Math.random() * 5     
        }); 
    }
    enemies.splice(index, 1); 
    score += 100; 
    spawnExpOrb(enemy.x, enemy.y); 
}

function spawnExpOrb(x, y) { expOrbs.push({ x: x + 20, y: y + 20, radius: 6, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, val: 2 }); }

function updateExpOrbs() {
    for (let i = expOrbs.length - 1; i >= 0; i--) {
        let orb = expOrbs[i]; let px = player.x + player.width/2, py = player.y + player.height/2; let dist = Math.hypot(px - orb.x, py - orb.y);
        orb.y += 1.5; 
        if (orb.x < orb.radius) { orb.x = orb.radius; orb.vx *= -1; }
        if (orb.x > canvas.width - orb.radius) { orb.x = canvas.width - orb.radius; orb.vx *= -1; }
        if (dist < 150) { let angle = Math.atan2(py - orb.y, px - orb.x); orb.x += Math.cos(angle) * 12; orb.y += Math.sin(angle) * 12; } 
        else { orb.x += orb.vx; orb.y += orb.vy; orb.vx *= 0.9; orb.vy *= 0.9; }
        if (IMAGES['images/경험치.webp']) {
            let size = orb.radius * 5; 
            ctx.drawImage(IMAGES['images/경험치.webp'], orb.x - orb.radius, orb.y - orb.radius, size, size);
        } else {
            ctx.fillStyle = 'yellow'; 
            ctx.beginPath(); 
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI*2); 
            ctx.fill(); 
        }
        if (dist < 30 && (gameState === "playing" || gameState === "stage_clear_sequence" || gameState === "stage_start_sequence")) { 
    gainExp(orb.val); 
    expOrbs.splice(i, 1); 
    continue; 
}
        if (orb.y > canvas.height + 20) { expOrbs.splice(i, 1); }
    }
}

function gainExp(amount) {
    let bonusMult = 1.0; if (player.leftPart.id === 'pira' && player.rightPart.id !== 'kidian') bonusMult += (player.leftPart.level * 0.2); if (player.rightPart.id === 'pira' && player.leftPart.id !== 'kidian') bonusMult += (player.rightPart.level * 0.2);
    let finalExp = amount * bonusMult; player.currentExp += finalExp;
    if (player.currentExp >= player.maxExp) { player.currentExp -= player.maxExp; player.maxExp += 10; player.level++; showUpgradeModal(); }
    updateUI();
}

function updatePlayerStats() {
    let oldMaxHp = player.maxHp;
    let currentHpRatio = 1.0;
    if (oldMaxHp > 0) {
        currentHpRatio = player.hp / oldMaxHp;
    }
    let hpMultiplier = 1.0;
    if (player.leftPart.id === 'asana') {
        hpMultiplier += (player.leftPart.level * 0.1);
    }
    if (player.leftPart.id === 'suro') {
        hpMultiplier -= (player.leftPart.level * 0.1);
    }
    if (player.rightPart.id === 'asana') {
        hpMultiplier += (player.rightPart.level * 0.1);
    }
    if (player.rightPart.id === 'suro') {
        hpMultiplier -= (player.rightPart.level * 0.1);
    }
    let newMaxHp = Math.floor(100 * hpMultiplier);
    player.maxHp = newMaxHp;
    player.hp = Math.floor(newMaxHp * currentHpRatio);

    let gabiaLevel = 0;
    if (player.leftPart.id === 'gabia') gabiaLevel += player.leftPart.level;
    if (player.rightPart.id === 'gabia') gabiaLevel += player.rightPart.level;
    
    let oldMax = player.gabiaMaxShield;
    player.gabiaMaxShield = gabiaLevel * 20;
    
    if (player.gabiaMaxShield === 0) {
        player.gabiaShield = 0;
        player.gabiaState = 'active';
    } else if (player.gabiaState === 'active' && player.gabiaShield > player.gabiaMaxShield) {
        player.gabiaShield = player.gabiaMaxShield;
    }
    updateUI();
}

function updateUI() {
    let shieldInfo = "";
    if (player.gabiaMaxShield > 0) {
        if (player.gabiaState === 'broken') shieldInfo = " [방어막 재부팅 중...]";
        else shieldInfo = ` [방어막: ${Math.floor(player.gabiaShield)}/${player.gabiaMaxShield}]`;
    }

    uiHpBar.style.width = (player.hp / player.maxHp * 100) + "%"; 
    uiHpText.innerText = `체력: ${Math.floor(player.hp)}/${player.maxHp}` + shieldInfo;
    
    uiXpBar.style.width = (player.currentExp / player.maxExp * 100) + "%"; 
    uiXpText.innerText = `레벨 ${player.level} (${Math.floor(player.currentExp)}/${player.maxExp})`;
    uiScore.innerText = `점수: ${score}`; 
    
    bombContainer.innerHTML = '';
    for(let i=0; i<player.bombs; i++) {
        let img = document.createElement('img');
        img.src = 'minimi/마리.png';
        img.style.width = '30px'; 
        img.style.height = '30px';
        img.style.objectFit = 'contain';
        bombContainer.appendChild(img);
    }
}

function showUpgradeModal(isReroll = false) {
    if (!isReroll) {
        savedGameState = gameState; 
    }
    gameState = "paused"; 
    modal.style.display = "flex"; 
    selectUi.style.display = "flex"; 
    replaceUi.style.display = "none";
    upgradeSelectedIndex = 0;
    
    let keys = Object.keys(PARTS_INFO); 
    let pool = [];

    keys.forEach(key => {
        pool.push(key); 
        
        if (player.leftPart.id === key || player.rightPart.id === key) {
            pool.push(key); 
            pool.push(key); 
        }
    });
    
    pool.sort(() => Math.random() - 0.5);
    
    let choices = [];
    for (let i = 0; i < pool.length; i++) {
        if (!choices.includes(pool[i])) {
            choices.push(pool[i]);
        }
        if (choices.length === 3) break;
    }
    currentUpgradeChoices = choices; 
    
    cardList.innerHTML = "";
    choices.forEach((key, idx) => {
        let info = PARTS_INFO[key]; 
        let div = document.createElement('div'); div.className = 'card';
        let isOwned = (player.leftPart.id === key || player.rightPart.id === key);
        let currentLevel = 0;
        if(player.leftPart.id === key) currentLevel = player.leftPart.level;
        else if(player.rightPart.id === key) currentLevel = player.rightPart.level;
        
        let isMax = (isOwned && currentLevel >= 5);
        if(isMax) div.classList.add('disabled');
        
        div.innerHTML = `${isMax ? '<div class="max-badge">MAX</div>' : ''}<div class="card-icon"><img src="minimi/${info.name}.png" style="width:100%; height:100%; object-fit:contain;"></div><div class="card-name" style="color:${info.color}">${info.name}</div><div class="card-desc">${info.desc}</div><div class="card-level">${isOwned ? 'Lv.' + currentLevel + (isMax ? ' (MAX)' : ' -> ' + (currentLevel+1)) : 'New!'}</div>`;
        div.onclick = () => { if(!isMax) selectUpgradePart(key); }; 
        cardList.appendChild(div);
    });

    const btnReroll = document.getElementById('btn-reroll');
    if (btnReroll) {
        btnReroll.innerText = `🔄 리롤 (${player.rerolls}/3)`;
        if (player.rerolls <= 0) {
            btnReroll.style.opacity = '0.5'; btnReroll.style.pointerEvents = 'none';
        } else {
            btnReroll.style.opacity = '1'; btnReroll.style.pointerEvents = 'auto';
        }
    }
    const btnBomb = document.getElementById('btn-bomb');
    if (btnBomb) {
        if (player.bombs >= 5) {
            btnBomb.style.opacity = '0.5'; btnBomb.style.pointerEvents = 'none'; btnBomb.innerText = '💣 마리 최대치 도달';
        } else {
            btnBomb.style.opacity = '1'; btnBomb.style.pointerEvents = 'auto'; btnBomb.innerText = '💣 마리 획득';
        }
    }

    updateUpgradeVisuals();
}

function selectFixedUpgrade(type) { 
    if (type === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + 20); 
    } else if (type === 'bomb') {
        player.bombs = Math.min(5, player.bombs + 1);
    }
    updateUI(); 
    finishUpgrade(); 
}

function selectUpgradePart(partId) {
    if (player.leftPart.id === partId) { if(player.leftPart.level < 5) { player.leftPart.level++; finishUpgrade(); } } 
    else if (player.rightPart.id === partId) { if(player.rightPart.level < 5) { player.rightPart.level++; finishUpgrade(); } } 
    else { 
        selectedNewPartId = partId; 
        selectUi.style.display = "none"; 
        replaceUi.style.display = "flex"; 
        replaceSelection='left'; 
        updateReplaceVisuals(); 
        document.getElementById('btn-replace-left').innerText = `왼쪽: ${PARTS_INFO[player.leftPart.id].name} (Lv.${player.leftPart.level}) 교체`; 
        document.getElementById('btn-replace-right').innerText = `오른쪽: ${PARTS_INFO[player.rightPart.id].name} (Lv.${player.rightPart.level}) 교체`; 
    }
}

document.getElementById('btn-replace-left').onclick = () => replacePart('left'); 
document.getElementById('btn-replace-right').onclick = () => replacePart('right');
document.getElementById('btn-replace-cancel').onclick = () => cancelReplace();

function replacePart(side) { 
    let oldPart = player[side + 'Part']; let newLevel = Math.max(1, oldPart.level); 
    if (oldPart.id === 'Ifrit') player.IfritOrbs = []; 
    if (oldPart.id === 'elena') player.elenaDrones = []; 
    if (oldPart.id === 'barie') { player.barieDrones = []; player.barieNaiaDrones = []; } 
    if (oldPart.id === 'naia') { player.naiaDrones = []; player.barieNaiaDrones = []; }
    
    if(oldPart.id === 'lethe') {
        if(side === 'left') player.leftLaser = { active: false, timer: 0 };
        else player.rightLaser = { active: false, timer: 0 };
    }

    player[side + 'Part'] = { id: selectedNewPartId, level: newLevel }; 
    if (side === 'left') {
        player.leftCooldown = 0;
    } else {
        player.rightCooldown = 6;
    }

    finishUpgrade(); 
    if (selectedNewPartId === 'gabia') {
        player.gabiaShield = player.gabiaMaxShield;
        player.gabiaState = 'active';
        updateUI(); 
    }
}

function cancelReplace() { replaceUi.style.display = "none"; selectUi.style.display = "flex"; }
function finishUpgrade() { 
    modal.style.display = "none"; 
    
    gameState = savedGameState; 
    
    updatePlayerStats(); 
    player.invincible = true; 
    player.invincibleTimer = 60; 
}

function createParticles(x, y, color) { 
    for(let i=0; i<8; i++) { 
        particles.push({
            x, y, 
            vx:(Math.random()-0.5)*7, 
            vy:(Math.random()-0.5)*7, 
            life:10, maxLife: 10,
            color,
            size: 4
        }); 
    } 
}

function updateParticles() {
    for(let i=particles.length-1; i>=0; i--) { 
        let p = particles[i]; 
        p.x+=p.vx; p.y+=p.vy; 
        p.life--; 
        
        ctx.fillStyle=p.color; 
        ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 10)); 
        let s = p.size || 4;
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s); 
        ctx.globalAlpha=1; 
        if(p.life<=0) particles.splice(i,1); 
    }
}

function takeDamage(amount) {
    if (player.invincible) return; 
    playSound('damage');

    let dodgeChance = 0;
    if (player.leftPart.id === 'shady') dodgeChance = 0.4 + (player.leftPart.level - 1) * 0.1;
    else if (player.rightPart.id === 'shady') dodgeChance = 0.4 + (player.rightPart.level - 1) * 0.1;
    
    if (Math.random() < dodgeChance) {
        createParticles(player.x + player.width/2, player.y + player.height/2, 'cyan');
        player.invincible = true; player.invincibleTimer = 180;
        return;
    }

    if (player.gabiaState === 'active' && player.gabiaShield > 0) {
        player.gabiaShield -= amount;
        player.gabiaHitTimer = 180; 
        createParticles(player.x + player.width/2, player.y + player.height/2, '#8B4513'); 

        if (player.gabiaShield <= 0) {
            player.gabiaShield = 0;
            player.gabiaState = 'broken'; 
            player.invincible = true; 
            player.invincibleTimer = 180;
            createParticles(player.x + player.width/2, player.y + player.height/2, 'white'); 
        } 
        updateUI();
        return; 
    }

    player.hp -= amount; 
    player.totalHitCount++;
    updateUI();
    if (player.hp > 0) {
        player.invincible = true; player.invincibleTimer = 180;
        createParticles(player.x + player.width/2, player.y + player.height/2, 'white');
    }
}

function updateGabiaShield() {
    if (player.gabiaMaxShield <= 0) return;

    if (player.gabiaState === 'broken') {
        let regenRate = player.gabiaMaxShield / 1800; 
        player.gabiaShield += regenRate;

        if (player.gabiaShield >= player.gabiaMaxShield) {
            player.gabiaShield = player.gabiaMaxShield;
            player.gabiaState = 'active';
            createParticles(player.x + player.width/2, player.y + player.height/2, '#8B4513'); 
            updateUI();
        }
    } else {
        if (player.gabiaHitTimer > 0) {
            player.gabiaHitTimer--;
        } else {
            if (player.gabiaShield < player.gabiaMaxShield) {
                let regenRate = player.gabiaMaxShield / 600;
                player.gabiaShield += regenRate;
                if (player.gabiaShield > player.gabiaMaxShield) player.gabiaShield = player.gabiaMaxShield;
            }
        }
    }
    if (frame % 10 === 0) updateUI();
}

function applyDianaLifesteal(damage) {
    if (player.leftPart.id === 'diana' || player.rightPart.id === 'diana') {
        let healAmount = damage * 0.05; 
        if (healAmount > 0) {
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            updateUI(); 
        }
    }
}

function getSilphirMultiplier() {
    let silphirLevel = 0;
    if (player.leftPart.id === 'silphir') silphirLevel = Math.max(silphirLevel, player.leftPart.level);
    if (player.rightPart.id === 'silphir') silphirLevel = Math.max(silphirLevel, player.rightPart.level);
    if (player.leftPart.id === 'barie' && player.rightPart.id === 'silphir') silphirLevel = Math.max(silphirLevel, player.leftPart.level);
    if (player.rightPart.id === 'barie' && player.leftPart.id === 'silphir') silphirLevel = Math.max(silphirLevel, player.rightPart.level);

    if (silphirLevel === 0) return 1.0;

    let maxFrames = 18000;
    let progress = Math.min(1.0, player.silphirTimer / maxFrames);
    let startMult = 1.0 + (silphirLevel - 1) * 0.125; 
    let endMult = 1.5 + (silphirLevel - 1) * 0.25;    
    return startMult + (endMult - startMult) * progress;
}

function updateNerOrbs() {
    let ameliaLevel = 0;
    if (player.leftPart.id === 'amelia') ameliaLevel += player.leftPart.level;
    if (player.rightPart.id === 'amelia') ameliaLevel += player.rightPart.level;
    let homingStrength = ameliaLevel * 0.005; 

    for (let i = player.nerOrbs.length - 1; i >= 0; i--) {
        let orb = player.nerOrbs[i];

        if (homingStrength > 0 && !orb.isEnemy) {
            let closest = null;
            let minDist = Infinity;
            
            let activeBosses = bosses.filter(b => b.state !== 'dying');
            if (activeBosses.length > 0) {
                activeBosses.forEach(b => {
                    let d = Math.hypot((b.x+b.width/2)-orb.x, (b.y+b.height/2)-orb.y);
                    if(d < minDist) { minDist = d; closest = b; }
                });
            } else if (enemies.length > 0) {
                enemies.forEach(e => {
                    let d = Math.hypot((e.x+e.width/2)-orb.x, (e.y+e.height/2)-orb.y);
                    if(d < minDist) { minDist = d; closest = e; }
                });
            }

            if (closest) {
                let tx = closest.x + closest.width/2;
                let ty = closest.y + closest.height/2;
                let angle = Math.atan2(ty - orb.y, tx - orb.x);
                let speed = Math.hypot(orb.vx, orb.vy);
                let targetVx = Math.cos(angle) * speed;
                let targetVy = Math.sin(angle) * speed;
                orb.vx += (targetVx - orb.vx) * homingStrength;
                orb.vy += (targetVy - orb.vy) * homingStrength;
            }
        }
        
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.timer++;

        let triggerExplosion = false;
        if (orb.timer >= orb.explodeTime) {
            triggerExplosion = true;
        }

        if (!triggerExplosion) {
            for (let b of bosses) {
                if (b.state !== 'dying' && rectIntersect(orb.x - 10, orb.y - 10, 20, 20, b.x, b.y, b.width, b.height)) {
                    triggerExplosion = true; break;
                }
            }
            if (!triggerExplosion) {
                for (let e of enemies) {
                    if (rectIntersect(orb.x - 10, orb.y - 10, 20, 20, e.x, e.y, e.width, e.height)) {
                        triggerExplosion = true;
                        break; 
                    }
                }
            }
        }

        if (triggerExplosion) {
            createParticles(orb.x, orb.y, orb.isEnemy ? 'red' : 'orange');
            let bulletCount = 12 + (orb.level - 1) * 3;
            let angleStep = (Math.PI * 2) / bulletCount;

            for (let j = 0; j < bulletCount; j++) {
                let angle = angleStep * j;
                let bx = orb.x;
                let by = orb.y;
                let speed = 6;
                let bvx = Math.cos(angle) * speed;
                let bvy = Math.sin(angle) * speed;

                if (orb.isEnemy) {
                    enemyBullets.push({ x: bx, y: by, vx: bvx, vy: bvy, radius: 4, color: 'red' });
                } else {
                    spawnBullet(bx, by, bvx, bvy, 4, 4, 'yellow', 2, 'circle');
                }
            }
            player.nerOrbs.splice(i, 1);
            continue; 
        }

        if (orb.y < -50 || orb.y > canvas.height + 50) {
            player.nerOrbs.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 10, 0, Math.PI * 2); 
        ctx.fillStyle = orb.isEnemy ? '#8B0000' : '#FF8C00'; 
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawGameOver() { ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = "white"; ctx.textAlign="center"; ctx.font="40px Arial"; ctx.fillText("게임 오버", canvas.width/2, canvas.height/2); }

preloadAssets().then(() => {
    initGame();
    animate();
});
// 폭탄 사용 함수 (사운드 포함)
function useBomb() {
    if (player.bombs > 0) {
        player.bombs--;

        // 💣 폭탄 효과음 재생 (boom.ogg)
        if (audioCtx) {
            const soundRequest = new XMLHttpRequest();
            soundRequest.open('GET', 'boom.ogg', true);
            soundRequest.responseType = 'arraybuffer';
            soundRequest.onload = function() {
                audioCtx.decodeAudioData(soundRequest.response, function(buffer) {
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);
                    source.start(0);
                });
            };
            soundRequest.send();
        }

        flashTimer = 20; 

        // 1. 화면 내의 모든 적 총알 제거
        enemyBullets = [];

        // 2. 일반 적 즉사 처리
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.hp = 0;
            killEnemy(e, i); 
        }

        // 3. 보스에게 데미지
        bosses.forEach(b => {
            if (b.state !== 'dying') {
                b.hp -= 100; 
                b.hitTimer = 10;
                createParticles(b.x + b.width / 2, b.y + b.height / 2, 'orange');
                if (b.hp <= 0) killBoss(b);
            }
        });

        updateUI();
    }
}

const EXTENDED_DICT = {
    tig: "검을 쪼개서 두개씩 탄환을 발사합니다. 레벨이 오를수록 연사력이 극대화됩니다. (최대레벨 시 쿨다운이 절반으로 감소)",
    leets: "보라색 탄환을 발사합니다. 맞으면 광폭화하여 모든 데미지를 100% 증가시키며, 공격력 배율은 레벨당 20%씩 증가합니다.",
    Ifrit: "주변을 맴도는 불의 정령을 최대 5~15개 소환합니다. 적이 탐지 사거리에 들어오면 유도 미사일처럼 날아갑니다.",
    pira: "황철석색 탄환을 쏘며, 장착 시 경험치 획득량이 레벨당 20% 씩 증가합니다. ",
    diana: "갈색 탄환을 쏘며, 적에게 입힌 데미지의 5%만큼 체력을 회복합니다. 슈로와 같이 쓰지 마세요.",
    elena: "레벨당 1개씩 적을 끝까지 쫓아다니며 지속적인 딜을 넣는 유도 드론을 생성합니다.",
    shasha: "전방을 향해 넓은 부채꼴로 다수의 탄환을 흩뿌립니다. 레벨당 발사되는 탄환 수가 1개씩 늘어납니다.",
    silphir: "파란 탄환을 발사하며, 게임 진행 시간(최대 5분)에 비례하여 모든 파츠의 데미지를 최대 1.5배~2.5배까지 서서히 증가시키는 대기만성형입니다.",
    lethe: "일정 주기마다 전방의 모든 것을 관통하는 강력한 레이저를 발사합니다.",
    haley: "빨간색색 탄환을 쏘며, 이동 속도와 공격 속도를 레벨당 10%씩 올려줍니다. 무적 상태일 때는 공속이 2배로 폭증합니다.",
    amelia: "회색색 탄환을 쏘며, 모든 탄환에 유도 기능을 부여합니다.",
    shady: "회색 탄환을 쏘며, 적의 공격에 피격당할 때 레벨당 40% ~ 80%의 높은 확률로 데미지를 회피합니다.",
    rim: "전방으로 붉은 탄환 뭉치를 발사합니다. 피격 시 광림 상태가 되며 공격 속도가 2배가 됩니다",
    asana: "녹색 탄환을 쏘며, 장착 시 볼-요가 효과로 최대 체력이 레벨당 10% 증가하며, 매 1초마다 지속적으로 체력을 자동 회복합니다.",
    Belita: "붉은색 기탄을 발사하며, 현재 체력에 따라 쏘아내는 붉은 기탄의 크기와 공격력이 폭발적으로 증가합니다.",
    kidian: "검은 탄환을 부채꼴과 직선으로 섞어 쏩니다. 전체 레벨에 정비례하여 끝없이 데미지가 오릅니다",
    naia: "주변을 공전하며 다방향으로 물총을 쏘는 나이아 미니미를 3개 이상 생성합니다. 나이아 미니미의 개수는 1~3개에서 지맘대로 바뀝니다. 퓨퓨!",
    barie: "보라색 탄환을 쏩니다. 반대편 미니미의 공격을 그대로 복제합니다. 책 딸깍!",
    gabia: "갈색 탄환을 쏩니다. 피해를 100% 흡수하는 나무 방어막을 생성합니다. 방어막이 깨지면 서서히 재충전됩니다.",
    suro: "웨이브 형태의 탄막을 쏘며, 피격당한 횟수 1번당 공격력이 1%씩 누적 증가합니다(최대 100회).",
    erpin: "황금 산탄을 난사합니다. 20% 확률로 공격을 쉬고 체력을 1 회복시킵니다. 네르랑 함께 있으면 마리랑 놀러간다고 사라지곤 합니다.",
    ner: "시한폭탄 구체를 날립니다. 20% 확률로 배신합니다, 에르핀과 조합하면 배신하지 않습니다."
};

function openDict() {
    initAudio();
    playLobbyMusic();
    document.getElementById('dict-screen').style.display = 'flex';
    const list = document.getElementById('dict-list');
    list.innerHTML = "";
    
    // 데이터 렌더링
    Object.keys(PARTS_INFO).forEach(key => {
        let info = PARTS_INFO[key];
        let desc = EXTENDED_DICT[key] || info.desc;
        
        let card = document.createElement('div');
        card.className = 'dict-card';
        
        card.innerHTML = `
            <div class="dict-icon">
                <img src="minimi/${info.name}.png" style="width:100%; height:100%; object-fit:contain;" alt="${info.name}">
            </div>
            <div class="dict-text-box">
                <div class="dict-name" style="color: ${info.color}">${info.name}</div>
                <div class="dict-desc">${desc}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

function closeDict() {
    document.getElementById('dict-screen').style.display = 'none';
}

function rerollUpgrade() {
    if (player.rerolls > 0) {
        player.rerolls--;
        showUpgradeModal(true);
    }
}

function skipUpgrade() {
    player.level--;
    player.maxExp -= 10;
    player.currentExp = Math.floor(player.maxExp / 2);
    
    updateUI();
    finishUpgrade(); 
}