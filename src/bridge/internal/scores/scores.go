// Package scores keeps a mission's high-score list on the kiosk (Gunnery):
// a small JSON file per mission under the state directory. The kiosk page
// posts a finished round; the list of the day and of all time are served back.
package scores

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// Entry is one finished round.
type Entry struct {
	Name      string `json:"name"`
	Score     int    `json:"score"`
	MissFeet  int    `json:"missFeet"`
	Target    int    `json:"target"`
	Charge    string `json:"charge"`
	Elevation string `json:"elevation"`
	At        string `json:"at"` // RFC 3339, set by the bridge
}

// Board is what GET returns: the best of today and the best of all time.
type Board struct {
	Today []Entry `json:"today"`
	All   []Entry `json:"all"`
}

const (
	keep    = 200 // entries kept per mission
	listLen = 10  // entries served per list
)

var (
	idRe   = regexp.MustCompile(`^[a-z0-9-]{1,40}$`)
	nameRe = regexp.MustCompile(`^[A-Za-z0-9 .\-]{1,8}$`)
)

// Store is the file-backed list.
type Store struct {
	dir string
	now func() time.Time
	mu  sync.Mutex
}

// New keeps lists in dir/scores (created on first write).
func New(stateDir string) *Store {
	return &Store{dir: filepath.Join(stateDir, "scores"), now: time.Now}
}

func (s *Store) path(mission string) string { return filepath.Join(s.dir, mission+".json") }

func (s *Store) load(mission string) []Entry {
	b, err := os.ReadFile(s.path(mission))
	if err != nil {
		return nil
	}
	var l []Entry
	if json.Unmarshal(b, &l) != nil {
		return nil
	}
	return l
}

func better(l []Entry) {
	sort.SliceStable(l, func(i, j int) bool {
		if l[i].Score != l[j].Score {
			return l[i].Score > l[j].Score
		}
		return l[i].At < l[j].At
	})
}

// Board returns the lists for a mission.
func (s *Store) Board(mission string) Board {
	s.mu.Lock()
	defer s.mu.Unlock()
	all := s.load(mission)
	better(all)
	day := s.now().Format("2006-01-02")
	b := Board{Today: []Entry{}, All: []Entry{}}
	for _, e := range all {
		if len(b.All) < listLen {
			b.All = append(b.All, e)
		}
		if len(b.Today) < listLen && strings.HasPrefix(e.At, day) {
			b.Today = append(b.Today, e)
		}
	}
	return b
}

// Add validates and stores one round, returning the new board.
func (s *Store) Add(mission string, e Entry) (Board, bool) {
	e.Name = strings.TrimSpace(e.Name)
	if !idRe.MatchString(mission) || !nameRe.MatchString(e.Name) || e.Score < 0 || e.Score > 100000 ||
		e.MissFeet < 0 || e.Target < 0 || !idRe.MatchString(e.Charge) || !idRe.MatchString(e.Elevation) {
		return Board{}, false
	}
	e.At = s.now().Format(time.RFC3339)
	s.mu.Lock()
	l := append(s.load(mission), e)
	better(l)
	if len(l) > keep {
		l = l[:keep]
	}
	err := os.MkdirAll(s.dir, 0o755)
	if err == nil {
		var b []byte
		if b, err = json.Marshal(l); err == nil {
			tmp := s.path(mission) + ".tmp"
			if err = os.WriteFile(tmp, b, 0o644); err == nil {
				err = os.Rename(tmp, s.path(mission))
			}
		}
	}
	s.mu.Unlock()
	if err != nil {
		return Board{}, false
	}
	return s.Board(mission), true
}

// Handler serves GET and POST /api/scores/{mission}. A POST must come from the
// kiosk page itself (originOK, the websocket's rule).
func (s *Store) Handler(originOK func(origin string) bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/scores/{mission}", func(w http.ResponseWriter, r *http.Request) {
		m := r.PathValue("mission")
		if !idRe.MatchString(m) {
			reply(w, http.StatusNotFound, map[string]string{"error": "unknown mission"})
			return
		}
		reply(w, http.StatusOK, s.Board(m))
	})
	mux.HandleFunc("POST /api/scores/{mission}", func(w http.ResponseWriter, r *http.Request) {
		if !originOK(r.Header.Get("Origin")) {
			reply(w, http.StatusForbidden, map[string]string{"error": "origin not allowed"})
			return
		}
		var e Entry
		r.Body = http.MaxBytesReader(w, r.Body, 4096)
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
			reply(w, http.StatusBadRequest, map[string]string{"error": "bad score"})
			return
		}
		b, ok := s.Add(r.PathValue("mission"), e)
		if !ok {
			reply(w, http.StatusBadRequest, map[string]string{"error": "bad score"})
			return
		}
		reply(w, http.StatusOK, b)
	})
	return mux
}

func reply(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}
