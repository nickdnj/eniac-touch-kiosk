# The "Back to kiosk" button over Brian L. Stuart's original UI
# (docs/original-ui-switch.md 5.3; UX 7.12.5, 7.12.6). Run by
# deploy/kiosk/original-ui as:
#
#   wish original-ui-back.tcl --idle-s N --warn-s N
#
# One 280 x 96 window at the top left, always on top (openbox keeps the
# window titled "eniac-back" in its above layer, without focus, at 0,0:
# openbox-rc.xml). It is never re-raised on a timer, so Stuart's LOAD CONF
# menu (popped up at 10,10) can draw over it while it is open. No
# confirmation, no keys. Touch-down darkens it; release says "Going back..."
# and exits 0. Idle is X input idle time ([tk inactive], any touch anywhere
# resets it): for the last warnS seconds the label counts down and the
# border blinks at 1 Hz; at 0 the label says "Going back..." and it exits
# 10. The strings are the wrapper rows of UX 7.12.7 (this is not the web app).

set idleS 300
set warnS 30
foreach {k v} $argv {
    switch -- $k {
        --idle-s { set idleS $v }
        --warn-s { set warnS $v }
    }
}
if {![string is integer -strict $idleS] || $idleS < 1} { set idleS 300 }
if {![string is integer -strict $warnS] || $warnS < 0} { set warnS 30 }

# UX 7.12.7 originalUi.back / backWarn(m, ss) / backBusy
set txtBack "Back to kiosk"
set txtBusy "Going back..."
proc warnText {left} { return [format "Back to kiosk %d:%02d" [expr {$left / 60}] [expr {$left % 60}]] }

set plate "#0E0F11"   ;# --plate
set pressed "#1B1D21" ;# --panel
set cream "#F4EFE3"   ;# --card
set yellow "#F0E442"  ;# --guide

wm title . eniac-back
wm geometry . 280x96+0+0
wm resizable . 0 0
wm attributes . -topmost 1
. configure -background $plate -highlightthickness 3 -highlightbackground $yellow -highlightcolor $yellow -takefocus 0 -cursor {}
label .l -text $txtBack -font {{DejaVu Sans} -32 bold} -foreground $cream -background $plate -takefocus 0
place .l -relx 0.5 -rely 0.5 -anchor center

set busy 0
proc fill {c} { . configure -background $c; .l configure -background $c }
proc goBack {code} {
    global busy txtBusy
    if {$busy} return
    set busy 1
    bind . <ButtonPress-1> {}
    bind . <ButtonRelease-1> {}
    bind .l <ButtonPress-1> {}
    bind .l <ButtonRelease-1> {}
    .l configure -text $txtBusy
    update idletasks
    after 150 [list exit $code]
}
foreach w {. .l} {
    bind $w <ButtonPress-1> [list fill $pressed]
    bind $w <ButtonRelease-1> {goBack 0}
}

# Idle: X input idle time. [tk inactive] is -1 where the XScreenSaver
# extension is missing; then count from our own start (logged once).
set started [clock milliseconds]
set noXss 0
set blink 0
proc tick {} {
    global idleS warnS started noXss blink busy txtBack yellow plate
    if {$busy} return
    set idleMs [tk inactive]
    if {$idleMs < 0} {
        if {!$noXss} {
            puts stderr "original-ui-back: tk inactive is unsupported here; idle counts from the start"
            set noXss 1
        }
        set idleMs [expr {[clock milliseconds] - $started}]
    }
    set left [expr {$idleS - $idleMs / 1000}]
    if {$left <= 0} {
        goBack 10
        return
    }
    if {$left <= $warnS} {
        .l configure -text [warnText $left]
        set blink [expr {!$blink}]
        if {$blink} { set c $yellow } else { set c $plate }
        . configure -highlightbackground $c -highlightcolor $c
    } else {
        .l configure -text $txtBack
        . configure -highlightbackground $yellow -highlightcolor $yellow
    }
    after 500 tick
}
after 500 tick
