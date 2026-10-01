package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"

	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/protocol"
)

// ClientQueueMax bounds a client's ordered (non-frame) messages. A client
// that falls this far behind is disconnected; it reconnects and resyncs.
const ClientQueueMax = 512

// Client is one websocket connection.
type Client struct {
	ID       int64
	conn     *websocket.Conn
	out      chan []byte
	co       *machine.Coalescer
	done     chan struct{}
	closeOne sync.Once
	lastSeen atomic.Int64 // unix nanos of the last ping
}

// Hub fans server messages out to every client. Frames merge per client
// (a slow client never blocks the core reader); everything else is queued
// in order.
type Hub struct {
	log     *slog.Logger
	mu      sync.Mutex
	clients map[*Client]struct{}
	nextID  int64
	lastAny atomic.Int64 // last ping from any client
}

func NewHub(log *slog.Logger) *Hub {
	return &Hub{log: log, clients: map[*Client]struct{}{}}
}

func (h *Hub) add(conn *websocket.Conn) *Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.nextID++
	c := &Client{ID: h.nextID, conn: conn, out: make(chan []byte, ClientQueueMax), co: machine.NewCoalescer(), done: make(chan struct{})}
	h.clients[c] = struct{}{}
	return c
}

func (h *Hub) remove(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	c.close(websocket.StatusNormalClosure, "")
}

func (c *Client) close(code websocket.StatusCode, reason string) {
	c.closeOne.Do(func() {
		close(c.done)
		c.conn.Close(code, reason)
	})
}

// Count is the number of connected clients.
func (h *Hub) Count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.clients)
}

// Seen records a ping from a client (kiosk liveness).
func (h *Hub) Seen(c *Client) {
	now := time.Now().UnixNano()
	c.lastSeen.Store(now)
	h.lastAny.Store(now)
}

// LastPing is the time of the most recent ping from any client (zero if none).
func (h *Hub) LastPing() time.Time {
	n := h.lastAny.Load()
	if n == 0 {
		return time.Time{}
	}
	return time.Unix(0, n)
}

func encode(msg any) []byte {
	b, err := json.Marshal(msg)
	if err != nil {
		panic(err) // protocol types always marshal
	}
	return b
}

// Send queues a message for one client.
func (h *Hub) Send(c *Client, msg any) { h.sendRaw(c, encode(msg)) }

func (h *Hub) sendRaw(c *Client, b []byte) {
	select {
	case <-c.done:
	case c.out <- b:
	default:
		h.log.Warn("ws: client too slow, disconnecting", "client", c.ID)
		go h.remove(c)
	}
}

// Broadcast queues a message for every client, in order.
func (h *Hub) Broadcast(msg any) {
	b := encode(msg)
	h.mu.Lock()
	cs := make([]*Client, 0, len(h.clients))
	for c := range h.clients {
		cs = append(cs, c)
	}
	h.mu.Unlock()
	for _, c := range cs {
		h.sendRaw(c, b)
	}
}

// BroadcastFrame merges a delta into every client's pending frame.
func (h *Hub) BroadcastFrame(seq uint64, patch map[string]any) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		c.co.AddFrame(seq, patch)
	}
}

// BroadcastPunch queues a card for every client. It returns
// machine.ErrPunchOverflow if any client is more than 5000 cards behind.
func (h *Hub) BroadcastPunch(p machine.Punch) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	var err error
	for c := range h.clients {
		if e := c.co.AddPunch(p); e != nil {
			err = e
		}
	}
	return err
}

// ResetFrames drops every client's pending frames (a fresh state follows).
func (h *Hub) ResetFrames() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		c.co.Reset()
	}
}

// writer is the only goroutine writing to a client's connection. Ordered
// messages go first; then any merged frame and queued punches.
func (h *Hub) writer(ctx context.Context, c *Client) {
	write := func(b []byte) bool {
		wctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := c.conn.Write(wctx, websocket.MessageText, b); err != nil {
			go h.remove(c)
			return false
		}
		return true
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-c.done:
			return
		case b := <-c.out:
			if !write(b) {
				return
			}
		case <-c.co.Ready():
			// Drain ordered messages first so a state resync precedes the
			// frames that follow it.
		drain:
			for {
				select {
				case b := <-c.out:
					if !write(b) {
						return
					}
				default:
					break drain
				}
			}
			seq, patch, punches := c.co.Take()
			for _, p := range punches {
				if !write(encode(protocol.Punch{T: "punch", N: p.N, Text: p.Text, Fields: p.Fields})) {
					return
				}
			}
			if patch != nil {
				if !write(encode(protocol.Frame{T: "frame", Seq: seq, D: patch})) {
					return
				}
			}
		}
	}
}
