// --- Ambil Element DOM ---
const mainTimeInput = document.getElementById('main-time');
const breakTimeInput = document.getElementById('break-time');
const reminderTimeInput = document.getElementById('reminder-time');
const timerLabel = document.getElementById('timer-label');
const timeLeftDisplay = document.getElementById('time-left');
const statusMessage = document.getElementById('status-message');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');

// Optional: Elemen Audio
const reminderSound = document.getElementById('reminder-sound');
const endSound = document.getElementById('end-sound');
const breakStartSound = document.getElementById('break-start-sound');

// --- Variabel State Timer ---
let timerInterval = null;
let totalSeconds = 0;
let mainDurationSeconds = 0;
let breakDurationSeconds = 0;
let reminderSeconds = 0;
let firstHalfDuration = 0;
let remainingAfterBreak = 0;

let isRunning = false;
let isPaused = false;
let isBreakTime = false;
let reminderTriggered = false;

// --- Helper Functions ---

function timeToSeconds(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function playSound(soundElement) {
    if (soundElement && typeof soundElement.play === 'function') {
        soundElement.currentTime = 0;
        soundElement.play().catch(error => console.warn("Audio play failed:", error));
    }
}

// --- BARU: Helper function untuk menghentikan suara ---
function stopSound(soundElement) {
    if (soundElement && typeof soundElement.pause === 'function' && !soundElement.paused) {
        soundElement.pause();
        soundElement.currentTime = 0; // Reset posisi ke awal
    }
}

function updateDisplay() {
    timeLeftDisplay.textContent = formatTime(totalSeconds);
    document.title = `${formatTime(totalSeconds)} - ${timerLabel.textContent}`;
}

function setControlsState(running) {
    isRunning = running;
    startButton.disabled = running;
    pauseButton.disabled = !running || isPaused;
    resetButton.disabled = !mainDurationSeconds && !isRunning && !isPaused; // Aktif jika sudah ada durasi ATAU sedang berjalan/paused
    mainTimeInput.disabled = running || isPaused;
    breakTimeInput.disabled = running || isPaused;
    reminderTimeInput.disabled = running || isPaused;

    if (!running && !isPaused) {
        pauseButton.textContent = "Jeda";
        pauseButton.disabled = true;
    } else if (isPaused) {
         pauseButton.textContent = "Lanjutkan";
         pauseButton.disabled = false;
    } else {
        pauseButton.textContent = "Jeda";
        pauseButton.disabled = false;
    }
}

// --- Fungsi Inti Timer ---

function tick() {
    if (isPaused || totalSeconds < 0) return;

    totalSeconds--;

    // 1. Cek Kondisi Selesai Fase
    if (totalSeconds < 0) {
        clearInterval(timerInterval); // Hentikan interval
        stopSound(reminderSound); // <<< HENTIKAN SUARA PENGINGAT DI SINI

        if (isBreakTime) {
            // Jeda selesai, lanjutkan paruh kedua waktu utama
            playSound(endSound); // Mainkan suara akhir jeda (atau suara selesai)
            isBreakTime = false;
            totalSeconds = remainingAfterBreak;
             if (totalSeconds <= 0) {
                finishTimer(); // Langsung finish jika sisa waktu 0
                return;
            }
            timerLabel.textContent = "Waktu Utama (Sisa)";
            statusMessage.textContent = "";
            reminderTriggered = false;
            timerInterval = setInterval(tick, 1000);
        } else {
            // Waktu utama selesai (baik paruh pertama tanpa jeda, atau paruh kedua)
            finishTimer(); // Panggil fungsi penyelesaian akhir
        }
        updateDisplay(); // Update tampilan terakhir sebelum return
        return;
    }

    // 2. Cek Waktu Jeda
    if (!isBreakTime && breakDurationSeconds > 0 && totalSeconds === firstHalfDuration) {
        // (Tidak perlu stop reminder di sini karena timer masih lanjut ke jeda)
        playSound(breakStartSound);
        isBreakTime = true;
        remainingAfterBreak = totalSeconds;
        totalSeconds = breakDurationSeconds;
        timerLabel.textContent = "Waktu Jeda";
        statusMessage.textContent = "Waktu jeda dimulai...";
        reminderTriggered = false; // Reset pengingat untuk fase jeda (meskipun tidak ada pengingat jeda)
    }

    // 3. Cek Pengingat
    if (!isBreakTime && reminderSeconds > 0 && totalSeconds === reminderSeconds && !reminderTriggered) {
        playSound(reminderSound);
        statusMessage.textContent = `Pengingat: Waktu tersisa ${formatTime(reminderSeconds)}!`;
        reminderTriggered = true;
    } else if (totalSeconds < reminderSeconds) {
        if (statusMessage.textContent.startsWith("Pengingat:")) {
             statusMessage.textContent = ""; // Hapus pesan jika sudah lewat
        }
    }

    updateDisplay();
}

function finishTimer() {
    stopSound(reminderSound); // <<< PASTIKAN PENGINGAT BERHENTI DI AKHIR
    playSound(endSound); // Mainkan suara selesai akhir
    timerLabel.textContent = "Selesai!";
    timeLeftDisplay.textContent = "00:00:00";
    statusMessage.textContent = "Timer telah berakhir.";
    isRunning = false;
    isPaused = false;
    isBreakTime = false;
    document.title = "Timer Selesai!";
    setControlsState(false);
    resetButton.disabled = false;
    // Pastikan interval benar-benar bersih jika dipanggil dari tempat lain selain tick
    if(timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}


// --- Event Listeners ---

startButton.addEventListener('click', () => {
    // ... (logika start tidak berubah banyak)
    mainDurationSeconds = timeToSeconds(mainTimeInput.value);
    breakDurationSeconds = timeToSeconds(breakTimeInput.value);
    reminderSeconds = timeToSeconds(reminderTimeInput.value);

    if (mainDurationSeconds <= 0) {
        statusMessage.textContent = "Waktu Utama harus lebih dari 00:00:00";
        return;
    }
     if (reminderSeconds >= mainDurationSeconds && mainDurationSeconds > 0) {
        statusMessage.textContent = "Waktu Pengingat harus kurang dari Waktu Utama.";
        return;
    }

    firstHalfDuration = Math.floor(mainDurationSeconds / 2);
    remainingAfterBreak = mainDurationSeconds - firstHalfDuration;

    totalSeconds = mainDurationSeconds;
    isPaused = false;
    isBreakTime = false;
    reminderTriggered = false;
    timerLabel.textContent = "Waktu Utama";
    statusMessage.textContent = "";

    clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);

    updateDisplay();
    setControlsState(true);
    resetButton.disabled = false; // Aktifkan reset setelah start
});

pauseButton.addEventListener('click', () => {
    if (!isRunning) return;

    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(timerInterval);
        timerLabel.textContent += " (Dijeda)";
        statusMessage.textContent = "Timer dijeda.";
        // Tidak perlu stop suara saat jeda manual, mungkin ingin dilanjutkan nanti
    } else {
        timerLabel.textContent = timerLabel.textContent.replace(" (Dijeda)", "");
        statusMessage.textContent = "";
        timerInterval = setInterval(tick, 1000);
    }
    setControlsState(true);
});

resetButton.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;

    // <<< HENTIKAN SEMUA SUARA SAAT RESET >>>
    stopSound(reminderSound);
    stopSound(breakStartSound);
    stopSound(endSound);

    totalSeconds = 0;
    mainDurationSeconds = 0; // Reset durasi agar tombol reset nonaktif lagi
    breakDurationSeconds = 0;
    reminderSeconds = 0;
    firstHalfDuration = 0;
    remainingAfterBreak = 0;
    isRunning = false;
    isPaused = false;
    isBreakTime = false;
    reminderTriggered = false;

    timerLabel.textContent = "Siap Dimulai";
    timeLeftDisplay.textContent = "00:00:00";
    statusMessage.textContent = "";
    document.title = "Web Timer Fleksibel";

    // Reset input fields ke 00:00:00 saat reset
    mainTimeInput.value = "00:00:00";
    breakTimeInput.value = "00:00:00";
    reminderTimeInput.value = "00:00:00";


    setControlsState(false);
    resetButton.disabled = true; // Nonaktifkan reset setelah reset selesai
});

// --- Inisialisasi ---
setControlsState(false);
resetButton.disabled = true;

// const fullscreenBtn = document.getElementById('fullscreen-btn');
// const newsSection = document.getElementById('display');

//     // Fungsi untuk masuk fullscreen pada bagian berita
//     function enterFullscreen(element) {
//     if (element.requestFullscreen) {
//         element.requestFullscreen();
//     } else if (element.webkitRequestFullscreen) { // Safari
//         element.webkitRequestFullscreen();
//     } else if (element.msRequestFullscreen) { // IE/Edge
//         element.msRequestFullscreen();
//     }
//     }

//     // Fungsi untuk keluar fullscreen
//     function exitFullscreen() {
//     if (document.exitFullscreen) {
//         document.exitFullscreen();
//     } else if (document.webkitExitFullscreen) { // Safari
//         document.webkitExitFullscreen();
//     } else if (document.msExitFullscreen) { // IE/Edge
//         document.msExitFullscreen();
//     }
//     }

//     // Update tombol saat keluar fullscreen
//     document.addEventListener('fullscreenchange', () => {
//     if (!document.fullscreenElement) {
//         fullscreenBtn.textContent = 'fokus';
//     }
//     });

// --- Existing Code (Ambil Element DOM, Variabel State, Helper Functions, Fungsi Timer, Event Listeners) ---
// ... (biarkan semua kode sebelumnya) ...


// --- BARU: Fullscreen Functionality ---

const fullscreenContent = document.getElementById('fullscreen-content');
const fullscreenButton = document.getElementById('fullscreen-button');
// Opsional: Ikon jika menggunakan Font Awesome
// const fullscreenIcon = fullscreenButton.querySelector('i');

function enterFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari, Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
}

function isFullscreen() {
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullscreenElement;
}

function toggleFullscreen() {
    if (!isFullscreen()) {
        enterFullscreen(fullscreenContent);
    } else {
        exitFullscreen();
    }
}

function updateFullscreenButton() {
    if (isFullscreen()) {
        fullscreenButton.textContent = "Keluar Layar Penuh";
        // Jika pakai ikon:
        // fullscreenIcon.classList.remove('fa-expand');
        // fullscreenIcon.classList.add('fa-compress');
    } else {
        fullscreenButton.textContent = "Layar Penuh";
         // Jika pakai ikon:
        // fullscreenIcon.classList.remove('fa-compress');
        // fullscreenIcon.classList.add('fa-expand');
    }
}

// Event listener untuk tombol fullscreen
fullscreenButton.addEventListener('click', toggleFullscreen);

// Event listener untuk perubahan status fullscreen (termasuk tekan ESC)
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton); // Chrome, Safari, Opera
document.addEventListener('mozfullscreenchange', updateFullscreenButton);    // Firefox
document.addEventListener('MSFullscreenChange', updateFullscreenButton);     // IE/Edge


// Panggil sekali di awal untuk set teks tombol yang benar (meskipun pasti tidak fullscreen saat load)
updateFullscreenButton();