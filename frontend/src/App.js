import { useState } from "react";
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

  const [searchKey, setSearchKey] = useState("");
  const [searchPath, setSearchPath] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [executionTime, setExecutionTime] = useState(null);
  const [searchFound, setSearchFound] = useState(null);
  const [animatedPath, setAnimatedPath] = useState([]);

  const generateRandomData = () => {
    const n = 5;
    let randomKeys = [];
    let randomFreq = [];

    for (let i = 0; i < n; i++) {
      randomKeys.push((i + 1) * 10);
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
      const start = performance.now();

      const res = await axios.post("https://obst-project-backend.onrender.com/generate-obst", {
        keys: keys.split(",").map((x) => Number(x.trim())),
        freq: freq.split(",").map((x) => Number(x.trim())),
      });

      const end = performance.now();

      setCost(res.data.cost);
      setNormalCost(res.data.normalCost);
      setDpTable(res.data.dpTable);
      setTreeData(res.data.tree);
      setSteps(res.data.steps || []);
      setExecutionTime((end - start).toFixed(2));
      setSearchPath([]);
      setAnimatedPath([]);
      setSearchFound(null);
      setActiveTab("analysis");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  const generateFromSearch = async () => {
    try {
      setError("");
      const start = performance.now();

      const searches = searchSeq.split(",").map((x) => Number(x.trim()));
      const freqMap = {};

      searches.forEach((num) => {
        freqMap[num] = (freqMap[num] || 0) + 1;
      });

      const sortedKeys = Object.keys(freqMap).map(Number).sort((a, b) => a - b);
      const sortedFreq = sortedKeys.map((key) => freqMap[key]);

      setKeys(sortedKeys.join(","));
      setFreq(sortedFreq.join(","));

      const res = await axios.post("https://obst-project-backend.onrender.com/", {
        keys: sortedKeys,
        freq: sortedFreq,
      });

      const end = performance.now();

      setCost(res.data.cost);
      setNormalCost(res.data.normalCost);
      setDpTable(res.data.dpTable);
      setTreeData(res.data.tree);
      setSteps(res.data.steps || []);
      setExecutionTime((end - start).toFixed(2));
      setSearchPath([]);
      setAnimatedPath([]);
      setSearchFound(null);
      setActiveTab("analysis");
    } catch (err) {
      setError("Invalid search sequence");
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

  // ✅ FIXED ANIMATION FUNCTION
  const simulateSearch = () => {
    if (!treeData || !searchKey) return;

    const target = Number(searchKey);
    const result = searchInTree(treeData, target);

    setSearchPath(result.path);
    setSearchFound(null); // reset first
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

        // last node → turn green after delay
        if (index === result.path.length - 1) {
          setTimeout(() => {
            setSearchFound(result.found);
          }, 500);
        }
      }, index * 1200);
    });
  };

  const renderCustomNode = ({ nodeDatum }) => {
  const nodeKey = Number(nodeDatum.name.split(" ")[0]);

  let fillColor = "#3b82f6";

  if (animatedPath.includes(nodeKey)) {
    fillColor = "#f59e0b";
  }

  if (searchFound && nodeKey === Number(searchKey)) {
    fillColor = "#22c55e";
  }

  return (
    <g>
      <circle
        r="24"
        fill={fillColor}
        stroke="#ffffff"
        strokeWidth="3"
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
  
  const chartData = {
    labels: ["Optimal BST", "Normal BST"],
    datasets: [
      {
        label: "Cost Comparison",
        data: [cost || 0, normalCost || 0],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className="app">
      <div className="hero">
  <h1>Optimal BST Visualizer</h1>
  <p> Dynamic Programming Tree Construction & Search Analysis</p>
</div>

      <div className="tabs">
        <button onClick={() => setActiveTab("input")}>Input</button>
        <button onClick={() => setActiveTab("tree")}>Tree</button>
        <button onClick={() => setActiveTab("analysis")}>Analysis</button>
        <button onClick={() => setActiveTab("dp")}>DP Table</button>
        <button onClick={() => setActiveTab("steps")}>Steps</button>
      </div>

      {error && <p className="error">{error}</p>}

      {activeTab === "input" && (
        <div className="card">
          <h2>Input Section</h2>
          <div className="form-box">
            <input
              type="text"
              placeholder="Enter keys"
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter frequencies"
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
            />

            <button onClick={generateRandomData}>Random Data</button>
            <button onClick={generateFromFreq}>Generate OBST</button>

            <hr />

            <input
              type="text"
              placeholder="Search sequence"
              value={searchSeq}
              onChange={(e) => setSearchSeq(e.target.value)}
            />
            <button onClick={generateFromSearch}>From Sequence</button>

            <hr />

            <input
              type="text"
              placeholder="Search key"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
            />
            <button onClick={simulateSearch}>Simulate Search</button>
          </div>
        </div>
      )}

      {activeTab === "tree" && (
        <div className="card">
          <h2>Tree Visualization</h2>

          {searchPath.length > 0 && (
            <>
              <h3>Path: {searchPath.join(" → ")}</h3>
              <h3>Comparisons: {searchPath.length}</h3>
              <h3 style={{ color: searchFound ? "green" : "red" }}>
                {searchFound === null
                  ? "Searching..."
                  : searchFound
                  ? "Found"
                  : "Not Found"}
              </h3>
            </>
          )}

          <div className="tree-container">
            {treeData && (
              <Tree
                key={animatedPath.join("-")}
                data={treeData}
                renderCustomNodeElement={renderCustomNode}
                translate={{ x: 500, y: 80 }}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "analysis" && cost !== null && (
        <div className="card">
          <h2>Analysis</h2>
          <p>Optimal Cost: {cost}</p>
          <p>Normal Cost: {normalCost}</p>
          <p>Time: {executionTime} ms</p>
          <Bar data={chartData} />
        </div>
      )}

      {activeTab === "dp" && (
        <div className="card">
          <h2>DP Table</h2>
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
        </div>
      )}

     {activeTab === "steps" && (
  <div className="card">
    <h2>OBST Construction Steps</h2>
    <div className="steps-box">
      {steps.map((step, index) => (
        <div key={index} className="step-item">
          <strong>Step {index + 1}:</strong> {step}
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  );
}

export default App;