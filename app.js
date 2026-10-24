// ことばの森 English 試作品
// 教材は data/ 以下のJSONから読み込み、学習履歴は端末内（localStorage）に保存する。
(function () {
  'use strict';

  const STORE_KEY = 'kotobanomori:v1';
  const DATA_BASE = 'data/';
  const CHOICES = 4;
  const HISTORY_LIMIT = 200;

  const app = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');
  const M = window.Mofurun;

  let courses = [];
  const lessonCache = {};
  let store = loadStore();
  let view = { name: 'loading' };

  /* ---------- 保存 ---------- */

  function freshStore() {
    return {
      version: 1,
      lessons: {},   // lessonId -> { best, total, attempts, last }
      words: {},     // wordId   -> { correct, wrong, learned }
      mistakes: {},  // wordId   -> { lessonId, count, last }
      history: [],   // { at, lessonId, mode, score, total, seconds }
      days: [],      // 学習した日 'YYYY-MM-DD'
      settings: { sound: true }
    };
  }

  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.version === 1) return Object.assign(freshStore(), s);
    } catch (e) { /* 保存領域が使えない環境でも動かす */ }
    return freshStore();
  }

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* noop */ }
  }

  /* ---------- 教材の読み込み ---------- */

  async function getJSON(path) {
    const res = await fetch(DATA_BASE + path);
    if (!res.ok) throw new Error(path + ' を読み込めませんでした (' + res.status + ')');
    return res.json();
  }

  async function loadCourses() {
    const data = await getJSON('courses.json');
    courses = data.courses;
  }

  function findLessonRef(lessonId) {
    for (const c of courses) {
      const ref = c.lessons.find(l => l.id === lessonId);
      if (ref) return ref;
    }
    return null;
  }

  async function ensureLesson(lessonId) {
    if (lessonCache[lessonId]) return lessonCache[lessonId];
    const ref = findLessonRef(lessonId);
    if (!ref) throw new Error('レッスン ' + lessonId + ' が見つかりません');
    const lesson = await getJSON(ref.file);
    lesson.words.forEach(w => { w.lessonId = lesson.id; });
    lessonCache[lessonId] = lesson;
    return lesson;
  }

  // いま選んでいるコース（未選択なら最初に使えるコース）
  function currentCourse() {
    return courses.find(c => c.id === store.settings.courseId && c.status === 'available')
      || courses.find(c => c.status === 'available');
  }

  function loadCourseLessons(course) {
    return Promise.all(course.lessons.map(r => ensureLesson(r.id)));
  }

  const shortLevel = label => label.replace(/英検|相当/g, '');

  /* ---------- 小さな道具 ---------- */

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function streak() {
    const set = new Set(store.days);
    const d = new Date();
    if (!set.has(today(d))) d.setDate(d.getDate() - 1); // 今日まだでも昨日まで続いていれば数える
    let n = 0;
    while (set.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function learnedCount(words) {
    return words.filter(w => store.words[w.id] && store.words[w.id].learned).length;
  }

  function mistakeCount() {
    return Object.keys(store.mistakes).length;
  }

  function formatMinutes(sec) {
    const m = Math.round(sec / 60);
    return m < 1 ? '1分未満' : m + '分';
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------- 発音 ---------- */
  // 教材に audio（事前収録の音声ファイル）があればそれを使い、無ければ端末の読み上げを使う。

  function speak(text, audio) {
    if (!store.settings.sound) return;
    if (audio) {
      try { new Audio(DATA_BASE + audio).play(); return; } catch (e) { /* 読み上げにフォールバック */ }
    }
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    const voice = speechSynthesis.getVoices().find(v => /^en(-|_)US/i.test(v.lang) && v.localService)
      || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  const icon = {
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" fill="currentColor"/><path d="M5 19l8-8" stroke="var(--card)" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  function speakBtn(text, audio, label) {
    return `<button class="speak" data-action="speak" data-text="${esc(text)}" ${audio ? `data-audio="${esc(audio)}"` : ''} aria-label="${esc(label || text + ' を聞く')}">${icon.speaker}</button>`;
  }

  /* ---------- モフルンのことば ---------- */

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'こんな時間まで、えらいね。少しだけ学ぼうか。';
    if (h < 11) return 'おはよう！今日も森で、ことばをひとつ見つけよう。';
    if (h < 17) return 'こんにちは！5分だけ、いっしょに学ぼう。';
    return 'こんばんは。今日のしめくくりに、ひとつ覚えていこう。';
  }

  function resultLine(score, total) {
    const r = score / total;
    if (r === 1) return { mood: 'happy', text: 'ぜんぶ正解！森じゅうに聞こえるくらい、うれしいよ。' };
    if (r >= 0.6) return { mood: 'happy', text: 'よくできたね！まちがえたところは、あとで復習しよう。' };
    if (r >= 0.34) return { mood: 'cheer', text: 'いい調子。もう一度やると、ぐっと覚えられるよ。' };
    return { mood: 'cheer', text: 'だいじょうぶ、はじめはみんなこう。いっしょにもう一回やろう。' };
  }

  /* ---------- 画面の切り替え ---------- */

  function go(next) {
    view = next;
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const screens = { loading: renderLoading, error: renderError, home: renderHome, learn: renderLearn, quiz: renderQuiz, result: renderResult, review: renderReview, record: renderRecord };
    app.innerHTML = (screens[view.name] || renderHome)();
    const focused = ['learn', 'quiz'].includes(view.name);
    tabbar.hidden = focused;
    document.body.classList.toggle('is-focused', focused);
    tabbar.querySelectorAll('[data-tab]').forEach(b => {
      b.setAttribute('aria-current', b.dataset.tab === view.name ? 'page' : 'false');
    });
    const badge = tabbar.querySelector('.tab__badge');
    const n = mistakeCount();
    badge.textContent = n;
    badge.hidden = n === 0;
    updateNet();
  }

  function renderLoading() {
    return `<div class="center-state">${M.svg('think')}<p>教材を準備しています…</p></div>`;
  }

  function renderError() {
    return `<div class="center-state">${M.svg('cheer')}<p>${esc(view.message)}</p>
      <p class="muted">はじめて開くときはインターネット接続が必要です。接続を確認して、もう一度お試しください。</p>
      <button class="btn btn--primary" data-action="reload">再読み込み</button></div>`;
  }

  /* ---------- ホーム ---------- */

  function nextMission(course) {
    // 未学習のレッスンを順に。全部終わっていたらベストが低いものを。
    const refs = course.lessons;
    const untouched = refs.find(r => !store.lessons[r.id]);
    if (untouched) return untouched.id;
    return refs.slice().sort((a, b) => {
      const A = store.lessons[a.id], B = store.lessons[b.id];
      return (A.best / A.total) - (B.best / B.total) || A.last - B.last;
    })[0].id;
  }

  function renderHome() {
    const course = currentCourse();
    const lessons = course.lessons.map(r => lessonCache[r.id]).filter(Boolean);
    const allWords = lessons.flatMap(l => l.words);
    const learned = learnedCount(allWords);
    const missionId = nextMission(course);
    const mission = lessonCache[missionId];
    const doneToday = store.days.includes(today());
    const reviewN = mistakeCount();
    const pct = allWords.length ? Math.round((learned / allWords.length) * 100) : 0;

    return `
    <header class="topbar">
      <div class="brand"><span class="brand__mark">${icon.leaf}</span><span>ことばの森 <em>English</em></span></div>
      <span class="net" id="net-status"></span>
    </header>

    <section class="hero">
      <div class="hero__mofu">${M.svg(doneToday ? 'happy' : 'normal')}</div>
      <p class="bubble">${doneToday ? '今日もがんばったね！もう少しやってみる？' : greeting()}</p>
    </section>

    <nav class="course-nav">
      <div class="course-tabs" role="group" aria-label="コースをえらぶ">
        ${courses.map(c => `<button class="course-tab" data-action="pick-course" data-course="${esc(c.id)}" aria-pressed="${c.id === course.id}" ${c.status !== 'available' ? 'disabled' : ''}>
          <strong>${esc(shortLevel(c.levelLabel))}</strong><small>${c.status === 'available' ? esc(c.title) : '準備中'}</small>
        </button>`).join('')}
      </div>
    </nav>

    <section class="mission card">
      <p class="eyebrow">今日のミッション</p>
      <h2 class="mission__title">「${esc(mission.title)}」のことばを${mission.words.length}つ学ぼう</h2>
      <p class="muted">${esc(mission.subtitle)}・約5分</p>
      <button class="btn btn--primary btn--block" data-action="start-learn" data-lesson="${esc(mission.id)}">学習をはじめる</button>
      ${reviewN ? `<button class="btn btn--soft btn--block" data-action="tab" data-tab="review">まちがえた${reviewN}問を復習する</button>` : ''}
    </section>

    <section class="progress">
      <div class="stat stat--wide">
        <div class="stat__row"><span class="stat__label">覚えたことば</span><span class="stat__value">${learned}<small> / ${allWords.length}</small></span></div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="覚えたことばの割合"><span style="width:${pct}%"></span></div>
      </div>
      <div class="stat"><span class="stat__label">連続学習</span><span class="stat__value">${streak()}<small>日</small></span></div>
      <div class="stat"><span class="stat__label">復習まち</span><span class="stat__value">${reviewN}<small>問</small></span></div>
    </section>

    <section class="course">
      <div class="section-head">
        <h2>${esc(course.title)}</h2><span class="chip">${esc(course.levelLabel)}</span>
      </div>
      <p class="muted course__desc">${esc(course.description)}</p>
      <ul class="lesson-list">
        ${lessons.map(l => {
          const p = store.lessons[l.id];
          const lw = learnedCount(l.words);
          return `<li><button class="lesson" data-action="start-learn" data-lesson="${esc(l.id)}">
            <span class="lesson__kind lesson__kind--${esc(l.kind)}">${l.kind === 'phrase' ? 'フレーズ' : '単語'}</span>
            <span class="lesson__body"><strong>${esc(l.title)}</strong><span class="muted">${esc(l.subtitle)}</span></span>
            <span class="lesson__meta">${p ? `<span class="score">${p.best}/${p.total}</span>` : '<span class="muted">未学習</span>'}
              <span class="dots" aria-label="${lw}/${l.words.length}語 覚えた">${l.words.map(w => `<i class="${store.words[w.id] && store.words[w.id].learned ? 'on' : ''}"></i>`).join('')}</span>
            </span>
          </button></li>`;
        }).join('')}
      </ul>
    </section>`;
  }

  /* ---------- 単語学習 ---------- */

  async function startLearn(lessonId) {
    const lesson = await ensureLesson(lessonId);
    go({ name: 'learn', lesson, index: 0, startedAt: Date.now() });
    autoSpeak();
  }

  function autoSpeak() {
    const w = view.lesson.words[view.index];
    setTimeout(() => speak(w.en, w.audio), 250);
  }

  function stepper(i, n) {
    return `<div class="stepper" aria-label="${n}中${i + 1}">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>`;
  }

  function renderLearn() {
    const { lesson, index } = view;
    const w = lesson.words[index];
    const last = index === lesson.words.length - 1;
    return `
    <header class="focusbar">
      <button class="icon-btn" data-action="home" aria-label="やめてホームにもどる">${icon.close}</button>
      ${stepper(index, lesson.words.length)}
      <span class="focusbar__count">${index + 1}/${lesson.words.length}</span>
    </header>

    <p class="eyebrow center">${esc(lesson.title)}・ことばを学ぶ</p>
    <article class="word-card card">
      <span class="pos">${esc(w.pos)}</span>
      <div class="word-card__en ${lesson.kind === 'phrase' ? 'is-phrase' : ''}" lang="en">${esc(w.en)}</div>
      ${speakBtn(w.en, w.audio)}
      <div class="word-card__ja">${esc(w.ja)}</div>
      ${w.example ? `<div class="example">
        <div class="example__en" lang="en">${esc(w.example.en)}</div>
        <div class="example__row"><span class="example__ja">${esc(w.example.ja)}</span>${speakBtn(w.example.en, w.example.audio, '例文を聞く')}</div>
      </div>` : ''}
    </article>

    <div class="tip ${w.note ? 'tip--note' : ''}">${M.svg(w.note ? 'think' : 'normal')}<p>${w.note
      ? `<strong>ポイント</strong>${esc(w.note)}`
      : index === 0 ? '音を聞いて、声に出してまねしてみよう。' : '例文の中で、どこに出てくるか見てみてね。'}</p></div>

    <div class="nav-row">
      <button class="btn btn--ghost" data-action="learn-prev" ${index === 0 ? 'disabled' : ''}>まえへ</button>
      ${last
        ? `<button class="btn btn--primary" data-action="start-quiz">クイズにすすむ</button>`
        : `<button class="btn btn--primary" data-action="learn-next">つぎへ</button>`}
    </div>`;
  }

  /* ---------- クイズ ---------- */

  // 穴埋めで隠す部分（教材の blank、無ければ見出し語）
  const blankOf = w => w.blank || w.en;

  // 文頭の大文字で答えがばれないよう、選択肢は小文字始まりにそろえる（I は除く）
  const clozeLabel = s => /^I(\b|')/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);

  function clozeSentence(w) {
    if (!w.example) return null;
    const b = blankOf(w);
    const i = w.example.en.toLowerCase().indexOf(b.toLowerCase());
    if (i < 0) return null;
    return { before: w.example.en.slice(0, i), after: w.example.en.slice(i + b.length) };
  }

  function makeQuestion(word, pool, type) {
    if (type === 'cloze' && !clozeSentence(word)) type = 'en2ja';
    const pickText = type === 'en2ja' ? w => w.ja : type === 'ja2en' ? w => w.en : w => clozeLabel(blankOf(w));
    const answer = pickText(word);
    const seen = new Set([answer]);
    const wrong = [];
    for (const o of shuffle(pool)) {
      if (wrong.length >= CHOICES - 1) break;
      const t = pickText(o);
      if (o.id !== word.id && !seen.has(t)) { seen.add(t); wrong.push(t); }
    }
    return { word, type, answer, choices: shuffle([answer].concat(wrong)) };
  }

  function buildQuestions(words) {
    // レッスンごとの出題形式（quiz）を順番に回す。指定が無ければ英→日と日→英
    return shuffle(words).map((w, i) => {
      const lesson = lessonCache[w.lessonId];
      const types = lesson.quiz && lesson.quiz.length ? lesson.quiz : ['en2ja', 'ja2en'];
      return makeQuestion(w, lesson.words, types[i % types.length]);
    });
  }

  function startQuiz(mode, words, lesson) {
    go({
      name: 'quiz', mode, lesson,
      questions: buildQuestions(words),
      index: 0, picked: null, results: [],
      startedAt: view.startedAt || Date.now()
    });
    autoSpeakQuestion();
  }

  function autoSpeakQuestion() {
    const q = view.questions[view.index];
    if (q.type === 'en2ja') setTimeout(() => speak(q.word.en, q.word.audio), 250);
  }

  function renderQuiz() {
    const { questions, index, picked, mode, lesson } = view;
    const q = questions[index];
    const answered = picked !== null;
    const ok = answered && picked === q.answer;
    const last = index === questions.length - 1;
    const asks = { en2ja: 'この英語の意味は？', ja2en: 'これを英語でいうと？', cloze: '空らんに入ることばは？' };
    const cz = q.type === 'cloze' ? clozeSentence(q.word) : null;
    const prompt = q.type === 'en2ja'
      ? `<div class="question__prompt is-en" lang="en">${esc(q.word.en)}</div>${speakBtn(q.word.en, q.word.audio)}`
      : q.type === 'ja2en'
        ? `<div class="question__prompt">${esc(q.word.ja)}</div>`
        : `<div class="question__cloze" lang="en">${esc(cz.before)}<span class="blank ${answered ? 'is-filled' : ''}">${answered ? esc(blankOf(q.word)) : ''}</span>${esc(cz.after)}</div>
           <p class="question__hint">${esc(q.word.example.ja)}</p>`;

    return `
    <header class="focusbar">
      <button class="icon-btn" data-action="home" aria-label="やめてホームにもどる">${icon.close}</button>
      ${stepper(index, questions.length)}
      <span class="focusbar__count">${index + 1}/${questions.length}</span>
    </header>

    <p class="eyebrow center">${mode === 'review' ? '復習クイズ' : esc(lesson.title) + '・4択クイズ'}</p>
    <section class="question card">
      <p class="question__ask">${asks[q.type]}</p>
      ${prompt}
    </section>

    <div class="choices" role="group" aria-label="選択肢">
      ${q.choices.map((c, i) => {
        let cls = '';
        if (answered) {
          if (c === q.answer) cls = 'is-correct';
          else if (c === picked) cls = 'is-wrong';
          else cls = 'is-dim';
        }
        return `<button class="choice ${cls}" data-action="pick" data-choice="${esc(c)}" ${answered ? 'disabled' : ''} ${q.type !== 'en2ja' ? 'lang="en"' : ''}>
          <span class="choice__key">${'ABCD'[i]}</span><span class="choice__label">${esc(c)}</span>
          ${answered && c === q.answer ? `<span class="choice__mark">${icon.check}</span>` : ''}
          ${answered && c === picked && !ok ? `<span class="choice__mark">${icon.cross}</span>` : ''}
        </button>`;
      }).join('')}
    </div>

    ${answered ? `
    <div class="feedback ${ok ? 'is-ok' : 'is-ng'}" role="status">
      <div class="feedback__mofu">${M.svg(ok ? 'happy' : 'cheer')}</div>
      <div class="feedback__body">
        <strong>${ok ? '正解！' : 'おしい！'}</strong>
        <span><span lang="en">${esc(q.word.en)}</span> ＝ ${esc(q.word.ja)}</span>
        ${ok ? '' : '<span class="muted">復習リストに入れておくね。</span>'}
      </div>
      <button class="btn btn--primary" data-action="quiz-next">${last ? '結果を見る' : 'つぎへ'}</button>
    </div>` : ''}`;
  }

  function pick(choice) {
    const q = view.questions[view.index];
    if (view.picked !== null) return;
    view.picked = choice;
    const ok = choice === q.answer;
    view.results.push({ word: q.word, ok });
    recordAnswer(q.word, ok);
    render();
    if (ok) {
      if (q.type === 'cloze') speak(q.word.example.en, q.word.example.audio);
      else speak(q.word.en, q.word.audio);
    }
    const btn = app.querySelector('[data-action="quiz-next"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  function recordAnswer(word, ok) {
    const w = store.words[word.id] || (store.words[word.id] = { correct: 0, wrong: 0, learned: false });
    if (ok) {
      w.correct++;
      w.learned = true;
      delete store.mistakes[word.id]; // 正解できたら復習リストから外す
    } else {
      w.wrong++;
      const m = store.mistakes[word.id] || (store.mistakes[word.id] = { lessonId: word.lessonId, count: 0 });
      m.count++;
      m.last = Date.now();
    }
    saveStore();
  }

  function finishQuiz() {
    const { results, mode, lesson, startedAt } = view;
    const score = results.filter(r => r.ok).length;
    const total = results.length;
    const seconds = Math.round((Date.now() - startedAt) / 1000);

    store.history.unshift({ at: Date.now(), lessonId: lesson ? lesson.id : null, lessonTitle: lesson ? lesson.title : null, mode, score, total, seconds });
    store.history = store.history.slice(0, HISTORY_LIMIT);
    if (mode === 'lesson') {
      const p = store.lessons[lesson.id];
      store.lessons[lesson.id] = {
        best: p ? Math.max(p.best, score) : score,
        total,
        attempts: (p ? p.attempts : 0) + 1,
        last: Date.now()
      };
    }
    if (!store.days.includes(today())) store.days.push(today());
    saveStore();

    go({ name: 'result', mode, lesson, results, score, total, seconds });
  }

  /* ---------- 結果 ---------- */

  function renderResult() {
    const { results, score, total, mode, lesson, seconds } = view;
    const line = resultLine(score, total);
    const right = results.filter(r => r.ok);
    const wrong = results.filter(r => !r.ok);
    const stars = Math.round((score / total) * 3);

    return `
    <section class="result">
      <div class="result__mofu">${M.svg(line.mood)}</div>
      <p class="bubble">${line.text}</p>
      <div class="result__score card">
        <div class="stars" aria-label="星${stars}つ">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="result__num"><strong>${score}</strong><span>/ ${total} 問正解</span></div>
        <p class="muted">${mode === 'review' ? '復習' : esc(lesson.title)}・${formatMinutes(seconds)}</p>
      </div>
    </section>

    ${right.length ? `<section class="word-group">
      <h3>覚えたことば <span class="count">${right.length}</span></h3>
      <ul class="pill-list">${right.map(r => `<li class="pill pill--ok"><span lang="en">${esc(r.word.en)}</span><small>${esc(r.word.ja)}</small></li>`).join('')}</ul>
    </section>` : ''}

    ${wrong.length ? `<section class="word-group">
      <h3>もう一度ね <span class="count">${wrong.length}</span></h3>
      <ul class="pill-list">${wrong.map(r => `<li class="pill pill--ng"><span lang="en">${esc(r.word.en)}</span><small>${esc(r.word.ja)}</small></li>`).join('')}</ul>
      <p class="muted small">復習リストに追加しました。</p>
    </section>` : ''}

    <div class="stack">
      ${wrong.length ? `<button class="btn btn--primary btn--block" data-action="retry-wrong">まちがえた${wrong.length}問に再挑戦</button>` : ''}
      ${mode === 'lesson' ? `<button class="btn ${wrong.length ? 'btn--soft' : 'btn--primary'} btn--block" data-action="start-learn" data-lesson="${esc(lesson.id)}">このレッスンをもう一度</button>` : ''}
      <button class="btn btn--ghost btn--block" data-action="home">ホームにもどる</button>
    </div>`;
  }

  /* ---------- 復習 ---------- */

  async function mistakeWords() {
    const ids = Object.keys(store.mistakes);
    const words = [];
    for (const id of ids) {
      const m = store.mistakes[id];
      try {
        const lesson = await ensureLesson(m.lessonId);
        const w = lesson.words.find(x => x.id === id);
        if (w) words.push(w);
        else delete store.mistakes[id]; // 教材から消えた語は外す
      } catch (e) { delete store.mistakes[id]; }
    }
    return words;
  }

  async function openReview() {
    const words = await mistakeWords();
    saveStore();
    go({ name: 'review', words });
  }

  function renderReview() {
    const { words } = view;
    if (!words.length) {
      return `
      <header class="page-head"><h1>復習</h1></header>
      <div class="center-state">${M.svg('happy')}
        <p><strong>復習する問題はありません</strong></p>
        <p class="muted">クイズでまちがえたことばは、ここに集まります。</p>
        <button class="btn btn--primary" data-action="home">ホームで学習する</button>
      </div>`;
    }
    const sorted = words.slice().sort((a, b) => store.mistakes[b.id].count - store.mistakes[a.id].count);
    return `
    <header class="page-head"><h1>復習</h1><p class="muted">まちがえたことば ${words.length}語。正解すると、リストから外れます。</p></header>
    <button class="btn btn--primary btn--block" data-action="start-review">${Math.min(words.length, 10)}問に再挑戦する</button>
    <ul class="review-list">
      ${sorted.map(w => `<li class="review-item card">
        <div class="review-item__text"><strong lang="en">${esc(w.en)}</strong><span>${esc(w.ja)}</span></div>
        <span class="miss">${store.mistakes[w.id].count}回</span>
        ${speakBtn(w.en, w.audio)}
      </li>`).join('')}
    </ul>`;
  }

  /* ---------- きろく ---------- */

  function renderRecord() {
    const totalSec = store.history.reduce((s, h) => s + (h.seconds || 0), 0);
    const totalAns = Object.values(store.words).reduce((s, w) => s + w.correct + w.wrong, 0);
    const totalOk = Object.values(store.words).reduce((s, w) => s + w.correct, 0);
    const rate = totalAns ? Math.round((totalOk / totalAns) * 100) : 0;
    const titleOf = h => (lessonCache[h.lessonId] && lessonCache[h.lessonId].title) || h.lessonTitle || h.lessonId;

    return `
    <header class="page-head"><h1>学習のきろく</h1><p class="muted">きろくはこの端末の中だけに保存されます。</p></header>

    <section class="progress">
      <div class="stat"><span class="stat__label">学習した日</span><span class="stat__value">${store.days.length}<small>日</small></span></div>
      <div class="stat"><span class="stat__label">連続学習</span><span class="stat__value">${streak()}<small>日</small></span></div>
      <div class="stat"><span class="stat__label">合計時間</span><span class="stat__value">${Math.round(totalSec / 60)}<small>分</small></span></div>
      <div class="stat"><span class="stat__label">正答率</span><span class="stat__value">${rate}<small>%</small></span></div>
    </section>

    <section>
      <h2 class="h2">最近の学習</h2>
      ${store.history.length ? `<ul class="history">
        ${store.history.slice(0, 20).map(h => `<li>
          <span class="history__date">${formatDate(h.at)}</span>
          <span class="history__title">${h.mode === 'review' ? '復習' : esc(titleOf(h))}</span>
          <span class="score">${h.score}/${h.total}</span>
        </li>`).join('')}
      </ul>` : '<p class="muted">まだきろくがありません。最初のレッスンをやってみよう。</p>'}
    </section>

    <section class="settings card">
      <h2 class="h2">せってい</h2>
      <label class="toggle"><span>発音を再生する</span>
        <input type="checkbox" id="setting-sound" data-action="toggle-sound" ${store.settings.sound ? 'checked' : ''}>
      </label>
      <div class="danger">
        ${view.confirmReset
          ? `<p><strong>学習のきろくをすべて消しますか？</strong><br><span class="muted">元にはもどせません。</span></p>
             <div class="nav-row"><button class="btn btn--ghost" data-action="reset-cancel">やめる</button><button class="btn btn--danger" data-action="reset-do">消す</button></div>`
          : `<button class="btn btn--ghost btn--block" data-action="reset-ask">学習のきろくを消す</button>`}
      </div>
    </section>`;
  }

  /* ---------- 操作 ---------- */

  const actions = {
    speak: el => speak(el.dataset.text, el.dataset.audio),
    home: () => go({ name: 'home' }),
    reload: () => location.reload(),
    tab: el => {
      if (el.dataset.tab === 'review') return openReview();
      go({ name: el.dataset.tab });
    },
    'start-learn': el => startLearn(el.dataset.lesson),
    'learn-next': () => { view.index++; render(); autoSpeak(); },
    'learn-prev': () => { view.index = Math.max(0, view.index - 1); render(); autoSpeak(); },
    'start-quiz': () => startQuiz('lesson', view.lesson.words, view.lesson),
    pick: el => pick(el.dataset.choice),
    'quiz-next': () => {
      if (view.index === view.questions.length - 1) return finishQuiz();
      view.index++;
      view.picked = null;
      render();
      autoSpeakQuestion();
      window.scrollTo(0, 0);
    },
    'retry-wrong': () => {
      const words = view.results.filter(r => !r.ok).map(r => r.word);
      view.startedAt = Date.now();
      startQuiz('review', words, view.lesson);
    },
    'start-review': () => {
      view.startedAt = Date.now();
      startQuiz('review', shuffle(view.words).slice(0, 10), null);
    },
    'pick-course': async el => {
      const course = courses.find(c => c.id === el.dataset.course);
      if (!course || course.status !== 'available') return;
      store.settings.courseId = course.id;
      saveStore();
      await loadCourseLessons(course);
      go({ name: 'home' });
    },
    'toggle-sound': el => { store.settings.sound = el.checked; saveStore(); },
    'reset-ask': () => { view.confirmReset = true; render(); },
    'reset-cancel': () => { view.confirmReset = false; render(); },
    'reset-do': () => {
      const sound = store.settings.sound;
      store = freshStore();
      store.settings.sound = sound;
      saveStore();
      go({ name: 'record' });
    }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (el.type === 'checkbox') return; // change で処理
    const fn = actions[el.dataset.action];
    if (fn) Promise.resolve(fn(el)).catch(showError);
  });

  document.addEventListener('change', e => {
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
  });

  // クイズはキーボードの 1〜4 / A〜D でも答えられる
  document.addEventListener('keydown', e => {
    if (view.name !== 'quiz' || view.picked !== null) return;
    const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    const q = view.questions[view.index];
    if (i >= 0 && q.choices[i] !== undefined) pick(q.choices[i]);
  });

  function showError(err) {
    console.error(err);
    go({ name: 'error', message: err.message || '読み込みに失敗しました。' });
  }

  /* ---------- オフライン ---------- */

  function updateNet() {
    const el = document.getElementById('net-status');
    if (!el) return;
    const ready = document.documentElement.dataset.offlineReady === '1';
    if (!navigator.onLine) { el.textContent = 'オフラインで学習中'; el.className = 'net net--off'; }
    else if (ready) { el.textContent = 'オフライン対応'; el.className = 'net net--ready'; }
    else { el.textContent = ''; el.className = 'net'; }
  }
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
        document.documentElement.dataset.offlineReady = '1';
        updateNet();
      }).catch(() => { /* プレビュー環境などでは使えない */ });
    } catch (e) { /* noop */ }
  }

  /* ---------- 起動 ---------- */

  async function boot() {
    render();
    try {
      await loadCourses();
      await loadCourseLessons(currentCourse());
      go({ name: 'home' });
    } catch (err) {
      showError(err);
    }
    registerSW();
  }

  boot();
})();
