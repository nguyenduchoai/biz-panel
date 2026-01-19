package api

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// LogSource represents a log source
type LogSource struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Path     string `json:"path"`
	Type     string `json:"type"` // system, nginx, apache, docker, app
	Readable bool   `json:"readable"`
}

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	Source    string `json:"source"`
}

// Common log paths
var logSources = []LogSource{
	{ID: "syslog", Name: "System Log", Path: "/var/log/syslog", Type: "system"},
	{ID: "auth", Name: "Auth Log", Path: "/var/log/auth.log", Type: "system"},
	{ID: "nginx-access", Name: "Nginx Access", Path: "/var/log/nginx/access.log", Type: "nginx"},
	{ID: "nginx-error", Name: "Nginx Error", Path: "/var/log/nginx/error.log", Type: "nginx"},
	{ID: "apache-access", Name: "Apache Access", Path: "/var/log/apache2/access.log", Type: "apache"},
	{ID: "apache-error", Name: "Apache Error", Path: "/var/log/apache2/error.log", Type: "apache"},
	{ID: "mysql", Name: "MySQL", Path: "/var/log/mysql/error.log", Type: "database"},
	{ID: "postgresql", Name: "PostgreSQL", Path: "/var/log/postgresql/postgresql-14-main.log", Type: "database"},
	{ID: "dmesg", Name: "Kernel Log", Path: "/var/log/dmesg", Type: "system"},
	{ID: "fail2ban", Name: "Fail2Ban", Path: "/var/log/fail2ban.log", Type: "security"},
}

// ListLogSources returns available log sources
func ListLogSources(c *gin.Context) {
	sources := make([]LogSource, 0)

	for _, src := range logSources {
		src.Readable = isReadable(src.Path)
		sources = append(sources, src)
	}

	c.JSON(http.StatusOK, sources)
}

// isReadable checks if a file is readable
func isReadable(path string) bool {
	file, err := os.Open(path)
	if err != nil {
		return false
	}
	file.Close()
	return true
}

// GetLogs returns log entries from a source
func GetLogs(c *gin.Context) {
	sourceID := c.Param("source")
	lines := 100 // default

	if l := c.Query("lines"); l != "" {
		fmt.Sscanf(l, "%d", &lines)
	}

	if lines > 1000 {
		lines = 1000
	}

	// Find log source
	var logPath string
	for _, src := range logSources {
		if src.ID == sourceID {
			logPath = src.Path
			break
		}
	}

	// Allow custom path
	if logPath == "" {
		customPath := c.Query("path")
		if customPath != "" {
			logPath = filepath.Clean(customPath)
		}
	}

	if logPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown log source"})
		return
	}

	// Read last N lines using tail
	cmd := exec.Command("tail", "-n", fmt.Sprintf("%d", lines), logPath)
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse log lines
	entries := parseLogLines(string(output), sourceID)

	c.JSON(http.StatusOK, gin.H{
		"source":  sourceID,
		"path":    logPath,
		"entries": entries,
		"count":   len(entries),
	})
}

// parseLogLines parses raw log text into structured entries
func parseLogLines(text, source string) []LogEntry {
	lines := strings.Split(text, "\n")
	entries := make([]LogEntry, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		entry := LogEntry{
			Message: line,
			Source:  source,
			Level:   detectLogLevel(line),
		}

		// Try to extract timestamp (common formats)
		if len(line) > 15 {
			// Check for common date formats
			if timestamp := extractTimestamp(line); timestamp != "" {
				entry.Timestamp = timestamp
			}
		}

		entries = append(entries, entry)
	}

	return entries
}

// detectLogLevel detects log level from message
func detectLogLevel(line string) string {
	lineLower := strings.ToLower(line)

	levelPatterns := map[string][]string{
		"error":   {"error", "err", "fail", "fatal", "critical"},
		"warning": {"warn", "warning"},
		"info":    {"info", "notice"},
		"debug":   {"debug", "trace"},
	}

	for level, patterns := range levelPatterns {
		for _, pattern := range patterns {
			if strings.Contains(lineLower, pattern) {
				return level
			}
		}
	}

	return "info"
}

// extractTimestamp tries to extract timestamp from log line
func extractTimestamp(line string) string {
	// Pattern: Jan 18 10:30:45 (syslog format)
	if len(line) >= 15 && line[3] == ' ' && line[6:7] == " " {
		return line[:15]
	}

	// Pattern: 2026-01-18 10:30:45 (ISO format)
	if len(line) >= 19 && line[4] == '-' && line[10] == ' ' {
		return line[:19]
	}

	// Pattern: [2026-01-18T10:30:45] (bracketed ISO)
	if line[0] == '[' && len(line) > 20 {
		end := strings.Index(line, "]")
		if end > 0 {
			return line[1:end]
		}
	}

	return ""
}

// SearchLogs searches across all log files
func SearchLogs(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query is required"})
		return
	}

	sourceFilter := c.Query("source") // optional source filter

	results := make([]LogEntry, 0)
	maxResults := 100

	for _, src := range logSources {
		if sourceFilter != "" && src.ID != sourceFilter {
			continue
		}

		if !isReadable(src.Path) {
			continue
		}

		// Use grep to search
		cmd := exec.Command("grep", "-i", "-n", query, src.Path)
		output, _ := cmd.Output()

		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			results = append(results, LogEntry{
				Message: line,
				Source:  src.ID,
				Level:   detectLogLevel(line),
			})

			if len(results) >= maxResults {
				break
			}
		}

		if len(results) >= maxResults {
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"results": results,
		"count":   len(results),
	})
}

// StreamLogs streams log entries via WebSocket
func StreamLogs(c *gin.Context) {
	sourceID := c.Param("source")

	// Find log path
	var logPath string
	for _, src := range logSources {
		if src.ID == sourceID {
			logPath = src.Path
			break
		}
	}

	if logPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown log source"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Use tail -f for real-time streaming
	cmd := exec.Command("tail", "-f", "-n", "50", logPath)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		conn.WriteJSON(gin.H{"error": err.Error()})
		return
	}

	if err := cmd.Start(); err != nil {
		conn.WriteJSON(gin.H{"error": err.Error()})
		return
	}

	defer cmd.Process.Kill()

	// Read and stream lines
	reader := bufio.NewReader(stdout)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err != io.EOF {
				break
			}
			time.Sleep(100 * time.Millisecond)
			continue
		}

		entry := LogEntry{
			Timestamp: time.Now().Format("2006-01-02 15:04:05"),
			Message:   strings.TrimSpace(line),
			Source:    sourceID,
			Level:     detectLogLevel(line),
		}

		if err := conn.WriteJSON(entry); err != nil {
			break
		}
	}
}

// DownloadLog downloads a log file
func DownloadLog(c *gin.Context) {
	sourceID := c.Param("source")

	var logPath string
	for _, src := range logSources {
		if src.ID == sourceID {
			logPath = src.Path
			break
		}
	}

	if logPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown log source"})
		return
	}

	if !isReadable(logPath) {
		c.JSON(http.StatusForbidden, gin.H{"error": "log not readable"})
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.log", sourceID))
	c.Header("Content-Type", "text/plain")
	c.File(logPath)
}

// ClearLog clears a log file (truncates it)
func ClearLog(c *gin.Context) {
	sourceID := c.Param("source")

	var logPath string
	for _, src := range logSources {
		if src.ID == sourceID {
			logPath = src.Path
			break
		}
	}

	if logPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown log source"})
		return
	}

	// Truncate file
	if err := os.Truncate(logPath, 0); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Log cleared",
		"source":  sourceID,
	})
}
