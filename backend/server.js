const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function normalizeInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((num) => !Number.isNaN(num));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((num) => !Number.isNaN(num));
  }

  return [];
}

function calculateNormalBSTCost(keys, frequencies) {
  if (keys.length === 0) {
    return 0;
  }

  const root = {
    key: keys[0],
    left: null,
    right: null,
  };
  let totalCost = frequencies[0];

  for (let i = 1; i < keys.length; i += 1) {
    let current = root;
    let depth = 1;

    while (true) {
      if (keys[i] < current.key) {
        if (!current.left) {
          current.left = { key: keys[i], left: null, right: null };
          totalCost += frequencies[i] * (depth + 1);
          break;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = { key: keys[i], left: null, right: null };
          totalCost += frequencies[i] * (depth + 1);
          break;
        }
        current = current.right;
      }

      depth += 1;
    }
  }

  return totalCost;
}

function buildOptimalOBST(keys, frequencies) {
  const n = keys.length;

  if (n === 0) {
    return {
      cost: 0,
      tree: null,
      dpTable: [],
      steps: [],
    };
  }

  const indexed = keys.map((key, index) => ({ key, freq: frequencies[index] }));
  indexed.sort((a, b) => a.key - b.key);

  const sortedKeys = indexed.map((item) => item.key);
  const sortedFreq = indexed.map((item) => item.freq);

  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  const rootIndices = Array.from({ length: n }, () => Array(n).fill(0));
  const prefixSum = Array(n + 1).fill(0);

  for (let i = 0; i < n; i += 1) {
    prefixSum[i + 1] = prefixSum[i] + sortedFreq[i];
    dp[i][i] = sortedFreq[i];
    rootIndices[i][i] = i;
  }

  const getFreqSum = (i, j) => prefixSum[j + 1] - prefixSum[i];
  const steps = [];

  for (let length = 2; length <= n; length += 1) {
    for (let i = 0; i <= n - length; i += 1) {
      const j = i + length - 1;
      dp[i][j] = Number.POSITIVE_INFINITY;
      const totalFreq = getFreqSum(i, j);
      let chosenRoot = i;

      for (let r = i; r <= j; r += 1) {
        const leftCost = r > i ? dp[i][r - 1] : 0;
        const rightCost = r < j ? dp[r + 1][j] : 0;
        const cost = leftCost + rightCost + totalFreq;

        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          chosenRoot = r;
        }
      }

      rootIndices[i][j] = chosenRoot;
      steps.push(
        `Optimal root for keys [${sortedKeys
          .slice(i, j + 1)
          .join(", ")}] is ${sortedKeys[chosenRoot]} with cost ${dp[i][j]}`
      );
    }
  }

  function buildTree(i, j) {
    if (i > j) {
      return null;
    }

    const r = rootIndices[i][j];
    const node = { name: `${sortedKeys[r]}` };
    const children = [];
    const leftChild = buildTree(i, r - 1);
    const rightChild = buildTree(r + 1, j);

    if (leftChild) {
      children.push(leftChild);
    }
    if (rightChild) {
      children.push(rightChild);
    }

    if (children.length > 0) {
      node.children = children;
    }

    return node;
  }

  const dpTable = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j < i ? "" : dp[i][j]))
  );

  return {
    cost: dp[0][n - 1],
    tree: buildTree(0, n - 1),
    dpTable,
    steps,
  };
}

app.post("/api/generate-obst", (req, res) => {
  try {
    const keys = normalizeInput(req.body.keys);
    const frequencies = normalizeInput(req.body.frequencies);

    if (keys.length === 0 || frequencies.length === 0) {
      return res.status(400).json({ error: "Missing keys or frequencies" });
    }

    if (keys.length !== frequencies.length) {
      return res
        .status(400)
        .json({ error: "Number of keys and frequencies must match" });
    }

    const indexed = keys.map((key, index) => ({ key, freq: frequencies[index] }));
    indexed.sort((a, b) => a.key - b.key);
    const sortedKeys = indexed.map((item) => item.key);
    const sortedFreq = indexed.map((item) => item.freq);

    const { cost, tree, dpTable, steps } = buildOptimalOBST(sortedKeys, sortedFreq);
    const normalCost = calculateNormalBSTCost(sortedKeys, sortedFreq);

    res.json({ cost, normalCost, tree, dpTable, steps });
  } catch (error) {
    console.error("Error generating OBST:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));