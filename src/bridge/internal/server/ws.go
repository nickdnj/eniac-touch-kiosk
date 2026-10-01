package server

import (
	"context"
	"net/http"
	"net/url"

	"github.com/coder/websocket"

	"eniac-kiosk/bridge/internal/protocol"
)

// Handler is the bridge's session side (implemented by internal/session).
type Handler interface {
	// Hello and Snapshot are sent to each new client, in that order.
	Hello() protocol.Hello
	Snapshot() protocol.State
	// Handle processes one validated client message and returns replies for
	// that client only (broadcasts go through the Hub).
	Handle(ctx context.Context, c *Client, msg any) []any
	// ClientsChanged is called after a client connects or disconnects.
	ClientsChanged(n int)
}

// originAllowed: the kiosk page is served from the bridge itself, so the
// Origin must be the bridge's own address; --dev adds localhost.
func originAllowed(origin string, allowed []string) bool {
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	o := u.Scheme + "://" + u.Host
	for _, a := range allowed {
		if o == a {
			return true
		}
	}
	return false
}

func (s *srv) handleWS(w http.ResponseWriter, r *http.Request) {
	if !originAllowed(r.Header.Get("Origin"), s.origins) {
		s.log.Warn("ws: origin refused", "origin", r.Header.Get("Origin"))
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return
	}
	// The Origin was checked above against an explicit list.
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	conn.SetReadLimit(64 * 1024)
	ctx, cancel := context.WithCancel(s.ctx)
	defer cancel()
	c := s.hub.add(conn)
	s.log.Info("ws: client connected", "client", c.ID)
	if s.handler != nil {
		s.hub.Send(c, s.handler.Hello())
		s.hub.Send(c, s.handler.Snapshot())
		s.handler.ClientsChanged(s.hub.Count())
	}
	go s.hub.writer(ctx, c)
	defer func() {
		s.hub.remove(c)
		s.log.Info("ws: client gone", "client", c.ID)
		if s.handler != nil {
			s.handler.ClientsChanged(s.hub.Count())
		}
	}()
	for {
		typ, b, err := conn.Read(ctx)
		if err != nil {
			return
		}
		if typ != websocket.MessageText {
			s.hub.Send(c, protocol.Error{T: "error", Code: protocol.ErrBadMessage, Message: "text frames only"})
			continue
		}
		msg, perr := protocol.Decode(b)
		if perr != nil {
			s.hub.Send(c, *perr)
			continue
		}
		if _, ok := msg.(protocol.Ping); ok {
			s.hub.Seen(c)
		}
		if s.handler == nil {
			continue
		}
		for _, reply := range s.handler.Handle(ctx, c, msg) {
			s.hub.Send(c, reply)
		}
	}
}
