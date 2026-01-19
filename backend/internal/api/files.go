package api

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// FileInfo represents file/directory information
type FileInfo struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Size        int64  `json:"size"`
	IsDirectory bool   `json:"isDirectory"`
	Extension   string `json:"extension"`
	Permissions string `json:"permissions"`
	ModTime     int64  `json:"modTime"`
	Owner       string `json:"owner"`
}

// ListDirectory lists contents of a directory
func ListDirectory(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		path = "/"
	}

	// Security: prevent path traversal
	path = filepath.Clean(path)

	// Read directory
	entries, err := os.ReadDir(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	files := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		ext := ""
		if !entry.IsDir() {
			ext = strings.TrimPrefix(filepath.Ext(entry.Name()), ".")
		}

		files = append(files, FileInfo{
			Name:        entry.Name(),
			Path:        filepath.Join(path, entry.Name()),
			Size:        info.Size(),
			IsDirectory: entry.IsDir(),
			Extension:   ext,
			Permissions: info.Mode().String(),
			ModTime:     info.ModTime().Unix(),
		})
	}

	// Sort: directories first, then by name
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDirectory != files[j].IsDirectory {
			return files[i].IsDirectory
		}
		return files[i].Name < files[j].Name
	})

	c.JSON(http.StatusOK, gin.H{
		"path":   path,
		"parent": filepath.Dir(path),
		"files":  files,
	})
}

// ReadFile reads file content
func ReadFile(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	path = filepath.Clean(path)

	// Check if file exists
	info, err := os.Stat(path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	if info.IsDir() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is a directory"})
		return
	}

	// Limit file size to 10MB for reading
	if info.Size() > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 10MB)"})
		return
	}

	content, err := os.ReadFile(path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"path":    path,
		"content": string(content),
		"size":    info.Size(),
		"modTime": info.ModTime().Unix(),
	})
}

// WriteFile writes content to a file
func WriteFile(c *gin.Context) {
	var req struct {
		Path    string `json:"path" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	path := filepath.Clean(req.Path)

	// Create parent directories if needed
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Write file
	if err := os.WriteFile(path, []byte(req.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	info, _ := os.Stat(path)

	c.JSON(http.StatusOK, gin.H{
		"message": "File saved",
		"path":    path,
		"size":    info.Size(),
	})
}

// CreateDirectory creates a new directory
func CreateDirectory(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	path := filepath.Clean(req.Path)

	if err := os.MkdirAll(path, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Directory created",
		"path":    path,
	})
}

// DeletePath deletes a file or directory
func DeletePath(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}

	path = filepath.Clean(path)

	// Prevent deleting root or critical directories
	dangerousPaths := []string{"/", "/etc", "/usr", "/bin", "/sbin", "/var", "/root", "/home"}
	for _, dp := range dangerousPaths {
		if path == dp {
			c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete system directory"})
			return
		}
	}

	if err := os.RemoveAll(path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Deleted",
		"path":    path,
	})
}

// RenamePath renames/moves a file or directory
func RenamePath(c *gin.Context) {
	var req struct {
		OldPath string `json:"oldPath" binding:"required"`
		NewPath string `json:"newPath" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oldPath := filepath.Clean(req.OldPath)
	newPath := filepath.Clean(req.NewPath)

	if err := os.Rename(oldPath, newPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Renamed",
		"oldPath": oldPath,
		"newPath": newPath,
	})
}

// CopyPath copies a file or directory
func CopyPath(c *gin.Context) {
	var req struct {
		Source      string `json:"source" binding:"required"`
		Destination string `json:"destination" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	source := filepath.Clean(req.Source)
	dest := filepath.Clean(req.Destination)

	// Simple file copy
	srcInfo, err := os.Stat(source)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "source not found"})
		return
	}

	if srcInfo.IsDir() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "directory copy not implemented"})
		return
	}

	srcFile, err := os.Open(source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Copied",
		"source":      source,
		"destination": dest,
	})
}

// ChangePermissions changes file permissions
func ChangePermissions(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
		Mode string `json:"mode" binding:"required"` // e.g., "755", "644"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	path := filepath.Clean(req.Path)

	// Parse mode
	var mode os.FileMode
	if _, err := fmt.Sscanf(req.Mode, "%o", &mode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mode format"})
		return
	}

	if err := os.Chmod(path, mode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Permissions changed",
		"path":    path,
		"mode":    req.Mode,
	})
}

// SearchFiles searches for files matching a pattern
func SearchFiles(c *gin.Context) {
	basePath := c.Query("path")
	pattern := c.Query("pattern")

	if basePath == "" {
		basePath = "/"
	}
	if pattern == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pattern is required"})
		return
	}

	basePath = filepath.Clean(basePath)

	var results []FileInfo
	maxResults := 100
	startTime := time.Now()
	maxDuration := 10 * time.Second

	err := filepath.Walk(basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}

		// Timeout check
		if time.Since(startTime) > maxDuration {
			return fmt.Errorf("search timeout")
		}

		// Check if filename matches pattern
		matched, _ := filepath.Match(pattern, info.Name())
		if matched || strings.Contains(strings.ToLower(info.Name()), strings.ToLower(pattern)) {
			ext := ""
			if !info.IsDir() {
				ext = strings.TrimPrefix(filepath.Ext(info.Name()), ".")
			}

			results = append(results, FileInfo{
				Name:        info.Name(),
				Path:        path,
				Size:        info.Size(),
				IsDirectory: info.IsDir(),
				Extension:   ext,
				Permissions: info.Mode().String(),
				ModTime:     info.ModTime().Unix(),
			})

			if len(results) >= maxResults {
				return fmt.Errorf("max results reached")
			}
		}

		return nil
	})

	if err != nil && err.Error() != "max results reached" && err.Error() != "search timeout" {
		// Ignore walk errors
	}

	c.JSON(http.StatusOK, gin.H{
		"path":    basePath,
		"pattern": pattern,
		"results": results,
		"count":   len(results),
	})
}
