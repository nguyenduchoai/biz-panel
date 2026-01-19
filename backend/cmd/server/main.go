package main

import (
	"log"
	"os"

	"github.com/bizino-services/biz-panel-backend/internal/api"
	"github.com/bizino-services/biz-panel-backend/internal/auth"
	"github.com/bizino-services/biz-panel-backend/internal/docker"
	"github.com/bizino-services/biz-panel-backend/internal/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Docker client
	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Printf("Warning: Docker not available: %v", err)
	}

	// Initialize Authentication
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "biz-panel-default-secret-change-in-production"
	}

	adminUser := os.Getenv("ADMIN_USER")
	if adminUser == "" {
		adminUser = "admin"
	}

	adminPassHash := os.Getenv("ADMIN_PASS_HASH")
	if adminPassHash == "" {
		// Default password hash for "admin123" - CHANGE IN PRODUCTION
		adminPassHash = "$2a$10$JpCkpb4PGX4QmbEaqLO6RulAsCF4.hkiI557ujaLzuHUP4Shc/ht6"
	}

	auth.Initialize(auth.Config{
		JWTSecret:     jwtSecret,
		AdminUser:     adminUser,
		AdminPassHash: adminPassHash,
	})

	// Create Gin router
	r := gin.Default()

	// CORS configuration - Secure: Allow specific origins
	corsOrigins := os.Getenv("CORS_ORIGINS")
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:8888",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
		"http://127.0.0.1:8888",
	}
	if corsOrigins != "" {
		allowedOrigins = append(allowedOrigins, corsOrigins)
	}
	// Also allow the server's own IP
	allowedOrigins = append(allowedOrigins, "http://116.118.2.95:5173", "http://116.118.2.95:5174", "http://116.118.2.95:8888")

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// API routes
	apiGroup := r.Group("/api")
	{
		// Health check (no auth)
		apiGroup.GET("/health", api.HealthCheck)

		// Auth routes (no auth required for login, but rate limited)
		authGroup := apiGroup.Group("/auth")
		authGroup.Use(middleware.LoginRateLimiter()) // Rate limit: 5 attempts/minute
		{
			authGroup.POST("/login", auth.LoginHandler)
		}

		// Apply auth middleware and rate limiting to all protected routes
		protected := apiGroup.Group("")
		protected.Use(middleware.APIRateLimiter()) // Rate limit: 100 requests/minute
		protected.Use(auth.AuthMiddleware())
		{
			// Auth routes (protected)
			protected.GET("/auth/me", auth.GetCurrentUser)
			protected.POST("/auth/change-password", auth.ChangePasswordHandler)

			// System metrics
			protected.GET("/metrics", api.GetSystemMetrics)
			protected.GET("/metrics/ws", api.MetricsWebSocket)

			// Set global Docker client for projects
			api.SetDockerClient(dockerClient)

			// Projects (Coolify-style with isolated networks)
			projects := protected.Group("/projects")
			{
				projects.GET("", api.ListProjects)
				projects.POST("", api.CreateProject)
				projects.GET("/:id", api.GetProject)
				projects.PUT("/:id", api.UpdateProject)
				projects.DELETE("/:id", api.DeleteProject)
				projects.POST("/:id/deploy", api.DeployProject)
				projects.GET("/:id/logs", api.GetProjectLogs)
				projects.GET("/:id/containers", api.GetProjectContainers(dockerClient))
				projects.POST("/:id/containers", api.AddContainerToProject(dockerClient))
			}

			// Docker
			containers := protected.Group("/docker")
			{
				containers.GET("/containers", api.ListContainers(dockerClient))
				containers.GET("/containers/:id", api.GetContainer(dockerClient))
				containers.POST("/containers/:id/start", api.StartContainer(dockerClient))
				containers.POST("/containers/:id/stop", api.StopContainer(dockerClient))
				containers.POST("/containers/:id/restart", api.RestartContainer(dockerClient))
				containers.DELETE("/containers/:id", api.RemoveContainer(dockerClient))
				containers.GET("/containers/:id/logs", api.ContainerLogs(dockerClient))
				containers.GET("/containers/:id/stats", api.ContainerStats(dockerClient))
				containers.GET("/images", api.ListImages(dockerClient))
				containers.DELETE("/images/:id", api.RemoveImage(dockerClient))
				containers.GET("/networks", api.ListNetworks(dockerClient))
				containers.POST("/networks", api.CreateNetwork(dockerClient))
				containers.DELETE("/networks/:id", api.RemoveNetwork(dockerClient))
				containers.GET("/volumes", api.ListVolumes(dockerClient))
				containers.POST("/volumes", api.CreateVolume(dockerClient))
				containers.DELETE("/volumes/:name", api.RemoveVolume(dockerClient))
			}

			// Websites
			websites := protected.Group("/websites")
			{
				websites.GET("", api.ListWebsites)
				websites.POST("", api.CreateWebsiteReal)
				websites.DELETE("/:id", api.DeleteWebsiteReal)
			}

			// Databases
			databases := protected.Group("/databases")
			{
				databases.GET("", api.ListDatabases)
				databases.POST("", api.CreateDatabase)
				databases.DELETE("/:id", api.DeleteDatabase)
			}

			// Cronjobs
			crons := protected.Group("/crons")
			{
				crons.GET("", api.ListCronjobs)
				crons.POST("", api.CreateCronjob)
				crons.PUT("/:id", api.UpdateCronjob)
				crons.DELETE("/:id", api.DeleteCronjob)
				crons.POST("/:id/run", api.RunCronjob)
			}

			// Firewall
			firewall := protected.Group("/firewall")
			{
				firewall.GET("/rules", api.ListFirewallRules)
				firewall.POST("/rules", api.CreateFirewallRule)
				firewall.DELETE("/rules/:id", api.DeleteFirewallRule)
			}

			// Settings
			protected.GET("/settings", api.GetSettings)
			protected.PUT("/settings", api.UpdateSettings)

			// Activities
			protected.GET("/activities", api.ListActivities)

			// File Manager
			files := protected.Group("/files")
			{
				files.GET("", api.ListDirectory)
				files.GET("/read", api.ReadFile)
				files.POST("/write", api.WriteFile)
				files.POST("/mkdir", api.CreateDirectory)
				files.DELETE("", api.DeletePath)
				files.POST("/rename", api.RenamePath)
				files.POST("/copy", api.CopyPath)
				files.POST("/chmod", api.ChangePermissions)
				files.GET("/search", api.SearchFiles)
			}

			// Logs
			logs := protected.Group("/logs")
			{
				logs.GET("/sources", api.ListLogSources)
				logs.GET("/:source", api.GetLogs)
				logs.GET("/:source/stream", api.StreamLogs)
				logs.GET("/:source/download", api.DownloadLog)
				logs.DELETE("/:source", api.ClearLog)
				logs.GET("/search", api.SearchLogs)
			}

			// Terminal
			terminal := protected.Group("/terminal")
			{
				terminal.GET("/shells", api.ListShells)
				terminal.GET("/ws", api.CreateTerminal)
				terminal.POST("/exec", api.ExecuteCommand)
				terminal.GET("/container/:id", api.ContainerTerminal)
			}

			// App Store / Templates
			templates := protected.Group("/templates")
			{
				templates.GET("", api.ListTemplates)
				templates.GET("/categories", api.GetTemplateCategories)
				templates.GET("/:id", api.GetTemplate)
				templates.POST("/:id/deploy", api.DeployTemplate(dockerClient))
			}

			// SSL Certificates
			ssl := protected.Group("/ssl")
			{
				ssl.GET("", api.ListSSLCertificates)
				ssl.GET("/:id", api.GetSSLCertificate)
				ssl.POST("/letsencrypt", api.RequestLetsEncryptCertificate)
				ssl.POST("/upload", api.UploadSSLCertificate)
				ssl.POST("/self-signed", api.GenerateSelfSignedCertificate)
				ssl.POST("/:id/renew", api.RenewSSLCertificate)
				ssl.DELETE("/:id", api.DeleteSSLCertificate)
				ssl.GET("/check-expiry", api.CheckSSLExpiry)
			}

			// Software Management
			software := protected.Group("/software")
			{
				software.GET("", api.ListSoftware)
				software.POST("/:id/install", api.InstallSoftware)
				software.POST("/:id/uninstall", api.UninstallSoftware)
				software.GET("/jobs/:jobId", api.GetInstallStatus)
				software.POST("/:id/:action", api.ServiceAction)
			}

			// PHP Management
			php := protected.Group("/php")
			{
				php.GET("/versions", api.ListPHPVersions)
				php.POST("/versions/:version/install", api.InstallPHPVersion)
				php.POST("/versions/:version/uninstall", api.UninstallPHPVersion)
				php.POST("/versions/:version/default", api.SetDefaultPHP)
				php.POST("/versions/:version/:action", api.ControlPHPFPM)
				php.GET("/versions/:version/extensions", api.GetPHPExtensions)
				php.POST("/versions/:version/extensions/:extension/install", api.InstallPHPExtension)
				php.PUT("/versions/:version/extensions/:extension", api.TogglePHPExtension)
				php.GET("/versions/:version/config", api.GetPHPConfig)
				php.PUT("/versions/:version/config", api.UpdatePHPConfig)
			}

			// Unified Services Management
			services := protected.Group("/services")
			{
				services.GET("", api.ListServices)
				services.GET("/:id", api.GetService)
				services.POST("/:id/install", api.InstallService)
				services.POST("/:id/uninstall", api.UninstallService)
				services.POST("/:id/:action", api.ControlService)
				services.GET("/:id/config", api.GetServiceConfigOptions)
				services.PUT("/:id/config", api.UpdateServiceConfig)
				services.GET("/:id/logs", api.GetServiceLogs)
			}
		}
	}

	// Get port from env or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Biz-Panel Backend starting on :%s", port)
	log.Printf("📋 Default credentials: admin / admin123 (CHANGE IN PRODUCTION!)")
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
