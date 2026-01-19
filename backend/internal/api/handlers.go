package api

import (
	"net/http"
	"sync"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// In-memory storage (replace with database in production)
var (
	websiteStore   = make(map[string]*models.Website)
	websiteMu      sync.RWMutex
	databaseStore  = make(map[string]*models.Database)
	databaseMu     sync.RWMutex
	cronjobStore   = make(map[string]*models.Cronjob)
	cronjobMu      sync.RWMutex
	firewallStore  = make(map[string]*models.FirewallRule)
	firewallMu     sync.RWMutex
	activityStore  = make([]*models.Activity, 0)
	activityMu     sync.RWMutex
	settingsStore  = &models.Settings{
		General: models.GeneralSettings{
			PanelTitle: "Biz-Panel",
			PanelPort:  5173,
			Timezone:   "UTC",
			Language:   "en",
			DarkMode:   true,
		},
		Security: models.SecuritySettings{
			EnableSSL:         true,
			SessionTimeout:    30,
			BruteForceEnabled: true,
		},
		Notifications: models.NotificationSettings{
			NotifyDeploy: true,
			NotifySSL:    true,
		},
		Backup: models.BackupSettings{
			Enabled:         true,
			Schedule:        "daily",
			RetentionDays:   30,
			BackupDatabases: true,
			BackupWebsites:  true,
		},
	}
	settingsMu sync.RWMutex
)

// Initialize mock data
func init() {
	// Add mock websites
	websiteStore["1"] = &models.Website{
		ID:           "1",
		Domain:       "example.com",
		Aliases:      []string{"www.example.com"},
		Engine:       models.WebEngineNginx,
		ProjectType:  "php",
		PHPVersion:   "8.2",
		SSL:          models.SSLConfig{Enabled: true, Provider: "letsencrypt", AutoRenew: true},
		DocumentRoot: "/var/www/example.com",
		Status:       models.StatusRunning,
		CreatedAt:    time.Now().Add(-7 * 24 * time.Hour),
		UpdatedAt:    time.Now(),
	}

	// Add mock databases
	databaseStore["1"] = &models.Database{
		ID:        "1",
		Name:      "app_production",
		Engine:    models.DatabasePostgreSQL,
		Size:      1024 * 1024 * 500, // 500MB
		Tables:    45,
		Charset:   "UTF8",
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
	}

	// Add mock cronjobs
	cronjobStore["1"] = &models.Cronjob{
		ID:       "1",
		Name:     "Database Backup",
		Schedule: "0 2 * * *",
		Command:  "/scripts/backup-db.sh",
		Type:     models.CronjobScript,
		Enabled:  true,
		NextRun:  time.Now().Add(8 * time.Hour),
		CreatedAt: time.Now().Add(-14 * 24 * time.Hour),
	}

	// Add mock firewall rules
	firewallStore["1"] = &models.FirewallRule{
		ID:          "1",
		Port:        22,
		Protocol:    "tcp",
		Source:      "0.0.0.0/0",
		Action:      "allow",
		Description: "SSH Access",
		Enabled:     true,
	}
	firewallStore["2"] = &models.FirewallRule{
		ID:          "2",
		Port:        80,
		Protocol:    "tcp",
		Source:      "0.0.0.0/0",
		Action:      "allow",
		Description: "HTTP",
		Enabled:     true,
	}
	firewallStore["3"] = &models.FirewallRule{
		ID:          "3",
		Port:        443,
		Protocol:    "tcp",
		Source:      "0.0.0.0/0",
		Action:      "allow",
		Description: "HTTPS",
		Enabled:     true,
	}
}

// ========== WEBSITES ==========

// ListWebsites returns all websites
func ListWebsites(c *gin.Context) {
	websiteMu.RLock()
	defer websiteMu.RUnlock()

	websites := make([]*models.Website, 0, len(websiteStore))
	for _, w := range websiteStore {
		websites = append(websites, w)
	}

	c.JSON(http.StatusOK, websites)
}

// CreateWebsite creates a new website
func CreateWebsite(c *gin.Context) {
	var website models.Website
	if err := c.ShouldBindJSON(&website); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	website.ID = uuid.New().String()[:8]
	website.Status = models.StatusStopped
	website.CreatedAt = time.Now()
	website.UpdatedAt = time.Now()

	websiteMu.Lock()
	websiteStore[website.ID] = &website
	websiteMu.Unlock()

	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "create",
		Title:       "Website Created",
		Description: "Website '" + website.Domain + "' was created",
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusCreated, website)
}

// DeleteWebsite deletes a website
func DeleteWebsite(c *gin.Context) {
	id := c.Param("id")

	websiteMu.Lock()
	website, exists := websiteStore[id]
	if exists {
		delete(websiteStore, id)
	}
	websiteMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Website not found"})
		return
	}

	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "delete",
		Title:       "Website Deleted",
		Description: "Website '" + website.Domain + "' was deleted",
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Website deleted"})
}

// ========== DATABASES ==========

// ListDatabases returns all databases
func ListDatabases(c *gin.Context) {
	databaseMu.RLock()
	defer databaseMu.RUnlock()

	databases := make([]*models.Database, 0, len(databaseStore))
	for _, d := range databaseStore {
		databases = append(databases, d)
	}

	c.JSON(http.StatusOK, databases)
}

// CreateDatabase creates a new database
func CreateDatabase(c *gin.Context) {
	var db models.Database
	if err := c.ShouldBindJSON(&db); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.ID = uuid.New().String()[:8]
	db.CreatedAt = time.Now()

	databaseMu.Lock()
	databaseStore[db.ID] = &db
	databaseMu.Unlock()

	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "create",
		Title:       "Database Created",
		Description: "Database '" + db.Name + "' was created",
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusCreated, db)
}

// DeleteDatabase deletes a database
func DeleteDatabase(c *gin.Context) {
	id := c.Param("id")

	databaseMu.Lock()
	db, exists := databaseStore[id]
	if exists {
		delete(databaseStore, id)
	}
	databaseMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Database not found"})
		return
	}

	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "delete",
		Title:       "Database Deleted",
		Description: "Database '" + db.Name + "' was deleted",
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Database deleted"})
}

// ========== CRONJOBS ==========

// ListCronjobs returns all cronjobs
func ListCronjobs(c *gin.Context) {
	cronjobMu.RLock()
	defer cronjobMu.RUnlock()

	cronjobs := make([]*models.Cronjob, 0, len(cronjobStore))
	for _, cj := range cronjobStore {
		cronjobs = append(cronjobs, cj)
	}

	c.JSON(http.StatusOK, cronjobs)
}

// CreateCronjob creates a new cronjob
func CreateCronjob(c *gin.Context) {
	var cj models.Cronjob
	if err := c.ShouldBindJSON(&cj); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cj.ID = uuid.New().String()[:8]
	cj.Enabled = true
	cj.NextRun = time.Now().Add(time.Hour)
	cj.CreatedAt = time.Now()

	cronjobMu.Lock()
	cronjobStore[cj.ID] = &cj
	cronjobMu.Unlock()

	c.JSON(http.StatusCreated, cj)
}

// UpdateCronjob updates a cronjob
func UpdateCronjob(c *gin.Context) {
	id := c.Param("id")

	cronjobMu.Lock()
	cj, exists := cronjobStore[id]
	if !exists {
		cronjobMu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "Cronjob not found"})
		return
	}

	var updates models.Cronjob
	if err := c.ShouldBindJSON(&updates); err != nil {
		cronjobMu.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if updates.Name != "" {
		cj.Name = updates.Name
	}
	if updates.Schedule != "" {
		cj.Schedule = updates.Schedule
	}
	if updates.Command != "" {
		cj.Command = updates.Command
	}
	cj.Enabled = updates.Enabled
	cronjobMu.Unlock()

	c.JSON(http.StatusOK, cj)
}

// DeleteCronjob deletes a cronjob
func DeleteCronjob(c *gin.Context) {
	id := c.Param("id")

	cronjobMu.Lock()
	_, exists := cronjobStore[id]
	if exists {
		delete(cronjobStore, id)
	}
	cronjobMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cronjob not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cronjob deleted"})
}

// RunCronjob manually runs a cronjob
func RunCronjob(c *gin.Context) {
	id := c.Param("id")

	cronjobMu.Lock()
	cj, exists := cronjobStore[id]
	if exists {
		now := time.Now()
		cj.LastRun = &now
		cj.LastStatus = "success"
	}
	cronjobMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cronjob not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cronjob executed", "status": "success"})
}

// ========== FIREWALL ==========

// ListFirewallRules returns all firewall rules
func ListFirewallRules(c *gin.Context) {
	firewallMu.RLock()
	defer firewallMu.RUnlock()

	rules := make([]*models.FirewallRule, 0, len(firewallStore))
	for _, r := range firewallStore {
		rules = append(rules, r)
	}

	c.JSON(http.StatusOK, rules)
}

// CreateFirewallRule creates a new firewall rule
func CreateFirewallRule(c *gin.Context) {
	var rule models.FirewallRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule.ID = uuid.New().String()[:8]
	rule.Enabled = true

	firewallMu.Lock()
	firewallStore[rule.ID] = &rule
	firewallMu.Unlock()

	c.JSON(http.StatusCreated, rule)
}

// DeleteFirewallRule deletes a firewall rule
func DeleteFirewallRule(c *gin.Context) {
	id := c.Param("id")

	firewallMu.Lock()
	_, exists := firewallStore[id]
	if exists {
		delete(firewallStore, id)
	}
	firewallMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Firewall rule not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Firewall rule deleted"})
}

// ========== SETTINGS ==========

// GetSettings returns current settings
func GetSettings(c *gin.Context) {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	c.JSON(http.StatusOK, settingsStore)
}

// UpdateSettings updates settings
func UpdateSettings(c *gin.Context) {
	var settings models.Settings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settingsMu.Lock()
	settingsStore = &settings
	settingsMu.Unlock()

	c.JSON(http.StatusOK, settings)
}

// ========== ACTIVITIES ==========

// ListActivities returns recent activities
func ListActivities(c *gin.Context) {
	activityMu.RLock()
	defer activityMu.RUnlock()

	// Return last 50 activities
	start := 0
	if len(activityStore) > 50 {
		start = len(activityStore) - 50
	}

	c.JSON(http.StatusOK, activityStore[start:])
}

// addActivity adds an activity to the log
func addActivity(activity *models.Activity) {
	activityMu.Lock()
	defer activityMu.Unlock()

	activityStore = append(activityStore, activity)

	// Keep only last 100 activities
	if len(activityStore) > 100 {
		activityStore = activityStore[len(activityStore)-100:]
	}
}
