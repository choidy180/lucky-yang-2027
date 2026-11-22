// Small raster illustrations drawn on an integer grid to keep the pixel edges sharp.
// Logical sizes: landscape 336×272, lucky bag 84×88.

export const SCENE_SIZE = { width: 336, height: 272 } as const;
export const BAG_SIZE = { width: 84, height: 88 } as const;

type Ctx = CanvasRenderingContext2D;
type Point = readonly [number, number];

const rect = (c: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

function disc(c: Ctx, x: number, y: number, r: number, color: string) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(c, x - dx, y + dy, 2 * dx + 1, 1, color);
  }
}

function polygon(c: Ctx, points: readonly Point[], color: string) {
  const ys = points.map((p) => p[1]);
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    const hits: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        hits.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const left = Math.ceil(hits[i]!);
      rect(c, left, y, Math.floor(hits[i + 1]!) - left + 1, 1, color);
    }
  }
}

function steppedCloud(c: Ctx, x: number, y: number, size: number) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  const outline: Point[] = [
    [0, 9], [5, 9], [5, 6], [11, 6], [11, 3], [17, 3], [17, 0], [26, 0], [26, 3], [31, 3], [31, 5],
    [36, 5], [36, 8], [42, 8], [42, 11], [47, 11], [47, 13], [0, 13],
  ];
  polygon(c, outline, "#fdf4dc");
  rect(c, 2, 13, 41, 2, "#f4dfbe");
  rect(c, 9, 15, 21, 1, "#b9ccc0");
  c.restore();
}

function hills(c: Ctx, points: readonly Point[], fill: string, ridge: string) {
  polygon(c, [...points, [336, 272], [0, 272]], fill);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    for (let x = a[0]; x < b[0]; x += 2) {
      const y = Math.round((a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])) / 2) * 2;
      rect(c, x, y, 2, 2, ridge);
    }
  }
}

function pine(c: Ctx, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  rect(c, -1, -5, 3, 6, "#635943");
  polygon(c, [[-7, -4], [0, -14], [7, -4]], "#597962");
  polygon(c, [[-6, -8], [0, -17], [6, -8]], "#648970");
  polygon(c, [[-4, -12], [0, -20], [4, -12]], "#769b7a");
  c.restore();
}

function sprig(c: Ctx, x: number, y: number, n: number) {
  rect(c, x, y, 1, 4, "#77936a");
  rect(c, x - 2, y + 1, 2, 1, "#79956f");
  rect(c, x + 1, y, 2, 1, "#79956f");
  if (n % 4 === 0) {
    rect(c, x - 1, y - 2, 3, 2, "#fff1b9");
    rect(c, x, y - 3, 1, 4, "#e6bd69");
  }
}

/** Sky, clouds, a low sun, layered green hills, pines and field sprigs on a 336×272 grid. */
export function drawScene(canvas: HTMLCanvasElement): void {
  const c = canvas.getContext("2d");
  if (!c) return;
  c.imageSmoothingEnabled = false;
  rect(c, 0, 0, 336, 272, "#c8e3df");
  rect(c, 0, 91, 336, 24, "#d6e6d8");
  rect(c, 0, 115, 336, 28, "#e1e8cc");
  rect(c, 0, 143, 336, 30, "#efe8c8");
  disc(c, 247, 71, 26, "#f3c397");
  disc(c, 247, 69, 24, "#ffdbab");
  for (let row = 0; row < 3; row++) rect(c, 222, 79 + row * 4, 50, 1, "#f6d1a4");
  steppedCloud(c, 31, 47, 1);
  steppedCloud(c, 94, 30, 1);
  steppedCloud(c, 276, 48, 1);
  steppedCloud(c, 198, 97, 1);
  for (const [x, y] of [[15, 77], [145, 60], [302, 25], [184, 32]] as const) {
    rect(c, x - 3, y, 7, 1, "#fff6d9");
    rect(c, x, y - 3, 1, 7, "#fff6d9");
  }
  hills(c, [[0, 155], [20, 148], [50, 138], [75, 142], [115, 124], [146, 132], [177, 140], [204, 125], [239, 116], [266, 129], [294, 116], [336, 107]], "#a6c8b2", "#c0d7bd");
  hills(c, [[0, 150], [28, 142], [54, 149], [86, 163], [127, 154], [167, 151], [201, 169], [226, 162], [262, 153], [287, 143], [315, 144], [336, 138]], "#86ad94", "#a6c3a5");
  hills(c, [[0, 173], [38, 169], [66, 177], [106, 174], [137, 181], [178, 169], [211, 176], [247, 178], [282, 167], [323, 160], [336, 164]], "#acc79a", "#bfd3a2");
  for (const [x, y, s] of [[6, 175, 1], [18, 171, 1], [291, 170, 1], [319, 166, 2], [333, 165, 1], [37, 172, 1]] as const) {
    pine(c, x, y, s);
  }
  hills(c, [[0, 195], [37, 187], [73, 189], [108, 197], [153, 201], [194, 199], [230, 196], [276, 190], [311, 188], [336, 181]], "#c3d39e", "#dbe3b0");
  hills(c, [[0, 226], [40, 222], [80, 219], [119, 221], [168, 225], [207, 224], [258, 217], [303, 215], [336, 212]], "#b3c890", "#c9d6a5");
  for (let i = 0; i < 56; i++) {
    const x = (i * 73 + 13) % 334;
    const y = 193 + ((i * 37) % 71);
    if (i % 3 === 0) rect(c, x, y, 2 + (i % 5), 1, "#9eb782");
    else sprig(c, x, y, i);
  }
}

/** Red lucky bag with a gold knot and the embroidered 복 on an 84×88 grid. */
export function drawBag(canvas: HTMLCanvasElement): void {
  const c = canvas.getContext("2d");
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 84, 88);
  const outer = "#6f3434";
  const mid = "#cd5145";
  const light = "#e76b50";
  const gold = "#f0ba61";
  polygon(c, [[22, 5], [29, 8], [36, 4], [44, 8], [54, 4], [62, 8], [60, 16], [53, 23], [53, 28], [63, 34], [72, 45], [77, 56], [76, 67], [71, 76], [63, 81], [52, 84], [30, 84], [18, 81], [10, 75], [6, 67], [5, 56], [10, 43], [18, 34], [27, 28], [28, 23], [23, 18]], outer);
  polygon(c, [[25, 9], [30, 12], [36, 8], [44, 12], [54, 8], [58, 10], [52, 20], [31, 21]], "#e47c55");
  polygon(c, [[29, 10], [36, 9], [35, 20], [32, 20]], "#b2433a");
  polygon(c, [[44, 12], [53, 9], [48, 21], [44, 21]], "#ad4039");
  polygon(c, [[30, 28], [51, 27], [61, 35], [70, 46], [74, 57], [72, 67], [66, 74], [57, 79], [30, 81], [19, 77], [11, 69], [9, 57], [13, 46], [21, 36]], mid);
  polygon(c, [[29, 30], [35, 31], [22, 43], [15, 55], [15, 66], [11, 61], [14, 46], [21, 36]], light);
  polygon(c, [[58, 36], [69, 47], [73, 57], [71, 68], [64, 75], [54, 79], [39, 80], [55, 74], [64, 67], [67, 56]], "#ae3e3a");
  rect(c, 27, 21, 28, 6, outer);
  rect(c, 26, 21, 29, 3, gold);
  rect(c, 29, 25, 25, 2, "#dda24d");
  polygon(c, [[51, 24], [55, 21], [63, 20], [66, 23], [65, 27], [57, 29], [55, 27], [62, 25], [63, 23], [57, 23]], "#f3bf65");
  polygon(c, [[54, 25], [59, 27], [65, 34], [67, 42], [65, 43], [61, 34], [53, 28]], "#f4c56f");
  rect(c, 64, 40, 5, 5, gold);
  rect(c, 63, 45, 7, 4, "#e4a544");
  polygon(c, [[40, 37], [57, 54], [40, 71], [23, 54]], "#973c35");
  polygon(c, [[40, 39], [55, 54], [40, 69], [25, 54]], "#efbb6b");
  polygon(c, [[40, 41], [53, 54], [40, 67], [27, 54]], "#f6d29b");
  c.font = 'bold 17px Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#9e302d";
  c.fillText("복", 40, 55);
}
