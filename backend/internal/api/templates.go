package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/docker"
	"github.com/gin-gonic/gin"
)

// AppTemplate represents a one-click deployment template
type AppTemplate struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Icon        string            `json:"icon"`
	Category    string            `json:"category"`
	Version     string            `json:"version"`
	Image       string            `json:"image"`
	Ports       []string          `json:"ports"`
	Volumes     []string          `json:"volumes"`
	Environment map[string]string `json:"environment"`
	MinMemory   int               `json:"minMemory"` // MB
	Tags        []string          `json:"tags"`
}

// Pre-defined app templates
var appTemplates = []AppTemplate{
	// Web Servers
	{
		ID:          "nginx",
		Name:        "Nginx",
		Description: "High-performance web server and reverse proxy",
		Icon:        "🌐",
		Category:    "Web Server",
		Version:     "1.25",
		Image:       "nginx:1.25-alpine",
		Ports:       []string{"80:80", "443:443"},
		Volumes:     []string{"nginx-config:/etc/nginx", "nginx-html:/usr/share/nginx/html"},
		Environment: map[string]string{},
		MinMemory:   64,
		Tags:        []string{"web", "proxy", "server"},
	},
	{
		ID:          "apache",
		Name:        "Apache HTTP",
		Description: "The Apache HTTP Server Project",
		Icon:        "🪶",
		Category:    "Web Server",
		Version:     "2.4",
		Image:       "httpd:2.4-alpine",
		Ports:       []string{"80:80"},
		Volumes:     []string{"apache-htdocs:/usr/local/apache2/htdocs"},
		Environment: map[string]string{},
		MinMemory:   64,
		Tags:        []string{"web", "server"},
	},

	// Databases
	{
		ID:          "mysql",
		Name:        "MySQL",
		Description: "The world's most popular open source database",
		Icon:        "🐬",
		Category:    "Database",
		Version:     "8.0",
		Image:       "mysql:8.0",
		Ports:       []string{"3306:3306"},
		Volumes:     []string{"mysql-data:/var/lib/mysql"},
		Environment: map[string]string{
			"MYSQL_ROOT_PASSWORD": "${MYSQL_ROOT_PASSWORD:-changeme}",
			"MYSQL_DATABASE":      "${MYSQL_DATABASE:-app}",
		},
		MinMemory: 512,
		Tags:      []string{"database", "sql", "mysql"},
	},
	{
		ID:          "postgresql",
		Name:        "PostgreSQL",
		Description: "The world's most advanced open source database",
		Icon:        "🐘",
		Category:    "Database",
		Version:     "16",
		Image:       "postgres:16-alpine",
		Ports:       []string{"5432:5432"},
		Volumes:     []string{"postgres-data:/var/lib/postgresql/data"},
		Environment: map[string]string{
			"POSTGRES_PASSWORD": "${POSTGRES_PASSWORD:-changeme}",
			"POSTGRES_DB":       "${POSTGRES_DB:-app}",
		},
		MinMemory: 256,
		Tags:      []string{"database", "sql", "postgres"},
	},
	{
		ID:          "mongodb",
		Name:        "MongoDB",
		Description: "NoSQL document database",
		Icon:        "🍃",
		Category:    "Database",
		Version:     "7.0",
		Image:       "mongo:7.0",
		Ports:       []string{"27017:27017"},
		Volumes:     []string{"mongo-data:/data/db"},
		Environment: map[string]string{
			"MONGO_INITDB_ROOT_USERNAME": "${MONGO_USER:-root}",
			"MONGO_INITDB_ROOT_PASSWORD": "${MONGO_PASSWORD:-changeme}",
		},
		MinMemory: 512,
		Tags:      []string{"database", "nosql", "mongo"},
	},
	{
		ID:          "redis",
		Name:        "Redis",
		Description: "In-memory data structure store, cache, and message broker",
		Icon:        "🔴",
		Category:    "Cache",
		Version:     "7.2",
		Image:       "redis:7.2-alpine",
		Ports:       []string{"6379:6379"},
		Volumes:     []string{"redis-data:/data"},
		Environment: map[string]string{},
		MinMemory:   64,
		Tags:        []string{"cache", "nosql", "redis"},
	},

	// CMS
	{
		ID:          "wordpress",
		Name:        "WordPress",
		Description: "World's most popular CMS",
		Icon:        "📝",
		Category:    "CMS",
		Version:     "6.4",
		Image:       "wordpress:6.4-php8.2-apache",
		Ports:       []string{"8080:80"},
		Volumes:     []string{"wordpress-content:/var/www/html/wp-content"},
		Environment: map[string]string{
			"WORDPRESS_DB_HOST":     "${DB_HOST:-mysql}",
			"WORDPRESS_DB_USER":     "${DB_USER:-wordpress}",
			"WORDPRESS_DB_PASSWORD": "${DB_PASSWORD:-changeme}",
			"WORDPRESS_DB_NAME":     "${DB_NAME:-wordpress}",
		},
		MinMemory: 256,
		Tags:      []string{"cms", "blog", "php"},
	},

	// Dev Tools
	{
		ID:          "phpmyadmin",
		Name:        "phpMyAdmin",
		Description: "Web-based MySQL/MariaDB administration",
		Icon:        "🔧",
		Category:    "Dev Tools",
		Version:     "5.2",
		Image:       "phpmyadmin:5.2",
		Ports:       []string{"8081:80"},
		Volumes:     []string{},
		Environment: map[string]string{
			"PMA_HOST":              "${DB_HOST:-mysql}",
			"PMA_ARBITRARY":         "1",
			"UPLOAD_LIMIT":          "100M",
		},
		MinMemory: 128,
		Tags:      []string{"admin", "mysql", "database"},
	},
	{
		ID:          "adminer",
		Name:        "Adminer",
		Description: "Database management in single PHP file",
		Icon:        "🗄️",
		Category:    "Dev Tools",
		Version:     "4.8",
		Image:       "adminer:4.8",
		Ports:       []string{"8082:8080"},
		Volumes:     []string{},
		Environment: map[string]string{
			"ADMINER_DEFAULT_SERVER": "${DB_HOST:-localhost}",
		},
		MinMemory: 32,
		Tags:      []string{"admin", "database"},
	},
	{
		ID:          "portainer",
		Name:        "Portainer",
		Description: "Container management made easy",
		Icon:        "🐳",
		Category:    "Dev Tools",
		Version:     "2.19",
		Image:       "portainer/portainer-ce:2.19.4",
		Ports:       []string{"9000:9000", "9443:9443"},
		Volumes:     []string{"/var/run/docker.sock:/var/run/docker.sock", "portainer-data:/data"},
		Environment: map[string]string{},
		MinMemory:   64,
		Tags:        []string{"docker", "management", "container"},
	},

	// Monitoring
	{
		ID:          "grafana",
		Name:        "Grafana",
		Description: "Open source analytics and monitoring solution",
		Icon:        "📊",
		Category:    "Monitoring",
		Version:     "10.2",
		Image:       "grafana/grafana:10.2.0",
		Ports:       []string{"3000:3000"},
		Volumes:     []string{"grafana-data:/var/lib/grafana"},
		Environment: map[string]string{
			"GF_SECURITY_ADMIN_PASSWORD": "${GRAFANA_PASSWORD:-admin}",
		},
		MinMemory: 128,
		Tags:      []string{"monitoring", "dashboard", "metrics"},
	},
	{
		ID:          "prometheus",
		Name:        "Prometheus",
		Description: "Monitoring system and time series database",
		Icon:        "🔥",
		Category:    "Monitoring",
		Version:     "2.48",
		Image:       "prom/prometheus:v2.48.0",
		Ports:       []string{"9090:9090"},
		Volumes:     []string{"prometheus-data:/prometheus"},
		Environment: map[string]string{},
		MinMemory:   128,
		Tags:        []string{"monitoring", "metrics", "alerting"},
	},

	// Storage
	{
		ID:          "minio",
		Name:        "MinIO",
		Description: "High performance object storage (S3 compatible)",
		Icon:        "📦",
		Category:    "Storage",
		Version:     "latest",
		Image:       "minio/minio:latest",
		Ports:       []string{"9000:9000", "9001:9001"},
		Volumes:     []string{"minio-data:/data"},
		Environment: map[string]string{
			"MINIO_ROOT_USER":     "${MINIO_USER:-admin}",
			"MINIO_ROOT_PASSWORD": "${MINIO_PASSWORD:-changeme}",
		},
		MinMemory: 512,
		Tags:      []string{"storage", "s3", "object"},
	},

	// Code
	{
		ID:          "gitea",
		Name:        "Gitea",
		Description: "Lightweight Git service",
		Icon:        "☕",
		Category:    "Code",
		Version:     "1.21",
		Image:       "gitea/gitea:1.21",
		Ports:       []string{"3000:3000", "2222:22"},
		Volumes:     []string{"gitea-data:/data"},
		Environment: map[string]string{},
		MinMemory:   256,
		Tags:        []string{"git", "vcs", "code"},
	},
}

// ListTemplates returns all available app templates
func ListTemplates(c *gin.Context) {
	category := c.Query("category")
	search := c.Query("search")

	results := make([]AppTemplate, 0)

	for _, template := range appTemplates {
		// Filter by category
		if category != "" && template.Category != category {
			continue
		}

		// Filter by search
		if search != "" {
			search = strings.ToLower(search)
			if !strings.Contains(strings.ToLower(template.Name), search) &&
				!strings.Contains(strings.ToLower(template.Description), search) {
				match := false
				for _, tag := range template.Tags {
					if strings.Contains(tag, search) {
						match = true
						break
					}
				}
				if !match {
					continue
				}
			}
		}

		results = append(results, template)
	}

	c.JSON(http.StatusOK, gin.H{
		"templates": results,
		"count":     len(results),
	})
}

// GetTemplate returns a single template by ID
func GetTemplate(c *gin.Context) {
	id := c.Param("id")

	for _, template := range appTemplates {
		if template.ID == id {
			c.JSON(http.StatusOK, template)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
}

// GetTemplateCategories returns all available categories
func GetTemplateCategories(c *gin.Context) {
	categoryMap := make(map[string]int)

	for _, template := range appTemplates {
		categoryMap[template.Category]++
	}

	categories := make([]gin.H, 0)
	for cat, count := range categoryMap {
		categories = append(categories, gin.H{
			"name":  cat,
			"count": count,
		})
	}

	c.JSON(http.StatusOK, categories)
}

// DeployTemplate deploys an app template as a Docker container
func DeployTemplate(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Find template
		var template *AppTemplate
		for _, t := range appTemplates {
			if t.ID == id {
				template = &t
				break
			}
		}

		if template == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
			return
		}

		var req struct {
			Name        string            `json:"name"`
			ProjectID   string            `json:"projectId"`
			Environment map[string]string `json:"environment"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.Name == "" {
			req.Name = fmt.Sprintf("%s-%d", template.ID, time.Now().Unix())
		}

		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		// Merge environment variables
		envVars := make([]string, 0)
		for k, v := range template.Environment {
			// Replace placeholders with user values
			if userVal, ok := req.Environment[k]; ok && userVal != "" {
				v = userVal
			}
			envVars = append(envVars, fmt.Sprintf("%s=%s", k, v))
		}

		// Create container
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		containerID, err := dockerClient.CreateContainer(ctx, docker.CreateContainerOptions{
			Name:        req.Name,
			Image:       template.Image,
			Ports:       template.Ports,
			Volumes:     template.Volumes,
			Environment: envVars,
			Labels: map[string]string{
				"biz-panel.managed":  "true",
				"biz-panel.template": template.ID,
				"biz-panel.project":  req.ProjectID,
			},
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Start container
		if err := dockerClient.StartContainer(ctx, containerID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":     "Template deployed",
			"containerId": containerID,
			"name":        req.Name,
			"template":    template.ID,
		})
	}
}
