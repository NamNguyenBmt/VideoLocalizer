"""Tổng hợp nhạc nền + hiệu ứng âm thanh cho template (không dùng file có bản quyền).

  python tools/make_audio.py            # ghi public/audio/*.mp3

Cần numpy + scipy và ffmpeg trong PATH. Mỗi bản nhạc nền là một vòng lặp liền mạch
(Remotion phát lặp lại), âm lượng tự giảm khi có lời đọc.
Muốn dùng nhạc thật (vd. bài "Bước chân tới trường"): chép mp3 vào public/audio/
rồi ghi tên file vào trường "music" của cảnh trong kịch bản.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(7)

# ---------- building blocks ----------------------------------------------------------
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name: str) -> float:
    """'A4', 'C#5', 'Bb3' -> frequency."""
    n = NOTE[name[0]]
    rest = name[1:]
    if rest[0] in "#b":
        n += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 440.0 * 2 ** ((n + 12 * (int(rest) + 1) - 69) / 12)


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def env_adsr(n: int, a=0.01, d=0.1, s=0.6, r=0.3) -> np.ndarray:
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    e = np.concatenate([np.linspace(0, 1, a_n, endpoint=False),
                        np.linspace(1, s, d_n, endpoint=False),
                        np.full(s_n, s), np.linspace(s, 0, r_n)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lowpass(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def highpass(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def reverb(x, seconds=2.2, wet=0.3, bright=4500):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lowpass(ir, bright)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, ir)[: len(x)]
    return (1 - wet) * x + wet * y


def loopify(x, tail_sec=3.0):
    """Fold the reverb tail back onto the start so the file loops without a click."""
    n = int(tail_sec * SR)
    body, tail = x[:-n].copy(), x[-n:]
    body[:n] += tail
    fade = np.linspace(0, 1, 256)
    body[:256] *= fade
    body[-256:] *= fade[::-1]
    return body


def place(buf, sig, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]


# ---------- instruments ---------------------------------------------------------------
def piano(f, dur=2.5, vel=0.5):
    t = t_axis(dur)
    s = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t * (1 + 0.0004 * k)) for k in range(6))
    e = np.exp(-t * (2.2 + f / 900)) * (1 - np.exp(-t * 300))
    return vel * s * e


def marimba(f, dur=1.2, vel=0.5):  # đàn t'rưng / đàn đá
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t * 18)
    return vel * s * np.exp(-t * 6) * (1 - np.exp(-t * 500))


def flute(f, dur=1.0, vel=0.35):  # sáo trúc
    t = t_axis(dur)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 2, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = bandpass(rng.standard_normal(len(t)), f * 0.8, min(f * 3, 18000)) * 0.08
    return vel * (s + breath) * env_adsr(len(t), 0.06, 0.15, 0.8, min(0.25, dur * 0.3))


def pad(freqs, dur, vel=0.12, bright=1400):
    t = t_axis(dur)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            s += 2 * ((ff * t + ph / (2 * np.pi)) % 1) - 1  # saw
    s = lowpass(s / (3 * len(freqs)), bright)
    return vel * s * env_adsr(len(t), min(1.5, dur / 3), 0.5, 0.85, min(1.5, dur / 3))


def tom(f=70, dur=1.6, vel=0.9):  # trống hội
    t = t_axis(dur)
    pitch = f * (1 + 1.2 * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(pitch) / SR
    body = np.sin(ph) * np.exp(-t * 3.2)
    hit = lowpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 40) * 0.5
    return vel * (body + hit)


def shaker(dur=0.12, vel=0.15):
    t = t_axis(dur)
    return vel * highpass(rng.standard_normal(len(t)), 5000) * np.exp(-t * 45)


def gong(f=110, dur=6, vel=0.5):
    t = t_axis(dur)
    s = sum(a * np.sin(2 * np.pi * f * r * t) for a, r in
            [(1, 1), (0.6, 1.48), (0.45, 2.01), (0.3, 2.66), (0.2, 3.2)])
    return vel * s * np.exp(-t * 0.8) * (1 - np.exp(-t * 80)) * (1 + 0.15 * np.sin(2 * np.pi * 3 * t))


def bird(dur=0.5):
    t = t_axis(dur)
    f0 = rng.uniform(2500, 4200)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * rng.uniform(8, 18) * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.08 * np.sin(ph) * np.sin(np.pi * t / dur) ** 2


# ---------- tracks --------------------------------------------------------------------
PENTA = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"]


def track_forest(sec=48):
    n = int(sec * SR)
    wind = lowpass(np.cumsum(rng.standard_normal(n)) * 0.002, 500)
    wind *= 0.5 + 0.5 * np.sin(2 * np.pi * np.arange(n) / SR / 11) ** 2
    stream = bandpass(rng.standard_normal(n), 900, 4200) * 0.05
    stream *= 0.7 + 0.3 * lowpass(np.abs(rng.standard_normal(n)), 6)
    x = wind / (np.abs(wind).max() + 1e-9) * 0.25 + stream
    for at in np.cumsum(rng.uniform(1.0, 3.5, 40)):
        if at < sec - 1:
            for k in range(int(rng.integers(1, 4))):
                place(x, bird(rng.uniform(0.15, 0.4)), at + k * 0.22)
    return loopify(reverb(np.concatenate([x, np.zeros(SR * 3)]), 1.5, 0.15))


def track_rain(sec=40):
    n = int(sec * SR)
    x = lowpass(highpass(rng.standard_normal(n), 300), 7000) * 0.12
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * np.arange(n) / SR / 7)
    for at in rng.uniform(0, sec - 0.1, 900):  # giọt mưa
        d = t_axis(0.03)
        place(x, highpass(rng.standard_normal(len(d)), 2000) * np.exp(-d * 200) * rng.uniform(0.02, 0.08), at)
    for at in (9.0, 27.0):  # sấm xa
        d = t_axis(4)
        place(x, lowpass(rng.standard_normal(len(d)), 120) * np.exp(-d * 0.9) * 0.9, at)
    return loopify(np.concatenate([x, np.zeros(SR * 3)]))


def _song(chords, melody_fn, bpm, bars, vel_pad=0.1, beat_fn=None, arp=True, arp_inst=piano,
          bright=1400, wet=0.32):
    beat = 60 / bpm
    bar = 4 * beat
    sec = bars * bar
    x = np.zeros(int((sec + 3) * SR))
    for b in range(bars):
        ch = chords[b % len(chords)]
        place(x, pad([hz(c) for c in ch], bar + 0.6, vel_pad, bright), b * bar)
        if arp:
            notes = [hz(c) * 2 for c in ch] + [hz(ch[1]) * 4]
            for k in range(8):
                place(x, arp_inst(notes[(k * 3) % len(notes)], 1.6, 0.13), b * bar + k * beat / 2)
        if beat_fn:
            beat_fn(x, b * bar, beat)
    melody_fn(x, beat, bars)
    return loopify(reverb(x, 2.4, wet), 3.0)


def track_piano(sec_bars=16):
    chords = [["A2", "E3", "C4"], ["F2", "C3", "A3"], ["C3", "G3", "E4"], ["G2", "D3", "B3"]]
    mel = ["E5", "", "D5", "C5", "", "", "A4", "", "C5", "", "D5", "", "E5", "", "", "",
           "G5", "", "E5", "D5", "", "", "C5", "", "D5", "", "", "", "", "", "", ""]

    def melody(x, beat, bars):
        for b in range(bars):
            if b % 4 in (1, 3):
                continue
            for k in range(8):
                nm = mel[(b * 8 + k) % len(mel)]
                if nm:
                    place(x, piano(hz(nm), 3.0, 0.2), b * 4 * beat + k * beat / 2)
    return _song(chords, melody, 66, sec_bars, 0.06, arp=True)


def track_tension(sec_bars=12):
    chords = [["D2", "A2", "F3"], ["Bb1", "F2", "D3"], ["D2", "A2", "E3"], ["A1", "E2", "C#3"]]

    def melody(x, beat, bars):
        for b in range(bars):
            for k, nm in enumerate(["A4", "", "F4", "", "E4", "", "", ""]):
                if nm and b % 2 == 0:
                    place(x, piano(hz(nm), 3.5, 0.12), b * 4 * beat + k * beat)
    return _song(chords, melody, 56, sec_bars, 0.07, arp=False, bright=900, wet=0.45)


def track_warm(sec_bars=16):
    chords = [["C3", "G3", "E4"], ["A2", "E3", "C4"], ["F2", "C3", "A3"], ["G2", "D3", "B3"]]
    line = ["G5", "E5", "D5", "C5", "D5", "E5", "G5", "A5", "G5", "E5", "D5", "E5", "C5", "D5", "C5", "A4"]

    def melody(x, beat, bars):
        for b in range(bars):
            if b % 2:
                continue
            for k in range(4):
                nm = line[(b * 2 + k) % len(line)]
                place(x, flute(hz(nm), beat * 1.9, 0.16), b * 4 * beat + k * beat)
    return _song(chords, melody, 72, sec_bars, 0.07, arp=True, arp_inst=marimba)


def _festival_beat(x, at, beat):
    for k in range(4):
        place(x, tom(72 if k % 2 == 0 else 96, 1.0, 0.55 if k % 2 == 0 else 0.35), at + k * beat)
        place(x, shaker(), at + k * beat + beat / 2)
    place(x, tom(120, 0.5, 0.25), at + 3.5 * beat)


def track_festival(sec_bars=16):
    chords = [["D3", "A3", "D4"], ["C3", "G3", "C4"], ["D3", "A3", "D4"], ["A2", "E3", "A3"]]
    line = ["A5", "G5", "E5", "D5", "E5", "G5", "A5", "C6", "A5", "G5", "E5", "G5", "D5", "E5", "D5", "C5"]

    def melody(x, beat, bars):
        for b in range(bars):
            for k in range(8):
                if (b * 8 + k) % 16 in (6, 7, 14, 15):
                    continue
                nm = line[(b * 8 + k) % len(line)]
                place(x, flute(hz(nm), beat * 0.48, 0.2), b * 4 * beat + k * beat / 2)
                if k % 2 == 0:
                    place(x, marimba(hz(nm) / 2, 0.8, 0.18), b * 4 * beat + k * beat / 2)
    return _song(chords, melody, 116, sec_bars, 0.06, beat_fn=_festival_beat, arp=False, wet=0.22)


def track_bright(sec_bars=16):
    chords = [["C3", "G3", "E4"], ["G2", "D3", "B3"], ["A2", "E3", "C4"], ["F2", "C3", "A3"]]
    line = ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "D5", "E5", "G5", "C6", "A5", "G5", "E5", "D5", "E5"]

    def beat_fn(x, at, beat):
        for k in range(4):
            place(x, tom(90, 0.6, 0.3), at + k * beat)
            place(x, shaker(0.1, 0.1), at + k * beat + beat / 2)

    def melody(x, beat, bars):
        for b in range(bars):
            for k in range(4):
                nm = line[(b * 4 + k) % len(line)]
                place(x, flute(hz(nm), beat * 0.9, 0.15), b * 4 * beat + k * beat)
    return _song(chords, melody, 100, sec_bars, 0.06, beat_fn=beat_fn, arp=True, arp_inst=marimba)


# ---------- one-shots -----------------------------------------------------------------
def sfx_drum():
    return np.concatenate([tom(62, 2.5, 1.0), np.zeros(SR // 2)])


def sfx_drum3():
    x = np.zeros(int(4.2 * SR))
    for k in range(3):
        place(x, tom(62, 2.2, 1.0), k * 0.95)
    return reverb(x, 2.0, 0.25)


def sfx_schooldrum():  # trống trường: 3 hồi
    x = np.zeros(int(6.5 * SR))
    times = [0, 0.55, 1.1, 1.65, 2.2] + [3.0 + k * 0.28 for k in range(6)] + [5.0]
    for at in times:
        place(x, tom(80, 1.2, 0.9), at)
    return reverb(x, 1.6, 0.2)


def sfx_chime():
    x = np.zeros(int(3.5 * SR))
    for k, nm in enumerate(["C6", "G6", "E6"]):
        place(x, marimba(hz(nm), 2.5, 0.25), k * 0.09)
    return reverb(x, 2.5, 0.4)


def sfx_gong():
    return reverb(np.concatenate([gong(), np.zeros(SR)]), 3, 0.3)


def sfx_whoosh():
    t = t_axis(1.4)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    for i, c in enumerate(np.linspace(300, 4000, 14)):
        seg = slice(int(i * len(t) / 14), int((i + 1) * len(t) / 14))
        out[seg] = bandpass(n, c * 0.7, c * 1.3)[seg]
    return 0.35 * out * np.sin(np.pi * t / 1.4) ** 2


def write(name, x, peak=0.8, kbps=96):
    x = x / (np.abs(x).max() + 1e-9) * peak
    wav = OUT / f"{name}.wav"
    import wave
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", f"{kbps}k",
                    str(OUT / f"{name}.mp3")], check=True)
    wav.unlink()
    print(f"  {name}.mp3  {len(x) / SR:5.1f}s")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("Nhạc nền (lặp):")
    write("forest", track_forest(), 0.7)
    write("rain", track_rain(), 0.7)
    write("piano", track_piano())
    write("tension", track_tension())
    write("warm", track_warm())
    write("festival", track_festival())
    write("bright", track_bright())
    print("Hiệu ứng:")
    write("drum", sfx_drum(), 0.95)
    write("drum3", sfx_drum3(), 0.95)
    write("schooldrum", sfx_schooldrum(), 0.9)
    write("chime", sfx_chime(), 0.7)
    write("gong", sfx_gong(), 0.8)
    write("whoosh", sfx_whoosh(), 0.6)


if __name__ == "__main__":
    main()
