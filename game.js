// ==================== ELEMENTS ====================
const levelSelect = document.getElementById("level-select");
const statSetup = document.getElementById("stat-setup");
const level1Btn = document.getElementById("level1-btn");
const startBtn = document.getElementById("start-level-btn");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const congratsScreen = document.getElementById("congrats-screen");
const congratsContent = document.getElementById("congrats-content");
const backToLevelsBtn = document.getElementById("back-to-levels");
const controlPanel = document.getElementById("control-panel");
const jumpControlUI = document.getElementById("jump-control-ui");
const speedControlUI = document.getElementById("speed-control-ui");
const jumpSpeedSlider = document.getElementById("jumpSpeedSlider");
const jumpSpeedValue = document.getElementById("jumpSpeedValue");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");

// ==================== CONTROL CHECKBOX TOGGLE ====================

const jumpControlCheckbox = document.getElementById("jumpControl");
const speedControlCheckbox = document.getElementById("speedControl");

// Update slider visibility whenever a checkbox changes
jumpControlCheckbox.addEventListener("change", updateControlUIVisibility);
speedControlCheckbox.addEventListener("change", updateControlUIVisibility);

function updateControlUIVisibility() {
  jumpControlUI.style.display = jumpControlCheckbox.checked ? "block" : "none";
  speedControlUI.style.display = speedControlCheckbox.checked ? "block" : "none";

  // Show the panel if any slider is active
  if (jumpControlCheckbox.checked || speedControlCheckbox.checked) {
    controlPanel.style.display = "block";
  } else {
    controlPanel.style.display = "none";
  }
}



// ==================== CONSTANTS ====================
const BLOCK = 20;
const PLAYER_SIZE = 15;
const gravity = 0.15;
const IMMUNITY_DURATION = 1000;
const SPIKE_DAMAGE_INTERVAL = 100;
const FLASH_DURATION = 300;
const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink"];

// ==================== STATE ====================
const keys = {};
let mouse = { x: 0, y: 0 };
let fireballs = [];
let player = null;
let gameRunning = false;
let slimes = [];
let spikes = [];
let lastSpikeDamage = 0;
let lastSlimeHitTime = 0;
let selectedSlime = null;
let stage = 1;
let startTime = 0;
let slimesDefeated = 0;
let totalXP = 0;
let cameraX = 0;
let maxPlayerX = 0;
let fireKeyPressed = false;

// Door
const door = { x: 0, y: 0, width: 20, height: 40 };

// ==================== INPUT ====================
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left + cameraX;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left + cameraX;
  const clickY = e.clientY - rect.top;
  selectedSlime = null;
  slimes.forEach(slime => {
    if (clickX > slime.x && clickX < slime.x + slime.size &&
        clickY > slime.y && clickY < slime.y + slime.size) {
      selectedSlime = slime;
    }
  });
});

// ==================== LEVEL FLOW ====================
level1Btn.addEventListener("click", () => {
  levelSelect.style.display = "none";
  statSetup.style.display = "block";
});

startBtn.addEventListener("click", () => {
  const boost = 1 + Number(document.getElementById("allStatsBoost").value || 0) / 100;

  const playerStats = {
    jumpHeight: Number(document.getElementById("jumping").value) * BLOCK * boost,
    speed: Number(document.getElementById("speed").value) * BLOCK * boost / 60,
    fireballRange: Number(document.getElementById("fireballRange").value) * BLOCK * boost,
    damage: Number(document.getElementById("damage").value) * boost,
    maxHealth: Number(document.getElementById("health").value) * boost,
    health: Number(document.getElementById("health").value) * boost,
    defense: Number(document.getElementById("defense").value) || 0
  };

  player = {
    x: 50,
    y: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    grounded: false,
    immune: false,
    hitTime: 0,
    color: document.getElementById("playerColor").value,
    ...playerStats
  };

  // Store logical (stat-based) jump separately
player.maxJumpStat = Number(document.getElementById("jumping").value) * boost;

// Preserve original jump height
player.baseJumpHeight = player.jumpHeight;

  // Store logical (stat-based) speed separately for controls
player.maxSpeedStat = Number(document.getElementById("speed").value) * boost;

// Keep movement speed unchanged
player.baseSpeed = player.speed;


  // ==================== JUMP / SPEED CONTROL SETUP ====================
const jumpControlEnabled = document.getElementById("jumpControl").checked;
const speedControlEnabled = document.getElementById("speedControl").checked;

// Store base speed
player.baseSpeed = player.speed;

// Show / hide control panel
if (jumpControlEnabled) {
  jumpControlUI.style.display = "block";

  const min = 1.5;
  const max = player.maxJumpStat;
  const steps = 20;

  jumpSpeedSlider.min = min;
  jumpSpeedSlider.max = max;
  jumpSpeedSlider.step = (max - min) / steps;
  jumpSpeedSlider.value = max;

  jumpSpeedValue.textContent = max.toFixed(2);

  jumpSpeedSlider.oninput = () => {
    const jumpStat = Number(jumpSpeedSlider.value);

    // Convert stat → actual jump height
    player.jumpHeight = jumpStat * BLOCK;

    jumpSpeedValue.textContent = jumpStat.toFixed(2);
  };
}

// ----- Speed Control -----
if (speedControlEnabled) {
  speedControlUI.style.display = "block";

  const min = 4;
  const max = player.maxSpeedStat;
  const steps = 20;

  speedSlider.min = min;
  speedSlider.max = max;
  speedSlider.step = (max - min) / steps;
  speedSlider.value = max;

  speedValue.textContent = max.toFixed(2);

  speedSlider.oninput = () => {
    const statSpeed = Number(speedSlider.value);
    player.speed = (statSpeed * BLOCK) / 60;
    speedValue.textContent = statSpeed.toFixed(2);
  };
}

jumpSpeedSlider.addEventListener("keydown", e => e.preventDefault());
speedSlider.addEventListener("keydown", e => e.preventDefault());

  slimesDefeated = 0;
  startTime = Date.now();
  cameraX = 0;

// ==================== TEST LEVELS (1-20) ====================
const testLevels = [
  { stage: 1, colors: ["red", "orange"] },
  { stage: 2, colors: ["yellow", "green"] },
  { stage: 3, colors: ["blue", "purple"] },
  { stage: 4, colors: ["pink", "red"] },
  { stage: 5, colors: ["orange", "green", "blue"] },
  { stage: 6, colors: ["purple", "pink", "yellow"] },
  { stage: 7, colors: ["green", "orange", "red"] },
  { stage: 8, colors: ["blue", "purple", "pink"] },
  { stage: 9, colors: ["yellow", "green", "blue"] },
  { stage: 10, colors: ["red", "orange", "purple"] },
  { stage: 11, colors: ["pink", "yellow", "green"] },
  { stage: 12, colors: ["blue", "red", "orange"] },
  { stage: 13, colors: ["purple", "pink", "yellow"] },
  { stage: 14, colors: ["green", "blue", "orange"] },
  { stage: 15, colors: ["red", "purple", "yellow"] },
  { stage: 16, colors: ["pink", "green", "blue"] },
  { stage: 17, colors: ["orange", "red", "purple"] },
  { stage: 18, colors: ["yellow", "pink", "green"] },
  { stage: 19, colors: ["blue", "orange", "red"] },
  { stage: 20, colors: ["purple", "yellow", "pink", "green"] }
];

  // Use stage 1 for now; you can change stage = 1..5 to test
  const testLevel = testLevels[stage - 1];

  stage = testLevel.stage;

  // Create slimes using formulas
  slimes = [];
  testLevel.colors.forEach((color, index) => {
    const colorIndex = COLORS.indexOf(color);
    const x = 200 + index * 120;
    const y = canvas.height - BLOCK - 15;
    const health = 50 * stage * Math.pow(2, colorIndex);
    const damage = 10 * stage * Math.pow(2, colorIndex);
    const defense = stage < 11 ? 0 : Math.floor(Math.pow(2*stage - 20, 1.2) * Math.pow(1.5, colorIndex));
    const xp = Math.floor(4 * stage * Math.pow(2.5, colorIndex));

    slimes.push({
      x: x,
      originalX: x,
      y: y,
      size: 15,
      color: color,
      dir: 1,
      health: health,
      maxHealth: health,
      damage: damage,
      defense: defense,
      xp: xp
    });
  });

  // --- Setup spikes ---
  spikes = [
    { x: 150, y: canvas.height - BLOCK - 10, width: BLOCK, height: 10 },
    { x: 350, y: canvas.height - BLOCK - 10, width: BLOCK, height: 10 }
  ];

  // --- Setup door ---
  door.x = canvas.width - 50;
  door.width = 20;
  door.height = 40;
  door.y = canvas.height - BLOCK - door.height;

  fireballs = [];
  statSetup.style.display = "none";
  canvas.style.display = "block";
  gameRunning = true;
  lastSpikeDamage = Date.now();
  lastSlimeHitTime = 0;
  updateControlUIVisibility();
  requestAnimationFrame(update);
});

// ==================== FIREBALL ====================
function shootFireball() {
  const startX = player.x + player.width/2;
  const startY = player.y + player.height/2;
  const dx = mouse.x - startX;
  const dy = mouse.y - startY;
  const dist = Math.hypot(dx, dy);
  if (dist===0) return;
  fireballs.push({x:startX,y:startY,vx:dx/dist*6,vy:dy/dist*6,traveled:0,maxDistance:player.fireballRange,radius:4});
}

// ==================== HELPER ====================
function rectOverlap(a,b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function spikeDamageForStage(stageNum){
  return Math.floor(Math.pow(stageNum, Math.pow(1.008, stageNum)));
}

// ==================== GAME LOOP ====================
function update() {
  if(!gameRunning) return;
  const now = Date.now();

  // --- SIDE SCROLLING CAMERA ---
  cameraX = Math.max(0, player.x - canvas.width/3);

  ctx.setTransform(1,0,0,1,-cameraX,0);
  ctx.clearRect(cameraX,0,canvas.width,canvas.height);

  // --- PLAYER MOVEMENT ---
  if(keys["ArrowLeft"]) player.x -= player.speed;
  if(keys["ArrowRight"]) player.x += player.speed;
  if((keys["Space"]||keys["ArrowUp"]) && player.grounded){
    player.dy = -Math.sqrt(2*gravity*player.jumpHeight);
    player.grounded=false;
  }
  document.addEventListener("keydown", e => {
    keys[e.code] = true;
  
    // Only allow one fireball per F press
    if (e.code === "KeyF" && !fireKeyPressed) {
      shootFireball();
      fireKeyPressed = true;
    }
  });
  
  document.addEventListener("keyup", e => {
    keys[e.code] = false;
  
    // Reset the fire key flag when F is released
    if (e.code === "KeyF") {
      fireKeyPressed = false;
    }
  });  

  // --- GRAVITY ---
  player.dy += gravity;
  player.y += player.dy;
  const groundY = canvas.height - BLOCK;
  if(player.y + player.height >= groundY){
    player.y = groundY - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  // --- DRAW GROUND ---
  ctx.fillStyle="green";
  ctx.fillRect(0,groundY,canvas.width*2,BLOCK);

  // --- SPIKES ---
  spikes.forEach(spike=>{
    const spikeCount=4;
    const triangleWidth=spike.width/spikeCount;
    ctx.fillStyle="gray";
    for(let i=0;i<spikeCount;i++){
      ctx.beginPath();
      ctx.moveTo(spike.x+i*triangleWidth,spike.y+spike.height);
      ctx.lineTo(spike.x+i*triangleWidth+triangleWidth/2,spike.y);
      ctx.lineTo(spike.x+(i+1)*triangleWidth,spike.y+spike.height);
      ctx.closePath();
      ctx.fill();
    }
    const playerRect={x:player.x,y:player.y,width:player.width,height:player.height};
    const spikeRect={x:spike.x,y:spike.y,width:spike.width,height:spike.height};
    if(rectOverlap(playerRect,spikeRect)){
      if(now - lastSpikeDamage > SPIKE_DAMAGE_INTERVAL){
        player.health -= spikeDamageForStage(stage);
        if(player.health<0) player.health=0;
        player.hitTime=now;
        lastSpikeDamage=now;
        if(player.health<=0) returnToLevelSelect();
      }
    }
  });

  // --- SLIMES ---
  slimes.forEach((slime,idx)=>{
    const range = 4*BLOCK;
    slime.x += 0.33*slime.dir;
    if(slime.x>slime.originalX+range) slime.dir=-1;
    if(slime.x<slime.originalX-range) slime.dir=1;

    // Rounded cube
    ctx.fillStyle=slime.color;
    const r=4;
    ctx.beginPath();
    ctx.moveTo(slime.x+r,slime.y);
    ctx.lineTo(slime.x+slime.size-r,slime.y);
    ctx.quadraticCurveTo(slime.x+slime.size,slime.y,slime.x+slime.size,slime.y+r);
    ctx.lineTo(slime.x+slime.size,slime.y+slime.size-r);
    ctx.quadraticCurveTo(slime.x+slime.size,slime.y+slime.size,slime.x+slime.size-r,slime.y+slime.size);
    ctx.lineTo(slime.x+r,slime.y+slime.size);
    ctx.quadraticCurveTo(slime.x,slime.y+slime.size,slime.x,slime.y+slime.size-r);
    ctx.lineTo(slime.x,slime.y+r);
    ctx.quadraticCurveTo(slime.x,slime.y,slime.x+r,slime.y);
    ctx.fill();

    // Player collision
    const playerRect={x:player.x,y:player.y,width:player.width,height:player.height};
    const slimeRect={x:slime.x,y:slime.y,width:slime.size,height:slime.size};
    if(rectOverlap(playerRect,slimeRect) && !player.immune){
        let dmg = slime.damage - player.defense;
        if(dmg < 0) dmg = 0;
      player.health -= dmg;
      if(player.health<0) player.health=0;
      player.hitTime=now;
      if(player.x<slime.x) player.x-=2*BLOCK; else player.x+=2*BLOCK;
      player.immune=true;
      lastSlimeHitTime=now;
      if(player.health<=0) returnToLevelSelect();
    }

// Fireball collision
fireballs.forEach((f,i)=>{
  if(f.x > slime.x && f.x < slime.x + slime.size &&
     f.y > slime.y && f.y < slime.y + slime.size){
       
    // Calculate damage after defense
    let dmg = player.damage - slime.defense;
    if(dmg < 0) dmg = 0; // prevent negative damage

    slime.health -= dmg;

    if(slime.health < 0) slime.health = 0;
    if(slime.health === 0){
      slimesDefeated++;
      totalXP += slime.xp;
    }

    // Remove the fireball
    fireballs.splice(i,1);
  }
});

    if(slime.health<=0) slimes.splice(idx,1);
  });

  if(player.immune && now - lastSlimeHitTime>IMMUNITY_DURATION) player.immune=false;

  // --- FIREBALLS ---
  ctx.fillStyle="orange";
  fireballs.forEach((f,i)=>{
    f.x+=f.vx; f.y+=f.vy;
    f.traveled+=Math.hypot(f.vx,f.vy);
    ctx.beginPath(); ctx.arc(f.x,f.y,f.radius,0,Math.PI*2); ctx.fill();
    if(f.traveled>f.maxDistance) fireballs.splice(i,1);
  });

  // --- PLAYER DRAW ---
  ctx.fillStyle=player.color;
  ctx.fillRect(player.x,player.y,player.width,player.height);
  const elapsed=now-player.hitTime;
  if(elapsed<FLASH_DURATION){
    const flashAlpha = 1-elapsed/FLASH_DURATION;
    ctx.fillStyle=`rgba(255,0,0,${flashAlpha})`;
    ctx.fillRect(player.x,player.y,player.width,player.height);
  }

// --- HEALTH BAR ---
const barWidth = 200;
const barHeight = 18;
const barX = cameraX + 10;
const barY = 10;

ctx.fillStyle = "black";
ctx.fillRect(barX, barY, barWidth, barHeight);

ctx.fillStyle = "#3fbf3f";
ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);

ctx.strokeStyle = "white";
ctx.strokeRect(barX, barY, barWidth, barHeight);

// Ensure left-aligned text
ctx.fillStyle = "black";
ctx.font = "14px Arial";
ctx.textAlign = "left"; // <-- add this line
ctx.fillText(`${Math.round(player.health)} / ${Math.round(player.maxHealth)}`, barX + 5, barY + barHeight - 3);

// --- PROGRESS BAR (TOP-RIGHT, HEALTH BAR STYLE) ---
const progressBarWidth = 200;
const progressBarHeight = 18;
const progressBarX = cameraX + canvas.width - progressBarWidth - 10; // 10px from right
const progressBarY = 10; // same y as health bar

// Update farthest distance
if (player.x > maxPlayerX) maxPlayerX = player.x;

// Calculate progress (0 to 1) based on farthest distance to door
const progress = Math.min(maxPlayerX / (door.x - PLAYER_SIZE), 1);

// Draw background (black)
ctx.fillStyle = "black";
ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

// Draw fill (player color)
ctx.fillStyle = player.color;
ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);

// Draw border (light gray)
ctx.strokeStyle = "lightgray";
ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

// Draw percentage text to the LEFT of the bar
ctx.fillStyle = "black";
ctx.font = "14px Arial";
ctx.textAlign = "right";
ctx.fillText(Math.round(progress * 100) + "%", progressBarX - 5, progressBarY + progressBarHeight - 3);

// --- HELPER FUNCTION FOR ROUNDED RECTANGLES ---
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === "undefined") radius = 5;
  if (typeof radius === "number") radius = {tl: radius, tr: radius, br: radius, bl: radius};
  else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) radius[side] = radius[side] || defaultRadius[side];
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

  // --- DOOR WITH DOORBELL ---
  ctx.fillStyle="brown";
  ctx.fillRect(door.x,door.y,door.width,door.height);
  ctx.fillStyle="yellow";
  ctx.beginPath();
  ctx.arc(door.x+door.width-5,door.y+door.height/2,3,0,Math.PI*2);
  ctx.fill();
  const doorRect={x:door.x,y:door.y,width:door.width,height:door.height};
  if(rectOverlap({x:player.x,y:player.y,width:player.width,height:player.height},doorRect)){
    ctx.fillStyle="black";
    ctx.font="12px Arial";
    ctx.fillText("Press X to exit",door.x-10,door.y-5);
    if(keys["KeyX"]) showCongrats();
  }

// --- SLIME INFO PANEL ---
if (selectedSlime) {
  const panelWidth = 210;
  const panelHeight = 140; // slightly taller for even top/bottom margins
  const panelPadding = 10;
  
  // Position panel below the progress bar
  const panelX = cameraX + canvas.width - panelWidth;
  const panelY = 10 + 18 + 10; // 10px top margin + 18px health bar height + 10px spacing

  // Draw panel background
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  // Draw text inside panel
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "right";       // right-aligned
  ctx.textBaseline = "top";      // start at top of text

  const textX = panelX + panelWidth - panelPadding; // right edge minus padding

  // Vertical centering: evenly spaced top/bottom margins
  const lines = [
    `${selectedSlime.color.charAt(0).toUpperCase() + selectedSlime.color.slice(1)} Slime (Stage ${stage})`,
    `Health: ${Math.round(selectedSlime.health)} / ${Math.round(selectedSlime.maxHealth)}`,
    `Damage: ${Math.round(selectedSlime.damage)}`,
    `Defense: ${Math.round(selectedSlime.defense)}`,
    `XP Reward: ${selectedSlime.xp}`
  ];
  const lineHeight = 20;
  const totalTextHeight = lines.length * lineHeight;
  let textY = panelY + (panelHeight - totalTextHeight) / 2; // center vertically

  lines.forEach(line => {
    ctx.fillText(line, textX, textY);
    textY += lineHeight;
  });

  // Reset text alignment to avoid affecting other UI elements
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

  requestAnimationFrame(update);
}

// ==================== RETURN TO LEVEL SELECT ====================
function returnToLevelSelect(){
  gameRunning=false;
  canvas.style.display="none";
  levelSelect.style.display="block";
  controlPanel.style.display = "none";

}

// ==================== SHOW CONGRATS SCREEN ====================
function showCongrats(){
  gameRunning=false;
  canvas.style.display="none";
  congratsScreen.style.display="flex";

  const timeTaken = ((Date.now()-startTime)/1000).toFixed(2);
  const xpStage = Math.floor(5*stage*Math.pow(stage,1.4));
  const xpFromSlimes = totalXP;

  congratsContent.innerHTML=`
    <h2>Congratulations!</h2>
    <p>Time Taken: ${timeTaken} s</p>
    <p>Slimes Defeated: ${slimesDefeated}</p>
    <p>XP from Slimes: ${xpFromSlimes}</p>
    <p>XP from Level: ${xpStage}</p>
    <p>Total XP: ${xpFromSlimes + xpStage}</p>
  `;
}

// ==================== BACK TO LEVEL SELECT ====================
backToLevelsBtn.addEventListener("click", ()=>{
  congratsScreen.style.display="none";
  levelSelect.style.display="block";
});