"""The sound of the opening: a short orchestral cue and a steam tug's whistle, timed to the animation after the tap.

  python3 tools/opening_sound.py   -> assets/opening.mp3 (about 4 seconds, 48 kHz stereo)

  0.0 s  the tap: a harp runs up and the strings swell over a soft timpani roll, as the tug sails in
  0.9 s  she arrives and blows her whistle, short then long: three chimes, the hiss of steam, the echo off the shore;
         the music drops back under it, the cellos climbing to
  2.0 s  the arrival chord: horns, trombones, tuba, strings, timpani and a touch of glockenspiel, ringing on into the
         title card

The music is written here as MIDI and played by FluidSynth with the MuseScore General soundfont (MIT licence; real
sampled instruments): apt-get install fluidsynth musescore-general-soundfont. The whistle is made here, in numpy: three
pipes tuned to the music's chord, each starting flat and rising as the steam comes up to pressure, with breath, flutter
and the hiss of the valve. Needs mido, numpy and scipy (pip install mido numpy scipy), and ffmpeg.
"""
import pathlib, subprocess, tempfile
import numpy as np
import mido
from scipy.signal import butter, sosfilt, fftconvolve

root = pathlib.Path(__file__).resolve().parent.parent
SF = '/usr/share/sounds/sf3/MuseScore_General_Full.sf3'
SR = 48000
LENGTH = 4.2  # seconds, the last of it ringing into the title card

# when things happen, in seconds from the tap: the same times the animation uses (tools/logo.py)
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from logo import TOOT1, TOOT1_LEN, TOOT2, TOOT2_LEN, ARRIVE  # noqa: E402

# ---- the music, as MIDI ----
D = {'D2': 38, 'A2': 45, 'B2': 47, 'C#3': 49, 'D3': 50, 'F#3': 54, 'A3': 57, 'D4': 62, 'E4': 64, 'F#4': 66, 'A4': 69,
     'B4': 71, 'D5': 74, 'E5': 76, 'F#5': 78, 'A5': 81, 'B5': 83, 'D6': 86}
CH = {'strings': (0, 48), 'harp': (1, 46), 'timp': (2, 47), 'horns': (3, 60), 'trom': (4, 57), 'tuba': (5, 58),
      'glock': (6, 9), 'cello': (7, 42), 'basses': (8, 43)}


def music_midi(path):
    ev = []  # (seconds, order, message)

    def note(part, n, t, dur, vel):
        ch = CH[part][0]; k = D[n] if isinstance(n, str) else n
        ev.append((t, 1, mido.Message('note_on', channel=ch, note=k, velocity=vel)))
        ev.append((t + dur, 0, mido.Message('note_off', channel=ch, note=k, velocity=0)))

    def cc(part, num, val, t):
        ev.append((t, 0, mido.Message('control_change', channel=CH[part][0], control=num, value=int(val))))

    def ramp(part, num, a, b, t0, t1, steps=24):
        for i in range(steps + 1):
            cc(part, num, a + (b - a) * i / steps, t0 + (t1 - t0) * i / steps)

    for part, (ch, prog) in CH.items():
        ev.append((0, -1, mido.Message('program_change', channel=ch, program=prog)))
        cc(part, 7, 110, 0); cc(part, 91, 70, 0); cc(part, 93, 10, 0); cc(part, 11, 127, 0)
    # the strings swell in, drop back for the whistle, and open out on the arrival
    ramp('strings', 11, 25, 100, 0, .85); ramp('strings', 11, 100, 62, .85, 1.0); ramp('strings', 11, 62, 118, 1.7, ARRIVE + .1)
    ramp('strings', 11, 118, 70, ARRIVE + .4, LENGTH - .3)
    for n in ['D3', 'A3', 'D4', 'F#4']: note('strings', n, 0.0, ARRIVE - .02, 70)
    for n in ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']: note('strings', n, ARRIVE, LENGTH - ARRIVE - .25, 92)
    # the harp: a run up the D major pentatonic as the tug sails in, and a last ripple on the arrival
    run = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6']
    for i, n in enumerate(run): note('harp', n, .04 + i * .065, 1.2, 58 + i * 4)
    for i, n in enumerate(['D4', 'A4', 'D5', 'F#5', 'A5']): note('harp', n, ARRIVE + i * .035, 1.6, 70)
    # timpani: a soft roll growing under the run, and one stroke on the arrival
    for i in range(14): note('timp', 'D2', .05 + i * .055, .06, 28 + i * 4)
    note('timp', 'D2', ARRIVE, 1.6, 104)
    # the cellos and basses climb under the long blast: A, B, C sharp, to D on the arrival
    ramp('cello', 11, 70, 112, 1.3, ARRIVE)
    for i, n in enumerate(['A2', 'B2', 'C#3']): note('cello', n, 1.40 + i * .2, .2, 74 + i * 8)
    note('cello', 'D3', ARRIVE, LENGTH - ARRIVE - .3, 100); note('basses', 'D2', ARRIVE, LENGTH - ARRIVE - .3, 96)
    # the arrival chord in the brass, warm rather than loud
    ramp('horns', 11, 90, 127, ARRIVE, ARRIVE + .35); ramp('horns', 11, 127, 70, ARRIVE + .6, LENGTH - .3)
    for n in ['D4', 'F#4', 'A4']: note('horns', n, ARRIVE, LENGTH - ARRIVE - .3, 88)
    cc('trom', 7, 84, 0)  # the trombones under the horns, not over them
    for n in ['D3', 'A3']: note('trom', n, ARRIVE + .02, LENGTH - ARRIVE - .5, 60)
    note('tuba', 'D2', ARRIVE + .02, LENGTH - ARRIVE - .5, 70)
    # and the glint of the sun on the water
    cc('glock', 7, 127, 0)
    for i, n in enumerate(['A5', 'D6']): note('glock', n, ARRIVE + .05 + i * .12, 1.2, 118)

    mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000))  # 120 a minute: a beat is half a second, 960 ticks a second
    last = 0
    for t, _, m in sorted(ev, key=lambda e: (e[0], e[1])):
        tick = int(round(t * 960)); tr.append(m.copy(time=tick - last)); last = tick
    tr.append(mido.MetaMessage('end_of_track', time=int(LENGTH * 960) - last + 240))
    mid.save(path)


def render_music(mid, wav):
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.55', '-r', str(SR), '-F', str(wav),
                    '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.62', '-o', 'synth.reverb.damp=0.35',
                    '-o', 'synth.reverb.width=0.9', '-o', 'synth.reverb.level=0.55', '-o', 'synth.chorus.active=0', SF, str(mid)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def read_wav(path):
    import wave
    with wave.open(str(path)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        return a.reshape(-1, w.getnchannels())


# ---- the whistle ----
rng = np.random.default_rng(1870)


def band(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def smooth_noise(n, cutoff):
    return sosfilt(butter(2, cutoff, fs=SR, output='sos'), rng.standard_normal(n)) * np.sqrt(SR / cutoff) * .5


def blast(length):
    """One blast of a three-chime steam whistle, tuned to D major, with the steam's onset and the valve's hiss."""
    pre, tail = .03, .45
    n = int((pre + length + tail) * SR); t = np.arange(n) / SR - pre
    on = np.clip(t / .05, 0, 1) ** 1.5 * np.clip((length + .14 - t) / .14, 0, 1)  # attack 50 ms, release 140 ms
    on[t < 0] = 0
    out = np.zeros(n)
    jitter = smooth_noise(n, 9) * .0018
    for i, f in enumerate([293.66, 369.99, 440.0]):
        rise = .9 + .1 * (1 - np.exp(-np.clip(t, 0, None) / .045))  # flat at first, up to pitch as the steam comes up
        fall = 1 - .035 * np.clip((t - length) / .14, 0, 1)            # sagging as the valve closes
        vib = 1 + .0025 * np.sin(2 * np.pi * (5.6 + i * .4) * t + i) + jitter
        ph = 2 * np.pi * np.cumsum(f * rise * fall * vib) / SR
        tone = np.sin(ph) + .32 * np.sin(2 * ph + .3) + .11 * np.sin(3 * ph + .7) + .04 * np.sin(4 * ph)
        breath = band(rng.standard_normal(n), f * .94, f * 1.06) * 2.2
        out += (tone * (1 - .08 * i) + breath * .35) * on
    hiss_env = np.clip((t + .02) / .02, 0, 1) * np.exp(-np.clip(t - length, 0, None) / .12)
    hiss = band(rng.standard_normal(n), 2500, 9000) * .5 * hiss_env
    w = out * .26 + hiss * .18
    return sosfilt(butter(2, 6500, fs=SR, output='sos'), w), pre


def reverb(x, seconds=1.3, wet=.18):
    n = int(seconds * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (seconds / 6.9))
    ir = sosfilt(butter(2, 3500, fs=SR, output='sos'), ir); ir /= np.sqrt(np.sum(ir ** 2))
    return x + wet * fftconvolve(x, ir)[:len(x)]


def whistle_track(n):
    mono = np.zeros(n)
    for start, length in [(TOOT1, TOOT1_LEN), (TOOT2, TOOT2_LEN)]:
        b, pre = blast(length); i = int((start - pre) * SR); mono[i:i + len(b)] += b[:n - i]
    # the echo back off the islands: later, softer and duller
    lp = butter(2, 2200, fs=SR, output='sos')
    for delay, gain in [(.34, .28), (.66, .12)]:
        k = int(delay * SR); mono[k:] += gain * sosfilt(lp, mono[:-k])
    mono = reverb(mono)
    # the tug is left of centre in the picture
    return np.stack([mono * 1.0, mono * .72], axis=1)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        music_midi(tmp / 'opening.mid'); render_music(tmp / 'opening.mid', tmp / 'music.wav')
        music = read_wav(tmp / 'music.wav')
        n = int(LENGTH * SR); music = np.pad(music, ((0, max(0, n - len(music))), (0, 0)))[:n]
        # the balance, by measurement: the whistle 3 dB under the arrival chord, so the music has the last word
        whistle = whistle_track(n)
        level = lambda x, a, b: np.sqrt(np.mean(x[int(a * SR):int(b * SR)] ** 2))
        whistle *= level(music, ARRIVE, ARRIVE + .8) / level(whistle, TOOT2, TOOT2 + TOOT2_LEN) * 10 ** (-3 / 20)
        mix = music + whistle
        # a gentle start (no click) and an ending that fades into the title card
        env = np.ones(n); f0 = int(.01 * SR); env[:f0] = np.linspace(0, 1, f0)
        f1 = int(1.1 * SR); env[-f1:] = np.linspace(1, 0, f1) ** 1.6
        mix *= env[:, None]
        mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))  # peak at -1 dBFS
        pcm = (mix * 32767).astype('<i2').tobytes()
        out = root / 'assets' / 'opening.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '128k', str(out)], input=pcm, check=True)
        rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)))
        print(f'assets/opening.mp3: {LENGTH} s, {out.stat().st_size // 1024} KB, overall level {rms:.1f} dBFS RMS')
        return mix


if __name__ == '__main__':
    main()
