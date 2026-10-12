package session

// The Original UI switch and the staff actions (docs/original-ui-switch.md
// 6). The visitor door is the websocket intent original_ui {mode:"tour"};
// the staff door is the admin API (internal/admin), whose hooks are the
// Admin* methods below. Both end what is on the machine first (attract or
// a visit; one core on the box at a time), then the uiswitch request makes
// the kiosk session swap Chromium for Brian L. Stuart's Tk front end.

import (
	"errors"
	"time"

	"eniac-kiosk/bridge/internal/admin"
	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/uiswitch"
)

// originalUIAvailable is (false, "disabled") without a switcher.
func (m *Manager) originalUIAvailable() (bool, string) {
	if m.o.Switch == nil {
		return false, uiswitch.ReasonDisabled
	}
	return m.o.Switch.Available()
}

// originalUIConfig is hello.config.originalUi.
func (m *Manager) originalUIConfig() protocol.OriginalUIConfig {
	ok, reason := m.originalUIAvailable()
	c := m.o.Config.OriginalUI
	return protocol.OriginalUIConfig{Available: ok, Reason: reason, TourIdleS: c.TourIdleS, InteractiveIdleS: c.InteractiveIdleS}
}

// consumeOriginalUIExit records how the original UI ended, once: the kiosk
// session writes `last` when it brings Chromium back, and the page's first
// hello afterwards reads and deletes it.
func (m *Manager) consumeOriginalUIExit() {
	if m.o.Switch == nil {
		return
	}
	e, err := m.o.Switch.ConsumeLast()
	if err != nil {
		m.log.Warn("ui: malformed last file removed", "err", err)
		return
	}
	if e == nil {
		return
	}
	m.log.Info("ui: original UI ended", "mode", e.Mode, "door", e.Door, "id", e.ID, "cause", e.Cause, "durS", e.DurS)
	m.o.Metrics.Bridge("original_ui_exit", "", map[string]any{"door": e.Door, "mode": e.Mode, "cause": e.Cause, "durS": e.DurS})
}

// leaveForOriginalUI ends attract and any visit (reason original_ui).
func (m *Manager) leaveForOriginalUI() {
	m.stopAttract("original_ui", nil)
	m.opMu.Lock()
	m.endSession("original_ui")
	m.opMu.Unlock()
}

func (m *Manager) requestOriginalUI(mode, door string) (uiswitch.Request, bool, error) {
	if m.o.Switch == nil {
		return uiswitch.Request{}, false, &uiswitch.ErrUnavailable{Reason: uiswitch.ReasonDisabled}
	}
	return m.o.Switch.Request(mode, door)
}

// originalUI handles the visitor's original_ui {mode:"tour"}.
func (m *Manager) originalUI(x protocol.OriginalUI) []any {
	req, repeat, err := m.requestOriginalUI(uiswitch.ModeTour, uiswitch.DoorVisitor)
	if err != nil {
		reason := err.Error()
		var un *uiswitch.ErrUnavailable
		if errors.As(err, &un) {
			reason = un.Reason
		}
		m.log.Info("ui: switch refused", "door", uiswitch.DoorVisitor, "reason", reason)
		return errMsg(x.ID, protocol.ErrNotAllowed, "the original UI is not available (%s)", reason)
	}
	m.leaveForOriginalUI()
	if !repeat {
		m.o.Metrics.Bridge("original_ui_enter", "", map[string]any{"door": uiswitch.DoorVisitor, "mode": req.Mode})
	}
	return []any{protocol.OriginalUIReply{T: "original_ui", Re: x.ID, Phase: "switching", Mode: req.Mode, ID: req.ID}}
}

// AdminOriginalUI is the staff's Original UI button (POST
// /api/admin/original-ui): the interactive front end, door staff.
func (m *Manager) AdminOriginalUI() (uiswitch.Request, error) {
	req, repeat, err := m.requestOriginalUI(uiswitch.ModeInteractive, uiswitch.DoorStaff)
	if err != nil {
		var un *uiswitch.ErrUnavailable
		if errors.As(err, &un) {
			m.log.Info("ui: switch refused", "door", uiswitch.DoorStaff, "reason", un.Reason)
		}
		return req, err
	}
	if repeat {
		return req, admin.ErrBusy
	}
	m.leaveForOriginalUI()
	m.o.Metrics.Bridge("original_ui_enter", "", map[string]any{"door": uiswitch.DoorStaff, "mode": req.Mode})
	return req, nil
}

// AdminRestartCore is the staff's Restart simulator: attract and any
// session end (reason restart), and the recovery budget starts over; a
// core stuck in E-RETRY-BUDGET is probed at once. The page then shows S1,
// whose attract_start boots a fresh core.
func (m *Manager) AdminRestartCore() {
	m.stopAttract("restart", nil)
	m.opMu.Lock()
	m.endSession("restart")
	m.opMu.Unlock()
	m.rec.Reset()
}

// healthzOriginalUI is /healthz's originalUi block.
func (m *Manager) healthzOriginalUI() protocol.HealthzOriginalUI {
	ok, reason := m.originalUIAvailable()
	h := protocol.HealthzOriginalUI{Available: ok, Reason: reason}
	if m.o.Switch != nil {
		if a, ok := m.o.Switch.ReadActive(); ok {
			h.Active = &protocol.HealthzOriginalUIActive{Mode: a.Mode, ID: a.ID, SinceS: max(0, time.Now().Unix()-a.Since)}
		}
	}
	return h
}
