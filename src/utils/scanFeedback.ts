// Minimal Web Audio API tone synthesizer for hardware feedback on the kiosk
// login screen. No audio files/assets needed — tones are generated on the fly.

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AudioContextCtor) return null;
	if (!sharedContext) sharedContext = new AudioContextCtor();
	return sharedContext;
}

function playTone(frequency: number, startOffsetSec: number, durationSec: number, context: AudioContext, gainValue = 0.15) {
	const oscillator = context.createOscillator();
	const gain = context.createGain();
	oscillator.type = "sine";
	oscillator.frequency.value = frequency;
	gain.gain.value = gainValue;
	oscillator.connect(gain);
	gain.connect(context.destination);

	const start = context.currentTime + startOffsetSec;
	oscillator.start(start);
	// Quick fade-out avoids an audible click at the end of the tone.
	gain.gain.setValueAtTime(gainValue, start + durationSec - 0.02);
	gain.gain.linearRampToValueAtTime(0, start + durationSec);
	oscillator.stop(start + durationSec);
}

/** Single short high beep — scan recognized / login succeeded. */
export function playScanSuccessTone() {
	const context = getContext();
	if (!context) return;
	playTone(1400, 0, 0.12, context);
}

/** Double short low beep — scan rejected / login failed. */
export function playScanErrorTone() {
	const context = getContext();
	if (!context) return;
	playTone(320, 0, 0.14, context, 0.18);
	playTone(320, 0.18, 0.14, context, 0.18);
}