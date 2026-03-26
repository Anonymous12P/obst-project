#include <bits/stdc++.h>
using namespace std;

struct Node {
    int key;
    int freq;
    Node* left;
    Node* right;
    Node(int k, int f) : key(k), freq(f), left(nullptr), right(nullptr) {}
};

int sumFreq(const vector<int>& freq, int i, int j) {
    int s = 0;
    for (int k = i; k <= j; k++) s += freq[k];
    return s;
}

Node* buildTree(const vector<int>& keys, const vector<int>& freq, const vector<vector<int>>& root, int i, int j) {
    if (i > j) return nullptr;
    int r = root[i][j];
    Node* node = new Node(keys[r], freq[r]);
    node->left = buildTree(keys, freq, root, i, r - 1);
    node->right = buildTree(keys, freq, root, r + 1, j);
    return node;
}

// Tree format for react-d3-tree visualization
void printVisualJson(Node* node) {
    if (!node) return;
    cout << "{";
    cout << "\"name\":\"" << node->key << " (" << node->freq << ")\"";
    if (node->left || node->right) {
        cout << ",\"children\":[";
        bool first = true;
        if (node->left) {
            printVisualJson(node->left);
            first = false;
        }
        if (node->right) {
            if (!first) cout << ",";
            printVisualJson(node->right);
        }
        cout << "]";
    }
    cout << "}";
}

// Tree format for actual search traversal
void printSearchJson(Node* node) {
    if (!node) {
        cout << "null";
        return;
    }

    cout << "{";
    cout << "\"key\":" << node->key << ",";
    cout << "\"freq\":" << node->freq << ",";
    cout << "\"left\":";
    printSearchJson(node->left);
    cout << ",";
    cout << "\"right\":";
    printSearchJson(node->right);
    cout << "}";
}

// Build normal BST
Node* insertBST(Node* root, int key, int freq) {
    if (!root) return new Node(key, freq);
    if (key < root->key) root->left = insertBST(root->left, key, freq);
    else root->right = insertBST(root->right, key, freq);
    return root;
}

int calculateCost(Node* root, int level = 1) {
    if (!root) return 0;
    return root->freq * level + calculateCost(root->left, level + 1) + calculateCost(root->right, level + 1);
}

int main() {
    int n;
    cin >> n;

    vector<int> keys(n), freq(n);
    for (int i = 0; i < n; i++) cin >> keys[i];
    for (int i = 0; i < n; i++) cin >> freq[i];

    vector<vector<int>> cost(n, vector<int>(n, 0));
    vector<vector<int>> root(n, vector<int>(n, -1));
    vector<string> steps;

    for (int i = 0; i < n; i++) {
        cost[i][i] = freq[i];
        root[i][i] = i;
        steps.push_back("Base Case: Range (" + to_string(i) + "," + to_string(i) +
                        ") -> Only key " + to_string(keys[i]) +
                        " with cost = " + to_string(freq[i]));
    }

    for (int L = 2; L <= n; L++) {
        for (int i = 0; i <= n - L; i++) {
            int j = i + L - 1;
            cost[i][j] = INT_MAX;

            int sum = sumFreq(freq, i, j);
            string step = "Range (" + to_string(i) + "," + to_string(j) + "): ";

            for (int r = i; r <= j; r++) {
                int c = (r > i ? cost[i][r - 1] : 0) +
                        (r < j ? cost[r + 1][j] : 0) +
                        sum;

                step += "Try root " + to_string(keys[r]) + " -> cost = " + to_string(c) + " | ";

                if (c < cost[i][j]) {
                    cost[i][j] = c;
                    root[i][j] = r;
                }
            }

            step += "Selected root = " + to_string(keys[root[i][j]]) +
                    " with minimum cost = " + to_string(cost[i][j]);
            steps.push_back(step);
        }
    }

    Node* optimalTree = buildTree(keys, freq, root, 0, n - 1);

    Node* normalBST = nullptr;
    for (int i = 0; i < n; i++) {
        normalBST = insertBST(normalBST, keys[i], freq[i]);
    }

    int normalCost = calculateCost(normalBST);

    cout << "{";
    cout << "\"cost\":" << cost[0][n - 1] << ",";
    cout << "\"normalCost\":" << normalCost << ",";

    cout << "\"dpTable\":[";
    for (int i = 0; i < n; i++) {
        cout << "[";
        for (int j = 0; j < n; j++) {
            cout << cost[i][j];
            if (j != n - 1) cout << ",";
        }
        cout << "]";
        if (i != n - 1) cout << ",";
    }
    cout << "],";

    cout << "\"steps\":[";
    for (int i = 0; i < steps.size(); i++) {
        cout << "\"" << steps[i] << "\"";
        if (i != steps.size() - 1) cout << ",";
    }
    cout << "],";

    cout << "\"tree\":";
    printVisualJson(optimalTree);
    cout << ",";

    cout << "\"searchTree\":";
    printSearchJson(optimalTree);

    cout << "}";

    return 0;
}