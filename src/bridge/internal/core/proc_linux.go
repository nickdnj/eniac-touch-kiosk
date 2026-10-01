//go:build linux

package core

import "syscall"

// sysProcAttr: own process group, and SIGKILL the core if the bridge dies.
func sysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setpgid: true, Pdeathsig: syscall.SIGKILL}
}
