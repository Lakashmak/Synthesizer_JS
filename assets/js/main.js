const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const buttonsDiv = document.getElementById('buttons');
const waveTypeSelect = document.getElementById('waveType');
const waveTypeSelect2 = document.getElementById('waveType2');
const waveTypeSelect3 = document.getElementById('waveType3');
const waveTypeSelect4 = document.getElementById('waveType4');
const modeSelect = document.getElementById('modeSelect');
const freqInput = document.getElementById('freqInput');
const addBtn = document.getElementById('addBtn');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const textbox1 = document.getElementById('textbox1');
const label1 = document.getElementById('label1');
const progressBar = document.getElementById('progressBar');
const timeLabel = document.getElementById('timeLabel');
const totalTime = document.getElementById('totalTime')
let timer1 = null;

playBtn.addEventListener('click', () => {this.playBtn_Click();});
stopBtn.addEventListener('click', () => {this.stopBtn_Click();});

const activeOscillators = new Map(); // Активные осцилляторы: key = frequency (строка), value = {oscillator, gainNode, button}
let time = 0;
let cid = 0;
var cmds = [];
let totalDuration = 0;
let seconds = Date.now() / 1000;

function commandsRead() {
  label1.textContent = "";
  var nots = [];
  var noteData = [];
  var noteValue = "";
  for(let i = 0; i < textbox1.value.length; i++) {
    if(textbox1.value[i] != "\n") {
      if(textbox1.value[i] != " ") noteValue += textbox1.value[i];
      else {
        if(i > 0 && textbox1.value[i-1] != " " && textbox1.value[i-1] != "\n") noteData.push(parseFloat(noteValue));
        noteValue = "";
      }
    } else {
      if(i > 0 && textbox1.value[i-1] != " " && textbox1.value[i-1] != "\n") noteData.push(parseFloat(noteValue));
      noteValue = "";
      if(i > 0 && textbox1.value[i-1] != "\n") nots.push([...noteData]);
      noteData = [];
    }
  }
  if(noteValue != "") noteData.push(parseFloat(noteValue));
  if(noteData != []) nots.push([...noteData]);
  
  var commands = [];
  var command = [];
  var t = 0.0;
  label1.textContent += "default t:" + t + "\n";
  for(let i = 0; i < nots.length; i++) {
    if(nots[i].length >= 3) t += parseFloat(nots[i][2]);
    label1.textContent += "nots[" + i + "][2]:" + nots[i][2] + "\n";
    command.push("play");
    command.push(nots[i][0]);
    command.push(t);
    if(nots[i].length >= 1 && nots[i][0] != "") commands.push([...command]);
    command = [];
    if(nots[i].length >= 2) t += parseFloat(nots[i][1]);
    label1.textContent += "nots[" + i + "][1]:" + nots[i][1] + "\n";
    command.push("stop");
    command.push(nots[i][0]);
    command.push(t);
    if(nots[i].length >= 1 && nots[i][0] != "") commands.push([...command]);
    command = [];
  }
  
  var commands1 = [];
  let id = 0;
  for(let i = 0; i < commands.length; i++) {
    if(t > commands[i][2]) {
      t = commands[i][2];
      id = i;
    }
    if(i == commands.length - 1) {
      commands1.push(commands[id]);
      commands.splice(id, 1);
      i = -1;
      if(commands.length > 0) t = commands[0][2];
      id = 0;
    }
  }
  
  for(let i = 0; i < commands1.length; i++) label1.textContent += commands1[i][0] + " " + commands1[i][1] + " " + commands1[i][2] + "\n";
  return commands1;
}

//воспроизвести
function playBtn_Click() {
  if(playBtn.textContent == "Воспроизвести") {
    if(time == 0) cmds = commandsRead();
    totalDuration = cmds[cmds.length-1][2];
    totalTime.textContent = Math.floor(totalDuration/200/60) + ":" + Math.floor(totalDuration/200 % 60 /10 % 10) + "" + Math.floor(totalDuration/200 % 60 % 10) + "." + Math.floor(totalDuration/20 % 10) + "" + Math.floor(totalDuration/2 % 10);
    timer1 = setInterval(timer1_Tick, 1);
    seconds = Date.now() / 1000;
    playBtn.textContent = "Пауза";
  } else {
    clearInterval(timer1);
    playBtn.textContent = "Воспроизвести";
    cid = 0;
    stopAllTones();
  }
}

//остановить
function stopBtn_Click() {
  clearInterval(timer1);
  time = 0;
  cid = 0;
  stopAllTones();
  progressBar.value = 0;
  timeLabel.textContent = "0:00.00";
  playBtn.textContent = "Воспроизвести";
}

function timer1_Tick() {
  while(cmds[cid][2] <= time) {
    if(cmds[cid][0] == "play") playTone(cmds[cid][1]);
    if(cmds[cid][0] == "stop") stopTone(cmds[cid][1]);
    cid++;
    if(cid >= cmds.length) {
      time = 0;
      cid = 0;
      playBtn.textContent = "Воспроизвести";
      clearInterval(timer1);
      return;
    }
  }
  time += (Date.now() / 1000 - seconds)*200;
  seconds = Date.now() / 1000;
  
  const percent = (time / totalDuration) * 100;
  progressBar.value = Math.min(percent, 100);
  timeLabel.textContent = Math.floor(time/200/60) + ":" + Math.floor(time/200 % 60 /10 % 10) + "" + Math.floor(time/200 % 60 % 10) + "." + Math.floor(time/20 % 10) + "" + Math.floor(time/2 % 10);
}

// Вспомогательная функция сравнения частот с учётом округления
function freqEquals(f1, f2) {
  return Math.abs(f1 - f2) < 0.0001;
}

// Найти кнопку по частоте
function findButtonByFreq(freq) {
  return [...buttonsDiv.children].find(btn => freqEquals(parseFloat(btn.dataset.freq), freq));
}

// Запустить звук с частотой freq для кнопки btn
function playTone(freq, btn) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  if (activeOscillators.has(freq.toString())) {
    return; // Уже играет
  }
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const osc3 = audioCtx.createOscillator();
  const osc4 = audioCtx.createOscillator();
  var oscs = [osc];
  if (waveTypeSelect2.value != "none") oscs.push(osc2);
  if (waveTypeSelect3.value != "none") oscs.push(osc3);
  if (waveTypeSelect4.value != "none") oscs.push(osc4);
  const gainNode = audioCtx.createGain();

  osc.type = waveTypeSelect.value;
  osc2.type = waveTypeSelect2.value;
  osc3.type = waveTypeSelect3.value;
  osc4.type = waveTypeSelect4.value;
  osc.frequency.value = freq;
  osc2.frequency.value = freq+1;
  osc3.frequency.value = freq+2;
  osc4.frequency.value = freq+3;

  gainNode.gain.value = 0.1;

  for(let i = 0; i < oscs.length; i++) oscs[i].connect(gainNode);
  gainNode.connect(audioCtx.destination);
  for(let i = 0; i < oscs.length; i++) oscs[i].start();
  
  if (arguments.length === 1) btn = findButtonByFreq(freq);
  activeOscillators.set(freq.toString(), {oscillators: oscs, gainNode: gainNode, button: btn});
  /*if (arguments.length > 1)*/ btn.classList.add('active');
}

// Остановить звук с частотой freq
function stopTone(freq) {
  const key = freq.toString();
  const obj = activeOscillators.get(key);
  if (!obj) return;
  for(let i = 0; i < obj.oscillators.length; i++) {
      obj.oscillators[i].stop();
      obj.oscillators[i].disconnect();
  }
  obj.gainNode.disconnect();
  try {obj.button.classList.remove('active');} catch {}
  activeOscillators.delete(key);
}

// Остановить все звуки
function stopAllTones() {
  for (const freqKey of [...activeOscillators.keys()]) {
    stopTone(parseFloat(freqKey));
  }
}

// Создать кнопку с частотой freq и цветом (опционально)
function createToneButton(freq, color = null) {
  const btn = document.createElement('button');
  btn.className = 'tone-btn';
  btn.textContent = freq.toFixed(3) + ' Hz';
  btn.dataset.freq = freq.toFixed(3);
  if(color) {
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    btn.style.color = getContrastYIQ(color);
  }

  function handleClick(e) {
    e.preventDefault();

    if (modeSelect.value === 'play-hold') return; // клики игнорируем в режиме удержания

    const freq = parseFloat(btn.dataset.freq);
    const mode = modeSelect.value;

    if (mode === 'play-toggle') {
      if (activeOscillators.has(freq.toString())) {
        stopTone(freq);
      } else {
        playTone(freq, btn);
      }
    } else if (mode === 'edit') {
      editButtonProperties(btn);
    } else if (mode === 'delete') {
      if (activeOscillators.has(freq.toString())) stopTone(freq);
      btn.remove();
    }
  }

  btn.addEventListener('click', handleClick);

  // Обработка play-hold — для мыши
  btn.addEventListener('mousedown', (e) => {
    if (modeSelect.value === 'play-hold') {
      e.preventDefault();
      const freq = parseFloat(btn.dataset.freq);
      playTone(freq, btn);
    }
  });
  btn.addEventListener('mouseup', (e) => {
    if (modeSelect.value === 'play-hold') {
      e.preventDefault();
      const freq = parseFloat(btn.dataset.freq);
      stopTone(freq);
    }
  });
  btn.addEventListener('mouseleave', (e) => {
    if (modeSelect.value === 'play-hold') {
      const freq = parseFloat(btn.dataset.freq);
      stopTone(freq);
    }
  });

  // Для touch-устройств play-hold
  btn.addEventListener('touchstart', (e) => {
    if (modeSelect.value === 'play-hold') {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const freq = parseFloat(btn.dataset.freq);
        playTone(freq, btn);
      }
    }
  }, {passive:false});

  btn.addEventListener('touchend', (e) => {
    if (modeSelect.value === 'play-hold') {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const freq = parseFloat(btn.dataset.freq);
        stopTone(freq);
      }
    }
  }, {passive:false});

  btn.addEventListener('touchcancel', (e) => {
    if (modeSelect.value === 'play-hold') {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const freq = parseFloat(btn.dataset.freq);
        stopTone(freq);
      }
    }
  }, {passive:false});

  return btn;
}

// Редактирование свойств кнопки (частота и цвет)
function editButtonProperties(btn) {
  const oldFreq = parseFloat(btn.dataset.freq);
  let newFreqStr = prompt('Изменить частоту (>= 0 Hz):', oldFreq);
  if (newFreqStr !== null) {
    const newFreq = parseFloat(newFreqStr);
    if (isNaN(newFreq) || newFreq < 0 || newFreq > 20000) {
      alert('Неверное значение частоты! Допустимо от 0 до 20000 Hz');
      return;
    }
    if (!freqEquals(newFreq, oldFreq)) {
      // Проверка на дубликаты частот
      if ([...buttonsDiv.children].some(otherBtn =>
        otherBtn !== btn && freqEquals(parseFloat(otherBtn.dataset.freq), newFreq)
      )) {
        alert('Кнопка с такой частотой уже существует');
        return;
      }
      if (activeOscillators.has(oldFreq.toString())) stopTone(oldFreq);
      btn.dataset.freq = newFreq.toFixed(3);
      btn.textContent = newFreq.toFixed(3) + ' Hz';
      insertButtonSorted(btn);
    }
  }
  let newColor = prompt('Изменить цвет кнопки (CSS цвет, например #ff0000 или red):', btn.dataset.color || '');
  if (newColor !== null && newColor.trim() !== '') {
    btn.style.backgroundColor = newColor.trim();
    btn.dataset.color = newColor.trim();
    btn.style.color = getContrastYIQ(newColor.trim());
  }
}

// Вставить кнопку отсортировано по возрастанию частоты
function insertButtonSorted(btn) {
  const freq = parseFloat(btn.dataset.freq);
  const buttons = [...buttonsDiv.children].filter(b => b !== btn);
  let inserted = false;
  for (let i = 0; i < buttons.length; i++) {
    const f = parseFloat(buttons[i].dataset.freq);
    if (freq < f) {
      buttonsDiv.insertBefore(btn, buttons[i]);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    buttonsDiv.appendChild(btn);
  }
}

// Добавление новой кнопки из поля ввода
addBtn.onclick = () => {
  const freq = parseFloat(freqInput.value);
  if (freq < 0 || freq > 20000 || isNaN(freq)) {
    alert('Введите частоту от 0 до 20000 Hz');
    return;
  }
  if ([...buttonsDiv.children].some(btn => freqEquals(parseFloat(btn.dataset.freq), freq))) {
    alert('Кнопка с этой частотой уже существует');
    return;
  }
  const btn = createToneButton(freq);
  insertButtonSorted(btn);
  freqInput.value = freq;
};

// При смене режима все звуки останавливаются
modeSelect.addEventListener('change', () => {
  stopAllTones();
});

// При смене формы волны меняем форму всех играющих звуков
waveTypeSelect.addEventListener('change', () => {
  const newType = waveTypeSelect.value;
  for (const {oscillator} of activeOscillators.values()) {
    oscillator.type = newType;
  }
});

// Контрастный цвет текста (белый или чёрный) для читаемости на цветной кнопке
function getContrastYIQ(color) {
  let r, g, b;
  if(color[0] === '#') {
    const c = color.substring(1);
    if(c.length === 3) {
      r = parseInt(c[0] + c[0], 16);
      g = parseInt(c[1] + c[1], 16);
      b = parseInt(c[2] + c[2], 16);
    } else {
      r = parseInt(c.substring(0,2), 16);
      g = parseInt(c.substring(2,4), 16);
      b = parseInt(c.substring(4,6), 16);
    }
  } else {
    // Примерное приближение для ключевых слов цвета — выбираем белый по умолчанию
    return '#fff';
  }
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000' : '#fff';
}

// Инициализация кнопок по умолчанию
//[25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900];
for(let freq = 25; freq <= 1800; freq += 25) {
  const btn = createToneButton(freq);
  insertButtonSorted(btn);
}