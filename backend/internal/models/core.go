package models

import "time"

// Website represents a website configuration
type Website struct {
	ID           string        `json:"id"`
	Domain       string        `json:"domain"`
	Aliases      []string      `json:"aliases"`
	Engine       WebEngine     `json:"engine"` // nginx, apache, openlitespeed
	ProjectType  string        `json:"projectType"` // php, node, static, proxy
	PHPVersion   string        `json:"phpVersion,omitempty"`
	SSL          SSLConfig     `json:"ssl"`
	DocumentRoot string        `json:"documentRoot"`
	Status       ServiceStatus `json:"status"`
	ProjectID    string        `json:"projectId,omitempty"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
}

// WebEngine defines web server engine
type WebEngine string

const (
	WebEngineNginx         WebEngine = "nginx"
	WebEngineApache        WebEngine = "apache"
	WebEngineOpenLiteSpeed WebEngine = "openlitespeed"
)

// SSLConfig represents SSL configuration
type SSLConfig struct {
	Enabled   bool      `json:"enabled"`
	Provider  string    `json:"provider"` // letsencrypt, custom, none
	ExpiresAt time.Time `json:"expiresAt,omitempty"`
	AutoRenew bool      `json:"autoRenew"`
}

// ServiceStatus defines service status
type ServiceStatus string

const (
	StatusRunning  ServiceStatus = "running"
	StatusStopped  ServiceStatus = "stopped"
	StatusUpdating ServiceStatus = "updating"
	StatusError    ServiceStatus = "error"
	StatusUnknown  ServiceStatus = "unknown"
)

// Database represents a database
type Database struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Engine    DatabaseEngine `json:"engine"`
	Size      int64          `json:"size"` // Bytes
	Tables    int            `json:"tables,omitempty"`
	Charset   string         `json:"charset,omitempty"`
	ProjectID string         `json:"projectId,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
}

// DatabaseEngine defines database engine type
type DatabaseEngine string

const (
	DatabaseMySQL      DatabaseEngine = "mysql"
	DatabasePostgreSQL DatabaseEngine = "postgresql"
	DatabaseMongoDB    DatabaseEngine = "mongodb"
	DatabaseRedis      DatabaseEngine = "redis"
)

// Cronjob represents a scheduled task
type Cronjob struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Schedule   string        `json:"schedule"` // Cron expression
	Command    string        `json:"command"`
	Type       CronjobType   `json:"type"` // command, script, url
	Enabled    bool          `json:"enabled"`
	LastRun    *time.Time    `json:"lastRun,omitempty"`
	LastStatus string        `json:"lastStatus,omitempty"` // success, failed
	NextRun    time.Time     `json:"nextRun"`
	ProjectID  string        `json:"projectId,omitempty"`
	CreatedAt  time.Time     `json:"createdAt"`
}

// CronjobType defines cronjob type
type CronjobType string

const (
	CronjobCommand CronjobType = "command"
	CronjobScript  CronjobType = "script"
	CronjobURL     CronjobType = "url"
)

// FirewallRule represents a firewall rule
type FirewallRule struct {
	ID          string `json:"id"`
	Port        int    `json:"port"`
	Protocol    string `json:"protocol"` // tcp, udp, both
	Source      string `json:"source"`   // IP or CIDR
	Action      string `json:"action"`   // allow, deny
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
}

// Activity represents an activity log entry
type Activity struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"` // deploy, backup, update, security, etc.
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"` // success, failed, pending
	ProjectID   string    `json:"projectId,omitempty"`
	UserID      string    `json:"userId,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Settings represents panel settings
type Settings struct {
	General       GeneralSettings       `json:"general"`
	Security      SecuritySettings      `json:"security"`
	Notifications NotificationSettings  `json:"notifications"`
	Backup        BackupSettings        `json:"backup"`
}

// GeneralSettings represents general settings
type GeneralSettings struct {
	PanelTitle string `json:"panelTitle"`
	ServerIP   string `json:"serverIP"`
	PanelPort  int    `json:"panelPort"`
	Timezone   string `json:"timezone"`
	Language   string `json:"language"`
	DarkMode   bool   `json:"darkMode"`
}

// SecuritySettings represents security settings
type SecuritySettings struct {
	EnableSSL          bool   `json:"enableSSL"`
	SessionTimeout     int    `json:"sessionTimeout"` // Minutes
	TwoFactorEnabled   bool   `json:"twoFactorEnabled"`
	AllowedIPs         string `json:"allowedIPs"`
	BruteForceEnabled  bool   `json:"bruteForceEnabled"`
}

// NotificationSettings represents notification settings
type NotificationSettings struct {
	EmailEnabled    bool   `json:"emailEnabled"`
	SMTPHost        string `json:"smtpHost"`
	SMTPPort        int    `json:"smtpPort"`
	SMTPUser        string `json:"smtpUser"`
	SlackWebhook    string `json:"slackWebhook"`
	DiscordWebhook  string `json:"discordWebhook"`
	NotifyDeploy    bool   `json:"notifyDeploy"`
	NotifySSL       bool   `json:"notifySSL"`
	NotifyBackup    bool   `json:"notifyBackup"`
	NotifyResource  bool   `json:"notifyResource"`
}

// BackupSettings represents backup settings
type BackupSettings struct {
	Enabled         bool   `json:"enabled"`
	Destination     string `json:"destination"` // local, s3, r2, webdav
	Path            string `json:"path"`
	Schedule        string `json:"schedule"` // hourly, daily, weekly
	RetentionDays   int    `json:"retentionDays"`
	Compress        bool   `json:"compress"`
	Encrypt         bool   `json:"encrypt"`
	BackupDatabases bool   `json:"backupDatabases"`
	BackupWebsites  bool   `json:"backupWebsites"`
	BackupDocker    bool   `json:"backupDocker"`
}
