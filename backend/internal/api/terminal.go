package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// TerminalSession represents an active terminal session
type TerminalSession struct {
	ID     string
	Shell  string
	Pty    *os.File
	Cmd    *exec.Cmd
	Ws     *websocket.Conn
	mu     sync.Mutex
	closed bool
}

// Active terminal sessions
var (
	terminalSessions = make(map[string]*TerminalSession)
	terminalMu       sync.RWMutex
)

// TerminalMessage represents a message to/from terminal
type TerminalMessage struct {
	Type string `json:"type"` // input, output, resize
	Data string `json:"data,omitempty"`
	Cols uint16 `json:"cols,omitempty"`
	Rows uint16 `json:"rows,omitempty"`
}

// CreateTerminal creates a new terminal session via WebSocket
func CreateTerminal(c *gin.Context) {
	shell := c.Query("shell")
	if shell == "" {
		shell = "/bin/bash"
	}

	cwd := c.Query("cwd")
	if cwd == "" {
		cwd = "/root"
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// Create command
	cmd := exec.Command(shell)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Create PTY
	ptmx, err := pty.Start(cmd)
	if err != nil {
		conn.WriteJSON(TerminalMessage{Type: "error", Data: err.Error()})
		return
	}
	defer ptmx.Close()
	defer cmd.Process.Kill()

	// Set initial size
	pty.Setsize(ptmx, &pty.Winsize{Rows: 24, Cols: 80})

	// Read from PTY and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				if err != io.EOF {
					conn.WriteJSON(TerminalMessage{Type: "error", Data: err.Error()})
				}
				conn.Close()
				return
			}
			if n > 0 {
				conn.WriteJSON(TerminalMessage{
					Type: "output",
					Data: string(buf[:n]),
				})
			}
		}
	}()

	// Read from WebSocket and write to PTY
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg TerminalMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "input":
			ptmx.Write([]byte(msg.Data))
		case "resize":
			if msg.Cols > 0 && msg.Rows > 0 {
				pty.Setsize(ptmx, &pty.Winsize{
					Rows: msg.Rows,
					Cols: msg.Cols,
				})
			}
		}
	}

	// Wait for command to finish
	cmd.Wait()
}

// ExecuteCommand executes a single command (non-interactive)
func ExecuteCommand(c *gin.Context) {
	var req struct {
		Command string `json:"command" binding:"required"`
		Cwd     string `json:"cwd"`
		Timeout int    `json:"timeout"` // seconds, default 30
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Timeout <= 0 {
		req.Timeout = 30
	}
	if req.Timeout > 300 {
		req.Timeout = 300 // max 5 minutes
	}

	if req.Cwd == "" {
		req.Cwd = "/root"
	}

	// Security: basic command filtering
	dangerousCommands := []string{"rm -rf /", "mkfs", "dd if=/dev/zero", ":(){ :|:& };:"}
	for _, dangerous := range dangerousCommands {
		if req.Command == dangerous {
			c.JSON(http.StatusForbidden, gin.H{"error": "command not allowed"})
			return
		}
	}

	// Execute command
	cmd := exec.Command("bash", "-c", req.Command)
	cmd.Dir = req.Cwd

	output, err := cmd.CombinedOutput()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"output":   string(output),
		"exitCode": exitCode,
		"command":  req.Command,
	})
}

// ContainerTerminal opens a terminal inside a Docker container
func ContainerTerminal(c *gin.Context) {
	containerID := c.Param("id")
	shell := c.Query("shell")
	if shell == "" {
		shell = "/bin/sh"
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// Create docker exec command
	cmd := exec.Command("docker", "exec", "-it", containerID, shell)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Create PTY
	ptmx, err := pty.Start(cmd)
	if err != nil {
		conn.WriteJSON(TerminalMessage{Type: "error", Data: err.Error()})
		return
	}
	defer ptmx.Close()
	defer cmd.Process.Kill()

	// Set initial size
	pty.Setsize(ptmx, &pty.Winsize{Rows: 24, Cols: 80})

	// Read from PTY and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				if err != io.EOF {
					conn.WriteJSON(TerminalMessage{Type: "error", Data: err.Error()})
				}
				conn.Close()
				return
			}
			if n > 0 {
				conn.WriteJSON(TerminalMessage{
					Type: "output",
					Data: string(buf[:n]),
				})
			}
		}
	}()

	// Read from WebSocket and write to PTY
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg TerminalMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "input":
			ptmx.Write([]byte(msg.Data))
		case "resize":
			if msg.Cols > 0 && msg.Rows > 0 {
				pty.Setsize(ptmx, &pty.Winsize{
					Rows: msg.Rows,
					Cols: msg.Cols,
				})
			}
		}
	}

	cmd.Wait()
}

// ListShells returns available shells
func ListShells(c *gin.Context) {
	shells := []string{}
	possibleShells := []string{"/bin/bash", "/bin/sh", "/bin/zsh", "/usr/bin/fish"}

	for _, shell := range possibleShells {
		if _, err := os.Stat(shell); err == nil {
			shells = append(shells, shell)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"shells": shells,
	})
}
