// モフルンの仮ビジュアル。表情（mood）ごとにインラインSVGを返す。
// 色はCSS変数（--mofu-*）から取るので、ライト／ダークどちらでも馴染む。
(function () {
  'use strict';

  // 円のふちを波打たせて、ふわふわの毛並みに見せる
  function fluff(cx, cy, r, bumps, depth) {
    const pt = (a, rad) => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad].map(n => n.toFixed(1));
    let d = '';
    for (let i = 0; i < bumps; i++) {
      const a0 = (i / bumps) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / bumps) * Math.PI * 2 - Math.PI / 2;
      const p0 = pt(a0, r);
      const c = pt((a0 + a1) / 2, r + depth);
      const p1 = pt(a1, r);
      d += (i === 0 ? `M${p0[0]} ${p0[1]}` : '') + ` Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`;
    }
    return d + 'Z';
  }

  const faces = {
    // ふだん：まるい目、小さな「ω」口
    normal: `
      <ellipse cx="80" cy="112" rx="7" ry="9" fill="var(--mofu-ink)"/>
      <ellipse cx="120" cy="112" rx="7" ry="9" fill="var(--mofu-ink)"/>
      <circle cx="82.5" cy="108.5" r="2.6" fill="#fff"/>
      <circle cx="122.5" cy="108.5" r="2.6" fill="#fff"/>
      <path d="M92 128 q4 5 8 0 q4 5 8 0" fill="none" stroke="var(--mofu-ink)" stroke-width="2.6" stroke-linecap="round"/>`,
    // うれしい：にっこり目、ひらいた口
    happy: `
      <path d="M72 114 q8 -10 16 0" fill="none" stroke="var(--mofu-ink)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M112 114 q8 -10 16 0" fill="none" stroke="var(--mofu-ink)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M90 126 q10 14 20 0 z" fill="var(--mofu-ink)"/>
      <path d="M94 131 q6 5 12 0" fill="none" stroke="var(--mofu-cheek)" stroke-width="3" stroke-linecap="round"/>`,
    // はげまし：少し眉を下げて、やさしい口
    cheer: `
      <ellipse cx="80" cy="113" rx="6.5" ry="8" fill="var(--mofu-ink)"/>
      <ellipse cx="120" cy="113" rx="6.5" ry="8" fill="var(--mofu-ink)"/>
      <circle cx="82" cy="110" r="2.4" fill="#fff"/>
      <circle cx="122" cy="110" r="2.4" fill="#fff"/>
      <path d="M70 99 l14 -3" stroke="var(--mofu-ink)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M130 99 l-14 -3" stroke="var(--mofu-ink)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M93 130 q7 -5 14 0" fill="none" stroke="var(--mofu-ink)" stroke-width="2.6" stroke-linecap="round"/>`,
    // かんがえ中：視線を上に、「o」口
    think: `
      <ellipse cx="81" cy="109" rx="6.5" ry="8" fill="var(--mofu-ink)"/>
      <ellipse cx="121" cy="109" rx="6.5" ry="8" fill="var(--mofu-ink)"/>
      <circle cx="83" cy="105" r="2.4" fill="#fff"/>
      <circle cx="123" cy="105" r="2.4" fill="#fff"/>
      <ellipse cx="100" cy="130" rx="4.5" ry="5" fill="var(--mofu-ink)"/>`
  };

  function svg(mood, opts) {
    mood = faces[mood] ? mood : 'normal';
    const label = (opts && opts.label) || 'モフルン';
    const armUp = mood === 'happy';
    return `
<svg class="mofurun mofurun--${mood}" viewBox="0 0 200 200" role="img" aria-label="${label}">
  <ellipse cx="100" cy="186" rx="52" ry="7" fill="var(--mofu-shadow)"/>
  <g class="mofurun__body">
    <!-- 頭の芽 -->
    <path d="M100 52 C100 42 101 36 104 30" fill="none" stroke="var(--mofu-leaf-deep)" stroke-width="3" stroke-linecap="round"/>
    <path d="M104 31 C112 20 126 22 128 28 C120 36 110 36 104 31Z" fill="var(--mofu-leaf)"/>
    <path d="M102 36 C94 28 82 30 81 35 C88 41 97 40 102 36Z" fill="var(--mofu-leaf)"/>
    <!-- 耳 -->
    <path d="${fluff(60, 64, 17, 9, 3)}" fill="var(--mofu-fur)"/>
    <path d="${fluff(140, 64, 17, 9, 3)}" fill="var(--mofu-fur)"/>
    <circle cx="60" cy="66" r="8" fill="var(--mofu-cheek)" opacity=".75"/>
    <circle cx="140" cy="66" r="8" fill="var(--mofu-cheek)" opacity=".75"/>
    <!-- 足 -->
    <ellipse cx="78" cy="176" rx="15" ry="9" fill="var(--mofu-fur-deep)"/>
    <ellipse cx="122" cy="176" rx="15" ry="9" fill="var(--mofu-fur-deep)"/>
    <!-- からだ -->
    <path d="${fluff(100, 118, 62, 22, 5)}" fill="var(--mofu-fur)"/>
    <ellipse cx="100" cy="146" rx="34" ry="26" fill="var(--mofu-belly)"/>
    <!-- 手 -->
    ${armUp
      ? `<ellipse cx="42" cy="104" rx="11" ry="15" transform="rotate(-35 42 104)" fill="var(--mofu-fur-deep)"/>`
      : `<ellipse cx="44" cy="136" rx="10" ry="14" transform="rotate(20 44 136)" fill="var(--mofu-fur-deep)"/>`}
    <ellipse cx="156" cy="136" rx="10" ry="14" transform="rotate(-20 156 136)" fill="var(--mofu-fur-deep)"/>
    <!-- ほっぺ -->
    <ellipse cx="66" cy="126" rx="10" ry="6" fill="var(--mofu-cheek)"/>
    <ellipse cx="134" cy="126" rx="10" ry="6" fill="var(--mofu-cheek)"/>
    ${faces[mood]}
  </g>
</svg>`;
  }

  window.Mofurun = { svg };
})();
