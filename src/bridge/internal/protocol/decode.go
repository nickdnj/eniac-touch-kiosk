package protocol

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
)

var (
	idRe   = regexp.MustCompile(`^[a-z0-9-]{1,64}$`)
	evRe   = regexp.MustCompile(`^[a-z_]{1,32}$`)
	screen = regexp.MustCompile(`^[A-Za-z0-9_-]{1,32}$`)
)

// Decode strictly parses one client frame into one of the client message
// types (StartMission, ApplyStep, SkipSetup, Button, SetSpeed, EndSession,
// AttractStart, AttractStop, Metric, Ping, OriginalUI). Unknown types, unknown fields, wrong field types, bad
// values and oversize frames return an Error with code BAD_MESSAGE; they
// never reach the core (FR-02).
func Decode(b []byte) (any, *Error) {
	var head struct {
		T  string          `json:"t"`
		ID json.RawMessage `json:"id"`
	}
	fail := func(re *int64, format string, a ...any) (any, *Error) {
		return nil, &Error{T: "error", Re: re, Code: ErrBadMessage, Message: fmt.Sprintf(format, a...)}
	}
	if len(b) > MaxClientFrame {
		return fail(nil, "frame larger than %d bytes", MaxClientFrame)
	}
	if err := json.Unmarshal(b, &head); err != nil {
		return fail(nil, "not a JSON object")
	}
	var re *int64
	if len(head.ID) > 0 && string(head.ID) != "null" {
		var id int64
		if err := json.Unmarshal(head.ID, &id); err != nil {
			return fail(nil, "id must be an integer")
		}
		re = &id
	}
	strict := func(v any) error {
		d := json.NewDecoder(bytes.NewReader(b))
		d.DisallowUnknownFields()
		if err := d.Decode(v); err != nil {
			return err
		}
		if d.More() {
			return fmt.Errorf("trailing data")
		}
		return nil
	}
	var msg any
	var err error
	switch head.T {
	case "start_mission":
		var m StartMission
		if err = strict(&m); err == nil {
			if !idRe.MatchString(m.Mission) {
				return fail(re, "bad mission id")
			}
			if m.Mode == "" {
				m.Mode = "visitor"
			}
			if m.Mode != "visitor" && m.Mode != "docent" && m.Mode != "attract" {
				return fail(re, "mode must be visitor, docent or attract")
			}
		}
		msg = m
	case "apply_step":
		var m ApplyStep
		if err = strict(&m); err == nil && !idRe.MatchString(m.Step) {
			return fail(re, "bad step id")
		}
		msg = m
	case "skip_setup":
		var m SkipSetup
		err = strict(&m)
		msg = m
	case "button":
		var m Button
		if err = strict(&m); err == nil && m.B != "init" && m.B != "clear" && m.B != "read" {
			return fail(re, "b must be init, clear or read")
		}
		msg = m
	case "set_speed":
		var m SetSpeed
		if err = strict(&m); err == nil && !idRe.MatchString(m.Speed) {
			return fail(re, "bad speed name")
		}
		msg = m
	case "end_session":
		var m EndSession
		if err = strict(&m); err == nil {
			switch m.Reason {
			case "idle", "menu", "restart", "done":
			default:
				return fail(re, "reason must be idle, menu, restart or done")
			}
		}
		msg = m
	case "metric":
		var m Metric
		if err = strict(&m); err == nil {
			if !evRe.MatchString(m.Ev) {
				return fail(re, "bad metric name")
			}
			for _, s := range []string{m.Mission, m.Step, m.Speed, m.Unit} {
				if s != "" && !idRe.MatchString(s) {
					return fail(re, "bad metric field")
				}
			}
			if m.Screen != "" && !screen.MatchString(m.Screen) {
				return fail(re, "bad metric screen")
			}
		}
		msg = m
	case "attract_start":
		var m AttractStart
		err = strict(&m)
		msg = m
	case "attract_stop":
		var m AttractStop
		if err = strict(&m); err == nil {
			if m.Reason == "" {
				m.Reason = "touch"
			}
			if m.Reason != "touch" && m.Reason != "menu" {
				return fail(re, "reason must be touch or menu")
			}
		}
		msg = m
	case "ping":
		var m Ping
		err = strict(&m)
		msg = m
	case "original_ui":
		// The visitor door: the room tour only. "interactive" is staff-only
		// and goes through the admin API with the PIN.
		var m OriginalUI
		if err = strict(&m); err == nil && m.Mode != "tour" {
			return fail(re, "mode must be tour")
		}
		msg = m
	default:
		return fail(re, "unknown message type %q", head.T)
	}
	if err != nil {
		return fail(re, "%s: %v", head.T, err)
	}
	return msg, nil
}
