:root {
  color-scheme: dark;
  --bg: #101315;
  --panel: #1a2025;
  --panel-2: #232b31;
  --line: #33414b;
  --text: #eef3f6;
  --muted: #9aa9b5;
  --accent: #2cc56f;
  --warn: #f2c94c;
  --danger: #ff6b6b;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

button,
input,
select {
  font: inherit;
}

button,
select,
input {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
}

button {
  min-height: 40px;
  padding: 0 14px;
  cursor: pointer;
  background: var(--accent);
  border-color: transparent;
  color: #06100a;
  font-weight: 700;
}

button:hover {
  filter: brightness(1.07);
}

.top-actions button,
.controls button {
  background: var(--panel-2);
  color: var(--text);
  border-color: var(--line);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  background: rgba(16, 19, 21, 0.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}

h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
}

p {
  margin: 6px 0 0;
  color: var(--muted);
}

.top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.exit-viewer {
  position: fixed;
  top: 10px;
  right: 10px;
