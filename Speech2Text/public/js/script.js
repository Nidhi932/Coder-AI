document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const autoScroll = document.getElementById("autoScroll");
  const clearBtn = document.getElementById("clearBtn");
  const languageSelect = document.getElementById("languageSelect");
  const voiceSelect = document.getElementById("voiceSelect");
  const punctuationToggle = document.getElementById("punctuationToggle");
  const capitalizationToggle = document.getElementById("capitalizationToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");
  const duration = document.getElementById("duration");
  const speakingSpeed = document.getElementById("speakingSpeed");
  const saveBtn = document.getElementById("saveBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const historyList = document.getElementById("historyList");

  // State Variables
  let recognition = null;
  let isRecording = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let startTime = null;
  let timerInterval = null;
  let history = [];
  const MAX_HISTORY_ITEMS = 5;

  // Initialize speech recognition
  function initializeSpeechRecognition() {
    if ("webkitSpeechRecognition" in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageSelect.value;

      recognition.onstart = () => {
        isRecording = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        startBtn.classList.add("recording");
        updateStatus("Recording...");
        startTimer();
      };

      recognition.onend = () => {
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.classList.remove("recording");
        updateStatus("Ready");
        stopTimer();
        addToHistory();
      };

      recognition.onresult = (event) => {
        let currentFinalTranscript = "";
        let currentInterimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinalTranscript += transcript + " ";
          } else {
            currentInterimTranscript = transcript;
          }
        }

        // Process the transcript based on settings
        currentFinalTranscript = processTranscript(currentFinalTranscript);
        currentInterimTranscript = processTranscript(currentInterimTranscript);

        // Update the final transcript
        finalTranscript = currentFinalTranscript;

        // Update the output with final transcript and current interim transcript
        output.value = finalTranscript + currentInterimTranscript;

        // Update counts and stats
        updateCounts();
        updateSpeakingSpeed();

        // Auto-scroll if enabled
        if (autoScroll.checked) {
          output.scrollTop = output.scrollHeight;
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        updateStatus("Error: " + event.error);
        showToast("Error occurred during speech recognition", "error");
      };
    } else {
      showToast(
        "Speech recognition is not supported in your browser. Please use Chrome.",
        "error"
      );
      startBtn.disabled = true;
      stopBtn.disabled = true;
    }
  }

  // Process transcript based on settings
  function processTranscript(text) {
    if (!text) return text;

    // Apply capitalization if enabled
    if (capitalizationToggle.checked) {
      text = capitalizeSentences(text);
    }

    // Apply punctuation if enabled
    if (punctuationToggle.checked) {
      text = addPunctuation(text);
    }

    return text;
  }

  // Capitalize sentences
  function capitalizeSentences(text) {
    // Capitalize first letter of each sentence
    text = text.replace(/(^\w|\.\s+\w)/gm, (letter) => letter.toUpperCase());

    // Capitalize first letter of the text if it's not already capitalized
    if (text.length > 0 && !text[0].match(/[A-Z]/)) {
      text = text[0].toUpperCase() + text.slice(1);
    }

    return text;
  }

  // Add basic punctuation
  function addPunctuation(text) {
    // Remove extra spaces
    text = text.replace(/\s+/g, " ").trim();

    // Add period at the end if no punctuation exists
    if (!text.match(/[.!?]$/)) {
      text += ".";
    }

    // Add space after punctuation if missing
    text = text.replace(/([.!?])([A-Za-z])/g, "$1 $2");

    // Add newline after sentence endings
    text = text.replace(/([.!?])\s+/g, "$1\n");

    return text;
  }

  // Timer functions
  function startTimer() {
    startTime = Date.now();
    duration.textContent = "00:00";
    speakingSpeed.textContent = "0 wpm";
    timerInterval = setInterval(updateTimer, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    duration.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  // Update speaking speed
  function updateSpeakingSpeed() {
    if (!startTime) return;

    const elapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const words = output.value
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const wpm = Math.round(words / elapsed);
    speakingSpeed.textContent = `${wpm} wpm`;
  }

  // Update word and character counts
  function updateCounts() {
    const text = output.value;
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    wordCount.textContent = words.length;
    charCount.textContent = text.length;
  }

  // Update status message
  function updateStatus(message) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `badge ${
      message === "Recording..." ? "bg-danger" : "bg-success"
    }`;
  }

  // History management
  function addToHistory() {
    const text = output.value.trim();
    if (text) {
      const historyItem = {
        text,
        timestamp: new Date().toISOString(),
        duration: duration.textContent,
        wordCount: wordCount.textContent,
      };

      history.unshift(historyItem);
      if (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
      }

      updateHistoryUI();
      saveHistory();
    }
  }

  function updateHistoryUI() {
    historyList.innerHTML = history
      .map(
        (item, index) => `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">Transcript ${index + 1}</h6>
            <small class="text-muted">${item.duration} • ${
          item.wordCount
        } words</small>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary" onclick="loadHistoryItem(${index})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteHistoryItem(${index})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function saveHistory() {
    localStorage.setItem("transcriptHistory", JSON.stringify(history));
  }

  function loadHistory() {
    const savedHistory = localStorage.getItem("transcriptHistory");
    if (savedHistory) {
      history = JSON.parse(savedHistory);
      updateHistoryUI();
    }
  }

  // Toast notifications
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    document.querySelector(".toast-container").appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener("hidden.bs.toast", () => {
      toast.remove();
    });
  }

  // Dark mode toggle
  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode")
    );
    showToast(
      `Dark mode ${
        document.body.classList.contains("dark-mode") ? "enabled" : "disabled"
      }`,
      "info"
    );
  }

  // Event Listeners
  startBtn.addEventListener("click", () => {
    if (recognition) {
      output.value = "";
      finalTranscript = "";
      interimTranscript = "";
      recognition.start();
    }
  });

  stopBtn.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
    }
  });

  clearBtn.addEventListener("click", () => {
    output.value = "";
    finalTranscript = "";
    interimTranscript = "";
    updateCounts();
    showToast("Text cleared", "info");
  });

  copyBtn.addEventListener("click", () => {
    output.select();
    document.execCommand("copy");
    showToast("Text copied to clipboard", "success");
  });

  saveBtn.addEventListener("click", () => {
    const text = output.value;
    if (text.trim()) {
      localStorage.setItem("savedTranscript", text);
      showToast("Transcript saved", "success");
    }
  });

  downloadBtn.addEventListener("click", () => {
    const text = output.value;
    if (text.trim()) {
      const blob = new Blob([text], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Transcript downloaded", "success");
    }
  });

  languageSelect.addEventListener("change", () => {
    if (recognition) {
      recognition.lang = languageSelect.value;
      showToast(
        `Language changed to ${
          languageSelect.options[languageSelect.selectedIndex].text
        }`,
        "info"
      );
    }
  });

  darkModeToggle.addEventListener("change", toggleDarkMode);

  // Handle visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && isRecording) {
      recognition.stop();
    }
  });

  // Load saved settings and history
  const savedTranscript = localStorage.getItem("savedTranscript");
  if (savedTranscript) {
    output.value = savedTranscript;
    updateCounts();
  }

  // Initialize dark mode if previously enabled
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    darkModeToggle.checked = true;
  }

  // Load history
  loadHistory();

  // Initialize speech recognition
  initializeSpeechRecognition();
});
