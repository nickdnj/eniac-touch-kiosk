import subprocess, json, os, shlex
# Review-cut builder for the Difference video (macOS `say` voice; a stand-in for the real Nick 2 voice).
# Needs: ffmpeg, macOS `say`, and node + the kiosk's Playwright for cards.mjs. Run from anywhere:
#   python3 scripts/build_difference_review.py            (reads assets/video/difference-2026-10-19/, writes output/build/difference-review/)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "assets/video/difference-2026-10-19/difference-clean-raw.mp4")
W = os.path.join(ROOT, "output/build/difference-review")   # work dir; holds beats.json, title/end PNGs and the output
os.makedirs(W, exist_ok=True)
import shutil
shutil.copy(os.path.join(ROOT, "assets/video/difference-2026-10-19/difference-beats.json"), os.path.join(W, "beats.json"))
VOICE, RATE = "Samantha", 172
B = {x["beat"]: x["at"]/1000 for x in json.load(open(f"{W}/beats.json"))}
sh = lambda *a, **k: subprocess.run(a, check=True, **k)
def dur(p): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p]).decode())

# (id, source, start, end, narration). source None = still card
SCENES = [
 ("s01", "raw", B["first card"]+1.4, B["first card"]+5.4, "A whole table of numbers, built with nothing but adding."),
 ("s02", "title", 0, 0, "This is Mission 4 on the new Ennie-ack touch screen at the Vintage Computer Federation museum."),
 ("s03", "raw", B["picker page 2: Difference"], B["plan"]-0.1, "Before computers, people made tables of numbers by hand. Charles Babbage designed a machine to build such tables automatically, using only addition. Ennie-ack can do the same."),
 ("s03b", "tutorial", 0, 0, "To start, work out a small table by hand. The numbers along the top diagonal are all Ennie-ack needs: six hundred, minus eighty-nine, minus thirty-four, and six."),
 ("s04", "raw", B["plan"], B["step 1: dial the 6"]-0.1, "Here is the trick. Four accumulators form a chain. The last one never changes. Each row, every accumulator adds the one below it, and the top one is the table."),
 ("s05", "raw", B["step 1: dial the 6"], B["step 2: first difference onto trunk 1"]-0.1, "Step one. Dial in a six. In this table, the last number in the chain is always six."),
 ("s06", "raw", B["step 2: first difference onto trunk 1"], B["step 4: punch the table value"]-0.1, "Steps two and three. Take the first difference out of accumulator eighteen, and add it into accumulator seventeen, the table itself. Look at the connectors. On the real machine, the ones that carry numbers are rectangular. The ones that carry control signals are round."),
 ("s07", "raw", B["step 4: punch the table value"], B["the rest is done for you"]-0.1, "Step four: tell the printer to punch the table value. Step five: close the loop, so the end of each row starts the next."),
 ("s08", "raw", B["the rest is done for you"], B["run view, before INIT"]-0.1, "The rest is wired for you: the starting numbers, the loader, and a counter in the master programmer that stops it after a hundred rows."),
 ("s09", "raw", B["run view, before INIT"], B["row 6: the table goes negative"]-0.2, "Press init, the initiating pulse button. Ennie-ack punches a card, then adds down the chain, again and again. Watch the lamps: zero is at the bottom, and nine at the top."),
 ("s10", "raw", B["row 6: the table goes negative"], B["Full speed"]-0.1, "At row six the table dips below zero. Those are negative numbers, and Ennie-ack is still only adding."),
 ("s11", "raw", B["result"], B["end"]-0.1, "That is the whole table, made by adding. Same machine, different cables, a fourth job."),
 ("s12", "end", 0, 0, "The program is Brian Stuart's, from his tutorial, Polynomial Tables on the Ennie-ack, and it runs on his simulator. Come to the museum and try it yourself."),
]
# The "why": the hand-worked table from Stuart's tutorial (page 1), cropped to a still.
TUT_PDF = os.path.join(ROOT, "research/sources/stuart-polynomial-tables/stuart-polynomial-tables-on-the-eniac.pdf")
if not os.path.exists(f"{W}/tutorial.png"):
    sh("pdftoppm", "-r", "220", "-f", "1", "-l", "1", "-png", TUT_PDF, f"{W}/tut-page")
    page = [f for f in os.listdir(W) if f.startswith("tut-page") and f.endswith(".png")][0]
    # crop the table and its lead-in (page is 1870 x 2420 at 220 dpi), fit to 1920x1080 on the dark background
    sh("ffmpeg","-y","-loglevel","error","-i",f"{W}/{page}","-vf","crop=1470:532:200:948,scale=1620:-1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0e1013",f"{W}/tutorial.png")
LEAD, TAIL = 0.4, 0.5
segs = []
for sid, src, a, b, text in SCENES:
    wav = f"{W}/{sid}.wav"
    sh("say", "-v", VOICE, "-r", str(RATE), "-o", f"{W}/{sid}.aiff", text)
    sh("ffmpeg","-y","-loglevel","error","-i",f"{W}/{sid}.aiff","-ar","48000","-ac","2",wav)
    d = dur(wav)
    need = LEAD + d + TAIL                       # how long the picture must last
    out = f"{W}/{sid}.mp4"
    if src == "raw":
        have = b - a
        hold = max(0.0, need - have)             # a hold on the last frame, never a speed-up
        length = have + hold if need > have else need   # footage longer than the line: cut the tail
        vf = f"fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration={hold:.2f}" if hold > 0 else "fps=30,scale=1920:1080"
        sh("ffmpeg","-y","-loglevel","error","-ss",f"{a}","-t",f"{min(have, need):.2f}","-i",RAW,"-i",wav,
           "-filter_complex",f"[0:v]{vf}[v];[1:a]adelay={int(LEAD*1000)}|{int(LEAD*1000)},apad[a]",
           "-map","[v]","-map","[a]","-t",f"{need:.2f}","-c:v","libx264","-crf","22","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k",out)
    else:
        png = f"{W}/{src}.png"
        sh("ffmpeg","-y","-loglevel","error","-loop","1","-framerate","30","-i",png,"-i",wav,
           "-filter_complex",f"[1:a]adelay={int(LEAD*1000)}|{int(LEAD*1000)},apad[a]",
           "-map","0:v","-map","[a]","-t",f"{need:.2f}","-c:v","libx264","-crf","22","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k",out)
    segs.append((sid, need))
    print(sid, f"{need:.1f}s")
with open(f"{W}/list.txt","w") as f:
    for sid,_ in segs: f.write(f"file '{W}/{sid}.mp4'\n")
sh("ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",f"{W}/list.txt","-af","loudnorm=I=-16:TP=-1.5:LRA=11","-c:v","libx264","-crf","23","-preset","medium","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-movflags","+faststart",f"{W}/ENIAC-Difference-mission-review.mp4")
print("total", f"{sum(n for _,n in segs):.1f}s")
