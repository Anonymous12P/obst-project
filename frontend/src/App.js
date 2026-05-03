import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Tree from "react-d3-tree";
import "./App.css";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://obst-project-backend.onrender.com";

function App() {
  const [keys, setKeys] = useState("");
  const [freq, setFreq] = useState("");
  const [searchSeq, setSearchSeq] = useState("");
  const [cost, setCost] = useState(null);
  const [normalCost, setNormalCost] = useState(null);
  const [dpTable, setDpTable] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchKey, setSearchKey] = useState("");
  const [searchPath, setSearchPath] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [executionTime, setExecutionTime] = useState(null);
  const [searchFound, setSearchFound] = useState(null);
  const [animatedPath, setAnimatedPath] = useState([]);
  const [treeTranslate, setTreeTranslate] = useState({ x: 640, y: 120 });

  const treeContainerRef = useRef(null);

  const generateRandomData = () => {
    const n = Math.floor(Math.random() * 3) + 10; // 10 to 12 values
    const randomKeys = [];
    const randomFreq = [];

    while (randomKeys.length < n) {
      const nextKey = Math.floor(Math.random() * 200) + 1;
      if (!randomKeys.includes(nextKey)) {
        randomKeys.push(nextKey);
      }
    }

    randomKeys.sort((a, b) => a - b);
    for (let i = 0; i < n; i += 1) {
      randomFreq.push(Math.floor(Math.random() * 50) + 1);
    }

    setKeys(randomKeys.join(","));
    setFreq(randomFreq.join(","));
    setError("");
    setSearchPath([]);
    setAnimatedPath([]);
    setSearchFound(null);
  };

  const generateFromFreq = async () => {
    try {
      setError("");
      setLoading(true);
      const start = performance.now();

      // Validate input
      if (!keys.trim() || !freq.trim()) {
        throw new Error("Please enter both keys and frequencies");
      }

      const keysArray = keys.split(",").map((x) => Number(x.trim()));
      const freqArray = freq.split(",").map((x) => Number(x.trim()));

      if (keysArray.length !== freqArray.length) {
        throw new Error("Number of keys and frequencies must match");
      }

      if (keysArray.some(isNaN) || freqArray.some(isNaN)) {
        throw new Error("Invalid input: ensure all values are numbers");
      }

     const res = await axios.post(`${API}/api/generate-obst`, {
  keys: keysArray.join(","),        // FIX
  frequencies: freqArray.join(","), // FIX
});

      const end = performance.now();

      setCost(res.data.cost);
      setNormalCost(res.data.normalCost);
      setDpTable(res.data.dpTable || []);
      setTreeData(res.data.tree || null);
      setSteps(res.data.steps || []);
      setExecutionTime((end - start).toFixed(2));
      setSearchPath([]);
      setAnimatedPath([]);
      setSearchFound(null);
      setActiveTab("tree");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to generate OBST"
      );
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateFromSearch = async () => {
    try {
      setError("");
      setLoading(true);
      const start = performance.now();

      if (!searchSeq.trim()) {
        throw new Error("Please enter a search sequence");
      }

      const searches = searchSeq.split(",").map((x) => {
        const num = Number(x.trim());
        if (isNaN(num)) throw new Error("Invalid search sequence");
        return num;
      });

      const freqMap = {};
      searches.forEach((num) => {
        freqMap[num] = (freqMap[num] || 0) + 1;
      });

      const sortedKeys = Object.keys(freqMap)
        .map(Number)
        .sort((a, b) => a - b);
      const sortedFreq = sortedKeys.map((key) => freqMap[key]);

      setKeys(sortedKeys.join(","));
      setFreq(sortedFreq.join(","));

      const res = await axios.post(`${API}/api/generate-obst`, {
  keys: sortedKeys.join(","),        // ✅ correct
  frequencies: sortedFreq.join(","), // ✅ correct
});
      

      const end = performance.now();

      setCost(res.data.cost);
      setNormalCost(res.data.normalCost);
      setDpTable(res.data.dpTable || []);
      setTreeData(res.data.tree || null);
      setSteps(res.data.steps || []);
      setExecutionTime((end - start).toFixed(2));
      setSearchPath([]);
      setAnimatedPath([]);
      setSearchFound(null);
      setActiveTab("tree");
    } catch (err) {
      setError(err.message || "Invalid search sequence");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getNodeKey = (node) => Number(node.name.split(" ")[0]);

  const searchInTree = (node, target, path = []) => {
    if (!node) return { found: false, path };

    const currentKey = getNodeKey(node);
    const newPath = [...path, currentKey];

    if (currentKey === target) {
      return { found: true, path: newPath };
    }

    if (!node.children || node.children.length === 0) {
      return { found: false, path: newPath };
    }

    let leftChild = null;
    let rightChild = null;

    node.children.forEach((child) => {
      const childKey = getNodeKey(child);
      if (childKey < currentKey) leftChild = child;
      else if (childKey > currentKey) rightChild = child;
    });

    if (target < currentKey && leftChild) {
      return searchInTree(leftChild, target, newPath);
    } else if (target > currentKey && rightChild) {
      return searchInTree(rightChild, target, newPath);
    }

    return { found: false, path: newPath };
  };

  const simulateSearch = () => {
    if (!treeData || !searchKey) {
      setError("Please generate an OBST first and enter a search key");
      return;
    }

    const target = Number(searchKey);
    if (isNaN(target)) {
      setError("Invalid search key");
      return;
    }

    const result = searchInTree(treeData, target);

    setSearchPath(result.path);
    setSearchFound(result.found);
    setAnimatedPath([]);
    setActiveTab("tree");

    if (!result.found) {
      setError("Key not found in OBST");
    } else {
      setError("");
    }

    result.path.forEach((node, index) => {
      setTimeout(() => {
        setAnimatedPath((prev) => [...prev, node]);
      }, index * 600);
    });
  };

  const renderCustomNode = ({ nodeDatum }) => {
    const nodeKey = Number(nodeDatum.name.split(" ")[0]);

    let fillColor = "#111111";

    if (animatedPath.includes(nodeKey)) {
      fillColor = "#f97316";
    }

    if (searchFound && nodeKey === Number(searchKey)) {
      fillColor = "#991b1c";
    }

    return (
      <g>
        <circle
          r="26"
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth="3"
          style={{
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.15))",
            transition: "all 0.3s ease",
          }}
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="16"
          fontWeight="900"
          stroke="none"
        >
          {nodeKey}
        </text>
      </g>
    );
  };

  const savings =
    cost !== null && normalCost !== null ? normalCost - cost : null;

  const chartData = {
    labels: ["Optimal BST", "Normal BST"],
    datasets: [
      {
        label: "Cost Comparison",
        data: [cost || 0, normalCost || 0],
        backgroundColor: ["#ef4444", "#111111"],
        borderRadius: 12,
      },
    ],
  };

  useEffect(() => {
    const updateTranslate = () => {
      if (treeContainerRef.current) {
        const { width } = treeContainerRef.current.getBoundingClientRect();
        setTreeTranslate({ x: Math.max(width / 2, 260), y: 120 });
      }
    };

    updateTranslate();
    window.addEventListener("resize", updateTranslate);
    return () => window.removeEventListener("resize", updateTranslate);
  }, []);

  useEffect(() => {
    if (treeData && treeContainerRef.current) {
      const { width } = treeContainerRef.current.getBoundingClientRect();
      setTreeTranslate({ x: Math.max(width / 2, 260), y: 120 });
    }
  }, [treeData]);

  return (
    <div className="app">
      <div className="hero">
        <div className="hero-badge">Algorithm Visualizer</div>
        <h1>Optimal BST Visualizer</h1>
        <p>
          Build, analyze, compare and simulate Optimal Binary Search Trees with
          dynamic programming.
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "input" ? "active-tab" : ""}
          onClick={() => setActiveTab("input")}
        >
          Input
        </button>
        <button
          className={activeTab === "tree" ? "active-tab" : ""}
          onClick={() => setActiveTab("tree")}
        >
          Tree
        </button>
        <button
          className={activeTab === "analysis" ? "active-tab" : ""}
          onClick={() => setActiveTab("analysis")}
        >
          Analysis
        </button>
        <button
          className={activeTab === "dp" ? "active-tab" : ""}
          onClick={() => setActiveTab("dp")}
        >
          DP Table
        </button>
        <button
          className={activeTab === "steps" ? "active-tab" : ""}
          onClick={() => setActiveTab("steps")}
        >
          Steps
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {activeTab === "input" && (
        <div className="card input-card">
          <h2>Input Section</h2>
          <p className="section-subtitle">
            Generate an Optimal BST using manual frequencies or a search sequence.
          </p>

          <div className="input-grid">
            <div className="mini-panel">
              <h3>Manual Frequency Input</h3>
              <input
                type="text"
                placeholder="Enter keys (e.g. 10,20,30)"
                value={keys}
                onChange={(e) => setKeys(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter frequencies (e.g. 34,8,50)"
                value={freq}
                onChange={(e) => setFreq(e.target.value)}
              />
              <div className="button-group">
                <button onClick={generateRandomData}>Random Data</button>
                <button onClick={generateFromFreq} disabled={loading}>
                  {loading ? "Generating..." : "Generate OBST"}
                </button>
              </div>
            </div>

            <div className="mini-panel">
              <h3>Search-Based Input</h3>
              <input
                type="text"
                placeholder="Search sequence (e.g. 30,20,20,10)"
                value={searchSeq}
                onChange={(e) => setSearchSeq(e.target.value)}
              />
              <button onClick={generateFromSearch} disabled={loading}>
                {loading ? "Generating..." : "Generate From Sequence"}
              </button>

              <hr />

              <h3>Search Simulation</h3>
              <input
                type="text"
                placeholder="Search key (e.g. 20)"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
              />
              <button onClick={simulateSearch}>Simulate Search</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tree" && (
        <div className="card">
          <h2>Tree Visualization</h2>
          <p className="section-subtitle">
            Visual representation of the generated Optimal BST.
          </p>

          {searchPath.length > 0 && (
            <div className="search-info-box">
              <div className="search-chip">
                <span className="chip-label">Path</span>
                <span>{searchPath.join(" → ")}</span>
              </div>

              <div className="search-chip">
                <span className="chip-label">Comparisons</span>
                <span>{searchPath.length}</span>
              </div>

              <div
                className={`search-chip ${
                  searchFound === null
                    ? "searching-chip"
                    : searchFound
                    ? "found-chip"
                    : "notfound-chip"
                }`}
              >
                <span className="chip-label">Result</span>
                <span>
                  {searchFound === null
                    ? "Searching..."
                    : searchFound
                    ? "Found"
                    : "Not Found"}
                </span>
              </div>
            </div>
          )}

          <div className="tree-container" ref={treeContainerRef}>
            {treeData  ? (
              <Tree
                key={animatedPath.join("-")}
                data={treeData}
                renderCustomNodeElement={renderCustomNode}
                translate={treeTranslate}
                pathFunc="step"
                orientation="vertical"
                nodeSize={{ x: 110, y: 110 }}
                separation={{ siblings: 0.9, nonSiblings: 1.8 }}
                zoomable
                scaleExtent={{ min: 0.4, max: 2.2 }}
                collapsible={false}
                transitionDuration={500}
              />
            ) : (
              <div className="empty-state">
                <h3>No tree generated yet</h3>
                <p>Generate an OBST first from the Input tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "analysis" && cost !== null && (
        <div className="card">
          <h2>Analysis Dashboard</h2>
          <p className="section-subtitle">
            Compare efficiency and performance of OBST against a normal BST.
          </p>

          <div className="stats-grid">
            <div className="stat-box">
              <p className="stat-label">Optimal Cost</p>
              <h3>{cost}</h3>
            </div>

            <div className="stat-box">
              <p className="stat-label">Normal BST Cost</p>
              <h3>{normalCost}</h3>
            </div>

            <div className="stat-box">
              <p className="stat-label">Cost Savings</p>
              <h3>{savings !== null ? `${savings}` : "—"}</h3>
            </div>

            <div className="stat-box">
              <p className="stat-label">Execution Time</p>
              <h3>{executionTime} ms</h3>
            </div>
          </div>

          <div className="analysis-summary">
            <p>
              {savings !== null
                ? savings >= 0
                  ? `This optimal BST reduces search cost by ${savings} compared to a naive BST.`
                  : `This optimal tree is ${Math.abs(savings)} cost points higher than a normal BST for this input.`
                : "Generate data to compare costs and view the analysis."}
            </p>
          </div>

          <div className="chart-box">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    labels: {
                      color: "#7f1d1d",
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: "#7f1d1d" },
                    grid: { color: "rgba(248, 113, 113, 0.12)" },
                  },
                  y: {
                    ticks: { color: "#7f1d1d" },
                    grid: { color: "rgba(248, 113, 113, 0.12)" },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "dp" && (
        <div className="card">
          <h2>DP Table</h2>
          <p className="section-subtitle">
            Dynamic Programming cost table used to build the OBST.
          </p>

          <div className="dp-section">
            {dpTable.length > 0 ? (
              <table className="dp-table">
                <tbody>
                  {dpTable.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <h3>No DP table available</h3>
                <p>Generate an OBST first to view the DP matrix.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "steps" && (
        <div className="card">
          <h2>OBST Construction Steps</h2>
          <p className="section-subtitle">
            Step-by-step explanation of how the tree is constructed.
          </p>

          <div className="steps-box">
            {steps.length > 0 ? (
              steps.map((step, index) => (
                <div key={index} className="step-item">
                  <strong>Step {index + 1}:</strong> {step}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <h3>No steps generated yet</h3>
                <p>Generate an OBST first to see the construction process.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;