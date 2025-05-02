let mic;
let recorder;
let soundFile;

// amplitude and frequency analysis tools
let amp;
let fft;

let isRecording = false;
let recordTime = 20000; //20 sec

// buttons
let audioButton;
let recordButton;
let stopButton;
let visualiseButton;
let restartButton;
let replayButton;
let saveButton;

// countdown for recording
let countdown = 0;
let countdownStartTime = 0;
let showProgressBar = false;
let micReady = false;

// Visualisation
let visualising = false;
let level; //current volume level
let points = [];
let x = 0;
let y = 0;

// states
const stateRecord = "record";
const stateWaiting = "waitingToVisualise";
const stateVisualise = "visualise";
const stateFinished = "visualiseFinished";
let state = stateRecord;

function setup() {
  createCanvas(600, 400);
  audioButton = buttonHandler(
    "Allow device microphone access",
    getAudioAccess,
    150,
    150
  );
}

// function to make buttons
function buttonHandler(label, handler, x, y) {
  let button = createButton(label);
  button.position(x, y);
  button.mousePressed(handler);
  return button;
}

function getAudioAccess() {
  getAudioContext()
    .resume()
    .then(() => {
      audioButton.hide();
      getMic();
    });
}

function updateUI() {
  if (recordButton) recordButton.hide();
  if (stopButton) stopButton.hide();
  if (visualiseButton) visualiseButton.hide();
  if (restartButton) restartButton.hide();

  switch (state) {
    case stateRecord:
      if (!recordButton) {
        recordButton = buttonHandler(
          "Start Recording",
          startRecording,
          100,
          80
        );
      }
      if (!stopButton) {
        stopButton = buttonHandler("Stop Recording", stopRecording, 300, 80);
      }
      recordButton.show();
      stopButton.show();
      break;

    case stateWaiting:
      if (!visualiseButton) {
        visualiseButton = buttonHandler(
          "Visualise Sound",
          startVisualisation,
          200,
          200
        );
      }
      if (!recordButton) {
        recordButton = handler("Start Recording", startRecording, 100, 80);
      }
      if (!stopButton) {
        stopButton = ("Stop Recording", stopRecording, 100, 80);
      }
      visualiseButton.show();
      recordButton.show();
      stopButton.show();
      break;

    case stateVisualise:
      break;

    case stateFinished:
      if (!restartButton) {
        restartButton = buttonHandler(
          "Record Again",
          resetToRecording,
          250,
          150
        );
      }
      restartButton.show();
      break;
  }
}

function getMic() {
  mic = new p5.AudioIn();
  mic.start(() => {
    recorder = new p5.SoundRecorder();
    recorder.setInput(mic);
    micReady = true;

    updateUI();
  });
  recordButton = buttonHandler("Start Recording", startRecording, 100, 80);
  stopButton = buttonHandler("Stop Recording", stopRecording, 300, 80);
}

function setState(newState) {
  console.log("state changing to ", newState);
  state = newState;
  updateUI();
}

function startRecording() {
  if (!micReady) return;

  soundFile = new p5.SoundFile();
  isRecording = true;
  showProgressBar = true;
  countdown = recordTime / 1000;
  countdownStartTime = millis();

  console.log("recording started");

  recorder.record(soundFile, countdown, () => {
    isRecording = false;
    showProgressBar = false;
    setState(stateWaiting);
  });
}

function stopRecording() {
  if (!isRecording) return;

  recorder.stop();
  isRecording = false;
  showProgressBar = false;

  setTimeout(() => {
    // playRecording();
    setState(stateWaiting);
  }, 500);
}

function playRecording() {
  if (!soundFile || !soundFile.buffer || soundFile.buffer.duration === 0);
  if (soundFile.isLoaded()) {
    soundFile.play();
  } else {
    setTimeout(playRecording, 250);
  }
}

function startVisualisation() {
  if (!soundFile?.isLoaded()) {
    setTimeout(startVisualisation, 250);
    return;
  }
  console.log("start visualisation");

  amp = new p5.Amplitude();
  fft = new p5.FFT();
  amp.setInput(soundFile);
  fft.setInput(soundFile);

  console.log(amp);
  soundFile.play();

  visualising = true;
  showProgressBar = false;

  setState(stateVisualise);

  soundFile.onended(() => {
    setTimeout(() => setState(stateFinished), 1000);
  });
  console.log("start visualisation 2");
}

function resetToRecording() {
  if (restartButton) restartButton.remove();
  points = [];
  x = 0;
  y = 0;
  visualising = false;
  setState(stateRecord);
}

function draw() {
  if (state === stateVisualise) {
    background("white");

    level = amp.getLevel();
    let spectrum = fft.analyze();
    let pitch = fft.getCentroid();

    let low = spectrum[0];
    let mid = spectrum[1];
    let high = spectrum[2];

    let angle = map(pitch, 100, 2000, -PI, PI);
    let dx = cos(angle) * map(high, 0, 255, 5, 20);
    let dy = sin(angle) * map(mid, 0, 255, 5, 20);

    x = constrain(x + dx, 10, width - 10);
    y = constrain(y + dy, 10, height - 10);

    strokeWeight(map(level, 0, 1, 5, 30));
    stroke(
      map(low, 0, 255, 0, 255),
      map(mid, 0, 255, 0, 255),
      map(high, 0, 255, 0, 255)
    );

    points.push({ x, y });

    noFill();
    beginShape();
    for (let pt of points) {
      let offsetX = sin(pt.x * 0.05) * 10;
      let offsetY = sin(pt.y * 0.05) * 10;
      curveVertex(pt.x + offsetX, pt.y + offsetY);
    }
    endShape();
  } else if (state === stateRecord && isRecording) {
    let elapsed = (millis() - countdownStartTime) / 1000;
    let remaining = max(0, countdown - elapsed);

    if (remaining === 0 && isRecording) {
      isRecording = false;
      showProgressBar = false;
      setState(stateWaiting);
      return;
    }

    fill(230);
    stroke(0);
    rect(140, 350, 300, 30);

    console.log("timer");

    let w = map(remaining, countdown, 0, 300, 0);
    fill("#000");
    noStroke();
    rect(140, 350, w, 30);

    fill("white");
    noStroke();
    rect(180, 280, 200, 25);

    fill(0);
    textSize(16);
    text(`Recording ${ceil(remaining)}s left`, 200, 300);
  }
}
