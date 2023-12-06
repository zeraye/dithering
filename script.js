const inCtx = document.getElementById("original-canvas").getContext("2d");
const outCtx = document.getElementById("transformed-canvas").getContext("2d");

const ditheringIntervals = (color) => {
  const k =
    color === "red"
      ? +document.getElementById("kr").value
      : color === "green"
      ? +document.getElementById("kg").value
      : +document.getElementById("kb").value;
  const stepDiff = 255 / (k - 1);
  let intervals = [];
  let currentStep = 0;
  for (let i = 0; i < k; ++i) {
    intervals.push(currentStep);
    currentStep += stepDiff;
  }
  return intervals;
};

const findInterval = (value, intervals, next = false) => {
  for (let i = 0; i < intervals.length - 1; ++i) {
    if (value < (intervals[i] + intervals[i + 1]) / 2) {
      if (next) return intervals[i + 1];
      return intervals[i];
    }
  }
  return intervals[intervals.length - 1];
};

const averageDithering = (data) => {
  const redIntervals = ditheringIntervals("red");
  const greenIntervals = ditheringIntervals("green");
  const blueIntervals = ditheringIntervals("blue");

  for (let i = 0; i < data.length; i += 4) {
    data[i] = findInterval(data[i], redIntervals);
    data[i + 1] = findInterval(data[i + 1], greenIntervals);
    data[i + 2] = findInterval(data[i + 2], blueIntervals);
  }

  return data;
};

const errorDiffusionDithering = (data) => {
  const redIntervals = ditheringIntervals("red");
  const greenIntervals = ditheringIntervals("green");
  const blueIntervals = ditheringIntervals("blue");
  const width = inCtx.canvas.width;

  for (let i = 0; i < data.length; i += 4) {
    const red = findInterval(data[i], redIntervals);
    const green = findInterval(data[i + 1], greenIntervals);
    const blue = findInterval(data[i + 2], blueIntervals);
    const rerr = data[i] - red;
    const gerr = data[i + 1] - green;
    const berr = data[i + 2] - blue;
    const err = [rerr, gerr, berr];
    data[i + 0] = red;
    data[i + 1] = green;
    data[i + 2] = blue;
    // Floyd and Steinberg Filter
    for (let j = 0; j < 3; ++j) {
      data[i + j + 4] += (err[j] * 7) / 16;
      data[i + j - 4 + 4 * width] += (err[j] * 3) / 16;
      data[i + j + 4 * width] += (err[j] * 5) / 16;
      data[i + j + 4 + 4 * width] += (err[j] * 1) / 16;
    }
  }

  return data;
};

const orderedDitheringRelative = (data) => {
  const redIntervals = ditheringIntervals("red");
  const greenIntervals = ditheringIntervals("green");
  const blueIntervals = ditheringIntervals("blue");
  const D3 = [
    [6, 8, 4],
    [1, 0, 3],
    [5, 2, 7],
  ];
  const n = 3;

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; ++j) {
      const intervals =
        j == 0 ? redIntervals : j == 1 ? greenIntervals : blueIntervals;
      let Ii = findInterval(data[i + j], intervals);
      const re = Ii % (n * n);
      const ii = Math.floor(i / inCtx.canvas.width) % n;
      const jj = Math.floor(i % inCtx.canvas.width) % n;
      if (re > D3[ii][jj]) Ii = findInterval(data[i + j], intervals, true);
      data[i + j] = Ii;
    }
  }
};

const orderedDitheringRandom = (data) => {
  const redIntervals = ditheringIntervals("red");
  const greenIntervals = ditheringIntervals("green");
  const blueIntervals = ditheringIntervals("blue");

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; ++j) {
      const intervals =
        j == 0 ? redIntervals : j == 1 ? greenIntervals : blueIntervals;
      let Ii = findInterval(data[i + j], intervals);
      if (Math.random() < 0.5) Ii = findInterval(data[i + j], intervals, true);
      data[i + j] = Ii;
    }
  }
};

const toHex = (c) => {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const dist = (rgb0, rgb1) => {
  return (
    (rgb0[0] - rgb1[0]) ** 2 +
    (rgb0[1] - rgb1[1]) ** 2 +
    (rgb0[2] - rgb1[2]) ** 2
  );
};

const popularityAlgorithm = (data) => {
  const n = data.length;
  const k = +document.getElementById("k").value;

  let colors = {};
  for (let i = 0; i < n; i += 4) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    if (!colors[key]) {
      colors[key] = 1;
    } else {
      colors[key]++;
    }
  }
  const sortedKeys = Object.keys(colors)
    .sort((a, b) => {
      return colors[b] - colors[a];
    })
    .slice(0, k);

  for (let i = 0; i < n; i += 4) {
    const currrgb = data.slice(i, i + 3);
    let bestrgb = sortedKeys[0].split(",");
    let bestdist = dist(currrgb, bestrgb);
    for (let j = 1; j < k; ++j) {
      const currdist = dist(currrgb, sortedKeys[j].split(","));
      if (currdist < bestdist) {
        bestdist = currdist;
        bestrgb = sortedKeys[j].split(",");
      }
    }
    data[i] = bestrgb[0];
    data[i + 1] = bestrgb[1];
    data[i + 2] = bestrgb[2];
  }
  return data;
};

const transformImage = () => {
  const start = Date.now();

  const imageData = inCtx.getImageData(
    0,
    0,
    inCtx.canvas.width,
    inCtx.canvas.height
  );

  let data = imageData.data;

  const algorithm = document.querySelector(
    'input[name="algorithms"]:checked'
  ).id;

  switch (algorithm) {
    case "avg-dith":
      data = averageDithering(data);
      break;
    case "err-diff-dith":
      data = errorDiffusionDithering(data);
      break;
    case "ord-dith-rel":
      data = orderedDitheringRelative(data);
      break;
    case "ord-dith-rand":
      data = orderedDitheringRandom(data);
      break;
    case "pop-alg":
      data = popularityAlgorithm(data);
      break;
    default:
      console.error("algorithm", algorithm, "not found");
  }

  outCtx.putImageData(imageData, 0, 0);

  document.getElementById("time").textContent = Date.now() - start;
};

const loadImage = (src) => {
  img = new Image();
  img.src = src;
  img.onload = () => {
    const scale = Math.max(
      inCtx.canvas.width / img.width,
      inCtx.canvas.height / img.height
    );
    const x = (inCtx.canvas.width - img.width * scale) / 2;
    const y = (inCtx.canvas.height - img.height * scale) / 2;
    inCtx.setTransform(scale, 0, 0, scale, x, y);
    inCtx.drawImage(img, 0, 0);
    transformImage();
  };
};

// load default image
loadImage("dog.jpg");

document.getElementById("refresh").addEventListener("click", transformImage);
