const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gravity = 0.5;

const player = {
  x: 50,
  y: 0,
  width: 30,
  height: 30,
  dy: 0,
  jumpPower: -10,
  grounded: false
};

const ground = {
  x: 0,
  y: 270,
  width: canvas.width,
  height: 30
};

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply gravity
  player.dy += gravity;
  player.y += player.dy;

  // Ground collision
  if (
    player.y + player.height >= ground.y
  ) {
    player.y = ground.y - player.height;
    player.dy = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  // Draw ground
  ctx.fillStyle = "green";
  ctx.fillRect(ground.x, ground.y, ground.width, ground.height);

  // Draw player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  requestAnimationFrame(update);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && player.grounded) {
    player.dy = player.jumpPower;
  }
});

update();
