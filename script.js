document.addEventListener('DOMContentLoaded', () => {

    // --- Hero Waveform Animation ---
    const heroCanvas = document.getElementById('waveform-bg');
    if(heroCanvas) {
        const heroCtx = heroCanvas.getContext('2d');
        
        let heroWidth, heroHeight;
        let heroPhase = 0;
        
        function resizeHeroCanvas() {
            heroWidth = heroCanvas.width = window.innerWidth;
            heroHeight = heroCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeHeroCanvas);
        resizeHeroCanvas();
        
        function drawHeroWaveform() {
            heroCtx.clearRect(0, 0, heroWidth, heroHeight);
            
            heroCtx.beginPath();
            heroCtx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
            heroCtx.lineWidth = 2;
            
            for (let x = 0; x < heroWidth; x += 2) {
                // Complex wave: combination of sine waves
                const y1 = Math.sin(x * 0.01 + heroPhase) * (heroHeight * 0.1);
                const y2 = Math.sin(x * 0.005 - heroPhase * 1.5) * (heroHeight * 0.2);
                const y3 = Math.sin(x * 0.02 + heroPhase * 0.5) * (heroHeight * 0.05);
                
                const totalY = heroHeight / 2 + y1 + y2 + y3;
                
                if (x === 0) heroCtx.moveTo(x, totalY);
                else heroCtx.lineTo(x, totalY);
            }
            
            heroCtx.stroke();
            
            // Add a second, faster neon green line
            heroCtx.beginPath();
            heroCtx.strokeStyle = 'rgba(0, 255, 65, 0.6)';
            heroCtx.lineWidth = 1;

            for (let x = 0; x < heroWidth; x += 4) {
                const y = Math.sin(x * 0.015 - heroPhase * 2) * (heroHeight * 0.15);
                const totalY = heroHeight / 2 + y;
                if (x === 0) heroCtx.moveTo(x, totalY);
                else heroCtx.lineTo(x, totalY);
            }
            heroCtx.stroke();

            heroPhase += 0.02;
            requestAnimationFrame(drawHeroWaveform);
        }
        
        drawHeroWaveform();
    }

    // --- Output Screen Waveform Animation ---
    const outCanvas = document.getElementById('output-canvas');
    const btnMicStart = document.getElementById('btn-mic-start');
    const btnMicStop = document.getElementById('btn-mic-stop');
    const outCaption = document.getElementById('output-caption');

    if(outCanvas) {
        const outCtx = outCanvas.getContext('2d');
        let outWidth, outHeight;
        let outPhase = 0;

        let audioContext = null;
        let analyser = null;
        let dataArray = null;
        let stream = null;
        let isMicActive = false;

        function resizeOutCanvas() {
            // Parent dimensions
            outWidth = outCanvas.width = outCanvas.parentElement.clientWidth;
            outHeight = outCanvas.height = outCanvas.parentElement.clientHeight;
        }
        window.addEventListener('resize', resizeOutCanvas);
        // Delay to allow container to size properly before first draw
        setTimeout(resizeOutCanvas, 100);

        function drawOutputWaveform() {
            // Fade effect for phosphor trail (oscilloscope persistence)
            outCtx.fillStyle = 'rgba(0, 17, 0, 0.2)';
            outCtx.fillRect(0, 0, outWidth, outHeight);

            outCtx.beginPath();
            outCtx.strokeStyle = '#00ff41'; // Neon green
            outCtx.lineWidth = 2;
            
            // Add a glow
            outCtx.shadowBlur = 8;
            outCtx.shadowColor = '#00ff41';

            const midY = outHeight / 2;

            if (isMicActive && analyser && dataArray) {
                // Real microphone data
                analyser.getByteTimeDomainData(dataArray);
                const sliceWidth = outWidth * 1.0 / analyser.frequencyBinCount;
                let x = 0;

                for (let i = 0; i < analyser.frequencyBinCount; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * outHeight) / 2;

                    if (i === 0) {
                        outCtx.moveTo(x, y);
                    } else {
                        outCtx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
            } else {
                // Simulate voice wave (with some randomness)
                const points = outWidth / 2; 
                let isSpeaking = Math.random() > 0.1; // 90% of time "speaking"
                let targetAmplitude = isSpeaking ? (Math.random() * 0.5 + 0.3) * (outHeight * 0.4) : (outHeight * 0.05);

                for(let i=0; i<points; i++) {
                    const x = (i / points) * outWidth;
                    // High frequency + low frequency + noise
                    let val = Math.sin(i * 0.2 + outPhase * 5) * 0.5 + 
                              Math.sin(i * 0.05 - outPhase * 2) * 0.4 +
                              (Math.random() - 0.5) * 0.15;
                    
                    // Envelope (Hanning window shape)
                    let envelope = Math.sin((i / points) * Math.PI); 
                    
                    const y = midY + (val * targetAmplitude * envelope);

                    if (i === 0) outCtx.moveTo(x, y);
                    else outCtx.lineTo(x, y);
                }
                outPhase += 0.08; // slightly faster
            }
            
            outCtx.stroke();
            
            // Reset shadow to avoid affecting the clear rect on next tick
            outCtx.shadowBlur = 0;

            requestAnimationFrame(drawOutputWaveform);
        }

        drawOutputWaveform();

        // Microphone Button Handlers
        if (btnMicStart && btnMicStop) {
            btnMicStart.addEventListener('click', async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    analyser = audioContext.createAnalyser();
                    const source = audioContext.createMediaStreamSource(stream);
                    
                    source.connect(analyser);
                    analyser.fftSize = 2048;
                    const bufferLength = analyser.frequencyBinCount;
                    dataArray = new Uint8Array(bufferLength);
                    
                    isMicActive = true;
                    btnMicStart.style.display = 'none';
                    btnMicStop.style.display = 'block';
                    if (outCaption) {
                        outCaption.textContent = 'Live microphone input active. Speak or make noise!';
                        outCaption.style.color = 'var(--neon-green)';
                    }
                } catch (err) {
                    console.error('Error accessing microphone:', err);
                    alert('Could not access microphone. Please allow microphone permissions.');
                }
            });

            btnMicStop.addEventListener('click', () => {
                isMicActive = false;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                if (audioContext) {
                    audioContext.close();
                }
                
                btnMicStart.style.display = 'block';
                btnMicStop.style.display = 'none';
                if (outCaption) {
                    outCaption.textContent = 'Simulated display of vocal audio input. Click "Start Microphone" for live input.';
                    outCaption.style.color = 'var(--text-muted)';
                }
            });
        }
    }

    // --- Simple Code Highlighting Script ---
    // A tiny script to colorize basic python keywords in our pre block
    const codeBlock = document.querySelector('code.language-python');
    if (codeBlock) {
        let text = codeBlock.textContent || codeBlock.innerText;
        
        text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Strings
        let html = text.replace(/('[^']*'|"[^"]*")/g, '<span class="string">$1</span>');
        
        // Comments
        html = html.replace(/(#[^\n]*)/g, '<span class="comment">$1</span>');

        // Keywords
        const keywords = ['import', 'from', 'global', 'def', 'return', 'with', 'as'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            // Ensure we don't accidentally replace within already highlighted spans
            html = html.replace(regex, `<span class="keyword">${kw}</span>`);
        });
        
        // Numbers
        html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="number">$1</span>');

        codeBlock.innerHTML = html;
    }
});
