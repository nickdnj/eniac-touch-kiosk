#!/usr/bin/env python3
"""Generate storyboard/storyboard-data.json (v4) from the verified v4 cut points.

v4 = v3 re-cut against the CLEAN=1 re-recordings in assets/video/source-v4/ (no burned-in caption box;
narration text and WAVs identical to v3, recording timing drifted). Same structure, rules and overlay positions as v3.
v3 generator kept as scripts/gen_storyboard_v3.py; v3 data as storyboard/storyboard-data.v3.json.

v3 = same structure, chapters and editorial rules as the approved v2 (as built by scripts/assemble_v2.py),
re-cut against the re-recorded kiosk footage in assets/video/source-v3/.

Every source in/out below was verified on 2026-10-05 against the v4 MP4s:
  * line positions: each per-line WAV in assets/audio/source-lines-v3/ (unchanged) cross-correlated into its v4 MP4
    (all 102 lines of the 5 re-recorded sources, score >= 0.996) -> output/build/v4-line-positions.json
  * every audio edge lands inside a silencedetect gap (noise=-40dB, d=0.25) -- listed in EDGE_CHECK
  * every visual edge checked frame by frame (25 fps) -- notes in EDGE_CHECK
Run:  python3 scripts/gen_storyboard_v4.py
"""
import json, os

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
SRC = 'assets/video/source-v4/'
TOUR, SQ, PR, TR, FI = (SRC + f for f in ('eniac-touch-tour.mp4', 'eniac-touch-walkthrough-squares.mp4',
                                           'eniac-touch-walkthrough-primes.mp4', 'eniac-touch-walkthrough-trajectory.mp4',
                                           'finale.mp4'))
FPS = 25
INTRO = 8.12  # VCF Power-On intro (203 frames @25), prepended; no S01 title open


def fr(s):
    return round(s * FPS) / FPS


# ---------------------------------------------------------------- source cut points (seconds in the v3 file)
CUT = {
    'B': (TOUR, 11.48, 110.70),   # S03-S05 continuous
    'D': (TOUR, 117.55, 141.52),  # S07
    'E': (TOUR, 151.10, 211.00),  # S08
    'G': (TOUR, 229.20, 247.25),  # S10
    'I': (SQ, 15.68, 164.52),     # S12
    'J': (PR, 102.40, 111.92),    # S13 (muted)
    'K': (TR, 133.10, 140.90),    # S14 (muted)
    'N': (FI, 6.85, 29.45),       # S17
    'O': (FI, 31.40, 37.36),      # S18 (muted) + freeze
}
NEWDUR = json.load(open(f'{ROOT}/assets/audio/narration/durations.json'))
nd = {k: v['duration_s'] for k, v in NEWDUR.items()}

DUR = {
    'A': fr(13.4),                     # S02 photo + N01 (12.45 s)
    'B': fr(CUT['B'][2] - CUT['B'][1]),
    'C': fr(1.8),                      # S06 card
    'D': fr(CUT['D'][2] - CUT['D'][1]),
    'E': fr(CUT['E'][2] - CUT['E'][1]),
    'F': fr(1.8),                      # S09 card
    'G': fr(CUT['G'][2] - CUT['G'][1]),
    'H': fr(3.3),                      # S11 card + tour-27 bridge
    'I': fr(CUT['I'][2] - CUT['I'][1]),
    'J': fr(CUT['J'][2] - CUT['J'][1]),  # N02 8.50 s
    'K': fr(CUT['K'][2] - CUT['K'][1]),  # N03 7.29 s
    'L': fr(11.0),                     # S15 invite card, N04 10.12 s
    'M': fr(6.5),                      # S16 card + finale-00
    'N': fr(CUT['N'][2] - CUT['N'][1]),
    'O': fr(13.8),                     # S18: 5.96 s footage + freeze, N05 12.59 s
    'P': fr(17.4),                     # S20 N06 16.07 s
    'Q': fr(20.0),                     # S21 end screen
}
UNIT_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'IJ', 'K', 'L', 'M', 'NO', 'P', 'Q']
DUR['IJ'] = fr(DUR['I'] + DUR['J'])
DUR['NO'] = fr(DUR['N'] + DUR['O'])
OV = {'A': 0.5, 'B': 0.4, 'C': 0.4, 'D': 0.4, 'E': 0.4, 'F': 0.4, 'G': 0.4, 'H': 0.4, 'IJ': 0.4,
      'K': 0.4, 'L': 0.4, 'M': 0.4, 'NO': 0.5, 'P': 0.5, 'Q': 0.0}
PS = {}
t = 0.0
for u in UNIT_ORDER:
    PS[u] = fr(t)
    t = PS[u] + DUR[u] - OV[u]
PS['I'] = PS['IJ']; PS['J'] = fr(PS['IJ'] + DUR['I'])
PS['N'] = PS['NO']; PS['O'] = fr(PS['NO'] + DUR['N'])
TOTAL = fr(PS['Q'] + DUR['Q'])

# sub-scene boundaries inside unit B (continuous source, no cut)
B_S04 = 34.05   # gap [33.58-34.31] between tour-02 and tour-03
B_S05 = 42.88   # picker -> Explore screen change (scdet 42.88), gap [42.41-44.65]
S05_OFF = fr(B_S05 - CUT['B'][1])

# ---------------------------------------------------------------- edge verification
EDGE_CHECK = [
    # unit, edge, source t, silence gap containing it, visual note   (v4, CLEAN=1: no burned-in caption box)
    ('B', 'in', 11.48, (10.38, 11.54), 'attract screen, title card gone (11.3 already clean); tour-01 from 11.54'),
    ('B', 'out', 110.70, (108.91, 111.51), 'Explore still clean at 110.8; glossary fades in from 110.96 (dropped tour-11 at 111.50)'),
    ('D', 'in', 117.55, (115.54, 117.85), 'tubes screen fully in (fading at 117.3); tour-12 from 117.82'),
    ('D', 'out', 141.52, (141.34, 142.22), '"Where the power went" through 141.56; MYTH card ("A story people still tell") from 141.60'),
    ('E', 'in', 151.10, (149.97, 151.42), '"Heaters on, the rest off" screen up by 150.80 (power screen 150.4-150.6, MYTH before); no caption box in v4'),
    ('E', 'out', 211.00, (210.66, 213.89), '"Fixed!" screen clean at 211.1; scene change 211.16; Stuart honor-roll screen from about 212'),
    ('G', 'in', 229.20, (228.64, 229.71), 'Stuart honor-roll screen ("...Thank you, Brian.") full at 228.9, cross-fading out from 229.00; programmers screen clean by 229.16; tour-26 from 229.60. No caption box in v4'),
    ('G', 'out', 247.25, (247.03, 249.96), 'programmers screen at 247.2; picker fades in from 247.32'),
    ('I', 'in', 15.68, (14.82, 15.73), 'blank transition frame between attract and picker (scdet 15.68); squares-02 onset 15.73 (50 ms)'),
    ('I', 'out', 164.52, (164.26, 164.79), 'table screen at 164.52; "Thank you / Simulator: Brian L. Stuart" end card at 164.6'),
    ('J', 'in', 102.40, None, 'muted; full-speed card pile-up (cards 5 -> 8); primes hand cut (raw 140-160) is later'),
    ('J', 'out', 111.92, None, 'muted; continuous'),
    ('K', 'in', 133.10, None, 'muted; hand-cut jump at 133.00 (hop 20 at 132.96 -> hop 32 at 133.04; raw cut 167-216.3); window is after it'),
    ('K', 'out', 140.90, None, 'muted; "Landed" from 139.0, held; summary screen at 141.76. Earlier jump 113.72 (raw 113.7-147.7) is outside'),
    ('N', 'in', 6.85, (5.62, 7.00), '"ENIAC flew the shell!" screen, title ghost gone; finale-01 from 6.91'),
    ('N', 'out', 29.45, (27.84, 31.03), '"Here is every unit you used"; f3 Stuart screen from 31.12'),
    ('O', 'in', 31.40, None, 'muted; f3 "Brian L. Stuart wrote this simulator" fully in (fading at 31.2)'),
    ('O', 'out', 37.36, None, 'muted; last clean f3 frame, freeze it; blank/f4 from 37.44'),
]

# ---------------------------------------------------------------- overlays (clear-space checked on v3 frames)
# measured free regions (all frames of the window): Explore header x588-1180 y10-85; Primes header x640-1193;
# Trajectory header x693-1193 (re-measured on v4 frames: unchanged); Trajectory right column x1420-1890 y425-680; Primes right column y437-543.
OVERLAYS = {
    'A': [dict(type='credit', text='U.S. Army Photo', pos='bottom-right', tin=0.6, tout='end-0.4'),
          dict(type='lower-third', text='Nick DeMarco', sub='Docent and Exhibit Developer, Vintage Computer Federation', pos='x60 y60', tin=0.6, tout=5.6),
          dict(type='chapter-lower-third', text='CHAPTER 1 · Meet the kiosk', pos='x60 y104 (on the opening photo)', tin=8.6, tout=12.2)],
    'B': [dict(type='header-tag', label='CHAPTER 2', text='Explore ENIAC', pos='Explore header gap, right edge x1165, y17 (box x807-1165)',
               tin=round(S05_OFF + 1.5, 2), tout=round(S05_OFF + 5.0, 2))],
    'C': [dict(type='chapter-card', text='CHAPTER 3 · Keeping ENIAC alive')],
    'E': [dict(type='credit', text='U.S. Army Photo', pos='bottom-right (on the P2 cutaway)', tin=0.8, tout=7.2)],
    'F': [dict(type='chapter-card', text='CHAPTER 4 · The first programmers')],
    'G': [dict(type='credit', text='Betty Jean Jennings and Frances Bilas, 1946 · U.S. Army Photo', pos='bottom-left (on the P3 cutaway)', tin=10.1, tout='end-0.4')],
    'H': [dict(type='chapter-card', text='CHAPTER 5 · Mission 1: Squares')],
    'J': [dict(type='header-tag', label='CHAPTER 6', text='Only at the museum', pos='Primes header gap, right edge x1175, y17 (box x753-1175)', tin=0.3, tout=3.5),
          dict(type='header-tag', label='MISSION 2', text='Primes  ·  live at the museum', pos='Primes header gap, right edge x1175, y17 (box x657-1175)', tin=3.6, tout='end')],
    'K': [dict(type='column-tag', label='MISSION 3', lines=["Brian Stuart's reconstruction", "of ENIAC's 1946 shell flight"],
               pos='trajectory right column, box x1434-1880 y455-595 (free x1420-1890 y425-680 in every frame)', size=25, tin=0.3, tout='end',
               note='Card K text v3: reads "MISSION 3 · Brian Stuart\'s reconstruction of ENIAC\'s 1946 shell flight". The 887 px one-line version does not fit the 500 px header gap, so it moved to the clear right column.')],
    'L': [dict(type='headline', text='Live, card by card. Only at the museum.'),
          dict(type='sub', text='Vintage Computer Federation  ·  InfoAge, Wall, NJ')],
    'M': [dict(type='chapter-card', text='CHAPTER 7 · The finale')],
    'O': [],  # v2 decision: no Stuart lower third on S18
    'P': [dict(type='headline', text='Come program ENIAC in person'), dict(type='sub', text='Vintage Computer Federation'),
          dict(type='sub', text='InfoAge Science and History Museums  ·  Wall, New Jersey'), dict(type='url', text='vcfed.org', tin=13.1)],
    'Q': [dict(type='title', text='Thanks for watching'),
          dict(type='sub', text='Vintage Computer Federation · InfoAge Science and History Museums · Wall, NJ · vcfed.org'),
          dict(type='credit', text='Exhibit by Nick DeMarco, Docent and Exhibit Developer, Vintage Computer Federation'),
          dict(type='placeholders', text='YouTube end-screen: video x150 y300 760x428; video x1010 y300 760x428; subscribe circle c(960,870) d220')],
}

# ---------------------------------------------------------------- voice events (program time) and audio
VOICE = [
    ('A', 0.3, 'new', 'assets/audio/narration/N01.wav', None, None, 'N01'),
    ('B', 0.0, 'baked', TOUR, CUT['B'][1], DUR['B'], 'tour-01..10'),
    ('D', 0.0, 'baked', TOUR, CUT['D'][1], DUR['D'], 'tour-12, 13'),
    ('E', 0.0, 'baked', TOUR, CUT['E'][1], DUR['E'], 'tour-15..24'),
    ('G', 0.0, 'baked', TOUR, CUT['G'][1], DUR['G'], 'tour-26'),
    ('H', 0.5, 'wav', 'assets/audio/source-lines-v3/tour-27.wav', 0.0, 2.21, 'tour-27 bridge (word gap 2.06-2.37)'),
    ('I', 0.0, 'baked', SQ, CUT['I'][1], DUR['I'], 'squares-02..17'),
    ('J', 0.4, 'new', 'assets/audio/narration/N02.wav', None, None, 'N02'),
    ('K', 0.15, 'new', 'assets/audio/narration/N03.wav', None, None, 'N03'),
    ('L', 0.3, 'new', 'assets/audio/narration/N04.wav', None, None, 'N04'),
    ('M', 0.2, 'wav', 'assets/audio/source-lines-v3/finale-00.wav', None, None, 'finale-00'),
    ('N', 0.0, 'baked', FI, CUT['N'][1], DUR['N'], 'finale-01..03'),
    ('O', 0.4, 'new', 'assets/audio/narration/N05.wav', None, None, 'N05 (the single Stuart thank-you)'),
    ('P', 0.5, 'new', 'assets/audio/narration/N06.wav', None, None, 'N06'),
]
FIT = {}
for u, off, kind, path, ss, tt, label in VOICE:
    if kind == 'new':
        k = label.split()[0]
        FIT[u] = dict(line=k, line_dur=nd[k], start=off, ends_at=round(off + nd[k], 2), unit_dur=DUR[u],
                      fits=off + nd[k] <= DUR[u] - 0.2)

# ---------------------------------------------------------------- scenes
def src(u, extra=None):
    f, a, b = CUT[u]
    d = dict(type='source', file=f, **{'in': a, 'out': b}, dur=round(b - a, 2))
    if extra:
        d.update(extra)
    return d


SCENES = [
    dict(id='S02', unit='A', chapter=1, chapter_title='Meet the kiosk', title='Docent intro (opening photo)',
         video=dict(type='photo', photo='P1', motion='slow pan/zoom 1.00->1.10'), audio='NEW N01'),
    dict(id='S03', unit='B', chapter=1, chapter_title='Meet the kiosk', title='The live attract screen',
         video=dict(type='source', file=TOUR, **{'in': CUT['B'][1], 'out': B_S04}), audio='REUSED baked tour-01, tour-02',
         note='Attract (v3 UI, v4 clean): taller room, rotating plates, no footer, no caption box. No clear header space -- no overlays, as in v2/v3.'),
    dict(id='S04', unit='B', chapter=1, chapter_title='Meet the kiosk', title='One touch, and the missions appear',
         video=dict(type='source', file=TOUR, **{'in': B_S04, 'out': B_S05}), audio='REUSED baked tour-03, tour-04'),
    dict(id='S05', unit='B', chapter=2, chapter_title='Explore ENIAC', title='Walk the room',
         video=dict(type='source', file=TOUR, **{'in': B_S05, 'out': CUT['B'][2]}), audio='REUSED baked tour-05..tour-10'),
    dict(id='S06', unit='C', chapter=3, chapter_title='Keeping ENIAC alive', title='Chapter card', video=dict(type='card'), audio='music'),
    dict(id='S07', unit='D', chapter=3, chapter_title='Keeping ENIAC alive', title='18,000 tubes and 150 kilowatts', video=src('D'), audio='REUSED baked tour-12, tour-13'),
    dict(id='S08', unit='E', chapter=3, chapter_title='Keeping ENIAC alive', title='Why tubes burned out, and find the dead tube', video=src('E'),
         cutaway=dict(photo='P2', offset_in=0.6, offset_out=7.6, source_equiv='tour 151.70-158.70 (over tour-15, 151.35-158.55)'), audio='REUSED baked tour-15..tour-24'),
    dict(id='S09', unit='F', chapter=4, chapter_title='The first programmers', title='Chapter card', video=dict(type='card'), audio='music'),
    dict(id='S10', unit='G', chapter=4, chapter_title='The first programmers', title='The honor roll: six first programmers', video=src('G'),
         cutaway=dict(photo='P3', offset_in=9.9, offset_out=DUR['G'], source_equiv='tour 239.10-247.25 (after the six names; word gap 238.96-239.24)'),
         audio='REUSED baked tour-26'),
    dict(id='S11', unit='H', chapter=5, chapter_title='Mission 1: Squares', title='Chapter card + bridge', video=dict(type='card'),
         audio='REUSED WAV tour-27.wav 0.00-2.21 ("Now it\'s my turn to program ENIAC.")'),
    dict(id='S12', unit='I', chapter=5, chapter_title='Mission 1: Squares', title='The Squares mission (near-full)', video=src('I'), audio='REUSED baked squares-02..squares-17'),
    dict(id='S13', unit='J', chapter=6, chapter_title='Only at the museum', title='Teaser: Primes', video=src('J', dict(mute_source=True)), audio='NEW N02'),
    dict(id='S14', unit='K', chapter=6, chapter_title='Only at the museum', title='Teaser: Trajectory', video=src('K', dict(mute_source=True)), audio='NEW N03'),
    dict(id='S15', unit='L', chapter=6, chapter_title='Only at the museum', title='Museum invite card',
         video=dict(type='graphic', bg='split: primes freeze at 111.90 | trajectory freeze at 140.80 (landed), centre crops 960x1080, blur 5, 70% luma, amber divider'),
         audio='NEW N04'),
    dict(id='S16', unit='M', chapter=7, chapter_title='The finale', title='Chapter card + finale setup', video=dict(type='card'), audio='REUSED WAV finale-00.wav'),
    dict(id='S17', unit='N', chapter=7, chapter_title='The finale', title='You programmed ENIAC', video=src('N'), audio='REUSED baked finale-01..finale-03'),
    dict(id='S18', unit='O', chapter=7, chapter_title='The finale', title='The single thank-you: Brian L. Stuart',
         video=src('O', dict(mute_source=True, hold=f'freeze last frame to {DUR["O"]} s')), audio='NEW N05'),
    dict(id='S20', unit='P', chapter=8, chapter_title='Come see it', title='Close and call to action',
         video=dict(type='graphic', bg='freeze of the v4 live attract room (tour at 30.00), blur 22, 45% luma'), audio='NEW N06'),
    dict(id='S21', unit='Q', chapter=8, chapter_title='Come see it', title='End screen (YouTube end-screen safe)', video=dict(type='graphic'), audio='music'),
]
for s in SCENES:
    u = s['unit']
    if u == 'B':
        a, b = s['video']['in'], s['video']['out']
        s['program_in'] = fr(PS['B'] + a - CUT['B'][1])
        s['program_out'] = fr(PS['B'] + b - CUT['B'][1])
    else:
        s['program_in'] = PS[u]
        s['program_out'] = fr(PS[u] + DUR[u])
    s['dur'] = round(s['program_out'] - s['program_in'], 2)
    s['program_in_with_intro'] = round(s['program_in'] + INTRO, 2)
    s['overlays'] = OVERLAYS.get(u, []) if not (u == 'B' and s['id'] != 'S05') else []
    s['crossfade_out'] = OV.get(u if u in OV else ('IJ' if u in 'IJ' else 'NO'), 0)

CH = [(1, 'Meet the kiosk', 0.0), (2, 'Explore ENIAC', PS['B'] + S05_OFF + 1.5), (3, 'Keeping ENIAC alive', PS['C']),
      (4, 'The first programmers', PS['F']), (5, 'Mission 1: Squares', PS['H']), (6, 'Only at the museum', PS['J']),
      (7, 'The finale', PS['M']), (8, 'Come see it', PS['P'])]
YT = []
for n, title, p in CH:
    tt = 0.0 if n == 1 else round(p + INTRO, 2)
    YT.append(dict(n=n, title=title, t=tt, stamp=f'{int(tt // 60)}:{int(tt % 60):02d}'))

STUART = dict(
    single_thanks='S18 / N05 (12.59 s) over the kiosk f3 screen; finale-04 muted. No Stuart lower third (v2 decision).',
    attribution_not_thanks=["N04: \"Brian Stuart's reconstruction of ENIAC's 1946 shell flight\"", 'S14 Card K tag (same wording)'],
    spoken_found=[
        ('tour-00', '0.06-10.46', 'cut: unit B starts 11.48'),
        ('tour-25', '213.87-228.77', 'cut: E ends 211.00, G starts 229.20'),
        ('tour-39', '341.72-347.29', 'not used (tour finale replaced by finale.mp4)'),
        ('tour-42', '361.63-367.90', 'not used'),
        ('squares-00', '0.39-10.42', 'cut: I starts 15.68'),
        ('squares-18', '164.71-169.53', 'cut: I ends 164.52'),
        ('attract-06', 'v3 63.82-68.14', 'not used (attract.mp4 not re-recorded, unused)'),
        ('explore-10', 'v3 80.75-84.37', 'not used (explore.mp4 not re-recorded, unused)'),
        ('tubes-13', 'v3 103.28-107.56', 'not used (tubes.mp4 not re-recorded, unused)'),
        ('finale-04', '30.97-37.15', 'MUTED under N05 (O uses 31.40-37.36 video only)'),
        ('finale-07', '48.29-52.79', 'cut: N/O footage ends 37.36'),
        ('primes-17', '173.40-179.25', 'not used (J is 102.40-111.92, muted)'),
        ('trajectory-00', '0.36-8.95', 'not used (K is 133.10-140.90, muted)'),
        ('trajectory-14', '149.95-154.96', 'not used'),
    ],
    on_screen=[
        'v4 has NO burned-in caption box (CLEAN=1), so the v3 "The honor roll: Brian L. Stuart" caption carry-over is gone',
        'Title cards naming Stuart (tour, squares, primes, trajectory, finale): tour and squares cut (B in 11.48, I in 15.68); others unused',
        '"Thank you / Simulator: Brian L. Stuart" end cards: squares (from 164.6) cut by I out 164.52; finale end card unused (footage ends 37.36); primes/trajectory unused',
        'Tour honor-roll Stuart screen incl. "Thank you, Brian." (about 212-229.1, cross-fading out 229.00-229.16): cut by E out 211.00 and G in 229.20',
    ],
    kept_ui=['v3 footer "ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University" (all kiosk screens except attract)',
             'attract-screen rotating plates: "The simulator behind this screen: Brian L. Stuart" / "ENIAC was designed by J. Presper Eckert, John W. Mauchly" / project team / built at and for / the machine / first programmers (S03-S04)',
             'honor-roll tab label "Brian L. Stuart" (S10)',
             'f3 screen "Brian L. Stuart wrote this simulator" under N05 (S18) -- the single thank-you visual'],
    new_in_v4='narration identical to v3 (same WAVs); no new spoken thank-yous; caption box removed',
)

data = dict(
    project='Program ENIAC: Our New Touch-Screen Exhibit', version='4.0', date='2026-10-05',
    status='v4 = v3 with clean screens (no caption box), re-cut against assets/video/source-v4 (CLEAN=1); structure, chapters, rules and overlay positions as v3',
    format=dict(resolution='1920x1080', fps=FPS, audio='48 kHz'),
    intro=dict(file='output/build/intro/vcf_intro_eniac_8s.mp4', dur=INTRO, note='VCF Power-On intro prepended; carries the title card. No S01 title open.'),
    program_total_s=TOTAL, total_with_intro_s=round(TOTAL + INTRO, 2),
    total_with_intro=f'{int((TOTAL + INTRO) // 60)}:{(TOTAL + INTRO) % 60:05.2f}',
    v2_total_with_intro_s=478.28, v3_total_with_intro_s=477.08,
    units=[dict(unit=u, program_in=PS[u], dur=DUR[u], crossfade_out=OV[u]) for u in UNIT_ORDER],
    scenes=SCENES, cuts=CUT, edge_check=[dict(unit=a, edge=b, t=c, silence=d, visual=e) for a, b, c, d, e in EDGE_CHECK],
    voice_events=[dict(unit=u, offset=o, kind=k, path=p, ss=s, t=t_, label=l, program_t=round(PS[u] + o, 2)) for u, o, k, p, s, t_, l in VOICE],
    new_line_fit=FIT, youtube_chapters=YT, stuart_audit=STUART,
    removed_scenes=[dict(id='S01', why='v2: the VCF intro carries the title'), dict(id='S19', why='Gate 1: runtime')],
    photos=json.load(open(f'{ROOT}/storyboard/storyboard-data.v2.json'))['photos'],
    voice=json.load(open(f'{ROOT}/storyboard/storyboard-data.v2.json'))['voice'],
)
json.dump(data, open(f'{ROOT}/storyboard/storyboard-data.json', 'w'), indent=1, ensure_ascii=False)

if __name__ == '__main__':
    print(f'program {TOTAL:.2f}s  with intro {TOTAL + INTRO:.2f}s ({data["total_with_intro"]})')
    for s in SCENES:
        print(f"{s['id']} {s['unit']:2s} {s['program_in']:7.2f}-{s['program_out']:7.2f} ({s['dur']:6.2f})  +intro {s['program_in_with_intro']:7.2f}  {s['title']}")
    for k, v in FIT.items():
        print('fit', k, v)
    for c in YT:
        print(c['stamp'], c['title'], c['t'])
