#include <bits/stdc++.h>
using namespace std;

long long sumRange(const vector<long long>& prefix, int i, int j) {
  return prefix[j + 1] - prefix[i];
}

int main() {
  int n;
  if (!(cin >> n)) {
    return 0;
  }

  if (n <= 0) {
    cout << "Invalid input" << endl;
    return 0;
  }

  vector<long long> keys(n);
  vector<long long> freq(n);
  for (int i = 0; i < n; i++) {
    cin >> keys[i];
  }
  for (int i = 0; i < n; i++) {
    cin >> freq[i];
  }

  vector<int> order(n);
  iota(order.begin(), order.end(), 0);
  sort(order.begin(), order.end(), [&](int a, int b) {
    return keys[a] < keys[b];
  });

  vector<long long> sortedKeys(n);
  vector<long long> sortedFreq(n);
  for (int i = 0; i < n; i++) {
    sortedKeys[i] = keys[order[i]];
    sortedFreq[i] = freq[order[i]];
  }

  vector<vector<long long>> dp(n, vector<long long>(n, 0));
  vector<vector<int>> root(n, vector<int>(n, 0));
  vector<long long> prefix(n + 1, 0);

  for (int i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + sortedFreq[i];
    dp[i][i] = sortedFreq[i];
    root[i][i] = i;
  }

  for (int len = 2; len <= n; len++) {
    for (int i = 0; i <= n - len; i++) {
      int j = i + len - 1;
      dp[i][j] = LLONG_MAX;
      long long totalFreq = sumRange(prefix, i, j);

      for (int r = i; r <= j; r++) {
        long long leftCost = (r > i) ? dp[i][r - 1] : 0;
        long long rightCost = (r < j) ? dp[r + 1][j] : 0;
        long long cost = leftCost + rightCost + totalFreq;

        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          root[i][j] = r;
        }
      }
    }
  }

  cout << "Optimal BST Cost: " << dp[0][n - 1] << "\n";
  return 0;
}
