#!/usr/bin/env python3
"""Generate storyboard/storyboard-data.json (v5) from the verified v5 cut points.

v5 = v4 structure re-cut against assets/video/source-v5/ (NARRATE=1 CLEAN=1; kiosk installed at the museum), plus:
  * Explore ends with the new "Original room tour" tile beat (tour-12) and a music-only insert of
    original-ui-tour.mp4 (Stuart's original Tk display, eniactk -D);
  * Squares includes the new "See the whole room" beat (squares-13);
  * finale narration is generic (finale-00..03 reworded).
v4 generator kept as scripts/gen_storyboard_v4.py; v4 data as storyboard/storyboard-data.v4.json.

OLDER HISTORY:

v4 = v3 re-cut against the CLEAN=1 re-recordings in assets/video/source-v4/ (no burned-in caption box;
narration text and WAVs identical to v3, recording timing drifted). Same structure, rules and overlay positions as v3.
v3 generator kept as scripts/gen_storyboard_v3.py; v3 data as storyboard/storyboard-data.v3.json.

v3 = same structure, chapters and editorial rules as the approved v2 (as built by scripts/assemble_v2.py),
re-cut against the re-recorded kiosk footage in assets/video/source-v3/.

Every source in/out below was verified on 2026-10-05 against the v4 MP4s:
  * line positions: each per-line WAV in assets/audio/source-lines-v3/ (unchanged) cross-correlated into its v4 MP4
    (all 102 lines of the 5 re-recorded sources, score >= 0.996) -> output/build/v5-line-positions.json
  * every audio edge lands inside a silencedetect gap (noise=-40dB, d=0.25) -- listed in EDGE_CHECK
  * every visual edge checked frame by frame (25 fps) -- notes in EDGE_CHECK
Run:  python3 scripts/gen_storyboard_v5.py
"""
import json, os

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
SRC = 'assets/video/source-v5/'
OUI = SRC + 'original-ui-tour.mp4'  # silent, 1920x1080 @30 fps
TOUR, SQ, PR, TR, FI = (SRC + f for f in ('eniac-touch-tour.mp4', 'eniac-touch-walkthrough-squares.mp4',
                                           'eniac-touch-walkthrough-primes.mp4', 'eniac-touch-walkthrough-trajectory.mp4',
                                           'finale.mp4'))
FPS = 25
INTRO = 8.12  # VCF Power-On intro (203 frames @25), prepended; no S01 title open


def fr(s):
    return round(s * FPS) / FPS


# ---------------------------------------------------------------- source cut points (seconds in the v3 file)
CUT = {
    'B': (TOUR, 11.48, 108.08),   # S03-S05 continuous
    'B2': (TOUR, 114.00, 126.40), # S05a Original room tour tile + switching page (tour-12)
    'U': (OUI, 26.64, 41.64),     # S05b original Tk display, music only (perspective room, then panel views)
    'D': (TOUR, 127.24, 151.04),  # S07
    'E': (TOUR, 160.50, 220.48),  # S08
    'G': (TOUR, 238.52, 256.56),  # S10
    'I': (SQ, 15.68, 163.32),     # S12 (incl. new squares-13 room view)
    'J': (PR, 102.40, 111.92),    # S13 (muted)
    'K': (TR, 132.60, 140.40),    # S14 (muted)
    'N': (FI, 4.50, 26.60),       # S17
    'O': (FI, 28.50, 34.60),      # S18 (muted) + freeze
}
NEWDUR = json.load(open(f'{ROOT}/assets/audio/narration/durations.json'))
nd = {k: v['duration_s'] for k, v in NEWDUR.items()}

DUR = {
    'A': fr(13.4),                     # S02 photo + N01 (12.45 s)
    'B': fr(CUT['B'][2] - CUT['B'][1]),
    'B2': fr(CUT['B2'][2] - CUT['B2'][1]),
    'U': fr(CUT['U'][2] - CUT['U'][1]),
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
    'M': fr(4.5),                      # S16 card + finale-00 (v5: 3.43 s line)
    'N': fr(CUT['N'][2] - CUT['N'][1]),
    'O': fr(13.8),                     # S18: 6.10 s footage + freeze, N05 12.59 s
    'P': fr(17.4),                     # S20 N06 16.07 s
    'Q': fr(20.0),                     # S21 end screen
}
UNIT_ORDER = ['A', 'B', 'B2', 'U', 'C', 'D', 'E', 'F', 'G', 'H', 'IJ', 'K', 'L', 'M', 'NO', 'P', 'Q']
DUR['IJ'] = fr(DUR['I'] + DUR['J'])
DUR['NO'] = fr(DUR['N'] + DUR['O'])
OV = {'A': 0.5, 'B': 0.4, 'B2': 0.5, 'U': 0.5, 'C': 0.4, 'D': 0.4, 'E': 0.4, 'F': 0.4, 'G': 0.4, 'H': 0.4, 'IJ': 0.4,
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
B_S04 = 33.95   # gap [33.53-34.23] between tour-02 and tour-03
B_S05 = 42.64   # picker -> Explore screen change (scdet 42.64), gap [42.21-44.20]
S05_OFF = fr(B_S05 - CUT['B'][1])

# ---------------------------------------------------------------- edge verification
EDGE_CHECK = [
    # unit, edge, source t, silence gap containing it, visual note   (v5, NARRATE=1 CLEAN=1)
    ('B', 'in', 11.48, (10.37, 11.51), 'attract screen, title card gone; tour-01 from 11.51'),
    ('B', 'out', 108.08, (106.64, 108.72), 'Explore clean (Mission 3 units lit); glossary from 108.16 (tour-11 glossary dropped)'),
    ('B2', 'in', 114.00, (112.74, 114.94), 'Explore back after glossary closes (113.72; 113.76 still fading); tour-12 from 114.84'),
    ('B2', 'out', 126.40, (126.00, 127.36), '"Starting the room tour..." switching page held 118.6-126.40; tour-12 ends 126.12. Failure timeout already cut at mux (raw 128.0-137.1)'),
    ('U', 'in', 26.64, None, 'original-ui-tour.mp4 (silent, 30 fps): first frame of the 3D Perspective View (view switch at 26.60)'),
    ('U', 'out', 41.64, None, 'S1 panel view mid-sweep (panel views from 31.63); music only'),
    ('D', 'in', 127.24, (126.00, 127.36), 'tubes screen clean (fading at 126.9-127.12); tour-13 from 127.32 (80 ms)'),
    ('D', 'out', 151.04, (150.84, 151.72), '"Where the power went" clean through 151.04; MYTH card ("A story people still tell") from 151.12'),
    ('E', 'in', 160.50, (159.47, 160.93), '"Heaters on, the rest off" up by 160.4 (power screen at 160.2); tour-16 from 160.86'),
    ('E', 'out', 220.48, (220.09, 223.18), '"Fixed!" screen clean; fade from 220.6; Stuart honor screen from about 221.5'),
    ('G', 'in', 238.52, (237.93, 239.00), 'Stuart honor screen cross-fade over by 238.52 (238.44 still fading); tour-27 from 238.89'),
    ('G', 'out', 256.56, (256.32, 259.24), 'programmers screen; picker fades in from 256.64'),
    ('I', 'in', 15.68, (14.90, 15.75), 'picker fading in (scdet 15.64); squares-02 onset 15.75'),
    ('I', 'out', 163.32, (163.11, 163.64), 'table screen at 163.32; "Thank you / Simulator: Brian L. Stuart" end card from 163.36'),
    ('J', 'in', 102.40, None, 'muted; full-speed card pile-up (cards 5 -> 8); primes hand cut (raw 140.5-161.5) is later'),
    ('J', 'out', 111.92, None, 'muted; continuous'),
    ('K', 'in', 132.60, None, 'muted; hand-cut jump at 132.40 (hop 21 at 132.32 -> hop 32 at 132.44; raw 153.6-188.1); earlier jump 113.12 outside'),
    ('K', 'out', 140.40, None, 'muted; "Landed" from about 138.3, held; summary screen at 141.24'),
    ('N', 'in', 4.50, (3.16, 4.77), 'finale.mp4 opens on "The finale" title card (0-4.4, fading); Trajectory result screen clean at 4.5; finale-01 from 4.75'),
    ('N', 'out', 26.60, (25.19, 28.35), '"Here is every unit you used"; f3 Stuart screen from 28.40'),
    ('O', 'in', 28.50, None, 'muted; f3 "Brian L. Stuart wrote this simulator" fully in'),
    ('O', 'out', 34.60, None, 'muted; last clean f3 frame, freeze; f4 from 34.68'),
]

# ---------------------------------------------------------------- overlays (clear-space checked on v3 frames)
# measured free regions (all frames of the window): Explore header x588-1180 y10-85; Primes header x640-1193;
# Trajectory header x693-1193 (re-measured on v4 frames: unchanged); Trajectory right column x1420-1890 y425-680; Primes right column y437-543.
OVERLAYS = {
    'A': [dict(type='credit', text='U.S. Army Photo', pos='bottom-right', tin=0.6, tout='end-0.4'),
          dict(type='lower-third', text='Nick DeMarco', sub='Docent and Exhibit Developer, Vintage Computer Federation', pos='x60 y60', tin=0.6, tout=5.6),
          dict(type='chapter-lower-third', text='CHAPTER 1 · Meet the kiosk', pos='x60 y104 (on the opening photo)', tin=8.6, tout=12.2)],
    'B2': [],
    'U': [],  # Stuart's own UI: no lower third, no tag; its Tk control strip stays as is
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
    ('B2', 0.0, 'baked', TOUR, CUT['B2'][1], DUR['B2'], 'tour-12 (new: Original room tour)'),
    ('D', 0.0, 'baked', TOUR, CUT['D'][1], DUR['D'], 'tour-13, 14'),
    ('E', 0.0, 'baked', TOUR, CUT['E'][1], DUR['E'], 'tour-16..25'),
    ('G', 0.0, 'baked', TOUR, CUT['G'][1], DUR['G'], 'tour-27'),
    ('H', 0.5, 'wav', 'assets/audio/source-lines-v3/tour-27.wav', 0.0, 2.21, 'v5 tour-28 = v3 tour-27.wav bridge (word gap 2.06-2.37)'),
    ('I', 0.0, 'baked', SQ, CUT['I'][1], DUR['I'], 'squares-02..18 (incl. new squares-13)'),
    ('J', 0.4, 'new', 'assets/audio/narration/N02.wav', None, None, 'N02'),
    ('K', 0.15, 'new', 'assets/audio/narration/N03.wav', None, None, 'N03'),
    ('L', 0.3, 'new', 'assets/audio/narration/N04.wav', None, None, 'N04'),
    ('M', 0.2, 'wav', 'assets/audio/source-lines-v5/finale-00.wav', None, None, 'finale-00 (v5 generic, 3.43 s)'),
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
    dict(id='S05a', unit='B2', chapter=2, chapter_title='Explore ENIAC', title='The Original room tour tile',
         video=src('B2'), audio='REUSED baked tour-12 (new row: "And for anyone curious how it looked before the touch screen...")'),
    dict(id='S05b', unit='U', chapter=2, chapter_title='Explore ENIAC', title="The simulator's own original display",
         video=dict(type='source', file=OUI, **{'in': 26.64, 'out': 41.64}, dur=15.0, note='silent source, 30 fps -> conform to 25 fps'),
         audio='music up, no voice'),
    dict(id='S06', unit='C', chapter=3, chapter_title='Keeping ENIAC alive', title='Chapter card', video=dict(type='card'), audio='music'),
    dict(id='S07', unit='D', chapter=3, chapter_title='Keeping ENIAC alive', title='18,000 tubes and 150 kilowatts', video=src('D'), audio='REUSED baked tour-13, tour-14'),
    dict(id='S08', unit='E', chapter=3, chapter_title='Keeping ENIAC alive', title='Why tubes burned out, and find the dead tube', video=src('E'),
         cutaway=dict(photo='P2', offset_in=0.6, offset_out=7.6, source_equiv='tour 161.10-168.10 (over tour-16, 160.86-168.05)'), audio='REUSED baked tour-16..tour-25'),
    dict(id='S09', unit='F', chapter=4, chapter_title='The first programmers', title='Chapter card', video=dict(type='card'), audio='music'),
    dict(id='S10', unit='G', chapter=4, chapter_title='The first programmers', title='The honor roll: six first programmers', video=src('G'),
         cutaway=dict(photo='P3', offset_in=9.9, offset_out=DUR['G'], source_equiv='tour 248.42-256.56 (after the six names; word gap 248.25-248.53)'),
         audio='REUSED baked tour-27'),
    dict(id='S11', unit='H', chapter=5, chapter_title='Mission 1: Squares', title='Chapter card + bridge', video=dict(type='card'),
         audio='REUSED WAV source-lines-v3/tour-27.wav 0.00-2.21 ("Now it\'s my turn to program ENIAC.")'),
    dict(id='S12', unit='I', chapter=5, chapter_title='Mission 1: Squares', title='The Squares mission (near-full, with See the whole room)', video=src('I'), audio='REUSED baked squares-02..squares-18 (squares-13 new: See the whole room, 111.03-118.09)'),
    dict(id='S13', unit='J', chapter=6, chapter_title='Only at the museum', title='Teaser: Primes', video=src('J', dict(mute_source=True)), audio='NEW N02'),
    dict(id='S14', unit='K', chapter=6, chapter_title='Only at the museum', title='Teaser: Trajectory', video=src('K', dict(mute_source=True)), audio='NEW N03'),
    dict(id='S15', unit='L', chapter=6, chapter_title='Only at the museum', title='Museum invite card',
         video=dict(type='graphic', bg='split: primes freeze at 111.90 | trajectory freeze at 140.30 (landed), centre crops 960x1080, blur 5, 70% luma, amber divider'),
         audio='NEW N04'),
    dict(id='S16', unit='M', chapter=7, chapter_title='The finale', title='Chapter card + finale setup', video=dict(type='card'), audio='REUSED WAV source-lines-v5/finale-00.wav ("Finish all three missions, and the kiosk ends with a finale.")'),
    dict(id='S17', unit='N', chapter=7, chapter_title='The finale', title='You programmed ENIAC', video=src('N'), audio='REUSED baked finale-01..finale-03 (v5 generic wording)'),
    dict(id='S18', unit='O', chapter=7, chapter_title='The finale', title='The single thank-you: Brian L. Stuart',
         video=src('O', dict(mute_source=True, hold=f'freeze last frame to {DUR["O"]} s')), audio='NEW N05'),
    dict(id='S20', unit='P', chapter=8, chapter_title='Come see it', title='Close and call to action',
         video=dict(type='graphic', bg='freeze of the v5 live attract room (tour at 30.00), blur 22, 45% luma'), audio='NEW N06'),
    dict(id='S21', unit='Q', chapter=8, chapter_title='Come see it', title='End screen (YouTube end-screen safe)', video=dict(type='graphic'), audio='music'),
]
for s in SCENES:
    u = s['unit']
    if u == 'B' and s['id'] in ('S03', 'S04', 'S05'):
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
        ('tour-00', '0.05-10.46', 'cut: unit B starts 11.48'),
        ('tour-26', '223.16-238.07', 'cut: E ends 220.48, G starts 238.52'),
        ('tour-40', '352.91-358.48', 'not used (tour finale replaced by finale.mp4)'),
        ('tour-43', '372.81-379.08', 'not used'),
        ('squares-00', '0.48-10.51', 'cut: I starts 15.68'),
        ('squares-19', '163.55-168.38', 'cut: I ends 163.32'),
        ('attract-06 / explore-10 / tubes-13', 'v3 sources', 'not used (not re-recorded, unused)'),
        ('finale-04', '28.29-34.47', 'MUTED under N05 (O uses 28.50-34.60 video only)'),
        ('finale-07', '45.61-50.11', 'cut: finale footage ends 34.60'),
        ('primes-17', '173.38-179.23', 'not used (J is 102.40-111.92, muted)'),
        ('trajectory-00', '0.32-8.91', 'not used (K is 132.60-140.40, muted)'),
        ('trajectory-14', '149.32-154.33', 'not used'),
    ],
    on_screen=[
        'No burned-in caption box (CLEAN=1)',
        'Title cards naming Stuart: tour and squares cut (B in 11.48, I in 15.68); finale title card ("The finale ... thanks the people behind ENIAC", 0-4.4) cut by N in 4.50; primes/trajectory unused',
        '"Thank you / Simulator: Brian L. Stuart" end cards: squares (from 163.36) cut by I out 163.32; finale end card unused (footage ends 34.60)',
        'Tour honor-roll Stuart screen incl. "Thank you, Brian." (about 221.5-238.5): cut by E out 220.48 and G in 238.52',
        'original-ui-tour.mp4 (S05b) shows no Stuart name or thanks: Tk panel views + control strip only',
    ],
    kept_ui=['v3 footer "ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University" (all kiosk screens except attract)',
             'attract-screen rotating plates: "The simulator behind this screen: Brian L. Stuart" / "ENIAC was designed by J. Presper Eckert, John W. Mauchly" / project team / built at and for / the machine / first programmers (S03-S04)',
             'honor-roll tab label "Brian L. Stuart" (S10)',
             'f3 screen "Brian L. Stuart wrote this simulator" under N05 (S18) -- the single thank-you visual'],
    new_in_v5='new rows tour-12 and squares-13 and reworded finale-00..03 contain no Stuart mention or thanks; same thank-you lines as v4, renumbered',
)

data = dict(
    project='Program ENIAC: Our New Touch-Screen Exhibit', version='5.0', date='2026-10-07',
    status='v5: kiosk installed; re-cut against assets/video/source-v5 (NARRATE=1 CLEAN=1) with Original room tour beat + original-UI insert, See the whole room beat, generic finale; v4 structure, rules and overlay layout',
    format=dict(resolution='1920x1080', fps=FPS, audio='48 kHz'),
    intro=dict(file='output/build/intro/vcf_intro_eniac_8s.mp4', dur=INTRO, note='VCF Power-On intro prepended; carries the title card. No S01 title open.'),
    program_total_s=TOTAL, total_with_intro_s=round(TOTAL + INTRO, 2),
    total_with_intro=f'{int((TOTAL + INTRO) // 60)}:{(TOTAL + INTRO) % 60:05.2f}',
    v2_total_with_intro_s=478.28, v3_total_with_intro_s=477.08, v4_total_with_intro_s=481.00,
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
