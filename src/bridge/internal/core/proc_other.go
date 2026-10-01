//go:build !linux

package core

import "syscall"

// sysProcAttr: own process group. Pdeathsig is Linux-only; on the Mac a
// bridge crash can orphan a core, which is acceptable for development.
func sysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setpgid: true}
}
