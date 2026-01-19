package api

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/docker"
	"github.com/bizino-services/biz-panel-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// In-memory storage (replace with database in production)
var (
	projectStore = make(map[string]*models.Project)
	projectMu    sync.RWMutex
)

// Global Docker client (set from main)
var dockerClientGlobal *docker.Client

// SetDockerClient sets the global Docker client
func SetDockerClient(client *docker.Client) {
	dockerClientGlobal = client
}

// ListProjects returns all projects
func ListProjects(c *gin.Context) {
	projectMu.RLock()
	defer projectMu.RUnlock()

	projects := make([]*models.Project, 0, len(projectStore))
	for _, p := range projectStore {
		projects = append(projects, p)
	}

	c.JSON(http.StatusOK, projects)
}

// GetProject returns a single project with its containers
func GetProject(c *gin.Context) {
	id := c.Param("id")

	projectMu.RLock()
	project, exists := projectStore[id]
	projectMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// If Docker is available, get containers for this project
	if dockerClientGlobal != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		containers, err := dockerClientGlobal.ListContainers(ctx, project.ID)
		if err == nil {
			// Update container IDs
			containerIDs := make([]string, len(containers))
			for i, ctr := range containers {
				containerIDs[i] = ctr.ID
			}
			project.Containers = containerIDs
		}
	}

	c.JSON(http.StatusOK, project)
}

// CreateProject creates a new project with isolated network (Coolify-style)
func CreateProject(c *gin.Context) {
	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	
	// Default type to "docker" if not provided
	projectType := req.Type
	if projectType == "" {
		projectType = models.ProjectTypeDocker
	}
	
	project := &models.Project{
		ID:          uuid.New().String()[:8],
		Name:        req.Name,
		Description: req.Description,
		Type:        projectType,
		Status:      models.ProjectStatusIdle,
		Repository:  req.Repository,
		Docker:      req.Docker,
		Environment: req.Environment,
		Domain:      req.Domain,
		SSL:         req.SSL,
		Resources:   req.Resources,
		Containers:  []string{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Create isolated Docker network for this project (like Coolify)
	networkName := fmt.Sprintf("biz-panel-%s", project.ID)
	project.NetworkID = networkName

	if dockerClientGlobal != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		networkID, err := dockerClientGlobal.CreateProjectNetwork(ctx, project.ID, project.Name)
		if err != nil {
			// Log error but don't fail - network can be created later
			fmt.Printf("Warning: Failed to create network for project %s: %v\n", project.ID, err)
		} else {
			project.NetworkID = networkID
			fmt.Printf("✓ Created isolated network '%s' for project '%s'\n", networkName, project.Name)
		}
	}

	projectMu.Lock()
	projectStore[project.ID] = project
	projectMu.Unlock()

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "create",
		Title:       "Project Created",
		Description: fmt.Sprintf("Project '%s' was created with isolated network '%s'", project.Name, networkName),
		Status:      "success",
		ProjectID:   project.ID,
		Timestamp:   now,
	})

	c.JSON(http.StatusCreated, project)
}

// UpdateProject updates a project
func UpdateProject(c *gin.Context) {
	id := c.Param("id")

	projectMu.RLock()
	project, exists := projectStore[id]
	projectMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		project.Name = req.Name
	}
	if req.Description != "" {
		project.Description = req.Description
	}
	if req.Repository != nil {
		project.Repository = req.Repository
	}
	if req.Docker != nil {
		project.Docker = req.Docker
	}
	if req.Environment != nil {
		project.Environment = req.Environment
	}
	if req.Domain != "" {
		project.Domain = req.Domain
	}
	project.SSL = req.SSL
	project.Resources = req.Resources
	project.UpdatedAt = time.Now()

	projectMu.Lock()
	projectStore[id] = project
	projectMu.Unlock()

	c.JSON(http.StatusOK, project)
}

// DeleteProject deletes a project and its network
func DeleteProject(c *gin.Context) {
	id := c.Param("id")

	projectMu.Lock()
	project, exists := projectStore[id]
	if exists {
		delete(projectStore, id)
	}
	projectMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Delete the project's Docker network
	if dockerClientGlobal != nil && project.NetworkID != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		err := dockerClientGlobal.RemoveNetwork(ctx, project.NetworkID)
		if err != nil {
			fmt.Printf("Warning: Failed to remove network %s: %v\n", project.NetworkID, err)
		}
	}

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "delete",
		Title:       "Project Deleted",
		Description: "Project '" + project.Name + "' was deleted",
		Status:      "success",
		ProjectID:   id,
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted", "id": id})
}

// GetProjectContainers returns containers for a specific project
func GetProjectContainers(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")

		// Check project exists
		projectMu.RLock()
		_, exists := projectStore[projectID]
		projectMu.RUnlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Get containers filtered by project label
		containers, err := dockerClient.ListContainers(ctx, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, containers)
	}
}

// AddContainerToProject adds a container to a project's network
func AddContainerToProject(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")

		var req struct {
			ContainerID string `json:"containerId" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check project exists
		projectMu.RLock()
		project, exists := projectStore[projectID]
		projectMu.RUnlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		// Connect container to project's network
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		err := dockerClient.ConnectContainerToNetwork(ctx, req.ContainerID, project.NetworkID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Update project's container list
		projectMu.Lock()
		project.Containers = append(project.Containers, req.ContainerID)
		projectMu.Unlock()

		c.JSON(http.StatusOK, gin.H{
			"message":     "Container added to project",
			"containerId": req.ContainerID,
			"projectId":   projectID,
			"network":     project.NetworkID,
		})
	}
}

// DeployProject triggers a deployment
func DeployProject(c *gin.Context) {
	id := c.Param("id")

	projectMu.Lock()
	project, exists := projectStore[id]
	if !exists {
		projectMu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Update status
	project.Status = models.ProjectStatusDeploying
	now := time.Now()
	project.LastDeploy = &models.DeployInfo{
		ID:        uuid.New().String()[:8],
		Status:    models.DeployStatusBuilding,
		StartedAt: now,
		Logs:      []string{"Starting deployment...", fmt.Sprintf("Using network: %s", project.NetworkID)},
	}
	project.UpdatedAt = now
	projectMu.Unlock()

	// Simulate async deployment
	go func() {
		time.Sleep(2 * time.Second)

		projectMu.Lock()
		defer projectMu.Unlock()

		if p, exists := projectStore[id]; exists {
			finishedAt := time.Now()
			p.Status = models.ProjectStatusRunning
			p.LastDeploy.Status = models.DeployStatusSuccess
			p.LastDeploy.FinishedAt = &finishedAt
			p.LastDeploy.Duration = int64(finishedAt.Sub(p.LastDeploy.StartedAt).Seconds())
			p.LastDeploy.Logs = append(p.LastDeploy.Logs,
				"Building image...",
				"Pulling base image...",
				"Installing dependencies...",
				fmt.Sprintf("Connecting to network: %s", p.NetworkID),
				"Building application...",
				"Creating container...",
				"Starting container...",
				"✓ Deployment successful!",
			)
		}
	}()

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "deploy",
		Title:       "Deployment Started",
		Description: "Deployment started for '" + project.Name + "'",
		Status:      "pending",
		ProjectID:   id,
		Timestamp:   now,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":  "Deployment started",
		"deployId": project.LastDeploy.ID,
		"network":  project.NetworkID,
	})
}

// GetProjectLogs returns project deployment logs
func GetProjectLogs(c *gin.Context) {
	id := c.Param("id")

	projectMu.RLock()
	project, exists := projectStore[id]
	projectMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.LastDeploy == nil {
		c.JSON(http.StatusOK, gin.H{"logs": []string{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deployId": project.LastDeploy.ID,
		"status":   project.LastDeploy.Status,
		"logs":     project.LastDeploy.Logs,
	})
}
