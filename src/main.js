/* ============================================================
   Letter from Spring · 传讯
   对方的每一句话，都来自字卡库的随机组合。
   ============================================================ */

const $ = (s) => document.querySelector(s);
const STORE_KEY = 'lfs-state-v1';
const rnd = Math.random;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randBetween = (a, b) => a + rnd() * (b - a);
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------------- 默认数据 ---------------- */
const DEFAULTS = {
  settings: {
    keepAlive: false,   // 后台挂活
    notify: false,      // 弹窗通知
    mixMode: true,      // emoji 混合模式
    stickers: true,     // 表情包开关
    partnerName: 'Nova',
    partnerTag: 'ENFP · 火象狮子',
    replyDelayMin: 0, replyDelayMax: 0,   // 秒，0~300
proactive: false,                    // 主动发消息开关
proactiveEvery: 0,                   // 分钟，0~300（0~5h）
readNoReply: false,                  // 已读不回
  },
  // 字卡库：对方说的话全部出自这里
  cards: [
    '今天也在下雨，你那边呢。',
    '刚刚路过书店，看到一本你一定会喜欢的书。',
    '一度ほどけた糸は、どんなに必死に戻そうとしても、元のように結び直すことは困難である。',
    '你说，雨停之后的第一件事应该做什么？',
    '我这里的樱花开了三分之一。',
    '有点想你了，只是一点点。',
    '刚才的晚霞很好看，可惜你不在。',
    '明天会降温，记得加衣服。',
    '听到一首歌，前奏一响就想起你。',
    '今天在咖啡店坐了一下午，写了点东西。',
    '人生的大多数事情，熬一熬就过去了。',
    '你最近睡得好吗？',
    '我把窗户打开了一条缝，风把信纸吹得哗啦响。',
    '如果思念有声音，那大概是雨声。',
    '别太累，慢慢来。',
    '刚刚做了一个关于春天的梦，梦里有你。',
    '你看，云在走。',
    '有些话说不出口，只好写在信里。',
    '今天也要好好吃饭。',
    '雨天适合想念，晴天适合见面。',
    '我在车站等了七分钟，车没有来，我想起你也没来。',
    '风把窗帘吹起来的时候，我以为是你来了。',
    '有些话，春天替我说了。',
    '你发来的每一条消息，我都看了三遍。',
    '今晚的月亮很圆，像一枚邮票。',
    '我挺好的，就是有点想你。',
    '一生の中で、雨の季節は多すぎる。',
    '茶凉了就再续一杯，人走了就再等一等。',
    '刚才淋了一点雨，想起你说过讨厌湿漉漉的感觉。',
    '世界这么大，能遇见你真好。',
    '把烦恼折成纸飞机，从窗口放飞吧。',
    '今天的云像一只很大的鲸鱼。',
    '我在练字，写的是你的名字。',
    '等这场雨停了，一起去散步吧。',
    '星星出来的时候，记得抬头看一眼。',
    '有些情绪像潮气，晾一晾就干了。',
    '你笑起来的样子，我一直记得。',
    '春天的信，你收到了吗？',
  ],
  // 状态库：分组 + 权重
  statuses: [
    { name: '日常', weight: 45, items: ['听雨', '发呆中', '刚睡醒', '在赶作业', '散步回来', '喝一杯热茶'] },
    { name: '文艺', weight: 30, items: ['读一封旧信', '写一首没写完的诗', '看云的形状', '收集雨滴的声音'] },
    { name: '想你', weight: 25, items: ['等你的消息', '又想起你了', '盯着对话框发呆', '想给你打电话'] },
  ],
  partnerStatus: '听雨',
  // emoji 库
  emojis: ['🌧️', '🍃', '🌸', '✨', '☁️', '🫧', '🌙', '💭', '🌱', '📮'],
  // 表情包（贴纸）库：非空才触发；sticker-1..4 由 assets/stickers.png 切片
  stickerNames: ['雨中萌芽', '云朵与信', '信里的小猫', '萤火之瓶'],
  // 心情库
  moods: [
    { emoji: '🌧️', label: '雨季' }, { emoji: '🌤️', label: '微晴' },
    { emoji: '🍃', label: '起风' }, { emoji: '🌸', label: '花开' },
    { emoji: '☁️', label: '多云' }, { emoji: '🌙', label: '星夜' },
    { emoji: '🫧', label: '放空' }, { emoji: '🌱', label: '新绿' },
  ],
  moodLog: {},             // { 'YYYY-MM-DD': {emoji,label} | null }
  messages: [],            // {id,from:'me'|'nova'|'sys',type,ts,...}
  lastStatusCheck: 0,      // 上次状态检查时间
  nextStatusIn: 0,         // 距下次状态检查的间隔 ms（1~8h）
  lastCallCheck: 0,
  nextCallIn: 0,           // 15~60min
  lastProactiveCheck: 0,
  nextProactiveIn: 0,
  welcomed: false,
};

/* ---------------- 状态 ---------------- */
let state;
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? { ...structuredClone(DEFAULTS), ...JSON.parse(raw) } : structuredClone(DEFAULTS);
    state.settings = { ...DEFAULTS.settings, ...(state.settings || {}) };
  } catch { state = structuredClone(DEFAULTS); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* 空间满时静默 */ }
}

/* ---------------- 渲染：消息 ---------------- */
const stream = $('#stream');
let lastDayDivider = '';

function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function addDividerIfNeeded(ts) {
  const key = dayKey(new Date(ts));
  if (key === lastDayDivider) return;
  lastDayDivider = key;
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  const label = key === today ? '今天' : key === yesterday ? '昨天' : key;
  const div = document.createElement('div');
  div.className = 'day-divider';
  div.textContent = label;
  stream.appendChild(div);
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderMessage(m) {
  addDividerIfNeeded(m.ts);
  if (m.from === 'sys') {
    stream.appendChild(el(
      `<div class="sys-msg"><span class="pill">${escapeHtml(m.text)}<span class="t">${fmtTime(m.ts)}</span></span></div>`
    ));
  } else if (m.type === 'sticker') {
    const row = el(`<div class="row nova">
      <div class="ava"><img src="./assets/avatar-nova.png" alt=""></div>
      <img class="sticker-msg" src="./assets/sticker-${(m.stickerIdx % 4) + 1}.png" alt="表情包" title="${escapeHtml(m.name || '')}">
    </div>`);
    stream.appendChild(row);
  } else {
    const side = m.from === 'me' ? 'me' : 'nova';
    const ava = side === 'me'
      ? `<div class="ava" style="display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-deep);font-size:13px">我</div>`
      : `<div class="ava"><img src="./assets/avatar-nova.png" alt=""></div>`;
    stream.appendChild(el(
      `<div class="row ${side}">${ava}
        <div class="bubble-wrap">
          <div class="bubble">${escapeHtml(m.text)}</div>
          <div class="meta">${fmtTime(m.ts)}</div>
        </div>
      </div>`
    ));
  }
  scrollBottom();
}

function scrollBottom() { requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; }); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pushMessage(m) {
  m.id = m.id || `${Date.now()}-${Math.floor(rnd() * 1e6)}`;
  m.ts = m.ts || Date.now();
  state.messages.push(m);
  if (state.messages.length > 300) state.messages = state.messages.slice(-300);
  save();
  renderMessage(m);
}

function replayMessages() {
  stream.innerHTML = '';
  lastDayDivider = '';
  for (const m of state.messages) renderMessage(m);
}

/* ---------------- 打字指示器 ---------------- */
let typingEl = null;
function showTyping() {
  hideTyping();
  typingEl = el(`<div class="row nova">
    <div class="ava"><img src="./assets/avatar-nova.png" alt=""></div>
    <div class="bubble typing" style="border-bottom-left-radius:5px"><i></i><i></i><i></i></div>
  </div>`);
  stream.appendChild(typingEl);
  scrollBottom();
}
function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

/* ---------------- 核心：传讯回复引擎 ----------------
   ① 用户发送后触发
   ② 3% 对方拍一拍
   ③ 发几条字卡：1条75% / 2条20% / 3条5%
   ④ 每条字卡 20% 概率附带表情包（库非空）
   ⑤ 每条字卡 20% 概率附带 emoji（库非空）
      混合模式开：emoji 拼接在文字前/后（各50%）
      混合模式关：emoji 单独成条
----------------------------------------------------- */
let lastCard = '';
function drawCard() {
  if (!state.cards.length) return null;
  if (state.cards.length === 1) return state.cards[0];
  let c = pick(state.cards), guard = 0;
  while (c === lastCard && guard++ < 10) c = pick(state.cards);
  lastCard = c;
  return c;
}

function drawStickerIdx() {
  const n = (state.stickerNames || []).length;
  return n ? Math.floor(rnd() * n) : -1;
}

async function novaReply() 
if (state.settings.readNoReply && rnd() < 0.35) {
  await delay(randBetween(800, 1500));
  showTyping();
  await delay(randBetween(1500, 3500));
  hideTyping();
  pushMessage({ from: 'sys', text: '对方已读，但没有回复' });
  return;
}
{
  const lo = state.settings.replyDelayMin * 1000;
const hi = state.settings.replyDelayMax * 1000;
await delay(hi > lo ? randBetween(lo, hi) : 700);;   // 对方“正在输入”
  showTyping();

  if (rnd() < 0.03) {                    // ② 拍一拍
    await delay(randBetween(900, 1600));
    hideTyping();
    patEvent(false);
    return;
  }

  const r = rnd();                       // ③ 条数
  const count = r < 0.75 ? 1 : r < 0.95 ? 2 : 3;

  for (let i = 0; i < count; i++) {
    await delay(randBetween(900, 2200));
    hideTyping();

    const card = drawCard();
    if (!card) {
      pushMessage({ from: 'sys', text: '字卡库是空的，去设置里添几句话吧。' });
      return;
    }

    let text = card;
    let emojiExtra = null;
    if (state.emojis.length && rnd() < 0.2) {          // ⑤ emoji
      const e = pick(state.emojis);
      if (state.settings.mixMode) {
        text = rnd() < 0.5 ? e + ' ' + text : text + ' ' + e;   // 前后各 50%
      } else {
        emojiExtra = e;                                     // 单独一条
      }
    }
    pushMessage({ from: 'nova', type: 'text', text });
    maybeNotify(text);

    if (state.settings.stickers && state.stickerNames.length && rnd() < 0.2) {  // ④ 表情包
      await delay(randBetween(450, 900));
      const idx = drawStickerIdx();
      if (idx >= 0) {
        pushMessage({ from: 'nova', type: 'sticker', stickerIdx: idx, name: state.stickerNames[idx] });
        maybeNotify('[表情包] ' + state.stickerNames[idx]);
      }
    }
    if (emojiExtra) {
      await delay(randBetween(400, 800));
      pushMessage({ from: 'nova', type: 'text', text: emojiExtra });
      maybeNotify(emojiExtra);
    }
    if (i < count - 1) showTyping();
  }
}

/* 拍一拍：fromMe=true 表示用户拍对方 */
function patEvent(fromMe) {
  const name = state.settings.partnerName;
  if (fromMe) {
    pushMessage({ from: 'sys', text: `你拍了拍「${name}」` });
    $('#peerAva').classList.remove('patted'); void $('#peerAva').offsetWidth;
    $('#peerAva').classList.add('patted');
    if (rnd() < 0.5) setTimeout(novaReply, randBetween(800, 2000));
  } else {
    pushMessage({ from: 'sys', text: `「${name}」拍了拍你` });
    $('#app').animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }],
      { duration: 380, easing: 'ease-out' }
    );
  }
}

/* ---------------- ⑦ 状态更新：每隔 1~8 小时 ---------------- */
const HOUR = 3600e3;
function statusTick() {
  const now = Date.now();
  if (!state.lastStatusCheck) {
    state.lastStatusCheck = now;
    state.nextStatusIn = (1 + rnd() * 7) * HOUR;
    save();
    return;
  }
  if (now - state.lastStatusCheck < state.nextStatusIn) return;
  state.lastStatusCheck = now;
  state.nextStatusIn = (1 + rnd() * 7) * HOUR;
  if (state.statuses.length) {
    const total = state.statuses.reduce((s, g) => s + (g.weight || 1), 0);
    let r = rnd() * total, chosen = state.statuses[0];
    for (const g of state.statuses) { r -= (g.weight || 1); if (r <= 0) { chosen = g; break; } }
    if (chosen.items && chosen.items.length) {
      state.partnerStatus = pick(chosen.items);
      pushMessage({ from: 'sys', text: `${state.settings.partnerName} 更新了状态：「${state.partnerStatus}」` });
      updatePeerBar();
    }
  }
  save();
}

/* ---------------- ⑧ 心情日历：每天首次加载 ---------------- */
function moodTick() {
  const key = dayKey();
  if (key in state.moodLog) { updatePeerBar(); return; }
  if (rnd() < 0.20) {                       // 20% 跳过当天
    state.moodLog[key] = null;
  } else {
    state.moodLog[key] = state.moods.length ? pick(state.moods) : null;
    if (state.moodLog[key]) {
      setTimeout(() => pushMessage({
        from: 'sys',
        text: `${state.settings.partnerName} 今天的心情是 ${state.moodLog[key].emoji} ${state.moodLog[key].label}`,
      }), 2500);
    }
  }
  save();
  updatePeerBar();
}

function updatePeerBar() {
  const mood = state.moodLog[dayKey()];
  $('#peerMood').textContent = mood ? `${mood.emoji} ${mood.label}` : '';
  $('#moodDot').style.display = mood ? '' : 'none';
  $('#peerStatusText').textContent = state.partnerStatus ? `「${state.partnerStatus}」` : '';
  $('#peerName').textContent = state.settings.partnerName;
  $('#peerTag').textContent = state.settings.partnerTag || '';
  $('#callName').textContent = state.settings.partnerName;
  document.title = `${state.settings.partnerName} · Letter from Spring`;
}

/* ---------------- ⑨ 来电：每 15~60 分钟检查，25% 概率 ---------------- */
let callActive = false;
let ringAudio = null;

function callTick() {
  if (callActive) return;
  const now = Date.now();
  if (!state.lastCallCheck) {
    state.lastCallCheck = now;
    state.nextCallIn = (15 + rnd() * 45) * 60e3;
    save();
    return;
  }
  if (now - state.lastCallCheck < state.nextCallIn) return;
  state.lastCallCheck = now;
  state.nextCallIn = (15 + rnd() * 45) * 60e3;
  save();
  if (rnd() < 0.25) incomingCall();
}
          
function startRing() {
  stopRing();
  ringAudio = new Audio('https://music.163.com/song/media/outer/url?id=40249284.mp3');
  ringAudio.loop = true;
  ringAudio.volume = 0.5;
  ringAudio.play().catch(() => {});
}
function stopRing() { if (ringAudio) { ringAudio.pause(); ringAudio = null; } }

function incomingCall() {
  if (callActive) return;
  callActive = true;
  const layer = $('#callLayer'), sub = $('#callSub'), timer = $('#callTimer'), acts = $('#callActions');
  layer.classList.add('on');
  $('#callAva').classList.add('ringing');
  sub.textContent = '语音来电…';
  timer.textContent = '';
  acts.innerHTML = `
    <div class="call-btn-col"><button class="call-btn reject" id="callReject" aria-label="拒绝">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(135deg)"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button><small>拒绝</small></div>
    <div class="call-btn-col"><button class="call-btn accept" id="callAccept" aria-label="接听">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button><small>接听</small></div>`;
  startRing();
  $('#callReject').onclick = () => { endCall(null); pushMessage({ from: 'sys', text: '你拒绝了一通来电' }); };
  $('#callAccept').onclick = () => connectCall(true);
}

let callTimerInt = null;
function connectCall(incoming) {
  stopRing();
  $('#callAva').classList.remove('ringing');
  const sub = $('#callSub'), timer = $('#callTimer'), acts = $('#callActions');
  sub.textContent = incoming ? '通话中' : '正在呼叫…';
  let secs = 0;
  timer.textContent = '00:00';
  clearInterval(callTimerInt);
  callTimerInt = setInterval(() => {
    secs++;
    timer.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }, 1000);
  acts.innerHTML = `
    <div class="call-btn-col"><button class="call-btn reject" id="callHangup" aria-label="挂断">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(135deg)"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button><small>挂断</small></div>`;
  $('#callHangup').onclick = () => {
    const dur = timer.textContent;
    endCall(dur);
    pushMessage({ from: 'sys', text: `通话结束 · ${dur}` });
  };
}

function endCall(duration) {
  callActive = false;
  clearInterval(callTimerInt);
  stopRing();
  $('#callLayer').classList.remove('on');
  $('#callAva').classList.remove('ringing');
  $('#callTimer').textContent = '';
}

/* 用户主动拨打：35% 被挂断 */
$('#btnCall').addEventListener('click', () => {
  if (callActive) return;
  callActive = true;
  const layer = $('#callLayer'), sub = $('#callSub'), acts = $('#callActions');
  layer.classList.add('on');
  $('#callAva').classList.add('ringing');
  sub.textContent = '正在呼叫…';
  acts.innerHTML = `
    <div class="call-btn-col"><button class="call-btn reject" id="callCancel" aria-label="取消">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(135deg)"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button><small>取消</small></div>`;
  startRing();
  $('#callCancel').onclick = () => { endCall(null); pushMessage({ from: 'sys', text: '你取消了呼叫' }); };
  setTimeout(() => {
    if (!callActive) return;
    if (rnd() < 0.35) {
      endCall(null);
      pushMessage({ from: 'sys', text: '对方挂断了电话' });
    } else {
      connectCall(false);
      setTimeout(() => { $('#callSub').textContent = '通话中'; }, 800);
    }
  }, randBetween(2500, 5000));
});

/* ---------------- 发送 ---------------- */
const input = $('#input');
function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  pushMessage({ from: 'me', type: 'text', text });
  novaReply();
}
$('#btnSend').addEventListener('click', send);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

/* 双击头像拍一拍 */
let lastTap = 0;
$('#peerAva').addEventListener('click', () => {
  const now = Date.now();
  if (now - lastTap < 320) patEvent(true);
  lastTap = now;
});

/* ---------------- 弹窗通知 ---------------- */
async function setNotify(on) {
  if (on) {
    if (!('Notification' in window)) { toast('这个浏览器不支持通知'); return false; }
    let perm = Notification.permission;
    if (perm !== 'granted') perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('通知权限被拒绝，请在浏览器设置中允许'); return false; }
    // 同意后立刻发一条测试通知
    try { new Notification('Letter from Spring', { body: '通知已开启 🎐 来消息时会提醒你', icon: './assets/avatar-nova.png' }); } catch {}
    state.settings.notify = true;
    toast('弹窗通知已开启');
  } else {
    state.settings.notify = false;
    toast('弹窗通知已关闭');
  }
  save();
  renderSettings();
  return true;
}
function maybeNotify(text) {
  if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try { new Notification(`${state.settings.partnerName}`, { body: text.slice(0, 60), icon: './assets/avatar-nova.png' }); } catch {}
}

/* ---------------- 后台挂活音频 ---------------- */
const kaAudio = $('#keepAliveAudio');
function setKeepAlive(on) {
  state.settings.keepAlive = on;
  save();
  if (on) {
    kaAudio.volume = 0.1;
    kaAudio.play().then(() => toast('后台挂活已开启（循环播放中）')).catch(() => {
      state.settings.keepAlive = false; save(); renderSettings();
      toast('浏览器拦截了自动播放，请再试一次');
    });
  } else {
    kaAudio.pause();
    toast('后台挂活已关闭');
  }
  renderSettings();
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------------- 设置抽屉 ---------------- */
const drawer = $('#drawer'), scrim = $('#scrim'), drawerBody = $('#drawerBody');
function openDrawer() { renderSettings(); drawer.classList.add('on'); scrim.classList.add('on'); }
function closeDrawer() { drawer.classList.remove('on'); scrim.classList.remove('on'); }
$('#btnSettings').addEventListener('click', openDrawer);
$('#btnCloseDrawer').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);

const switchHtml = (id, on) => `<button class="switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}" aria-label="开关"></button>`;

function libHtml(listId, items, renderItem) {
  const rows = items.map((it, i) => renderItem(it, i)).join('');
  return `<div class="set-card" style="margin-bottom:8px">
    <div id="${listId}">${rows || '<div class="empty-hint">空空如也</div>'}</div>
    <div class="add-line">
      <input id="${listId}-add" type="text" placeholder="添加一条…" enterkeyhint="done">
      <button id="${listId}-btn">添加</button>
    </div>
  </div>`;
}
const delBtn = (act, i) => `<button class="del-btn" data-act="${act}" data-i="${i}" aria-label="删除">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;

function moodCalendarHtml() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const wkName = ['日', '一', '二', '三', '四', '五', '六'];
  let cells = wkName.map(w => `<div class="mood-cell" style="border:none;background:none;font-weight:600">${w}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) cells += '<div class="mood-cell empty"></div>';
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const log = state.moodLog[key];
    const todayCls = key === dayKey() ? ' today' : '';
    cells += log
      ? `<div class="mood-cell${todayCls}"><span class="m">${log.emoji}</span><span>${log.label}</span></div>`
      : `<div class="mood-cell${todayCls}"><span>${d}</span></div>`;
  }
  return `<div class="mood-grid">${cells}</div>
    <div style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center">${y} 年 ${m + 1} 月 · 每天首次打开时记录心情（20% 概率留白）</div>`;
}

function renderSettings() {
  const s = state.settings;
  drawerBody.innerHTML = `
    <section class="set-sec">
      <h3>运行</h3>
      <div class="set-card">
        <div class="set-row">
          <div class="grow"><div class="label">后台挂活</div>
          <div class="desc">循环播放轻音乐，尽量让页面在后台保持活跃</div></div>
          ${switchHtml('sw-keepalive', s.keepAlive)}
        </div>
        <div class="set-row">
          <div class="grow"><div class="label">弹窗通知</div>
          <div class="desc">开启后立即发送一条测试通知</div></div>
          ${switchHtml('sw-notify', s.notify && ('Notification' in window) && Notification.permission === 'granted')}
        </div>
        <div class="set-row">
          <div class="grow"><div class="label">Emoji 混合模式</div>
          <div class="desc">开：emoji 拼在字卡文字前/后 · 关：单独发送</div></div>
          ${switchHtml('sw-mix', s.mixMode)}
        </div>
        <div class="set-row">
          <div class="grow"><div class="label">表情包</div>
          <div class="desc">字卡后 20% 概率附带一张贴纸</div></div>
          ${switchHtml('sw-stickers', s.stickers)}
        </div>
      </div>
      <div class="set-card" style="margin-top:8px">
        <div class="set-row">
          <div class="grow"><div class="label">角色称呼</div></div>
          <input id="inp-name" type="text" value="${escapeHtml(s.partnerName)}" maxlength="12"
            style="width:110px;border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-size:13px;background:#fff;outline:none;text-align:right">
        </div>
        <div class="set-row">
          <div class="grow"><div class="label">角色标签</div></div>
          <input id="inp-tag" type="text" value="${escapeHtml(s.partnerTag)}" maxlength="20"
            style="width:150px;border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-size:13px;background:#fff;outline:none;text-align:right">
        </div>
      </div>
    </section>

    <section class="set-sec">
      <h3>字卡库 · ${state.cards.length} 条</h3>
      ${libHtml('lib-cards', state.cards, (c, i) =>
        `<div class="lib-item"><span class="txt">${escapeHtml(c)}</span>${delBtn('card', i)}</div>`)}
    </section>

    <section class="set-sec">
      <h3>状态库 · 按权重随机</h3>
      <div id="lib-statuses"></div>
      <div class="btn-row">
        <button class="btn" id="btn-addgrp">＋ 新建分组</button>
      </div>
    </section>

    <section class="set-sec">
      <h3>表情库 · Emoji</h3>
      ${libHtml('lib-emojis', state.emojis, (c, i) =>
        `<div class="lib-item"><span class="txt" style="font-size:17px">${escapeHtml(c)}</span>${delBtn('emoji', i)}</div>`)}
    </section>

    <section class="set-sec">
      <h3>心情库 · Mood</h3>
      ${libHtml('lib-moods', state.moods, (c, i) =>
        `<div class="lib-item"><span class="txt">${escapeHtml(c.emoji)} ${escapeHtml(c.label)}</span>${delBtn('mood', i)}</div>`)}
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="lib-moods-emo" type="text" maxlength="4" placeholder="🌧️"
          style="width:64px;border:1px solid var(--line);border-radius:99px;padding:7px 10px;font-size:14px;background:#fff;outline:none;text-align:center">
      </div>
    </section>

    <section class="set-sec">
      <h3>心情日历</h3>
      <div class="set-card" style="padding:12px">${moodCalendarHtml()}</div>
    </section>

    <section class="set-sec">
      <h3>备份</h3>
      <div class="btn-row">
        <button class="btn primary" id="btn-export">导出备份</button>
        <button class="btn" id="btn-import">导入备份</button>
        <input id="file-import" type="file" accept=".json,application/json" hidden>
      </div>
      <div class="btn-row">
        <button class="btn danger" id="btn-reset">清空全部数据</button>
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.8">
        所有数据只保存在这台设备的浏览器里（localStorage），换设备或清缓存前请先导出备份。
      </div>
    </section>
  `;

  bindSettings();
}

function renderStatusGroups() {
  const box = $('#lib-statuses');
  if (!box) return;
  box.innerHTML = state.statuses.map((g, gi) => `
    <div class="set-card" style="margin-bottom:8px">
      <div class="grp-head">
        <span class="gname">${escapeHtml(g.name)}</span>
        <span style="color:var(--text-3)">权重</span>
        <input type="number" min="1" max="999" value="${g.weight || 1}" data-gi="${gi}" class="grp-weight">
        ${delBtn('grp', gi)}
      </div>
      ${g.items.map((it, ii) => `<div class="lib-item"><span class="txt">${escapeHtml(it)}</span>${delBtn('sitem', gi + '-' + ii)}</div>`).join('') || '<div class="empty-hint">分组是空的</div>'}
      <div class="add-line">
        <input type="text" placeholder="添加状态…" data-gi="${gi}" class="sitem-add" enterkeyhint="done">
        <button data-gi="${gi}" class="sitem-btn">添加</button>
      </div>
    </div>`).join('') || '<div class="empty-hint">状态库是空的</div>';
}

function bindSettings() {
  const s = state.settings;
  $('#sw-keepalive').onclick = () => setKeepAlive(!state.settings.keepAlive);
  $('#sw-notify').onclick = () => setNotify(!state.settings.notify);
  $('#sw-mix').onclick = () => { s.mixMode = !s.mixMode; save(); renderSettings(); };
  $('#sw-stickers').onclick = () => { s.stickers = !s.stickers; save(); renderSettings(); };
  $('#inp-name').onchange = (e) => { s.partnerName = e.target.value.trim() || 'Nova'; save(); updatePeerBar(); renderSettings(); };
  $('#inp-tag').onchange = (e) => { s.partnerTag = e.target.value.trim(); save(); updatePeerBar(); renderSettings(); };

  // 字卡 / emoji / 心情 添加与删除
  const bindSimpleList = (listId, arr, getVal, after) => {
    const btn = $(`#${listId}-btn`), inp = $(`#${listId}-add`);
    const doAdd = () => {
      const v = getVal(inp.value.trim());
      if (v === null || v === '' || (typeof v === 'object' && !v.label)) { toast('内容不能为空'); return; }
      arr.push(v); save(); renderSettings(); after && after();
    };
    if (btn) btn.onclick = doAdd;
    if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') doAdd(); };
  };
  bindSimpleList('lib-cards', state.cards, v => v);
  bindSimpleList('lib-emojis', state.emojis, v => v);
  bindSimpleList('lib-moods', state.moods, v => {
    const emo = ($('#lib-moods-emo')?.value.trim()) || v.match(/\p{Extended_Pictographic}/u)?.[0] || '';
    const label = v.replace(/\p{Extended_Pictographic}/gu, '').trim() || v;
    return emo ? { emoji: emo, label } : null;
  });

  drawerBody.querySelectorAll('.del-btn').forEach(b => {
    b.onclick = () => {
      const { act, i } = b.dataset;
      if (act === 'card') state.cards.splice(+i, 1);
      else if (act === 'emoji') state.emojis.splice(+i, 1);
      else if (act === 'mood') state.moods.splice(+i, 1);
      else if (act === 'grp') state.statuses.splice(+i, 1);
      else if (act === 'sitem') {
        const [gi, ii] = i.split('-').map(Number);
        state.statuses[gi]?.items.splice(ii, 1);
      }
      save(); renderSettings(); renderStatusGroups();
    };
  });

  renderStatusGroups();
  drawerBody.querySelectorAll('.grp-weight').forEach(inp => {
    inp.onchange = () => {
      const g = state.statuses[+inp.dataset.gi];
      if (g) { g.weight = Math.max(1, Math.min(999, +inp.value || 1)); save(); }
    };
  });
  drawerBody.querySelectorAll('.sitem-btn').forEach(btn => {
    btn.onclick = () => {
      const inp = drawerBody.querySelector(`.sitem-add[data-gi="${btn.dataset.gi}"]`);
      const v = inp.value.trim();
      if (!v) { toast('内容不能为空'); return; }
      state.statuses[+btn.dataset.gi].items.push(v);
      save(); renderSettings(); renderStatusGroups();
    };
  });
  drawerBody.querySelectorAll('.sitem-add').forEach(inp => {
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const v = inp.value.trim();
        if (!v) return;
        state.statuses[+inp.dataset.gi].items.push(v);
        save(); renderSettings(); renderStatusGroups();
      }
    };
  });
  $('#btn-addgrp').onclick = () => {
    state.statuses.push({ name: `分组 ${state.statuses.length + 1}`, weight: 10, items: [] });
    save(); renderSettings(); renderStatusGroups();
  };

  // 备份
  $('#btn-export').onclick = exportBackup;
  $('#btn-import').onclick = () => $('#file-import').click();
  $('#file-import').onchange = importBackup;
  $('#btn-reset').onclick = () => {
    if (confirm('确定清空全部数据吗？聊天记录、字卡库、心情日历都会被删除，且不可恢复。')) {
      localStorage.removeItem(STORE_KEY);
      location.reload();
    }
  };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `letter-from-spring-backup-${dayKey().replaceAll('-', '')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('备份文件已下载');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.cards)) throw new Error('bad file');
      state = { ...structuredClone(DEFAULTS), ...data };
      state.settings = { ...DEFAULTS.settings, ...(data.settings || {}) };
      save();
      replayMessages(); updatePeerBar(); renderSettings();
      toast('备份已恢复');
    } catch { toast('备份文件无法识别'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ---------------- 启动 ---------------- */
function boot() {
  loadState();
  replayMessages();
  updatePeerBar();
  moodTick();
  statusTick();

  if (!state.welcomed) {
    state.welcomed = true;
    save();
    pushMessage({ from: 'sys', text: '— 你收到了一封来自春天的信 —' });
    setTimeout(() => { showTyping(); }, 1200);
    setTimeout(() => { hideTyping(); pushMessage({ from: 'nova', type: 'text', text: '嗨，是我。春天到了，我来看看你。' }); }, 3200);
  }

  // 周期任务：状态检查 / 来电检查（每分钟看一眼）
  setInterval(() => { statusTick(); callTick(); }, 60e3);

  // 挂活音频被系统打断后自动续播
  kaAudio.addEventListener('pause', () => {
    if (state.settings.keepAlive && !kaAudio.ended) {
      kaAudio.play().catch(() => {});
    }
  });
  if (state.settings.keepAlive) { kaAudio.volume = 0.1; kaAudio.play().catch(() => {}); }
}
boot();

/* 内部调试/测试钩子 */
window.__lfs = { incomingCall, novaReply, patEvent, pushMessage, get state() { return state; } };
