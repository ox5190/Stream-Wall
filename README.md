# Stream Wall

Local multiview app for YouTube, CHZZK, SOOP, Twitch, and direct iframe URLs.

## Run

```powershell
npm.cmd start
```

If npm is blocked by PowerShell execution policy, run directly:

```powershell
node server.js
```

Open:

```text
http://localhost:5177
```

## Input Examples

- YouTube: `y:@youtube`, `https://www.youtube.com/watch?v=VIDEO_ID`, `VIDEO_ID`
- CHZZK: `32-character channel UID`
- SOOP: `soopid`
- Twitch: `t:twitchid`
- Multiple at once: `CHZZK_UID/soopid/t:twitchid/y:@youtube`

## Convenience Features

- `View`: hides controls and fills the screen with streams.
- `Link`: copies a URL that restores the current layout and opens in view mode.
- `Reload`: reloads every stream iframe.
- `Preset`: save, load, and delete named local layouts.
- Tile buttons:
  - `T`: rename the tile title.
  - `W`: pin the tile to the wide slot in auto layout.
  - `F`: fullscreen that tile.
  - `<` / `>`: move the tile without reloading the iframe.
  - `R`: reload that tile.
  - `M` / `A`: toggle muted start after reload.
  - `Chat`: open the chat panel when the platform allows embedding.
  - `X`: remove the tile without reloading the others.
- Keyboard shortcuts: `V` view mode, `Esc` edit mode, `R` reload all, `C` cycle columns.

## Notes

Some platform features can be limited by iframe, login, age verification, subscriber-only access, chat policy, or browser autoplay policy.

Ad skip buttons inside platform players cannot be clicked automatically from this app because cross-origin iframes block that control.

## Deploy With GitHub + Render

이 프로젝트는 GitHub에 올린 뒤 Render에서 Web Service로 배포하는 흐름을 기준으로 합니다.

### 1. GitHub에 올리기

이 PC에서 `git` 명령어가 안 잡히면 GitHub 웹사이트에서 새 저장소를 만들고 파일을 업로드합니다.

업로드할 주요 항목:

- `public/`
- `server.js`
- `package.json`
- `render.yaml`
- `README.md`
- `.gitignore`

업로드하지 않아도 되는 항목:

- `server.out.log`
- `server.err.log`
- `.env`
- `node_modules/`

### 2. Render에서 배포

1. Render에 로그인합니다.
2. GitHub 저장소를 연결합니다.
3. 새 Web Service를 만듭니다.
4. 저장소를 선택합니다.
5. 설정은 `render.yaml` 기준으로 자동 인식되게 둡니다.
6. 배포가 끝나면 Render가 제공하는 `https://...onrender.com` 주소로 접속합니다.

### 3. Render 수동 설정이 필요할 때

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: `Free`
- Environment: 별도 시크릿 없음
