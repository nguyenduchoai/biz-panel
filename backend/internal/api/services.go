package api

import (
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

// ServiceType defines the type of managed service
type ServiceType string

const (
	ServiceTypeRuntime   ServiceType = "runtime"
	ServiceTypeWebServer ServiceType = "webserver"
	ServiceTypeDatabase  ServiceType = "database"
	ServiceTypeCache     ServiceType = "cache"
	ServiceTypeTool      ServiceType = "tool"
	ServiceTypeQueue     ServiceType = "queue"
)

// ManagedService represents a service that can be installed and managed
type ManagedService struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Type        ServiceType       `json:"type"`
	Description string            `json:"description"`
	Icon        string            `json:"icon"`
	Versions    []string          `json:"versions"`
	Installed   bool              `json:"installed"`
	Running     bool              `json:"running"`
	Version     string            `json:"installedVersion,omitempty"`
	Port        int               `json:"port,omitempty"`
	ConfigPath  string            `json:"configPath,omitempty"`
	DataPath    string            `json:"dataPath,omitempty"`
	LogPath     string            `json:"logPath,omitempty"`
	SystemdUnit string            `json:"systemdUnit,omitempty"`
	Config      map[string]string `json:"config,omitempty"`
	Status      *ServiceStatus    `json:"status,omitempty"`
}

// ServiceStatus represents real-time service status
type ServiceStatus struct {
	State       string  `json:"state"`       // running, stopped, starting, error
	PID         int     `json:"pid,omitempty"`
	Uptime      int64   `json:"uptime,omitempty"` // seconds
	Memory      int64   `json:"memory,omitempty"` // bytes
	CPU         float64 `json:"cpu,omitempty"`    // percentage
	Connections int     `json:"connections,omitempty"`
	Message     string  `json:"message,omitempty"`
}

// ServiceConfig represents configurable options for a service
type ServiceConfig struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Type        string   `json:"type"` // string, number, boolean, select, file
	Default     string   `json:"default"`
	Current     string   `json:"current"`
	Options     []string `json:"options,omitempty"` // for select type
	Min         *int     `json:"min,omitempty"`     // for number type
	Max         *int     `json:"max,omitempty"`
	Unit        string   `json:"unit,omitempty"` // MB, seconds, etc.
	Restart     bool     `json:"restart"`        // requires restart to apply
}

// Service Registry - All managed services
var serviceRegistry = []ManagedService{
	// Runtimes
	{ID: "nodejs", Name: "Node.js", Type: ServiceTypeRuntime, Description: "JavaScript runtime built on V8", Icon: "🟢", Versions: []string{"22", "20", "18", "16"}, SystemdUnit: ""},
	{ID: "python", Name: "Python", Type: ServiceTypeRuntime, Description: "Python programming language", Icon: "🐍", Versions: []string{"3.12", "3.11", "3.10", "3.9"}, SystemdUnit: ""},
	{ID: "go", Name: "Go", Type: ServiceTypeRuntime, Description: "Go programming language", Icon: "🔵", Versions: []string{"1.22", "1.21", "1.20"}, SystemdUnit: ""},
	{ID: "ruby", Name: "Ruby", Type: ServiceTypeRuntime, Description: "Ruby programming language", Icon: "💎", Versions: []string{"3.3", "3.2", "3.1"}, SystemdUnit: ""},
	{ID: "java", Name: "Java (OpenJDK)", Type: ServiceTypeRuntime, Description: "Java Development Kit", Icon: "☕", Versions: []string{"21", "17", "11", "8"}, SystemdUnit: ""},
	{ID: "dotnet", Name: ".NET", Type: ServiceTypeRuntime, Description: ".NET runtime and SDK", Icon: "🔷", Versions: []string{"8.0", "7.0", "6.0"}, SystemdUnit: ""},

	// Web Servers
	{ID: "nginx", Name: "Nginx", Type: ServiceTypeWebServer, Description: "High-performance HTTP server", Icon: "🌐", Versions: []string{"1.25", "1.24"}, SystemdUnit: "nginx", Port: 80, ConfigPath: "/etc/nginx/nginx.conf"},
	{ID: "apache", Name: "Apache", Type: ServiceTypeWebServer, Description: "Apache HTTP Server", Icon: "🪶", Versions: []string{"2.4"}, SystemdUnit: "apache2", Port: 80, ConfigPath: "/etc/apache2/apache2.conf"},
	{ID: "caddy", Name: "Caddy", Type: ServiceTypeWebServer, Description: "Modern web server with automatic HTTPS", Icon: "🔒", Versions: []string{"2.7", "2.6"}, SystemdUnit: "caddy", Port: 80, ConfigPath: "/etc/caddy/Caddyfile"},
	{ID: "traefik", Name: "Traefik", Type: ServiceTypeWebServer, Description: "Cloud-native reverse proxy", Icon: "🚀", Versions: []string{"3.0", "2.10"}, SystemdUnit: "traefik", Port: 80, ConfigPath: "/etc/traefik/traefik.yml"},

	// Databases
	{ID: "mysql", Name: "MySQL", Type: ServiceTypeDatabase, Description: "Popular open-source relational database", Icon: "🐬", Versions: []string{"8.0", "5.7"}, SystemdUnit: "mysql", Port: 3306, ConfigPath: "/etc/mysql/mysql.conf.d/mysqld.cnf", DataPath: "/var/lib/mysql"},
	{ID: "mariadb", Name: "MariaDB", Type: ServiceTypeDatabase, Description: "MySQL fork with enhanced features", Icon: "🦭", Versions: []string{"11.2", "10.11", "10.6"}, SystemdUnit: "mariadb", Port: 3306, ConfigPath: "/etc/mysql/mariadb.conf.d/50-server.cnf", DataPath: "/var/lib/mysql"},
	{ID: "postgresql", Name: "PostgreSQL", Type: ServiceTypeDatabase, Description: "Advanced open-source database", Icon: "🐘", Versions: []string{"16", "15", "14", "13"}, SystemdUnit: "postgresql", Port: 5432, ConfigPath: "/etc/postgresql/{version}/main/postgresql.conf", DataPath: "/var/lib/postgresql"},
	{ID: "mongodb", Name: "MongoDB", Type: ServiceTypeDatabase, Description: "Document-oriented NoSQL database", Icon: "🍃", Versions: []string{"7.0", "6.0", "5.0"}, SystemdUnit: "mongod", Port: 27017, ConfigPath: "/etc/mongod.conf", DataPath: "/var/lib/mongodb"},
	{ID: "sqlite", Name: "SQLite", Type: ServiceTypeDatabase, Description: "Lightweight embedded database", Icon: "📦", Versions: []string{"3.45"}, SystemdUnit: ""},

	// Cache & Message Queue
	{ID: "redis", Name: "Redis", Type: ServiceTypeCache, Description: "In-memory data structure store", Icon: "🔴", Versions: []string{"7.2", "7.0", "6.2"}, SystemdUnit: "redis-server", Port: 6379, ConfigPath: "/etc/redis/redis.conf", DataPath: "/var/lib/redis"},
	{ID: "memcached", Name: "Memcached", Type: ServiceTypeCache, Description: "Distributed memory caching system", Icon: "🧊", Versions: []string{"1.6"}, SystemdUnit: "memcached", Port: 11211, ConfigPath: "/etc/memcached.conf"},
	{ID: "valkey", Name: "Valkey", Type: ServiceTypeCache, Description: "Redis-compatible fork by Linux Foundation", Icon: "🔑", Versions: []string{"7.2"}, SystemdUnit: "valkey", Port: 6379, ConfigPath: "/etc/valkey/valkey.conf"},

	// Queue
	{ID: "rabbitmq", Name: "RabbitMQ", Type: ServiceTypeQueue, Description: "Message broker", Icon: "🐰", Versions: []string{"3.12", "3.11"}, SystemdUnit: "rabbitmq-server", Port: 5672, ConfigPath: "/etc/rabbitmq/rabbitmq.conf"},

	// Tools
	{ID: "docker", Name: "Docker", Type: ServiceTypeTool, Description: "Container platform", Icon: "🐳", Versions: []string{"25", "24"}, SystemdUnit: "docker"},
	{ID: "composer", Name: "Composer", Type: ServiceTypeTool, Description: "PHP dependency manager", Icon: "🎼", Versions: []string{"2.6", "2.5"}, SystemdUnit: ""},
	{ID: "certbot", Name: "Certbot", Type: ServiceTypeTool, Description: "Let's Encrypt certificate automation", Icon: "🔐", Versions: []string{"2.8", "2.7"}, SystemdUnit: ""},
	{ID: "pm2", Name: "PM2", Type: ServiceTypeTool, Description: "Node.js process manager", Icon: "⚡", Versions: []string{"5.3"}, SystemdUnit: "pm2-root"},
	{ID: "supervisor", Name: "Supervisor", Type: ServiceTypeTool, Description: "Process control system", Icon: "👁️", Versions: []string{"4.2"}, SystemdUnit: "supervisor"},
}

// Mutex for concurrent access
var servicesMu sync.RWMutex

// ListServices returns all available services with their status
func ListServices(c *gin.Context) {
	serviceType := c.Query("type")

	servicesMu.RLock()
	defer servicesMu.RUnlock()

	services := make([]ManagedService, 0)

	for _, svc := range serviceRegistry {
		// Filter by type if specified
		if serviceType != "" && string(svc.Type) != serviceType {
			continue
		}

		// Check installation status
		svcCopy := svc
		svcCopy.Installed = isServiceInstalled(svc.ID)

		if svcCopy.Installed {
			svcCopy.Version = getServiceVersion(svc.ID)
			if svc.SystemdUnit != "" {
				svcCopy.Running = isServiceRunning(svc.SystemdUnit)
				svcCopy.Status = getServiceStatus(svc.SystemdUnit)
			}
		}

		services = append(services, svcCopy)
	}

	c.JSON(http.StatusOK, gin.H{
		"services": services,
		"count":    len(services),
	})
}

// GetService returns details of a specific service
func GetService(c *gin.Context) {
	id := c.Param("id")

	for _, svc := range serviceRegistry {
		if svc.ID == id {
			svcCopy := svc
			svcCopy.Installed = isServiceInstalled(id)

			if svcCopy.Installed {
				svcCopy.Version = getServiceVersion(id)
				svcCopy.Config = getServiceConfig(id)
				if svc.SystemdUnit != "" {
					svcCopy.Running = isServiceRunning(svc.SystemdUnit)
					svcCopy.Status = getServiceStatus(svc.SystemdUnit)
				}
			}

			c.JSON(http.StatusOK, svcCopy)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
}

// GetServiceConfigOptions returns available configuration options for a service
func GetServiceConfigOptions(c *gin.Context) {
	id := c.Param("id")

	configs := getConfigOptionsForService(id)
	c.JSON(http.StatusOK, configs)
}

// UpdateServiceConfig updates service configuration
func UpdateServiceConfig(c *gin.Context) {
	id := c.Param("id")

	var updates map[string]string
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration"})
		return
	}

	if err := applyServiceConfig(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration updated",
		"restart": true, // Most config changes require restart
	})
}

// InstallService installs a service
func InstallService(c *gin.Context) {
	id := c.Param("id")
	version := c.Query("version")

	// Find service
	var svc *ManagedService
	for _, s := range serviceRegistry {
		if s.ID == id {
			svc = &s
			break
		}
	}

	if svc == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
		return
	}

	// Install based on type
	if err := installServiceByID(id, version); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%s installed successfully", svc.Name),
		"service": id,
		"version": version,
	})
}

// UninstallService removes a service
func UninstallService(c *gin.Context) {
	id := c.Param("id")

	if err := uninstallServiceByID(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%s uninstalled", id),
	})
}

// ControlService starts/stops/restarts a service
func ControlService(c *gin.Context) {
	id := c.Param("id")
	action := c.Param("action")

	if action != "start" && action != "stop" && action != "restart" && action != "reload" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action. Use: start, stop, restart, reload"})
		return
	}

	// Find service
	var svc *ManagedService
	for _, s := range serviceRegistry {
		if s.ID == id {
			svc = &s
			break
		}
	}

	if svc == nil || svc.SystemdUnit == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Service does not have a manageable unit"})
		return
	}

	cmd := exec.Command("systemctl", action, svc.SystemdUnit)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  fmt.Sprintf("Failed to %s %s", action, svc.Name),
			"output": string(output),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%s %sed successfully", svc.Name, action),
		"service": id,
		"action":  action,
	})
}

// GetServiceLogs returns recent logs for a service
func GetServiceLogs(c *gin.Context) {
	id := c.Param("id")
	lines := c.DefaultQuery("lines", "100")

	// Find service
	var svc *ManagedService
	for _, s := range serviceRegistry {
		if s.ID == id {
			svc = &s
			break
		}
	}

	if svc == nil || svc.SystemdUnit == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Service not found"})
		return
	}

	cmd := exec.Command("journalctl", "-u", svc.SystemdUnit, "-n", lines, "--no-pager")
	output, _ := cmd.Output()

	c.JSON(http.StatusOK, gin.H{
		"service": id,
		"logs":    string(output),
	})
}

// Helper functions

func isServiceInstalled(id string) bool {
	switch id {
	case "nodejs":
		_, err := exec.LookPath("node")
		return err == nil
	case "python":
		_, err := exec.LookPath("python3")
		return err == nil
	case "go":
		_, err := exec.LookPath("go")
		return err == nil
	case "ruby":
		_, err := exec.LookPath("ruby")
		return err == nil
	case "java":
		_, err := exec.LookPath("java")
		return err == nil
	case "dotnet":
		_, err := exec.LookPath("dotnet")
		return err == nil
	case "nginx":
		_, err := exec.LookPath("nginx")
		return err == nil
	case "apache":
		_, err := exec.LookPath("apache2")
		return err == nil
	case "caddy":
		_, err := exec.LookPath("caddy")
		return err == nil
	case "mysql":
		_, err := exec.LookPath("mysql")
		return err == nil
	case "mariadb":
		_, err := exec.LookPath("mariadb")
		return err == nil
	case "postgresql":
		_, err := exec.LookPath("psql")
		return err == nil
	case "mongodb":
		_, err := exec.LookPath("mongod")
		return err == nil
	case "redis":
		_, err := exec.LookPath("redis-server")
		return err == nil
	case "memcached":
		_, err := exec.LookPath("memcached")
		return err == nil
	case "rabbitmq":
		_, err := exec.LookPath("rabbitmqctl")
		return err == nil
	case "docker":
		_, err := exec.LookPath("docker")
		return err == nil
	case "composer":
		_, err := exec.LookPath("composer")
		return err == nil
	case "certbot":
		_, err := exec.LookPath("certbot")
		return err == nil
	case "pm2":
		_, err := exec.LookPath("pm2")
		return err == nil
	case "supervisor":
		_, err := exec.LookPath("supervisorctl")
		return err == nil
	default:
		return false
	}
}

func getServiceVersion(id string) string {
	var cmd *exec.Cmd
	switch id {
	case "nodejs":
		cmd = exec.Command("node", "-v")
	case "python":
		cmd = exec.Command("python3", "--version")
	case "go":
		cmd = exec.Command("go", "version")
	case "ruby":
		cmd = exec.Command("ruby", "-v")
	case "java":
		cmd = exec.Command("java", "-version")
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

	output, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	return extractVersionString(string(output))
}

func extractVersionString(output string) string {
	lines := strings.Split(output, "\n")
	if len(lines) == 0 {
		return ""
	}
	// Clean up version string
	version := strings.TrimSpace(lines[0])
	version = strings.TrimPrefix(version, "v")
	return version
}

func isServiceRunning(unit string) bool {
	cmd := exec.Command("systemctl", "is-active", "--quiet", unit)
	return cmd.Run() == nil
}

func getServiceStatus(unit string) *ServiceStatus {
	status := &ServiceStatus{State: "unknown"}

	// Get state
	cmd := exec.Command("systemctl", "is-active", unit)
	output, _ := cmd.Output()
	status.State = strings.TrimSpace(string(output))

	// Get PID
	cmd = exec.Command("systemctl", "show", unit, "-p", "MainPID", "--value")
	output, _ = cmd.Output()
	fmt.Sscanf(strings.TrimSpace(string(output)), "%d", &status.PID)

	return status
}

func getServiceConfig(id string) map[string]string {
	config := make(map[string]string)

	// Service-specific config reading
	switch id {
	case "mysql":
		config["port"] = "3306"
		config["bind_address"] = "127.0.0.1"
	case "postgresql":
		config["port"] = "5432"
		config["max_connections"] = "100"
	case "redis":
		config["port"] = "6379"
		config["maxmemory"] = "256mb"
	case "nginx":
		config["worker_processes"] = "auto"
		config["worker_connections"] = "1024"
	}

	return config
}

func getConfigOptionsForService(id string) []ServiceConfig {
	switch id {
	case "nodejs":
		return []ServiceConfig{
			{Key: "NODE_ENV", Label: "Environment", Type: "select", Default: "production", Options: []string{"development", "production", "test"}},
			{Key: "NODE_OPTIONS", Label: "Node Options", Type: "string", Default: "", Description: "Additional Node.js CLI options"},
		}
	case "mysql":
		max := 1000
		return []ServiceConfig{
			{Key: "port", Label: "Port", Type: "number", Default: "3306", Unit: "", Restart: true},
			{Key: "bind_address", Label: "Bind Address", Type: "string", Default: "127.0.0.1", Restart: true},
			{Key: "max_connections", Label: "Max Connections", Type: "number", Default: "151", Max: &max, Restart: true},
			{Key: "innodb_buffer_pool_size", Label: "InnoDB Buffer Pool", Type: "string", Default: "128M", Unit: "bytes", Restart: true},
			{Key: "slow_query_log", Label: "Slow Query Log", Type: "boolean", Default: "0", Restart: false},
		}
	case "postgresql":
		return []ServiceConfig{
			{Key: "port", Label: "Port", Type: "number", Default: "5432", Restart: true},
			{Key: "max_connections", Label: "Max Connections", Type: "number", Default: "100", Restart: true},
			{Key: "shared_buffers", Label: "Shared Buffers", Type: "string", Default: "128MB", Restart: true},
			{Key: "work_mem", Label: "Work Memory", Type: "string", Default: "4MB", Restart: false},
			{Key: "log_statement", Label: "Log Statement", Type: "select", Default: "none", Options: []string{"none", "ddl", "mod", "all"}, Restart: false},
		}
	case "redis":
		return []ServiceConfig{
			{Key: "port", Label: "Port", Type: "number", Default: "6379", Restart: true},
			{Key: "bind", Label: "Bind Address", Type: "string", Default: "127.0.0.1", Restart: true},
			{Key: "maxmemory", Label: "Max Memory", Type: "string", Default: "0", Unit: "bytes", Description: "0 = no limit", Restart: false},
			{Key: "maxmemory-policy", Label: "Eviction Policy", Type: "select", Default: "noeviction", Options: []string{"noeviction", "allkeys-lru", "volatile-lru", "allkeys-random"}, Restart: false},
			{Key: "appendonly", Label: "AOF Persistence", Type: "boolean", Default: "no", Restart: true},
		}
	case "nginx":
		return []ServiceConfig{
			{Key: "worker_processes", Label: "Worker Processes", Type: "string", Default: "auto", Restart: true},
			{Key: "worker_connections", Label: "Worker Connections", Type: "number", Default: "1024", Restart: true},
			{Key: "keepalive_timeout", Label: "Keepalive Timeout", Type: "number", Default: "65", Unit: "seconds", Restart: false},
			{Key: "client_max_body_size", Label: "Max Body Size", Type: "string", Default: "1m", Unit: "bytes", Restart: false},
			{Key: "gzip", Label: "Enable Gzip", Type: "boolean", Default: "on", Restart: false},
		}
	default:
		return []ServiceConfig{}
	}
}

func applyServiceConfig(id string, updates map[string]string) error {
	// Find config path
	var configPath string
	for _, svc := range serviceRegistry {
		if svc.ID == id {
			configPath = svc.ConfigPath
			break
		}
	}

	if configPath == "" {
		return fmt.Errorf("no config path for service %s", id)
	}

	// Create backup
	backupPath := configPath + ".bak"
	exec.Command("cp", configPath, backupPath).Run()

	// Service-specific config update logic
	// This would be expanded based on config file format (ini, yaml, conf, etc.)

	return nil
}

func installServiceByID(id, version string) error {
	var cmd *exec.Cmd

	switch id {
	case "nodejs":
		// Use NodeSource
		v := "20"
		if version != "" {
			v = version
		}
		script := fmt.Sprintf("curl -fsSL https://deb.nodesource.com/setup_%s.x | bash - && apt install -y nodejs", v)
		cmd = exec.Command("bash", "-c", script)
	case "python":
		cmd = exec.Command("apt", "install", "-y", "python3", "python3-pip", "python3-venv")
	case "go":
		// Install latest Go
		cmd = exec.Command("bash", "-c", "wget -q https://go.dev/dl/go1.22.0.linux-amd64.tar.gz && rm -rf /usr/local/go && tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz")
	case "nginx":
		cmd = exec.Command("apt", "install", "-y", "nginx")
	case "apache":
		cmd = exec.Command("apt", "install", "-y", "apache2")
	case "mysql":
		cmd = exec.Command("apt", "install", "-y", "mysql-server")
	case "mariadb":
		cmd = exec.Command("apt", "install", "-y", "mariadb-server")
	case "postgresql":
		cmd = exec.Command("apt", "install", "-y", "postgresql", "postgresql-contrib")
	case "mongodb":
		cmd = exec.Command("bash", "-c", `
			curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
			echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
			apt update && apt install -y mongodb-org
		`)
	case "redis":
		cmd = exec.Command("apt", "install", "-y", "redis-server")
	case "memcached":
		cmd = exec.Command("apt", "install", "-y", "memcached")
	case "rabbitmq":
		cmd = exec.Command("apt", "install", "-y", "rabbitmq-server")
	case "docker":
		cmd = exec.Command("bash", "-c", "curl -fsSL https://get.docker.com | sh")
	case "composer":
		cmd = exec.Command("bash", "-c", "curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer")
	case "certbot":
		cmd = exec.Command("apt", "install", "-y", "certbot", "python3-certbot-nginx")
	case "pm2":
		cmd = exec.Command("npm", "install", "-g", "pm2")
	case "supervisor":
		cmd = exec.Command("apt", "install", "-y", "supervisor")
	default:
		return fmt.Errorf("unknown service: %s", id)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("installation failed: %s", string(output))
	}

	return nil
}

func uninstallServiceByID(id string) error {
	var cmd *exec.Cmd

	switch id {
	case "nodejs":
		cmd = exec.Command("apt", "remove", "-y", "nodejs")
	case "nginx":
		cmd = exec.Command("apt", "remove", "-y", "nginx")
	case "apache":
		cmd = exec.Command("apt", "remove", "-y", "apache2")
	case "mysql":
		cmd = exec.Command("apt", "remove", "-y", "mysql-server")
	case "mariadb":
		cmd = exec.Command("apt", "remove", "-y", "mariadb-server")
	case "postgresql":
		cmd = exec.Command("apt", "remove", "-y", "postgresql")
	case "mongodb":
		cmd = exec.Command("apt", "remove", "-y", "mongodb-org")
	case "redis":
		cmd = exec.Command("apt", "remove", "-y", "redis-server")
	case "docker":
		cmd = exec.Command("apt", "remove", "-y", "docker-ce", "docker-ce-cli")
	default:
		return fmt.Errorf("unknown service: %s", id)
	}

	_, err := cmd.CombinedOutput()
	return err
}
