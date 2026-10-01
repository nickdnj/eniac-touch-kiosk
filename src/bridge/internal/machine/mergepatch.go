package machine

// JSON Merge Patch (RFC 7396) helpers over the nested map[string]any form
// of MachineState. MachineState has no arrays and no nulls, so:
//   - Diff emits only changed leaves (objects recurse);
//   - composing two patches is a deep merge where the later one wins;
//   - applying a patch is the same deep merge onto the document.

// Diff returns the merge patch that turns a into b, or nil if they are equal.
// Keys present in a but not in b become null (never happens for
// MachineState, but it keeps Diff correct in general).
func Diff(a, b map[string]any) map[string]any {
	var p map[string]any
	for k, bv := range b {
		av, ok := a[k]
		if bm, isMap := bv.(map[string]any); isMap {
			if am, ok2 := av.(map[string]any); ok && ok2 {
				if sub := Diff(am, bm); sub != nil {
					if p == nil {
						p = map[string]any{}
					}
					p[k] = sub
				}
				continue
			}
			if p == nil {
				p = map[string]any{}
			}
			p[k] = Clone(bm)
			continue
		}
		if !ok || av != bv {
			if p == nil {
				p = map[string]any{}
			}
			p[k] = bv
		}
	}
	for k := range a {
		if _, ok := b[k]; !ok {
			if p == nil {
				p = map[string]any{}
			}
			p[k] = nil
		}
	}
	return p
}

// Merge applies patch onto doc in place (RFC 7396) and returns doc. It is
// used both to apply a patch to a document and to compose a pending patch
// with a newer one (later wins).
func Merge(doc, patch map[string]any) map[string]any {
	if doc == nil {
		doc = map[string]any{}
	}
	for k, pv := range patch {
		if pv == nil {
			delete(doc, k)
			continue
		}
		if pm, ok := pv.(map[string]any); ok {
			dm, ok := doc[k].(map[string]any)
			if !ok {
				dm = map[string]any{}
			}
			doc[k] = Merge(dm, pm)
			continue
		}
		doc[k] = pv
	}
	return doc
}

// Clone deep-copies a nested map.
func Clone(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	c := make(map[string]any, len(m))
	for k, v := range m {
		if vm, ok := v.(map[string]any); ok {
			c[k] = Clone(vm)
		} else {
			c[k] = v
		}
	}
	return c
}
