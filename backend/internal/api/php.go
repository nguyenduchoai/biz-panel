package api

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
)

// PHPVersion represents a PHP version
type PHPVersion struct {
	Version           string   `json:"version"`           // e.g., "8.2"
	FullVersion       string   `json:"fullVersion"`       // e.g., "8.2.15"
	Installed         bool     `json:"installed"`
	Running           bool     `json:"running"`
	Default           bool     `json:"default"`
	FPMSocket         string   `json:"fpmSocket,omitempty"`
	ConfigPath        string   `json:"configPath,omitempty"`
	ExtensionsEnabled []string `json:"extensionsEnabled,omitempty"`
}

// PHPExtension represents a PHP extension
type PHPExtension struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Installed   bool   `json:"installed"`
	Enabled     bool   `json:"enabled"`
	Version     string `json:"version,omitempty"`
}

// PHPConfig represents PHP configuration
type PHPConfig struct {
	MemoryLimit        string `json:"memory_limit"`
	MaxExecutionTime   string `json:"max_execution_time"`
	MaxInputTime       string `json:"max_input_time"`
	PostMaxSize        string `json:"post_max_size"`
	UploadMaxFilesize  string `json:"upload_max_filesize"`
	MaxFileUploads     string `json:"max_file_uploads"`
	DisplayErrors      string `json:"display_errors"`
	ErrorReporting     string `json:"error_reporting"`
	DateTimezone       string `json:"date.timezone"`
	OpCacheEnable      string `json:"opcache.enable"`
	OpCacheMemory      string `json:"opcache.memory_consumption"`
}

// Common PHP extensions
var phpExtensions = []PHPExtension{
	{Name: "curl", Description: "Client URL Library"},
	{Name: "gd", Description: "Image Processing"},
	{Name: "mbstring", Description: "Multibyte String"},
	{Name: "mysql", Description: "MySQL (deprecated)"},
	{Name: "mysqli", Description: "MySQL Improved"},
	{Name: "pdo", Description: "PHP Data Objects"},
	{Name: "pdo_mysql", Description: "PDO MySQL Driver"},
	{Name: "pdo_pgsql", Description: "PDO PostgreSQL Driver"},
	{Name: "pgsql", Description: "PostgreSQL"},
	{Name: "zip", Description: "ZIP Archive"},
	{Name: "xml", Description: "XML Support"},
	{Name: "json", Description: "JSON Support"},
	{Name: "intl", Description: "Internationalization"},
	{Name: "bcmath", Description: "BC Math"},
	{Name: "soap", Description: "SOAP Protocol"},
	{Name: "opcache", Description: "Opcode Cache"},
	{Name: "redis", Description: "Redis Client"},
	{Name: "memcached", Description: "Memcached Client"},
	{Name: "imagick", Description: "ImageMagick"},
	{Name: "xdebug", Description: "Debugging"},
	{Name: "apcu", Description: "APCu User Cache"},
	{Name: "iconv", Description: "Character Encoding"},
	{Name: "exif", Description: "EXIF Metadata"},
	{Name: "fileinfo", Description: "File Information"},
	{Name: "tokenizer", Description: "Tokenizer"},
	{Name: "ctype", Description: "Character Type"},
	{Name: "openssl", Description: "OpenSSL"},
	{Name: "sodium", Description: "Sodium Encryption"},
}

// PHP versions to support
var supportedPHPVersions = []string{"5.6", "7.4", "8.0", "8.1", "8.2", "8.3"}

// ListPHPVersions returns all PHP versions
func ListPHPVersions(c *gin.Context) {
	versions := make([]PHPVersion, 0)

	for _, v := range supportedPHPVersions {
		phpV := PHPVersion{
			Version:   v,
			Installed: isPHPVersionInstalled(v),
		}

		if phpV.Installed {
			phpV.FullVersion = getPHPFullVersion(v)
			phpV.Running = isPHPFPMRunning(v)
			phpV.FPMSocket = fmt.Sprintf("/run/php/php%s-fpm.sock", v)
			phpV.ConfigPath = fmt.Sprintf("/etc/php/%s/fpm/php.ini", v)
			phpV.Default = isDefaultPHP(v)
			phpV.ExtensionsEnabled = getEnabledExtensions(v)
		}

		versions = append(versions, phpV)
	}

	c.JSON(http.StatusOK, versions)
}

// InstallPHPVersion installs a specific PHP version
func InstallPHPVersion(c *gin.Context) {
	version := c.Param("version")

	// Validate version
	valid := false
	for _, v := range supportedPHPVersions {
		if v == version {
			valid = true
			break
		}
	}
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PHP version"})
		return
	}

	// Install PHP + common extensions
	packages := []string{
		fmt.Sprintf("php%s", version),
		fmt.Sprintf("php%s-fpm", version),
		fmt.Sprintf("php%s-cli", version),
		fmt.Sprintf("php%s-common", version),
		fmt.Sprintf("php%s-mysql", version),
		fmt.Sprintf("php%s-pgsql", version),
		fmt.Sprintf("php%s-curl", version),
		fmt.Sprintf("php%s-gd", version),
		fmt.Sprintf("php%s-mbstring", version),
		fmt.Sprintf("php%s-xml", version),
		fmt.Sprintf("php%s-zip", version),
		fmt.Sprintf("php%s-bcmath", version),
		fmt.Sprintf("php%s-intl", version),
		fmt.Sprintf("php%s-soap", version),
	}

	// First add ondrej/php PPA if not exists
	exec.Command("add-apt-repository", "-y", "ppa:ondrej/php").Run()
	exec.Command("apt", "update").Run()

	// Install packages
	args := append([]string{"install", "-y"}, packages...)
	cmd := exec.Command("apt", args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Installation failed",
			"output": string(output),
		})
		return
	}

	// Start PHP-FPM
	exec.Command("systemctl", "start", fmt.Sprintf("php%s-fpm", version)).Run()
	exec.Command("systemctl", "enable", fmt.Sprintf("php%s-fpm", version)).Run()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("PHP %s installed successfully", version),
		"version": version,
	})
}

// UninstallPHPVersion removes a PHP version
func UninstallPHPVersion(c *gin.Context) {
	version := c.Param("version")

	// Stop FPM first
	exec.Command("systemctl", "stop", fmt.Sprintf("php%s-fpm", version)).Run()

	// Remove all packages for this version
	cmd := exec.Command("apt", "remove", "-y", fmt.Sprintf("php%s*", version))
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Uninstallation failed",
			"output": string(output),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("PHP %s removed", version),
	})
}

// GetPHPExtensions returns extensions for a PHP version
func GetPHPExtensions(c *gin.Context) {
	version := c.Param("version")

	extensions := make([]PHPExtension, 0)
	enabledExts := getEnabledExtensions(version)
	enabledMap := make(map[string]bool)
	for _, e := range enabledExts {
		enabledMap[e] = true
	}

	for _, ext := range phpExtensions {
		extCopy := ext
		extCopy.Installed = isExtensionInstalled(version, ext.Name)
		extCopy.Enabled = enabledMap[ext.Name]
		extensions = append(extensions, extCopy)
	}

	c.JSON(http.StatusOK, extensions)
}

// InstallPHPExtension installs a PHP extension
func InstallPHPExtension(c *gin.Context) {
	version := c.Param("version")
	extName := c.Param("extension")

	packageName := fmt.Sprintf("php%s-%s", version, extName)
	cmd := exec.Command("apt", "install", "-y", packageName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Installation failed",
			"output": string(output),
		})
		return
	}

	// Restart PHP-FPM
	exec.Command("systemctl", "restart", fmt.Sprintf("php%s-fpm", version)).Run()

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("Extension %s installed for PHP %s", extName, version),
		"extension": extName,
	})
}

// TogglePHPExtension enables/disables a PHP extension
func TogglePHPExtension(c *gin.Context) {
	version := c.Param("version")
	extName := c.Param("extension")

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var cmd *exec.Cmd
	if req.Enabled {
		cmd = exec.Command("phpenmod", "-v", version, extName)
	} else {
		cmd = exec.Command("phpdismod", "-v", version, extName)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Toggle failed",
			"output": string(output),
		})
		return
	}

	// Restart PHP-FPM
	exec.Command("systemctl", "restart", fmt.Sprintf("php%s-fpm", version)).Run()

	action := "enabled"
	if !req.Enabled {
		action = "disabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("Extension %s %s for PHP %s", extName, action, version),
		"extension": extName,
		"enabled":   req.Enabled,
	})
}

// GetPHPConfig returns php.ini configuration
func GetPHPConfig(c *gin.Context) {
	version := c.Param("version")
	configPath := fmt.Sprintf("/etc/php/%s/fpm/php.ini", version)

	config := PHPConfig{
		MemoryLimit:        getINIValue(configPath, "memory_limit", "128M"),
		MaxExecutionTime:   getINIValue(configPath, "max_execution_time", "30"),
		MaxInputTime:       getINIValue(configPath, "max_input_time", "60"),
		PostMaxSize:        getINIValue(configPath, "post_max_size", "8M"),
		UploadMaxFilesize:  getINIValue(configPath, "upload_max_filesize", "2M"),
		MaxFileUploads:     getINIValue(configPath, "max_file_uploads", "20"),
		DisplayErrors:      getINIValue(configPath, "display_errors", "Off"),
		ErrorReporting:     getINIValue(configPath, "error_reporting", "E_ALL & ~E_DEPRECATED & ~E_STRICT"),
		DateTimezone:       getINIValue(configPath, "date.timezone", "UTC"),
		OpCacheEnable:      getINIValue(configPath, "opcache.enable", "1"),
		OpCacheMemory:      getINIValue(configPath, "opcache.memory_consumption", "128"),
	}

	c.JSON(http.StatusOK, config)
}

// UpdatePHPConfig updates php.ini configuration
func UpdatePHPConfig(c *gin.Context) {
	version := c.Param("version")
	configPath := fmt.Sprintf("/etc/php/%s/fpm/php.ini", version)

	var config PHPConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config"})
		return
	}

	// Update values
	updates := map[string]string{
		"memory_limit":              config.MemoryLimit,
		"max_execution_time":        config.MaxExecutionTime,
		"max_input_time":            config.MaxInputTime,
		"post_max_size":             config.PostMaxSize,
		"upload_max_filesize":       config.UploadMaxFilesize,
		"max_file_uploads":          config.MaxFileUploads,
		"display_errors":            config.DisplayErrors,
		"error_reporting":           config.ErrorReporting,
		"date.timezone":             config.DateTimezone,
		"opcache.enable":            config.OpCacheEnable,
		"opcache.memory_consumption": config.OpCacheMemory,
	}

	for key, value := range updates {
		if value != "" {
			setINIValue(configPath, key, value)
		}
	}

	// Restart PHP-FPM
	exec.Command("systemctl", "restart", fmt.Sprintf("php%s-fpm", version)).Run()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("PHP %s configuration updated", version),
	})
}

// SetDefaultPHP sets the default PHP version
func SetDefaultPHP(c *gin.Context) {
	version := c.Param("version")

	// Update alternatives
	cmd := exec.Command("update-alternatives", "--set", "php", fmt.Sprintf("/usr/bin/php%s", version))
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to set default",
			"output": string(output),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("PHP %s set as default", version),
		"version": version,
	})
}

// ControlPHPFPM starts/stops/restarts PHP-FPM
func ControlPHPFPM(c *gin.Context) {
	version := c.Param("version")
	action := c.Param("action")

	if action != "start" && action != "stop" && action != "restart" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
		return
	}

	serviceName := fmt.Sprintf("php%s-fpm", version)
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
		"message": fmt.Sprintf("PHP %s FPM %sed", version, action),
		"version": version,
		"action":  action,
	})
}

// Helper functions
func isPHPVersionInstalled(version string) bool {
	_, err := os.Stat(fmt.Sprintf("/usr/bin/php%s", version))
	return err == nil
}

func getPHPFullVersion(version string) string {
	cmd := exec.Command(fmt.Sprintf("php%s", version), "-v")
	output, err := cmd.Output()
	if err != nil {
		return version
	}
	lines := strings.Split(string(output), "\n")
	if len(lines) > 0 {
		parts := strings.Fields(lines[0])
		if len(parts) >= 2 {
			return strings.Trim(parts[1], "()")
		}
	}
	return version
}

func isPHPFPMRunning(version string) bool {
	cmd := exec.Command("systemctl", "is-active", "--quiet", fmt.Sprintf("php%s-fpm", version))
	return cmd.Run() == nil
}

func isDefaultPHP(version string) bool {
	cmd := exec.Command("php", "-v")
	output, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(output), version)
}

func getEnabledExtensions(version string) []string {
	cmd := exec.Command(fmt.Sprintf("php%s", version), "-m")
	output, err := cmd.Output()
	if err != nil {
		return []string{}
	}

	extensions := make([]string, 0)
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "[") {
			extensions = append(extensions, strings.ToLower(line))
		}
	}
	return extensions
}

func isExtensionInstalled(version, ext string) bool {
	_, err := os.Stat(fmt.Sprintf("/etc/php/%s/mods-available/%s.ini", version, ext))
	return err == nil
}

func getINIValue(path, key, defaultValue string) string {
	file, err := os.Open(path)
	if err != nil {
		return defaultValue
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, key+" ") || strings.HasPrefix(line, key+"=") {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return defaultValue
}

func setINIValue(path, key, value string) error {
	input, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	lines := strings.Split(string(input), "\n")
	found := false
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, key+" ") || strings.HasPrefix(trimmed, key+"=") {
			lines[i] = fmt.Sprintf("%s = %s", key, value)
			found = true
		}
	}

	if !found {
		lines = append(lines, fmt.Sprintf("%s = %s", key, value))
	}

	output := strings.Join(lines, "\n")
	return os.WriteFile(path, []byte(output), 0644)
}
