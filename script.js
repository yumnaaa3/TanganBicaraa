// Inisialisasi variabel
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const outputDiv = document.getElementById('output');
const currentLetterDiv = document.getElementById('currentLetter');
const historyDiv = document.getElementById('history');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const spaceBtn = document.getElementById('spaceBtn');
const clearBtn = document.getElementById('clearBtn');

let hands = null;
let camera = null;
let isRunning = false;
let currentText = '';
let lastLetter = '';
let letterTimeout = null;
// Cooldown untuk mencegah kata yang sama ditambahkan berkali-kali
let lastAddedWord = '';
let lastAddedTime = 0;
const WORD_COOLDOWN = 2000; // 2 detik

function addHistoryEntry(text) {
    const entry = document.createElement('div');
    entry.className = 'history-entry';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'history-entry-text';
    wordSpan.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'history-entry-meta';
    timeSpan.textContent = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    entry.appendChild(wordSpan);
    entry.appendChild(timeSpan);

    historyDiv.prepend(entry);

    const maxEntries = 8;
    while (historyDiv.children.length > maxEntries) {
        historyDiv.removeChild(historyDiv.lastChild);
    }
}

// Fungsi untuk menginisialisasi MediaPipe Hands
function initializeHands() {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2, // Bisa deteksi 2 tangan untuk gesture yang lebih kompleks
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);
}

// Fungsi untuk memproses hasil deteksi
function onResults(results) {
    if (!isRunning) return;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Flip horizontal untuk mirror effect
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Gambar landmarks tangan
        for (const landmarks of results.multiHandLandmarks) {
            // Flip landmarks untuk mirror effect
            const flippedLandmarks = landmarks.map(landmark => ({
                x: 1 - landmark.x,
                y: landmark.y,
                z: landmark.z
            }));
            
            drawConnectors(canvasCtx, flippedLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, flippedLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
        }

        // Deteksi gesture dan konversi ke kata (gunakan landmarks asli, bukan yang di-flip)
        const detectedWord = recognizeWordGesture(results.multiHandLandmarks);
        
        if (detectedWord) {
            const now = Date.now();

            // Jika masih dalam cooldown untuk kata yang sama, hanya tampilkan preview, jangan tambahkan ke teks
            if (detectedWord === lastAddedWord && now - lastAddedTime < WORD_COOLDOWN) {
                currentLetterDiv.textContent = detectedWord;
                currentLetterDiv.style.color = '#cccc00';
                currentLetterDiv.style.fontSize = '2em';
                statusDiv.textContent = `Kata "${detectedWord}" masih dalam jeda...`;
                statusDiv.style.color = '#ffc107';
            } else {
                // Tampilkan preview kata yang terdeteksi
                currentLetterDiv.textContent = detectedWord;
                currentLetterDiv.style.color = '#ffc107';
                currentLetterDiv.style.fontSize = '2em';
                
                // Update status
                statusDiv.textContent = `Kata terdeteksi: ${detectedWord} (tahan 1.5 detik)`;
                statusDiv.style.color = '#28a745';
                
                // Jika kata berbeda dari sebelumnya, reset timer
                if (detectedWord !== lastLetter) {
                    lastLetter = detectedWord;
                    
                    // Reset timeout sebelumnya jika ada
                    if (letterTimeout) {
                        clearTimeout(letterTimeout);
                    }
                    
                    // Tambahkan kata ke teks setelah 1.5 detik
                    letterTimeout = setTimeout(() => {
                        if (detectedWord === lastLetter && detectedWord) {
                            const nowInner = Date.now();
                            // Cek cooldown lagi sebelum benar-benar menambahkan
                            if (detectedWord === lastAddedWord && nowInner - lastAddedTime < WORD_COOLDOWN) {
                                return;
                            }

                            // Tambahkan spasi jika teks sudah ada dan tidak diakhiri spasi
                            if (currentText && !currentText.endsWith(' ')) {
                                currentText += ' ';
                            }
                            currentText += detectedWord;
                            outputDiv.textContent = currentText;

                            // Set info cooldown kata terakhir
                            lastAddedWord = detectedWord;
                            lastAddedTime = nowInner;
                            
                            // Reset untuk deteksi berikutnya
                            lastLetter = '';
                            currentLetterDiv.textContent = '';
                            currentLetterDiv.style.color = '';
                            
                            statusDiv.textContent = `Kata "${detectedWord}" ditambahkan!`;
                            setTimeout(() => {
                                statusDiv.textContent = 'Tangan terdeteksi - Tunjukkan bahasa isyarat';
                            }, 2000);
                        }
                    }, 1500);
                }
            }
        } else {
            // Tidak ada gesture terdeteksi
            if (lastLetter) {
                // Reset jika gesture hilang
                lastLetter = '';
                if (letterTimeout) {
                    clearTimeout(letterTimeout);
                }
            }
            currentLetterDiv.textContent = '';
            statusDiv.textContent = 'Tangan terdeteksi - Tunjukkan bahasa isyarat';
            statusDiv.style.color = '#ffc107';
        }
    } else {
        currentLetterDiv.textContent = '';
        statusDiv.textContent = 'Tidak ada tangan terdeteksi - Tunjukkan tangan di depan kamera';
        statusDiv.style.color = '#ffc107';
    }

    canvasCtx.restore();
}

// Fungsi untuk mengenali gesture kata-kata bahasa isyarat
function recognizeWordGesture(landmarksArray) {
    if (!landmarksArray || landmarksArray.length === 0) return null;
    
    const primaryHand = landmarksArray[0];
    // Gunakan landmarks asli untuk deteksi posisi absolut
    const landmarks = primaryHand;
    
    // Deteksi kata-kata sederhana berdasarkan gesture bahasa isyarat Indonesia
    // Prioritas: gesture yang lebih spesifik dulu (kurang ambigu)
    
    // I love you - Gesture klasik: jari kelingking, ibu jari lurus (sangat spesifik)
    if (isWordILoveYou(landmarks)) return 'i love you';
    
    // Ya/Baik - Jempol ke atas (spesifik)
    if (isWordYa(landmarks)) return 'ya';
    
    // Namaku - Jari telunjuk menunjuk ke bawah (ke diri sendiri)
    if (isWordNamaku(landmarks)) return 'namaku';
    
    // Yumna - dua jari rapat di depan wajah
    if (isWordYumna(landmarks)) return 'yumna';
    
    // Tidak/Apa kabar - Jari telunjuk lurus, jari lain menekuk
    if (isWordTidak(landmarks)) return 'tidak';
    
    // Maaf - Kepalan tangan di dada
    if (isWordMaaf(landmarks)) return 'maaf';
    
    // Terima kasih - Ibu jari dan jari telunjuk membentuk lingkaran
    if (isWordTerimaKasih(landmarks)) return 'terima kasih';
    
    // Sama-sama - Semua jari terbuka di posisi horizontal
    if (isWordSamaSama(landmarks)) return 'sama-sama';
    
    // Hallo/Hai/Tolong - Semua jari terbuka (gesture umum)
    if (isWordHallo(landmarks)) return 'hallo';
    
    // Selamat pagi - Tangan diangkat sangat tinggi
    if (isWordSelamatPagi(landmarks)) return 'selamat pagi';
    
    // Selamat siang - Tangan diangkat sedang
    if (isWordSelamatSiang(landmarks)) return 'selamat siang';
    
    // Selamat malam - Tangan diangkat lebih rendah
    if (isWordSelamatMalam(landmarks)) return 'selamat malam';
    
    return null;
}

// Fungsi untuk normalisasi landmarks
function normalizeLandmarks(landmarks) {
    // Hitung bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxX = Math.max(maxX, landmark.x);
        maxY = Math.max(maxY, landmark.y);
    });
    
    // Normalisasi ke 0-1
    const normalized = landmarks.map(landmark => ({
        x: (landmark.x - minX) / (maxX - minX),
        y: (landmark.y - minY) / (maxY - minY),
        z: landmark.z
    }));
    
    return normalized;
}

// Fungsi helper untuk menghitung jarak
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Fungsi helper untuk mengecek apakah jari lurus
function isFingerExtended(landmarks, fingerIndices) {
    const tip = landmarks[fingerIndices[3]];
    const pip = landmarks[fingerIndices[2]];
    const mcp = landmarks[fingerIndices[1]];
    
    // Untuk jari yang lurus, tip harus lebih tinggi (y lebih kecil) dari pip dan mcp
    // Tambahkan toleransi untuk deteksi yang lebih baik
    const tolerance = 0.02;
    return (tip.y < pip.y - tolerance) && (pip.y < mcp.y - tolerance);
}

// Fungsi khusus untuk ibu jari (karena orientasinya berbeda)
function isThumbExtended(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const wrist = landmarks[0];
    
    // Untuk ibu jari, kita cek posisi relatif terhadap wrist dan IP joint
    // Ibu jari extended jika tip lebih jauh dari wrist daripada IP joint
    const tipToWrist = Math.abs(thumbTip.x - wrist.x) + Math.abs(thumbTip.y - wrist.y);
    const ipToWrist = Math.abs(thumbIp.x - wrist.x) + Math.abs(thumbIp.y - wrist.y);
    
    return tipToWrist > ipToWrist + 0.05;
}

// Indeks landmarks untuk setiap jari (MediaPipe Hands)
const FINGER_INDICES = {
    THUMB: [1, 2, 3, 4],
    INDEX: [5, 6, 7, 8],
    MIDDLE: [9, 10, 11, 12],
    RING: [13, 14, 15, 16],
    PINKY: [17, 18, 19, 20]
};

// Fungsi deteksi untuk kata-kata bahasa isyarat
function isWordHallo(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const middleFinger = landmarks[12];
    
    // Hallo: Tangan diangkat dengan semua jari terbuka (seperti melambaikan)
    // Semua jari lurus kecuali ibu jari, posisi tangan di atas
    return !thumb && index && middle && ring && pinky && middleFinger.y < 0.5;
}

function isWordHai(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Hai: Tangan diangkat dengan jari terbuka (sama dengan hallo, tapi bisa lebih rendah)
    // Untuk membedakan, kita bisa cek posisi atau gunakan gesture yang sama
    // Sementara kita gabungkan dengan hallo
    return !thumb && index && middle && ring && pinky;
}

function isWordILoveYou(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // I Love You: Jari kelingking (I), ibu jari dan jari telunjuk (L), jari kelingking dan ibu jari (Y)
    // Gesture klasik: pinky, thumb, dan index extended
    return thumb && !index && !middle && !ring && pinky;
}

function isWordNamaku(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    
    // Namaku: Jari telunjuk menunjuk ke diri sendiri (ke arah dada)
    // Jari telunjuk di area tengah-bawah (mengarah ke dada)
    return !thumb && index && !middle && !ring && !pinky && 
           indexTip.y > 0.5 && indexTip.y < 0.8;
}

function isWordYumna(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const avgY = (indexTip.y + middleTip.y) / 2;
    const avgX = (indexTip.x + middleTip.x) / 2;
    const fingerGap = Math.abs(indexTip.x - middleTip.x);
    
    // Yumna: dua jari (telunjuk + tengah) rapat dan tegak di depan wajah/dada bagian atas
    return !thumb && index && middle && !ring && !pinky &&
           fingerGap < 0.08 &&
           avgY > 0.35 && avgY < 0.6 &&
           Math.abs(avgX - 0.5) < 0.2;
}

function isWordTerimaKasih(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const thumbIndexDist = distance(thumbTip, indexTip);
    
    // Terima kasih: Tangan di dada kemudian maju (gesture dengan jari telunjuk dan ibu jari)
    return thumb && index && !middle && !ring && !pinky && thumbIndexDist > 0.15;
}

function isWordYa(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Ya: Jempol ke atas (thumb extended, jari lain menekuk)
    return thumb && !index && !middle && !ring && !pinky;
}

function isWordTidak(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Tidak: Jari telunjuk lurus, jari lain menekuk
    return !thumb && index && !middle && !ring && !pinky;
}

function isWordMaaf(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const wrist = landmarks[0];
    const chest = { x: 0.5, y: 0.6 };
    
    // Maaf: Tangan di dada atau menepuk dada (kepalan atau tangan terbuka di area dada)
    return !thumb && !index && !middle && !ring && !pinky && 
           Math.abs(wrist.x - chest.x) < 0.25 && wrist.y > 0.4 && wrist.y < 0.7;
}

function isWordTolong(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Tolong: Tangan diangkat seperti meminta (semua jari terbuka)
    // Sama dengan hallo/hai
    return !thumb && index && middle && ring && pinky;
}

function isWordSamaSama(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Sama-sama: Tangan bergerak ke samping (semua jari terbuka)
    // Untuk membedakan, kita cek posisi horizontal
    const wrist = landmarks[0];
    const middleFinger = landmarks[12];
    // Jika tangan di posisi horizontal (x ekstrem) atau y sedang
    return !thumb && index && middle && ring && pinky && 
           (Math.abs(wrist.x - middleFinger.x) > 0.15 || (middleFinger.y > 0.4 && middleFinger.y < 0.7));
}

function isWordSelamatPagi(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const middleFinger = landmarks[12];
    
    // Selamat pagi: Tangan diangkat tinggi seperti menyapa pagi
    return !thumb && index && middle && ring && pinky && middleFinger.y < 0.35;
}

function isWordSelamatSiang(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const middleFinger = landmarks[12];
    
    // Selamat siang: Tangan diangkat sedang
    return !thumb && index && middle && ring && pinky && middleFinger.y > 0.35 && middleFinger.y < 0.5;
}

function isWordSelamatMalam(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const middleFinger = landmarks[12];
    
    // Selamat malam: Tangan diangkat lebih rendah
    return !thumb && index && middle && ring && pinky && middleFinger.y > 0.5;
}

function isWordApaKabar(landmarks) {
    // Apa kabar: Sama dengan tidak (jari telunjuk lurus)
    // Untuk membedakan, bisa berdasarkan konteks atau gerakan
    return isWordTidak(landmarks);
}

function isWordBaik(landmarks) {
    // Baik: Sama dengan ya (jempol ke atas)
    return isWordYa(landmarks);
}

// Fungsi deteksi untuk setiap huruf (OLD - tidak digunakan lagi)
function isLetterA(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // A: Ibu jari lurus, jari lainnya menekuk
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterB(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // B: Semua jari lurus, ibu jari menekuk
    return !thumb && index && middle && ring && pinky;
}

function isLetterC(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // C: Tangan membentuk C (semua jari sedikit melengkung)
    const thumbIndexDist = distance(thumbTip, indexTip);
    const thumbPinkyDist = distance(thumbTip, pinkyTip);
    
    return thumb && !index && !middle && !ring && !pinky && 
           thumbIndexDist > 0.1 && thumbIndexDist < 0.25 && 
           thumbPinkyDist > 0.1 && thumbPinkyDist < 0.25;
}

function isLetterD(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // D: Jari telunjuk lurus, jari lainnya menekuk
    return !thumb && index && !middle && !ring && !pinky;
}

function isLetterE(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // E: Semua jari menekuk (kepalan dengan ibu jari di atas)
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterF(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const thumbIndexDist = distance(thumbTip, indexTip);
    
    // F: Ibu jari dan jari telunjuk membentuk lingkaran, jari lainnya lurus
    return thumb && !index && middle && ring && pinky && thumbIndexDist < 0.12;
}

function isLetterG(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // G: Jari telunjuk dan ibu jari lurus, lainnya menekuk
    return thumb && index && !middle && !ring && !pinky;
}

function isLetterH(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    // H: Jari telunjuk dan jari tengah lurus dan sejajar (bukan V)
    const indexMiddleDist = Math.abs(indexTip.x - middleTip.x);
    
    // H: Jari telunjuk dan jari tengah lurus, sejajar, lainnya menekuk
    return !thumb && index && middle && !ring && !pinky && indexMiddleDist < 0.05;
}

function isLetterI(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // I: Jari kelingking lurus, lainnya menekuk
    return !thumb && !index && !middle && !ring && pinky;
}

function isLetterJ(landmarks) {
    // Similar to I but with movement (simplified)
    return isLetterI(landmarks);
}

function isLetterK(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // K: Jari telunjuk dan jari tengah membentuk V dengan ibu jari
    return thumb && index && middle && !ring && !pinky;
}

function isLetterL(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // L: Jari telunjuk dan ibu jari membentuk L
    return thumb && index && !middle && !ring && !pinky;
}

function isLetterM(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // M: Ibu jari di luar, tiga jari (telunjuk, tengah, manis) menekuk dengan ujung jari tengah di antara telunjuk dan manis
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterN(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // N: Ibu jari di luar, jari telunjuk dan jari tengah menekuk dengan ujung jari tengah di antara telunjuk dan manis
    // Mirip dengan M tapi sedikit berbeda posisi
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterO(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbIndexDist = distance(thumbTip, indexTip);
    const thumbPinkyDist = distance(thumbTip, pinkyTip);
    
    return thumbIndexDist < 0.12 && thumbPinkyDist < 0.12;
}

function isLetterP(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // P: Jari telunjuk dan jari tengah ke bawah dengan ibu jari
    return thumb && index && middle && !ring && !pinky;
}

function isLetterQ(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Q: Jari telunjuk dan ibu jari ke bawah
    return thumb && index && !middle && !ring && !pinky;
}

function isLetterR(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    
    // R: Jari telunjuk dan jari tengah menyilang
    return thumb && index && middle && !ring && !pinky && Math.abs(indexTip.x - middleTip.x) > 0.05;
}

function isLetterS(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // S: Kepalan tangan (semua jari menekuk)
    return !thumb && !index && !middle && !ring && !pinky;
}

function isLetterT(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // T: Ibu jari di antara jari telunjuk dan jari tengah
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterU(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    // U: Jari telunjuk dan jari tengah lurus bersama (sejajar, bukan V)
    const indexMiddleDist = Math.abs(indexTip.x - middleTip.x);
    
    // U: Jari telunjuk dan jari tengah lurus dan sejajar
    return !thumb && index && middle && !ring && !pinky && indexMiddleDist < 0.05;
}

function isLetterV(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    // V: Jari telunjuk dan jari tengah membentuk V (terpisah)
    const indexMiddleDist = Math.abs(indexTip.x - middleTip.x);
    
    // V: Jari telunjuk dan jari tengah lurus dan terpisah membentuk V
    return !thumb && index && middle && !ring && !pinky && indexMiddleDist > 0.05;
}

function isLetterW(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // W: Jari telunjuk, tengah, dan manis membentuk W
    return !thumb && index && middle && ring && !pinky;
}

function isLetterX(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // X: Jari telunjuk menekuk (hook shape)
    return thumb && !index && !middle && !ring && !pinky;
}

function isLetterY(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Y: Jari kelingking dan ibu jari lurus
    return thumb && !index && !middle && !ring && pinky;
}

function isLetterZ(landmarks) {
    // Z requires movement, simplified version
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // Z: Gerakan Z dengan jari telunjuk (simplified)
    return thumb && index && !middle && !ring && !pinky;
}

// Fungsi deteksi untuk angka 0-9
function isNumber0(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // 0: Semua jari membentuk lingkaran (O shape)
    const thumbIndexDist = distance(thumbTip, indexTip);
    const thumbPinkyDist = distance(thumbTip, pinkyTip);
    
    return thumb && !index && !middle && !ring && !pinky && 
           thumbIndexDist > 0.08 && thumbIndexDist < 0.2 && 
           thumbPinkyDist > 0.08 && thumbPinkyDist < 0.2;
}

function isNumber1(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // 1: Hanya jari telunjuk lurus, ibu jari menekuk di dalam
    // Untuk membedakan dengan D, kita pastikan ibu jari benar-benar menekuk
    return !thumb && index && !middle && !ring && !pinky;
}

function isNumber2(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    // 2: Jari telunjuk dan jari tengah lurus membentuk V (terpisah)
    const indexMiddleDist = Math.abs(indexTip.x - middleTip.x);
    
    // 2: Jari telunjuk dan jari tengah lurus dan terpisah membentuk V
    return !thumb && index && middle && !ring && !pinky && indexMiddleDist > 0.05;
}

function isNumber3(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // 3: Jari telunjuk, tengah, dan manis lurus
    return !thumb && index && middle && ring && !pinky;
}

function isNumber4(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // 4: Semua jari lurus kecuali ibu jari (sama dengan B)
    // Untuk membedakan, kita bisa cek apakah ibu jari benar-benar menekuk
    return !thumb && index && middle && ring && pinky;
}

function isNumber5(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // 5: Semua jari lurus (termasuk ibu jari)
    return thumb && index && middle && ring && pinky;
}

function isNumber6(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];
    const thumbPinkyDist = distance(thumbTip, pinkyTip);
    
    // 6: Ibu jari dan jari kelingking menyentuh atau dekat, jari lainnya lurus
    return thumb && index && middle && ring && pinky && thumbPinkyDist < 0.15;
}

function isNumber7(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const thumbIndexDist = distance(thumbTip, indexTip);
    const thumbMiddleDist = distance(thumbTip, middleTip);
    
    // 7: Jari telunjuk dan jari tengah menyentuh ibu jari
    return thumb && index && middle && !ring && !pinky && 
           thumbIndexDist < 0.12 && thumbMiddleDist < 0.12;
}

function isNumber8(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const thumbIndexDist = distance(thumbTip, indexTip);
    
    // 8: Ibu jari dan jari telunjuk membentuk lingkaran, jari lainnya lurus
    return thumb && index && middle && ring && pinky && thumbIndexDist < 0.12;
}

function isNumber9(landmarks) {
    const thumb = isThumbExtended(landmarks);
    const index = isFingerExtended(landmarks, FINGER_INDICES.INDEX);
    const middle = isFingerExtended(landmarks, FINGER_INDICES.MIDDLE);
    const ring = isFingerExtended(landmarks, FINGER_INDICES.RING);
    const pinky = isFingerExtended(landmarks, FINGER_INDICES.PINKY);
    
    // 9: Jari telunjuk membentuk hook (menekuk), jari lainnya lurus
    return thumb && !index && middle && ring && pinky;
}

// Fungsi untuk memulai kamera
async function startCamera() {
    try {
        // Cek apakah browser mendukung getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser Anda tidak mendukung akses kamera. Gunakan browser modern seperti Chrome, Firefox, atau Edge.');
        }
        
        statusDiv.textContent = 'Meminta izin akses kamera...';
        statusDiv.classList.add('loading');
        startBtn.disabled = true;
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        
        videoElement.srcObject = stream;
        
        // Tunggu video siap
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Set canvas size sesuai dengan video
        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 480;
        
        // Inisialisasi MediaPipe Hands
        if (!hands) {
            initializeHands();
        }
        
        // Tunggu sebentar untuk memastikan hands sudah siap
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Inisialisasi kamera MediaPipe
        if (camera) {
            camera.stop();
        }
        
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (hands && isRunning) {
                    await hands.send({ image: videoElement });
                }
            },
            width: canvasElement.width,
            height: canvasElement.height
        });
        
        camera.start();
        isRunning = true;
        
        statusDiv.textContent = 'Kamera aktif - Tunjukkan bahasa isyarat di depan kamera';
        statusDiv.classList.remove('loading');
        startBtn.disabled = true;
        startBtn.textContent = 'Kamera Aktif';
        
    } catch (err) {
        console.error('Error accessing camera:', err);
        isRunning = false;
        startBtn.disabled = false;
        startBtn.textContent = 'Coba Lagi';
        statusDiv.classList.remove('loading');
        
        let errorMessage = 'Tidak bisa mengakses kamera. ';
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDismissedError') {
            errorMessage += 'Izin kamera ditolak. ';
            errorMessage += 'Silakan klik ikon kamera di address bar browser dan izinkan akses kamera, lalu klik "Coba Lagi".';
            statusDiv.innerHTML = `
                <div style="color: #dc3545; font-weight: bold; margin-bottom: 10px;">
                    ⚠️ Izin Kamera Ditolak
                </div>
                <div style="font-size: 0.9em; line-height: 1.6;">
                    <p>Untuk menggunakan aplikasi ini, Anda perlu memberikan izin akses kamera.</p>
                    <p><strong>Cara mengizinkan:</strong></p>
                    <ol style="text-align: left; display: inline-block; margin: 10px 0;">
                        <li>Klik ikon 🔒 atau 🎥 di address bar browser</li>
                        <li>Pilih "Izinkan" untuk akses kamera</li>
                        <li>Klik tombol "Coba Lagi" di bawah</li>
                    </ol>
                </div>
            `;
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage += 'Kamera tidak ditemukan. Pastikan kamera terhubung.';
            statusDiv.textContent = errorMessage;
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage += 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain yang menggunakan kamera.';
            statusDiv.textContent = errorMessage;
        } else {
            errorMessage += err.message || 'Pastikan izin kamera diberikan dan kamera tersedia.';
            statusDiv.textContent = errorMessage;
        }
    }
}

// Fungsi untuk membersihkan teks
function clearText() {
    // Simpan ke history sebelum clear
    if (currentText.trim() !== '') {
        addHistoryEntry(currentText.trim());
    }
    
    currentText = '';
    outputDiv.textContent = 'Kata-kata akan muncul di sini...';
    currentLetterDiv.textContent = '';
    lastLetter = '';
    lastAddedWord = '';
    lastAddedTime = 0;
    
    if (letterTimeout) {
        clearTimeout(letterTimeout);
    }
}

// Fungsi untuk menambahkan spasi
function addSpace() {
    currentText += ' ';
    outputDiv.textContent = currentText;
}

// Event listeners
startBtn.addEventListener('click', startCamera);
spaceBtn.addEventListener('click', addSpace);
clearBtn.addEventListener('click', clearText);

// Inisialisasi saat halaman dimuat
window.addEventListener('load', () => {
    statusDiv.textContent = 'Klik "Mulai Kamera" untuk memulai';
});

