package api

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateWebsiteRequest - Request body for creating website
type CreateWebsiteRequest struct {
	Domain       string `json:"domain" binding:"required"`
	Port         int    `json:"port"`
	PHPVersion   string `json:"phpVersion"`
	DocumentRoot string `json:"documentRoot"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	SSLEnabled   bool   `json:"sslEnabled"`
	// FTP options
	CreateFTP     bool   `json:"createFTP"`
	FTPUsername   string `json:"ftpUsername"`
	FTPPassword   string `json:"ftpPassword"`
	// Database options
	CreateDatabase bool   `json:"createDatabase"`
	DatabaseType   string `json:"databaseType"` // mysql, postgresql
	DatabaseName   string `json:"databaseName"`
	DatabaseUser   string `json:"databaseUser"`
	DatabasePass   string `json:"databasePass"`
}

// CreateWebsiteReal creates a real website with nginx config, folders, etc.
func CreateWebsiteReal(c *gin.Context) {
	var req CreateWebsiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.Port == 0 {
		req.Port = 80
	}
	if req.PHPVersion == "" {
		req.PHPVersion = "8.2"
	}
	if req.DocumentRoot == "" {
		req.DocumentRoot = fmt.Sprintf("/www/wwwroot/%s", req.Domain)
	}

	websiteID := uuid.New().String()[:8]
	errors := []string{}
	createdItems := []string{}

	// 1. Create document root directory
	if err := os.MkdirAll(req.DocumentRoot, 0755); err != nil {
		errors = append(errors, fmt.Sprintf("Failed to create document root: %v", err))
	} else {
		createdItems = append(createdItems, "Document root created")
		
		// Create default index.html
		indexHTML := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <title>Welcome to %s</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); }
        .container { text-align: center; color: white; padding: 40px; 
                     background: rgba(255,255,255,0.1); border-radius: 20px; backdrop-filter: blur(10px); }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        p { opacity: 0.8; }
        .badge { background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 %s</h1>
        <p>Your website has been created successfully!</p>
        <p>Managed by <strong>Biz-Panel</strong></p>
        <div class="badge">PHP %s</div>
    </div>
</body>
</html>`, req.Domain, req.Domain, req.PHPVersion)
		
		indexPath := fmt.Sprintf("%s/index.html", req.DocumentRoot)
		if err := os.WriteFile(indexPath, []byte(indexHTML), 0644); err == nil {
			createdItems = append(createdItems, "Default index.html created")
		}
		
		// Set proper ownership (www-data)
		exec.Command("chown", "-R", "www-data:www-data", req.DocumentRoot).Run()
	}

	// 2. Create Nginx virtual host config
	nginxConfig := generateNginxConfig(req)
	nginxConfigPath := fmt.Sprintf("/etc/nginx/sites-available/%s", req.Domain)
	if err := os.WriteFile(nginxConfigPath, []byte(nginxConfig), 0644); err != nil {
		errors = append(errors, fmt.Sprintf("Failed to create nginx config: %v", err))
	} else {
		createdItems = append(createdItems, "Nginx config created")
		
		// Enable site (symlink to sites-enabled)
		enabledPath := fmt.Sprintf("/etc/nginx/sites-enabled/%s", req.Domain)
		os.Remove(enabledPath) // Remove if exists
		if err := os.Symlink(nginxConfigPath, enabledPath); err == nil {
			createdItems = append(createdItems, "Site enabled")
		}
		
		// Test and reload nginx
		if err := exec.Command("nginx", "-t").Run(); err == nil {
			exec.Command("systemctl", "reload", "nginx").Run()
			createdItems = append(createdItems, "Nginx reloaded")
		}
	}

	// 3. Create Database if requested
	if req.CreateDatabase && req.DatabaseType != "" && req.DatabaseType != "none" {
		dbName := req.DatabaseName
		if dbName == "" {
			dbName = strings.ReplaceAll(req.Domain, ".", "_")
			dbName = strings.ReplaceAll(dbName, "-", "_")
		}
		dbUser := req.DatabaseUser
		if dbUser == "" {
			dbUser = dbName + "_user"
		}
		dbPass := req.DatabasePass
		if dbPass == "" {
			dbPass = uuid.New().String()[:12]
		}

		var dbCmd *exec.Cmd
		if req.DatabaseType == "mysql" {
			// Create MySQL database and user
			mysqlCommands := fmt.Sprintf(`
				CREATE DATABASE IF NOT EXISTS %s;
				CREATE USER IF NOT EXISTS '%s'@'localhost' IDENTIFIED BY '%s';
				GRANT ALL PRIVILEGES ON %s.* TO '%s'@'localhost';
				FLUSH PRIVILEGES;
			`, dbName, dbUser, dbPass, dbName, dbUser)
			dbCmd = exec.Command("mysql", "-e", mysqlCommands)
		} else if req.DatabaseType == "postgresql" {
			// Create PostgreSQL database and user
			dbCmd = exec.Command("sudo", "-u", "postgres", "bash", "-c",
				fmt.Sprintf("psql -c \"CREATE USER %s WITH PASSWORD '%s';\" && psql -c \"CREATE DATABASE %s OWNER %s;\"",
					dbUser, dbPass, dbName, dbUser))
		}

		if dbCmd != nil {
			if err := dbCmd.Run(); err != nil {
				errors = append(errors, fmt.Sprintf("Failed to create database: %v", err))
			} else {
				createdItems = append(createdItems, fmt.Sprintf("Database %s created (user: %s)", dbName, dbUser))
				
				// Add to database store
				databaseMu.Lock()
				dbID := uuid.New().String()[:8]
				engine := models.DatabaseMySQL
				if req.DatabaseType == "postgresql" {
					engine = models.DatabasePostgreSQL
				}
				databaseStore[dbID] = &models.Database{
					ID:        dbID,
					Name:      dbName,
					Engine:    engine,
					Charset:   "UTF8",
					CreatedAt: time.Now(),
				}
				databaseMu.Unlock()
			}
		}
	}

	// 4. Create FTP account if requested
	if req.CreateFTP {
		ftpUser := req.FTPUsername
		if ftpUser == "" {
			ftpUser = strings.ReplaceAll(req.Domain, ".", "_")
		}
		ftpPass := req.FTPPassword
		if ftpPass == "" {
			ftpPass = uuid.New().String()[:12]
		}

		// Create system user for FTP (using useradd)
		// Set home directory to document root
		cmd := exec.Command("useradd", "-d", req.DocumentRoot, "-s", "/bin/false", ftpUser)
		if err := cmd.Run(); err == nil {
			// Set password
			passwdCmd := exec.Command("chpasswd")
			passwdCmd.Stdin = strings.NewReader(fmt.Sprintf("%s:%s", ftpUser, ftpPass))
			if err := passwdCmd.Run(); err == nil {
				createdItems = append(createdItems, fmt.Sprintf("FTP user %s created", ftpUser))
			}
		} else {
			errors = append(errors, fmt.Sprintf("Failed to create FTP user: %v", err))
		}
	}

	// 5. Create SSL certificate if enabled (using certbot)
	if req.SSLEnabled {
		cmd := exec.Command("certbot", "--nginx", "-d", req.Domain, "--non-interactive", "--agree-tos", "-m", "admin@"+req.Domain)
		if err := cmd.Run(); err != nil {
			errors = append(errors, fmt.Sprintf("SSL setup failed (will retry later): %v", err))
		} else {
			createdItems = append(createdItems, "SSL certificate installed")
		}
	}

	// Save website to store
	website := &models.Website{
		ID:           websiteID,
		Domain:       req.Domain,
		Engine:       models.WebEngineNginx,
		ProjectType:  "php",
		PHPVersion:   req.PHPVersion,
		SSL:          models.SSLConfig{Enabled: req.SSLEnabled, Provider: "letsencrypt", AutoRenew: true},
		DocumentRoot: req.DocumentRoot,
		Status:       models.StatusRunning,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	websiteMu.Lock()
	websiteStore[websiteID] = website
	websiteMu.Unlock()

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "create",
		Title:       "Website Created",
		Description: fmt.Sprintf("Website '%s' was created", req.Domain),
		Status:      "success",
		Timestamp:   time.Now(),
	})

	// Return response
	response := gin.H{
		"website":      website,
		"created":      createdItems,
		"errors":       errors,
		"success":      len(errors) == 0,
		"documentRoot": req.DocumentRoot,
	}

	if len(errors) > 0 {
		c.JSON(http.StatusPartialContent, response)
	} else {
		c.JSON(http.StatusCreated, response)
	}
}

// generateNginxConfig generates nginx virtual host configuration
func generateNginxConfig(req CreateWebsiteRequest) string {
	phpSocket := fmt.Sprintf("/run/php/php%s-fpm.sock", req.PHPVersion)
	
	config := fmt.Sprintf(`# Managed by Biz-Panel
# Domain: %s
# Created: %s

server {
    listen %d;
    listen [::]:%d;
    
    server_name %s www.%s;
    root %s;
    index index.php index.html index.htm;
    
    # Logging
    access_log /var/log/nginx/%s.access.log;
    error_log /var/log/nginx/%s.error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main location
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP handling
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:%s;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
`, req.Domain, time.Now().Format(time.RFC3339), 
   req.Port, req.Port, 
   req.Domain, req.Domain, 
   req.DocumentRoot,
   req.Domain, req.Domain,
   phpSocket)

	return config
}

// DeleteWebsiteReal deletes a website and cleans up all resources
func DeleteWebsiteReal(c *gin.Context) {
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

	deleted := []string{}
	errors := []string{}

	// 1. Remove nginx config
	nginxConfigPath := fmt.Sprintf("/etc/nginx/sites-available/%s", website.Domain)
	enabledPath := fmt.Sprintf("/etc/nginx/sites-enabled/%s", website.Domain)
	
	if err := os.Remove(enabledPath); err == nil {
		deleted = append(deleted, "Nginx site disabled")
	}
	if err := os.Remove(nginxConfigPath); err == nil {
		deleted = append(deleted, "Nginx config removed")
	}
	
	// Reload nginx
	exec.Command("systemctl", "reload", "nginx").Run()

	// 2. Optionally remove document root (ask user first in real implementation)
	// For safety, we'll just log this
	deleted = append(deleted, fmt.Sprintf("Document root at %s preserved (remove manually if needed)", website.DocumentRoot))

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "delete",
		Title:       "Website Deleted",
		Description: fmt.Sprintf("Website '%s' was deleted", website.Domain),
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Website deleted",
		"deleted": deleted,
		"errors":  errors,
	})
}
