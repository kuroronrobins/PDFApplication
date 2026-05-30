const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const workspace = process.cwd();
const validationRoot = path.resolve(workspace, "tmp_validation");
const profileDir = path.resolve(validationRoot, "chrome-page-operation-ui");
const screenshotPath = path.resolve(
  workspace,
  "docs/reports/screenshots/2026-05-30-page-operation-ui-safety.png",
);
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = "http://127.0.0.1:5173/?fixture=large-pages";

if (!profileDir.startsWith(validationRoot + path.sep)) {
  throw new Error(`Refusing unsafe profile path: ${profileDir}`);
}

fs.rmSync(profileDir, { recursive: true, force: true });
fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function waitForCdp(port) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < 12000) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/list`);
    } catch (error) {
      lastError = error;
      await sleep(200);
    }
  }
  throw lastError ?? new Error("CDP did not become ready");
}

async function connectWebSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
    } else {
      resolve(message.result);
    }
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
  }
  return result.result.value;
}

async function waitForApp(cdp) {
  const started = Date.now();
  let lastState;
  while (Date.now() - started < 12000) {
    const state = await evaluate(
      cdp,
      `(() => ({
        title: document.title,
        fileCards: document.querySelectorAll(".file-card").length,
        pageCards: document.querySelectorAll(".page-card").length,
        width: window.innerWidth,
        height: window.innerHeight,
        href: location.href,
        body: document.body.textContent?.slice(0, 160)
      }))()`,
    );
    if (state.title === "PDF Workbench" && state.fileCards > 0 && state.pageCards > 0) {
      return state;
    }
    lastState = state;
    await sleep(250);
  }
  throw new Error(`PDF Workbench fixture did not become ready: ${JSON.stringify(lastState)}`);
}

async function mouse(cdp, type, x, y, extra = {}) {
  await cdp.send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: extra.button ?? "left",
    buttons: extra.buttons ?? (type === "mouseReleased" ? 0 : 1),
    clickCount: extra.clickCount ?? 1,
  });
}

async function click(cdp, x, y) {
  await mouse(cdp, "mouseMoved", x, y, { buttons: 0, button: "none" });
  await mouse(cdp, "mousePressed", x, y);
  await sleep(40);
  await mouse(cdp, "mouseReleased", x, y);
}

async function drag(cdp, points, delayMs = 14) {
  const first = points[0];
  await mouse(cdp, "mouseMoved", first.x, first.y, { buttons: 0, button: "none" });
  await mouse(cdp, "mousePressed", first.x, first.y);
  for (const point of points.slice(1)) {
    await mouse(cdp, "mouseMoved", point.x, point.y);
    await sleep(delayMs);
  }
  const last = points[points.length - 1];
  await mouse(cdp, "mouseReleased", last.x, last.y);
}

function linePath(from, to, steps) {
  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: from.x + ((to.x - from.x) * index) / steps,
    y: from.y + ((to.y - from.y) * index) / steps,
  }));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

let chrome;
let cdp;

(async () => {
  const port = 9234;
  chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1366,768",
    "--force-device-scale-factor=1",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    appUrl,
  ], {
    stdio: "ignore",
  });

  const pages = await waitForCdp(port);
  const page = pages.find((item) => item.type === "page") ?? pages[0];
  cdp = await connectWebSocket(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send("Page.bringToFront");
  await cdp.send("Page.navigate", { url: appUrl });
  await sleep(800);
  await waitForApp(cdp);
  await sleep(800);

  const initial = await evaluate(
    cdp,
    `(() => {
      const fileOrder = document.querySelector(".file-order-section").getBoundingClientRect();
      const timeline = document.querySelector(".page-timeline").getBoundingClientRect();
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        fileOrderHeight: fileOrder.height,
        timelineHeight: timeline.height,
        pageCards: document.querySelectorAll(".page-card").length,
        timelineControls: document.querySelectorAll(".timeline-controls").length,
        resizer: Boolean(document.querySelector(".workbench-resizer")),
        activeTool: Array.from(document.querySelectorAll(".tool-button")).find((button) => button.classList.contains("is-active"))?.textContent?.trim()
      };
    })()`,
  );

  assert(initial.width === 1366 && initial.height === 768, "viewport is not 1366x768");
  assert(initial.resizer, "workbench resizer is missing");
  assert(initial.timelineControls === 0, "page movement controls were restored unexpectedly");

  const pageGeometry = await evaluate(
    cdp,
    `(() => {
      const cards = Array.from(document.querySelectorAll(".page-card")).slice(0, 8).map((card) => {
        const rect = card.getBoundingClientRect();
        return { id: card.dataset.pageId, text: card.textContent.trim(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      return { cards };
    })()`,
  );
  const pageOrderBefore = pageGeometry.cards.map((card) => card.id);
  await drag(
    cdp,
    linePath(pageGeometry.cards[0], pageGeometry.cards[7], 70),
  );
  await sleep(700);
  const visibleReorder = await evaluate(
    cdp,
    `(() => ({
      labels: Array.from(document.querySelectorAll(".page-card")).slice(0, 12).map((item) => item.textContent.trim()),
      ids: Array.from(document.querySelectorAll(".page-card")).slice(0, 12).map((item) => item.dataset.pageId),
      selectedCount: document.querySelectorAll(".page-card.is-selected").length,
      draggingCount: document.querySelectorAll(".page-card.is-dragging").length,
      dropMarkers: document.querySelectorAll(".page-card.is-drop-before, .page-card.is-drop-after").length
    }))()`,
  );
  assert(visibleReorder.ids[0] !== pageOrderBefore[0], "visible page drag did not reorder first page id");
  assert(visibleReorder.selectedCount === 0, "page drag caused an unintended selection");
  assert(visibleReorder.draggingCount === 0 && visibleReorder.dropMarkers === 0, "page drag left transient markers");

  const autoScrollGeometry = await evaluate(
    cdp,
    `(() => {
      const first = document.querySelector(".page-card").getBoundingClientRect();
      const timeline = document.querySelector(".page-timeline").getBoundingClientRect();
      return {
        start: { x: first.left + first.width / 2, y: first.top + first.height / 2 },
        edge: { x: first.left + first.width / 2 + 8, y: timeline.bottom - 8 },
        timelineTop: timeline.top,
        timelineBottom: timeline.bottom
      };
    })()`,
  );
  const autoPath = [
    autoScrollGeometry.start,
    ...linePath(autoScrollGeometry.start, autoScrollGeometry.edge, 18).slice(1),
    ...Array.from({ length: 90 }, () => autoScrollGeometry.edge),
  ];
  await drag(cdp, autoPath, 18);
  await sleep(800);
  const autoScroll = await evaluate(
    cdp,
    `(() => {
      const timeline = document.querySelector(".page-timeline");
      return {
        scrollTop: timeline.scrollTop,
        selectedCount: document.querySelectorAll(".page-card.is-selected").length,
        draggingCount: document.querySelectorAll(".page-card.is-dragging").length,
        dropMarkers: document.querySelectorAll(".page-card.is-drop-before, .page-card.is-drop-after").length
      };
    })()`,
  );
  assert(autoScroll.scrollTop > 0, "page drag near bottom did not auto-scroll");
  assert(autoScroll.draggingCount === 0 && autoScroll.dropMarkers === 0, "auto-scroll drag left transient markers");

  const headerButton = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll(".tool-button")).find((item) => item.textContent.trim() === "ヘッダー");
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  );
  await click(cdp, headerButton.x, headerButton.y);
  await sleep(500);
  const panelHandle = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".panel-drag-handle").getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: document.querySelector(".panel-drag-handle").textContent.trim() };
    })()`,
  );
  await drag(
    cdp,
    linePath(panelHandle, { x: panelHandle.x - 300, y: panelHandle.y - 48 }, 44),
  );
  await sleep(500);
  const panelBeforeClose = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".decoration-panel").getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    })()`,
  );
  const closeButton = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".decoration-panel .panel-close").getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  );
  await click(cdp, closeButton.x, closeButton.y);
  await sleep(300);
  const reopenButton = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".floating-panel-reopen").getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  );
  await click(cdp, reopenButton.x, reopenButton.y);
  await sleep(400);
  const panelAfterReopen = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".decoration-panel").getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    })()`,
  );
  const footerButton = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll(".tool-button")).find((item) => item.textContent.trim() === "フッター");
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
  );
  await click(cdp, footerButton.x, footerButton.y);
  await sleep(400);
  const panelAfterToolSwitch = await evaluate(
    cdp,
    `(() => {
      const rect = document.querySelector(".decoration-panel").getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, text: document.querySelector(".panel-drag-handle").textContent.trim() };
    })()`,
  );
  assert(Math.abs(panelBeforeClose.left - panelAfterReopen.left) < 2, "panel left was not retained after reopen");
  assert(Math.abs(panelBeforeClose.top - panelAfterReopen.top) < 2, "panel top was not retained after reopen");
  assert(Math.abs(panelBeforeClose.left - panelAfterToolSwitch.left) < 2, "panel left was not retained after tool switch");
  assert(panelAfterToolSwitch.text.includes("フッター"), "tool switch did not reopen footer panel");

  const resizeBefore = await evaluate(
    cdp,
    `(() => {
      const fileOrder = document.querySelector(".file-order-section").getBoundingClientRect();
      const timeline = document.querySelector(".page-timeline").getBoundingClientRect();
      const firstFile = document.querySelector(".file-card").getBoundingClientRect();
      const strip = document.querySelector(".file-strip").getBoundingClientRect();
      const resizer = document.querySelector(".workbench-resizer").getBoundingClientRect();
      return {
        fileOrderHeight: fileOrder.height,
        timelineHeight: timeline.height,
        fileCardClipped: firstFile.top < strip.top || firstFile.bottom > strip.bottom,
        resizer: { x: resizer.left + resizer.width / 2, y: resizer.top + resizer.height / 2 }
      };
    })()`,
  );
  await drag(
    cdp,
    linePath(resizeBefore.resizer, { x: resizeBefore.resizer.x, y: resizeBefore.resizer.y + 58 }, 40),
  );
  await sleep(500);
  const resizeAfterDrag = await evaluate(
    cdp,
    `(() => {
      const fileOrder = document.querySelector(".file-order-section").getBoundingClientRect();
      const timeline = document.querySelector(".page-timeline").getBoundingClientRect();
      const firstFile = document.querySelector(".file-card").getBoundingClientRect();
      const strip = document.querySelector(".file-strip").getBoundingClientRect();
      const resizer = document.querySelector(".workbench-resizer").getBoundingClientRect();
      return {
        fileOrderHeight: fileOrder.height,
        timelineHeight: timeline.height,
        fileCardClipped: firstFile.top < strip.top || firstFile.bottom > strip.bottom,
        cssVar: getComputedStyle(document.querySelector(".workbench")).getPropertyValue("--file-order-height").trim(),
        resizer: { x: resizer.left + resizer.width / 2, y: resizer.top + resizer.height / 2 }
      };
    })()`,
  );
  assert(resizeAfterDrag.fileOrderHeight > resizeBefore.fileOrderHeight + 20, "divider drag did not increase file-order height");
  assert(!resizeAfterDrag.fileCardClipped, "file card was clipped after divider drag");
  assert(resizeAfterDrag.timelineHeight >= 178, "page timeline became too small after divider drag");

  await click(cdp, resizeAfterDrag.resizer.x, resizeAfterDrag.resizer.y);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "ArrowUp",
    code: "ArrowUp",
    windowsVirtualKeyCode: 38,
    nativeVirtualKeyCode: 38,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "ArrowUp",
    code: "ArrowUp",
    windowsVirtualKeyCode: 38,
    nativeVirtualKeyCode: 38,
  });
  await sleep(300);
  const resizeAfterKeyboard = await evaluate(
    cdp,
    `(() => ({
      fileOrderHeight: document.querySelector(".file-order-section").getBoundingClientRect().height,
      timelineHeight: document.querySelector(".page-timeline").getBoundingClientRect().height,
      cssVar: getComputedStyle(document.querySelector(".workbench")).getPropertyValue("--file-order-height").trim()
    }))()`,
  );
  assert(resizeAfterKeyboard.fileOrderHeight < resizeAfterDrag.fileOrderHeight, "keyboard ArrowUp did not reduce file-order height");

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const result = {
    screenshotPath,
    initial,
    pageDrag: {
      pageOrderBefore,
      visibleReorder,
      autoScroll,
    },
    decorationPanel: {
      handleText: panelHandle.text,
      panelBeforeClose,
      panelAfterReopen,
      panelAfterToolSwitch,
    },
    divider: {
      resizeBefore,
      resizeAfterDrag,
      resizeAfterKeyboard,
    },
  };
  console.log(JSON.stringify(result, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      cdp?.close();
    } catch {}
    if (chrome && !chrome.killed) {
      chrome.kill();
    }
    await sleep(500);
  });
