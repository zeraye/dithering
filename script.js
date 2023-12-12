const inCtx = document.getElementById("original-canvas").getContext("2d");
const outCtx = document.getElementById("transformed-canvas").getContext("2d");

const imageInput = document.getElementById("file");
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    loadImage(reader.result);
  });
  reader.readAsDataURL(file);
});

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

const ditheringMatrixSize = (n) => {
  const possibleSizes = [];
  let a = 2;
  let b = 3;
  for (let i = 0; i < n; ++i) {
    possibleSizes.push(a);
    possibleSizes.push(b);
    if (a > n) break;
    a *= 2;
    b *= 2;
  }
  possibleSizes.sort((a, b) => a - b);
  for (let i = 0; i < possibleSizes.length; ++i) {
    if (possibleSizes[i] >= n) {
      return possibleSizes[i];
    }
  }
  throw new Error("Error in ditheringMatrixSize for argument", n);
};

const D2 = [
  [0, 2],
  [3, 1],
];

const D3 = [
  [6, 8, 4],
  [1, 0, 3],
  [5, 2, 7],
];

const buildUMatrix = (n) => {
  return Array(n)
    .fill(null)
    .map(() => Array(n).fill(1));
};

const factorMatrix = (factor, matrix0) => {
  const n = matrix0.length;

  let matrix = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i][j] = matrix0[i][j] * factor;
    }
  }

  return matrix;
};

const addMatrix = (matrix0, matrix1) => {
  const n = matrix0.length;

  let matrix = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i][j] = matrix0[i][j] + matrix1[i][j];
    }
  }

  return matrix;
};

const join4Matrix = (matrixLU, matrixRU, matrixLD, matrixRD) => {
  const n = matrixLU.length;

  let matrix = Array(n * 2)
    .fill(null)
    .map(() => Array(n * 2).fill(0));

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i][j] = matrixLU[i][j];
    }
  }

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i][j + n] = matrixRU[i][j];
    }
  }

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i + n][j] = matrixLD[i][j];
    }
  }

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      matrix[i + n][j + n] = matrixRD[i][j];
    }
  }

  return matrix;
};

const buildDitheringMatrix = (n) => {
  if (n == 2) return D2;
  if (n == 3) return D3;

  const D = buildDitheringMatrix(n / 2);
  const fD = factorMatrix(4, D);
  const U = buildUMatrix(n / 2);

  return join4Matrix(
    fD,
    addMatrix(fD, factorMatrix(2, U)),
    addMatrix(fD, factorMatrix(3, U)),
    addMatrix(fD, U)
  );
};

const orderedDitheringRelative = (data) => {
  const m = data.length;
  const width = inCtx.canvas.width;

  const cArray = ["red", "green", "blue"];
  const intervalsArray = cArray.map((c) => ditheringIntervals(c));

  const vArray = ["kr", "kg", "kb"];
  const kArray = vArray.map((v) => +document.getElementById(v).value);
  const nArray = kArray.map((k) =>
    ditheringMatrixSize(Math.floor(Math.sqrt(255 / (k - 1))))
  );
  const matrixArray = nArray.map((n) => buildDitheringMatrix(n));

  for (let i = 0; i < m; i += 4) {
    for (let j = 0; j < 3; ++j) {
      const n = nArray[j];
      const n2 = n * n;
      const Ii = data[i + j];
      let col = Math.floor(Ii / n2);
      const re = Ii % n2;
      const ii = Math.floor((i / 4) % width) % n;
      const jj = Math.floor(i / (4 * width)) % n;
      if (re > matrixArray[j][ii][jj]) col++;
      data[i + j] = intervalsArray[j][col];
    }
  }

  return data;
};

const orderedDitheringRandom = (data) => {
  const m = data.length;

  const cArray = ["red", "green", "blue"];
  const intervalsArray = cArray.map((c) => ditheringIntervals(c));

  const vArray = ["kr", "kg", "kb"];
  const kArray = vArray.map((v) => +document.getElementById(v).value);
  const nArray = kArray.map((k) =>
    ditheringMatrixSize(Math.floor(Math.sqrt(255 / (k - 1))))
  );
  const matrixArray = nArray.map((n) => buildDitheringMatrix(n));

  for (let i = 0; i < m; i += 4) {
    for (let j = 0; j < 3; ++j) {
      const n = nArray[j];
      const n2 = n * n;
      const Ii = data[i + j];
      let col = Math.floor(Ii / n2);
      const re = Ii % n2;
      const ii = Math.floor(Math.random() * n);
      const jj = Math.floor(Math.random() * n);
      if (re > matrixArray[j][ii][jj]) col++;
      data[i + j] = intervalsArray[j][col];
    }
  }

  return data;
};

const toHex = (c) => {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbEuclidDist = (rgb0, rgb1) => {
  return (
    (rgb0[0] - rgb1[0]) ** 2 +
    (rgb0[1] - rgb1[1]) ** 2 +
    (rgb0[2] - rgb1[2]) ** 2
  );
};

const popularityAlgorithm = (data) => {
  const n = data.length;
  let k = +document.getElementById("k").value;

  let colors = {};
  for (let i = 0; i < n; i += 4) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    if (!colors[key]) {
      colors[key] = 1;
    } else {
      colors[key]++;
    }
  }

  k = Math.min(Object.keys(colors).length, k);

  const sortedKeys = Object.keys(colors)
    .sort((a, b) => {
      return colors[b] - colors[a];
    })
    .slice(0, k);

  let popularityAlgorithmCache = {};
  for (let i = 0; i < n; i += 4) {
    const currrgb = data.slice(i, i + 3);
    let bestrgb = sortedKeys[0].split(",");
    let bestdist = rgbEuclidDist(currrgb, bestrgb);

    if (currrgb.toString() in popularityAlgorithmCache) {
      bestrgb = popularityAlgorithmCache[currrgb.toString()];
    } else {
      for (let j = 1; j < k; ++j) {
        const keyrgb = sortedKeys[j].split(",");
        const currdist = rgbEuclidDist(currrgb, keyrgb);

        if (currdist < bestdist) {
          bestdist = currdist;
          bestrgb = keyrgb;
        }
      }
      popularityAlgorithmCache[currrgb.toString()] = bestrgb;
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
