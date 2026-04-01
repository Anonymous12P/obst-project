const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate-obst", (req, res) => {
  const { keys, freq } = req.body;

  if (!Array.isArray(keys) || !Array.isArray(freq) || keys.length !== freq.length || keys.length === 0) {
    return res.status(400).json({ error: "Invalid input. Keys and frequencies must be equal-length arrays." });
  }

  const exePath = process.platform === "win32"
    ? path.join(__dirname, "cpp", "obst.exe")
    : path.join(__dirname, "cpp", "obst");

  const cpp = spawn(exePath);

  let output = "";
  let errorOutput = "";

  cpp.stdout.on("data", (data) => {
    output += data.toString();
  });

  cpp.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  cpp.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: errorOutput || "C++ program failed" });
    }

    try {
      const result = JSON.parse(output);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Invalid JSON returned from C++", raw: output });
    }
  });

  const input = `${keys.length}\n${keys.join(" ")}\n${freq.join(" ")}\n`;
  cpp.stdin.write(input);
  cpp.stdin.end();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});