package api

import (
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SoftwareItem represents a software package
type SoftwareItem struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Version           string   `json:"version"`
	Description       string   `json:"description"`
	Icon              string   `json:"icon"`
	Category          string   `json:"category"`
	Installed         bool     `json:"installed"`
	Running           *bool    `json:"running,omitempty"`
	InstalledVersion  string   `json:"installedVersion,omitempty"`
	AvailableVersions []string `json:"availableVersions"`
}

// InstallStatus tracks installation progress
type InstallStatus struct {
	ID        string    `json:"id"`
	Software  string    `json:"software"`
	Status    string    `json:"status"` // pending, installing, success, failed
	Progress  int       `json:"progress"`
	Message   string    `json:"message"`
	StartedAt time.Time `json:"startedAt"`
}

var (
	installJobs   = make(map[string]*InstallStatus)
	installJobsMu sync.RWMutex
)

// ListSoftware returns available software packages
func ListSoftware(c *gin.Context) {
	category := c.Query("category")

	software := []SoftwareItem{
		// Runtimes
		{ID: "php82", Name: "PHP 8.2", Version: "8.2.15", Description: "Server-side scripting language", Icon: "🐘", Category: "runtime", Installed: checkInstalled("php"), Running: boolPtr(checkRunning("php-fpm")), AvailableVersions: []string{"8.2.15", "8.1.27", "8.0.30"}},
		{ID: "nodejs20", Name: "Node.js 20", Version: "20.11.0", Description: "JavaScript runtime", Icon: "🟢", Category: "runtime", Installed: checkInstalled("node"), AvailableVersions: []string{"20.11.0", "18.19.0", "16.20.2"}},
		{ID: "python311", Name: "Python 3.11", Version: "3.11.7", Description: "Python programming language", Icon: "🐍", Category: "runtime", Installed: checkInstalled("python3"), AvailableVersions: []string{"3.12.1", "3.11.7", "3.10.13"}},
		{ID: "go122", Name: "Go 1.22", Version: "1.22.0", Description: "Go programming language", Icon: "🔵", Category: "runtime", Installed: checkInstalled("go"), AvailableVersions: []string{"1.22.0", "1.21.6"}},
		{ID: "ruby33", Name: "Ruby 3.3", Version: "3.3.0", Description: "Ruby programming language", Icon: "💎", Category: "runtime", Installed: checkInstalled("ruby"), AvailableVersions: []string{"3.3.0", "3.2.2"}},
		// Web Servers
		{ID: "nginx", Name: "Nginx", Version: "1.25.3", Description: "High-performance HTTP server", Icon: "🌐", Category: "webserver", Installed: checkInstalled("nginx"), Running: boolPtr(checkRunning("nginx")), AvailableVersions: []string{"1.25.3", "1.24.0"}},
		{ID: "apache", Name: "Apache", Version: "2.4.58", Description: "Apache HTTP Server", Icon: "🪶", Category: "webserver", Installed: checkInstalled("apache2"), Running: boolPtr(checkRunning("apache2")), AvailableVersions: []string{"2.4.58", "2.4.57"}},
		// Databases
		{ID: "mysql", Name: "MySQL", Version: "8.0.36", Description: "Popular open source database", Icon: "🐬", Category: "database", Installed: checkInstalled("mysql"), Running: boolPtr(checkRunning("mysql")), AvailableVersions: []string{"8.0.36", "5.7.44"}},
		{ID: "postgresql", Name: "PostgreSQL", Version: "16.1", Description: "Advanced open source database", Icon: "🐘", Category: "database", Installed: checkInstalled("psql"), Running: boolPtr(checkRunning("postgresql")), AvailableVersions: []string{"16.1", "15.5", "14.10"}},
		{ID: "mongodb", Name: "MongoDB", Version: "7.0.5", Description: "Document-oriented NoSQL database", Icon: "🍃", Category: "database", Installed: checkInstalled("mongod"), AvailableVersions: []string{"7.0.5", "6.0.13"}},
		// Cache
		{ID: "redis", Name: "Redis", Version: "7.2.4", Description: "In-memory data structure store", Icon: "🔴", Category: "cache", Installed: checkInstalled("redis-server"), Running: boolPtr(checkRunning("redis")), AvailableVersions: []string{"7.2.4", "7.0.15"}},
		{ID: "memcached", Name: "Memcached", Version: "1.6.23", Description: "Memory caching system", Icon: "🧊", Category: "cache", Installed: checkInstalled("memcached"), Running: boolPtr(checkRunning("memcached")), AvailableVersions: []string{"1.6.23", "1.6.22"}},
		// Tools
		{ID: "composer", Name: "Composer", Version: "2.6.6", Description: "PHP dependency manager", Icon: "🎼", Category: "tools", Installed: checkInstalled("composer"), AvailableVersions: []string{"2.6.6", "2.5.8"}},
		{ID: "certbot", Name: "Certbot", Version: "2.8.0", Description: "Let's Encrypt automation", Icon: "🔐", Category: "tools", Installed: checkInstalled("certbot"), AvailableVersions: []string{"2.8.0", "2.7.4"}},
		{ID: "docker", Name: "Docker", Version: "25.0.1", Description: "Container platform", Icon: "🐳", Category: "tools", Installed: checkInstalled("docker"), Running: boolPtr(checkRunning("docker")), AvailableVersions: []string{"25.0.1", "24.0.7"}},
	}

	// Filter by category
	if category != "" && category != "all" {
		filtered := make([]SoftwareItem, 0)
		for _, s := range software {
			if s.Category == category {
				filtered = append(filtered, s)
			}
		}
		software = filtered
	}

	// Get installed versions
	for i := range software {
		if software[i].Installed {
			software[i].InstalledVersion = getInstalledVersion(software[i].ID)
		}
	}

	c.JSON(http.StatusOK, software)
}

// InstallSoftware installs a software package
func InstallSoftware(c *gin.Context) {
	id := c.Param("id")
	version := c.Query("version")

	// Create install job
	jobID := uuid.New().String()[:8]
	job := &InstallStatus{
		ID:        jobID,
		Software:  id,
		Status:    "installing",
		Progress:  0,
		Message:   fmt.Sprintf("Installing %s...", id),
		StartedAt: time.Now(),
	}

	installJobsMu.Lock()
	installJobs[jobID] = job
	installJobsMu.Unlock()

	// Run installation in background
	go func() {
		var cmd *exec.Cmd

		switch id {
		case "php82":
			cmd = exec.Command("apt", "install", "-y", "php8.2", "php8.2-fpm", "php8.2-mysql", "php8.2-curl", "php8.2-gd", "php8.2-mbstring")
		case "nodejs20":
			cmd = exec.Command("bash", "-c", "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs")
		case "python311":
			cmd = exec.Command("apt", "install", "-y", "python3.11", "python3.11-venv", "python3-pip")
		case "nginx":
			cmd = exec.Command("apt", "install", "-y", "nginx")
		case "apache":
			cmd = exec.Command("apt", "install", "-y", "apache2")
		case "mysql":
			cmd = exec.Command("apt", "install", "-y", "mysql-server")
		case "postgresql":
			cmd = exec.Command("apt", "install", "-y", "postgresql", "postgresql-contrib")
		case "redis":
			cmd = exec.Command("apt", "install", "-y", "redis-server")
		case "docker":
			cmd = exec.Command("bash", "-c", "curl -fsSL https://get.docker.com | sh")
		case "composer":
			cmd = exec.Command("bash", "-c", "curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer")
		case "certbot":
			cmd = exec.Command("apt", "install", "-y", "certbot", "python3-certbot-nginx")
		default:
			job.Status = "failed"
			job.Message = "Unknown software: " + id
			return
		}

		// Run command
		output, err := cmd.CombinedOutput()

		installJobsMu.Lock()
		defer installJobsMu.Unlock()

		if err != nil {
			job.Status = "failed"
			job.Message = fmt.Sprintf("Installation failed: %s", string(output))
		} else {
			job.Status = "success"
			job.Progress = 100
			job.Message = fmt.Sprintf("%s installed successfully", id)
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": fmt.Sprintf("Installing %s (version: %s)", id, version),
		"jobId":   jobID,
	})
}

// UninstallSoftware uninstalls a software package
func UninstallSoftware(c *gin.Context) {
	id := c.Param("id")

	var cmd *exec.Cmd
	switch id {
	case "php82":
		cmd = exec.Command("apt", "remove", "-y", "php8.2*")
	case "nodejs20":
		cmd = exec.Command("apt", "remove", "-y", "nodejs")
	case "nginx":
		cmd = exec.Command("apt", "remove", "-y", "nginx")
	case "apache":
		cmd = exec.Command("apt", "remove", "-y", "apache2")
	case "mysql":
		cmd = exec.Command("apt", "remove", "-y", "mysql-server")
	case "postgresql":
		cmd = exec.Command("apt", "remove", "-y", "postgresql")
	case "redis":
		cmd = exec.Command("apt", "remove", "-y", "redis-server")
	case "docker":
		cmd = exec.Command("apt", "remove", "-y", "docker-ce", "docker-ce-cli")
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown software"})
		return
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Uninstallation failed",
			"output": string(output),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%s uninstalled", id),
	})
}

// GetInstallStatus returns the status of an installation job
func GetInstallStatus(c *gin.Context) {
	jobID := c.Param("jobId")

	installJobsMu.RLock()
	job, exists := installJobs[jobID]
	installJobsMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// ServiceAction performs an action on a service (start/stop/restart)
func ServiceAction(c *gin.Context) {
	id := c.Param("id")
	action := c.Param("action")

	serviceName := getServiceName(id)
	if serviceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown service"})
		return
	}

	if action != "start" && action != "stop" && action != "restart" && action != "status" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
		return
	}

	cmd := exec.Command("systemctl", action, serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  fmt.Sprintf("Failed to %s %s", action, serviceName),
			"output": string(output),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%s %s successful", serviceName, action),
		"output":  string(output),
	})
}

// Helper functions
func checkInstalled(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func checkRunning(service string) bool {
	cmd := exec.Command("systemctl", "is-active", "--quiet", service)
	err := cmd.Run()
	return err == nil
}

func boolPtr(b bool) *bool {
	return &b
}

func getInstalledVersion(id string) string {
	var cmd *exec.Cmd
	switch id {
	case "php82":
		cmd = exec.Command("php", "-v")
	case "nodejs20":
		cmd = exec.Command("node", "-v")
	case "python311":
		cmd = exec.Command("python3", "--version")
	case "go122":
		cmd = exec.Command("go", "version")
	case "nginx":
		cmd = exec.Command("nginx", "-v")
	case "mysql":
		cmd = exec.Command("mysql", "--version")
	case "postgresql":
		cmd = exec.Command("psql", "--version")
	case "redis":
		cmd = exec.Command("redis-server", "--version")
	case "docker":
		cmd = exec.Command("docker", "--version")
	default:
		return ""
	}

	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	// Extract version from output
	line := strings.Split(string(output), "\n")[0]
	return extractVersion(line)
}

func extractVersion(line string) string {
	parts := strings.Fields(line)
	for _, p := range parts {
		if strings.Contains(p, ".") && len(p) < 20 {
			return strings.Trim(p, "v(),")
		}
	}
	return ""
}

func getServiceName(id string) string {
	switch id {
	case "php82":
		return "php8.2-fpm"
	case "nginx":
		return "nginx"
	case "apache":
		return "apache2"
	case "mysql":
		return "mysql"
	case "postgresql":
		return "postgresql"
	case "redis":
		return "redis-server"
	case "memcached":
		return "memcached"
	case "docker":
		return "docker"
	}
	return ""
}
