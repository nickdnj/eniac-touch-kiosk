package mission

import (
	"encoding/json"
	"net/http"
	"strings"
)

// Registry holds the missions loaded at boot.
type Registry struct {
	list []*Mission
	byID map[string]*Mission
}

// NewRegistry indexes loaded missions.
func NewRegistry(list []*Mission) *Registry {
	r := &Registry{list: list, byID: map[string]*Mission{}}
	for _, m := range list {
		r.byID[m.File.ID] = m
	}
	return r
}

// Get returns a mission by id (available or not).
func (r *Registry) Get(id string) (*Mission, bool) {
	m, ok := r.byID[id]
	return m, ok
}

// All returns every mission in menu order.
func (r *Registry) All() []*Mission { return r.list }

// AnyAvailable reports whether at least one mission can run (else E-MISSION).
func (r *Registry) AnyAvailable() bool {
	for _, m := range r.list {
		if m.Available {
			return true
		}
	}
	return false
}

// Handler serves GET /api/missions and GET /api/missions/{id} (5.7).
func (r *Registry) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/missions", func(w http.ResponseWriter, _ *http.Request) {
		out := make([]Summary, 0, len(r.list))
		for _, m := range r.list {
			out = append(out, SummaryOf(m))
		}
		writeJSON(w, http.StatusOK, out)
	})
	mux.HandleFunc("GET /api/missions/{id}", func(w http.ResponseWriter, req *http.Request) {
		id := req.PathValue("id")
		m, ok := r.byID[id]
		if !ok || strings.ContainsAny(id, "/.") {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown mission"})
			return
		}
		if !m.Available {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "mission unavailable", "reason": m.Reason})
			return
		}
		writeJSON(w, http.StatusOK, m.Compiled())
	})
	return mux
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.Encode(v)
}
