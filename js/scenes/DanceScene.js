// js/scenes/DanceScene.js
// Dance challenge at the Alcatraz (chapter 8, js/story/flirt.js): launched
// over the PAUSED WorldScene when a girl wants to dance. Arrows rise from the
// bottom in 4 lanes, ON THE BEAT of the club track (the music keeps playing;
// its tempo comes from the map's `beat`). Press the matching arrow (or WASD)
// when an arrow crosses the targets at the top: PERFETTO / BENE / MANCATO.
// Accuracy ≥ `need` → she gives Gabbo her number. Esc gives up (a loss).
// Calls world.onDanceDone(girlId, won).
const LANES = [
  { dir: 'left', glyph: '←', color: '#ff4fd8' },
  { dir: 'down', glyph: '↓', color: '#4fd9ff' },
  { dir: 'up', glyph: '↑', color: '#7dff4f' },
  { dir: 'right', glyph: '→', color: '#ffe04f' },
];
const NOTES = 20;           // arrows per challenge
const LEAD_BEATS = 4;       // a bar of count-in before the first arrow
const TRAVEL_BEATS = 2;     // time an arrow takes to rise to the targets
const PERFECT = 0.09;       // s
const GOOD = 0.18;          // s
const MISS = 0.25;          // s after the target time an arrow counts as missed

export default class DanceScene extends Phaser.Scene {
  constructor() {
    super('DanceScene');
  }

  init(data) {
    this.girlId = data.girlId;
    this.girlName = data.girlName || '';
    this.need = data.need ?? 0.7;
    this.bpm = data.bpm || 120;
    this.offset = data.offset || 0;
    this.returnScene = data.returnScene || 'WorldScene';
    this.done = false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const world = this.scene.get(this.returnScene);
    const music = world?.audio?.music;
    // Our clock = the track's position when we start + real time since then
    // (the track loops, so we never read it again mid-dance). NOT the scene
    // clock: in a just-launched scene `time.now` is still 0 during create and
    // jumps to the game time on the first frame (every arrow was "missed").
    this.t0Music = music?.isPlaying ? music.seek : 0;
    this.t0 = performance.now();
    this.spb = 60 / this.bpm;

    this.add.rectangle(0, 0, W, H, 0x05040a, 0.82).setOrigin(0, 0);
    const big = { fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6 };
    this.add.text(W / 2, H * 0.06, `💃 Sfida di ballo con ${this.girlName}!`, { ...big, fontSize: '28px', color: '#ff8ad8' }).setOrigin(0.5);
    this.add.text(W / 2, H - 14, '←↓↑→ / WASD a tempo quando la freccia tocca il bersaglio · Esc rinuncia',
      { fontFamily: 'monospace', fontSize: '14px', color: '#c8ccd4' }).setOrigin(0.5, 1);
    this.scoreText = this.add.text(W / 2, H * 0.12, '', { ...big, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.judge = this.add.text(W / 2, H * 0.5, '', { ...big, fontSize: '34px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0);

    // Lanes and targets.
    this.laneW = Math.min(110, W / 6);
    this.x0 = W / 2 - this.laneW * 1.5;
    this.targetY = H * 0.24;
    this.bottomY = H * 0.95;
    this.speed = (this.bottomY - this.targetY) / (TRAVEL_BEATS * this.spb); // px per second
    this.targets = LANES.map((l, i) => this.add.text(this.laneX(i), this.targetY, l.glyph,
      { ...big, fontSize: '56px', color: '#3a3a48', stroke: l.color, strokeThickness: 4 }).setOrigin(0.5));

    // The chart: after a bar of count-in, NOTES arrows on beats 1 or 2 apart
    // (now and then half a beat for the harder girls).
    const startBeat = Math.ceil(((this.now() - this.offset) / this.spb)) + LEAD_BEATS;
    let beat = startBeat;
    this.notes = [];
    for (let k = 0; k < NOTES; k++) {
      const lane = Phaser.Math.Between(0, 3);
      const time = this.offset + beat * this.spb;
      const obj = this.add.text(this.laneX(lane), this.bottomY + 60, LANES[lane].glyph,
        { ...big, fontSize: '56px', color: LANES[lane].color }).setOrigin(0.5);
      this.notes.push({ lane, time, obj, judged: false });
      const r = Math.random();
      beat += this.need >= 0.75 && r < 0.2 ? 0.5 : r < 0.75 ? 1 : 2;
    }
    this.endTime = this.notes[this.notes.length - 1].time + 1.2;
    this.points = 0;
    this.combo = 0;

    // Count-in on the beats before the first arrow.
    this.countIn = [];
    for (let b = 1; b <= LEAD_BEATS; b++) {
      this.countIn.push({ t: this.offset + (startBeat - LEAD_BEATS + b - 1) * this.spb, text: b < LEAD_BEATS ? String(LEAD_BEATS - b) : 'VIA!' });
    }

    const K = Phaser.Input.Keyboard.KeyCodes;
    const keyLane = {
      [K.LEFT]: 0, [K.A]: 0, [K.DOWN]: 1, [K.S]: 1, [K.UP]: 2, [K.W]: 2, [K.RIGHT]: 3, [K.D]: 3,
    };
    this.input.keyboard.on('keydown', (e) => {
      if (this.done) return;
      if (e.keyCode === K.ESC) { this.finish(false); return; }
      const lane = keyLane[e.keyCode];
      if (lane != null) this.hit(lane);
    });
    this.updateScore();
  }

  laneX(i) {
    return this.x0 + this.laneW * i;
  }

  now() {
    return this.t0Music + (performance.now() - this.t0) / 1000;
  }

  hit(lane) {
    const t = this.now();
    this.tweens.add({ targets: this.targets[lane], scale: { from: 1.25, to: 1 }, duration: 120 });
    const n = this.notes.find((x) => !x.judged && x.lane === lane && Math.abs(x.time - t) <= MISS);
    if (!n) return;
    const dt = Math.abs(n.time - t);
    n.judged = true;
    n.obj.destroy();
    if (dt <= PERFECT) { this.points += 1; this.combo += 1; this.flash('PERFETTO!', '#7dff4f'); }
    else if (dt <= GOOD) { this.points += 0.6; this.combo += 1; this.flash('BENE', '#4fd9ff'); }
    else { this.combo = 0; this.flash('MANCATO', '#ff5a5a'); }
    this.updateScore();
  }

  flash(text, color) {
    this.judge.setText(text).setColor(color).setAlpha(1).setScale(1.2);
    this.tweens.killTweensOf(this.judge);
    this.tweens.add({ targets: this.judge, alpha: 0, scale: 1, duration: 450, delay: 150 });
  }

  updateScore() {
    const done = this.notes.filter((n) => n.judged).length;
    const acc = done ? this.points / done : 1;
    this.scoreText.setText(`Precisione ${Math.round(acc * 100)}%  ·  combo ${this.combo}  ·  serve ${Math.round(this.need * 100)}%`);
  }

  update() {
    if (this.done) return;
    const t = this.now();
    while (this.countIn.length && t >= this.countIn[0].t) this.flash(this.countIn.shift().text, '#ffd54a');
    for (const n of this.notes) {
      if (n.judged) continue;
      n.obj.y = this.targetY + (n.time - t) * this.speed;
      if (t - n.time > MISS) { // went past: missed
        n.judged = true;
        n.obj.destroy();
        this.combo = 0;
        this.flash('MANCATO', '#ff5a5a');
        this.updateScore();
      }
    }
    if (t >= this.endTime) this.finish(this.points / NOTES >= this.need);
  }

  finish(won) {
    if (this.done) return;
    this.done = true;
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.text(W / 2, H / 2, won ? '🔥 Che ballerino!' : '😬 Niente da fare...', {
      fontFamily: 'monospace', fontStyle: 'bold', fontSize: '40px', color: won ? '#ffd54a' : '#ff8a8a',
      stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5);
    this.time.delayedCall(1400, () => {
      const world = this.scene.get(this.returnScene);
      this.scene.stop();
      world.scene.resume();
      world.onDanceDone(this.girlId, won);
    });
  }
}
