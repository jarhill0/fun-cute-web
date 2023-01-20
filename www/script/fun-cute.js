let canvas;
let ctx;
let documentLog;

let gotMotionPermission = 'function' !== typeof DeviceMotionEvent.requestPermission;

const USE_LOG = false;

function init() {
  canvas = document.getElementById('fun-cute');
  ctx = canvas.getContext("2d");
  documentLog = document.getElementById('log')
  if (!USE_LOG) {
    documentLog.remove();
  }

  window.onresize = resizeCanvas;
  resizeCanvas();

  registerMouseHandlers();
}

function resizeCanvas() {
  const currentContents = exportCanvas();
  const image = new Image();
  image.src = currentContents;

  image.onload = () => {
    const dimensions = canvasDimensions();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    // setting width and height clears the canvas
    // we must only resize it when we are ready to draw our image; otherwise we get flicker

    ctx.drawImage(image, 0, 0);
  }
}

function canvasDimensions() {
  const root = document.documentElement;
  return {width: root.clientWidth, height: root.clientHeight}
}

function registerMouseHandlers() {
  // Computers with mouse/trackpad give us mouse events
  canvas.onmousedown = handleMouseEvent;
  canvas.onmousemove = handleMouseEvent;
  canvas.onmouseup = handleMouseEvent;

  // Touchscreen devices give us touch events
  canvas.ontouchstart = handleTouchEvent;
  canvas.ontouchmove = handleTouchEvent;
  canvas.ontouchend = handleTouchEvent;
  canvas.ontouchcancel = handleTouchEvent;

  if (!gotMotionPermission) {
    canvas.onclick = handleClick;
  }
}


function logEvent(e) {
  log(formatEvent(e));
}

function log(s) {
  if (!USE_LOG) {
    return;
  }

  console.log(s);
  documentLog.innerText += s + "\n";
  documentLog.scrollTop = documentLog.scrollHeight;
}

function formatEvent(e) {
  if (e.type.startsWith('mouse')) {
    return `${e.type} {click: ${e.buttons & 1}, x: ${e.clientX}, y: ${e.clientY}}`;
  } else if (e.type.startsWith('touch')) {
    return `${e.type} {changedTouches: ${formatTouches(e.changedTouches)}}`;
  } else {
    return e.type;
  }
}

function formatTouches(touches) {
  const strings = [];

  for (let i = 0; i < touches.length; i++) {
    const t = touches.item(i);
    strings.push(`{id: ${t.identifier}, x: ${t.clientX}, y: ${t.clientY}, radiusX: ${t.radiusX}, radiusY: ${t.radiusY}, rotationAngle: ${t.rotationAngle}, force: ${t.force}}`)
  }

  return `[${strings.join(', ')}]`;
}

const mousePosition = {x: null, y: null, color: null, radius: 4}

function handleMouseEvent(e) {
  e.preventDefault(); // just in case

  if (e.type === 'mousedown') {
    if (!(e.buttons & 1)) return // require primary button pressed

    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
    mousePosition.color = randomColor();
  } else if (e.type === 'mousemove') {
    if (!(e.buttons & 1)) return // require primary button pressed

    mousePosition.oldX = mousePosition.x;
    mousePosition.oldY = mousePosition.y;
    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
  } else if (e.type === 'mouseup') {
    mousePosition.x = null;
    mousePosition.y = null;
    mousePosition.oldX = null;
    mousePosition.oldY = null;
    mousePosition.color = null;

    if (randomInt(8) === 3) {
      dripCanvas();
    }
  }

  mouseDraw();
}

function mouseDraw() {
  if (mousePosition.x !== null && mousePosition.y !== null) {
    drawAt(mousePosition);
  }
}

function touchDraw() {
  for (let touch of Object.values(activeTouches)) {
    drawAt(touch);
  }
}

const activeTouches = {};

function handleTouchEvent(e) {
  if (gotMotionPermission) {
    e.preventDefault(); // blocks touch events from becoming mouse events
  }

  if (e.type === 'touchstart') {
    eachTouch(e.changedTouches, (t) => {
      activeTouches[t.identifier] = {
        // iPhone/iPad gives radiusX and radiusY for initial touch, always equal, with rotationAngle 0 and force 0
        // iPad with Apple Pencil instead gives radius and angle 0 but accurate force (from 0.0 to 1.0)
        x: t.clientX, y: t.clientY, radius: t.radiusX || t.radiusY || radiusFromForce(t.force), color: randomColor(),
      }
    });
  } else if (e.type === 'touchmove') {
    eachTouch(e.changedTouches, (t) => {
      const touch = activeTouches[t.identifier];
      touch.oldX = touch.x;
      touch.oldY = touch.y;

      touch.x = t.clientX;
      touch.y = t.clientY;
      touch.radius = t.radiusX || t.radiusY || radiusFromForce(t.force);
    });
  } else if (e.type === 'touchend' || e.type === 'touchcancel') {
    eachTouch(e.changedTouches, (t) => {
      delete activeTouches[t.identifier];
    });
  }

  touchDraw();
}

function eachTouch(touches, action) {
  for (let i = 0; i < touches.length; i++) {
    action(touches.item(i));
  }
}


function handleClick(e) {
  if (!gotMotionPermission) {
    DeviceMotionEvent.requestPermission().then(permissionState => {
      if (permissionState === 'granted') {
        window.ondevicemotion = handleMotionEvent;
        gotMotionPermission = true;
        canvas.onclick = null;
      }
    })
      .catch(log);
  }
}

function drawAt(opts) {
  ctx.beginPath();
  ctx.ellipse(opts.x, opts.y, opts.radius, opts.radius, 0, 0, 2 * Math.PI);
  ctx.fillStyle = opts.color;
  ctx.fill();

  if (opts.oldX && opts.oldY) {
    ctx.beginPath();
    ctx.moveTo(opts.oldX, opts.oldY);
    ctx.lineTo(opts.x, opts.y);
    ctx.lineWidth = 2 * opts.radius;
    ctx.strokeStyle = opts.color;
    ctx.stroke();
  }
}


let ignoreShake = false;

function handleMotionEvent(e) {
  const absAcceleration = Object.values(e.acceleration).map(Math.abs);
  if (Math.max(...absAcceleration) > 14) {
    if (!ignoreShake) {
      ignoreShake = true;
      setTimeout(() => {
        ignoreShake = false;
      }, 1000);

      dripCanvas();
    }
  }
}

function dripCanvas() {
  log('dripping canvas')
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  drip(image);
  ctx.putImageData(image, 0, 0);
  log('dripped')
}

const R = 0;
const G = 1;
const B = 2;
const A = 3;

function drip(image) {
  const arr = image.data;

  const ind = (x, y, channel) => ((y * 4 * image.width) + x * 4 + channel);

  function shiftColumn(x, amount) {
    console.log(x, amount);

    for (let y = image.height - 1; y >= 0; y--) {
      copyPixel(x, y - amount, x, y);
    }
  }

  function copyPixel(fromX, fromY, toX, toY) {
    arr[ind(toX, toY, R)] = arr[ind(fromX, fromY, R)];
    arr[ind(toX, toY, G)] = arr[ind(fromX, fromY, G)];
    arr[ind(toX, toY, B)] = arr[ind(fromX, fromY, B)];
    arr[ind(toX, toY, A)] = arr[ind(fromX, fromY, A)];
  }

  const shiftFunc = randomSineFunc();

  for (let x = 0; x < image.width; x++) {
    shiftColumn(x, shiftFunc(x))
  }
}

function randomSineFunc() {
  // should always be non-negative
  const phase = randomInt(153);
  const amplitude = 30 + randomInt(40);
  const period = 50 + randomInt(400);

  return (x) => (Math.floor(amplitude + amplitude * (Math.sin(((x + phase) / period) * 2 * Math.PI))));
}

function randomInt(max) {
  // max is excluded
  return Math.floor(Math.random() * max);
}

function randomColor() {
  const r = randomInt(256);
  const g = randomInt(256);
  const b = randomInt(256);

  return `rgb(${r}, ${g}, ${b})`
}

function radiusFromForce(force) {
  return 10 * Math.sqrt(force);
}

function exportCanvas() {
  return canvas.toDataURL('image/png');
}

window.onload = init;