package api

import (
	"context"
	"net/http"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/docker"
	"github.com/gin-gonic/gin"
)

// ListContainers returns all containers
func ListContainers(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		projectID := c.Query("projectId")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		containers, err := dockerClient.ListContainers(ctx, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, containers)
	}
}

// GetContainer returns container details
func GetContainer(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		container, err := dockerClient.GetContainer(ctx, id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, container)
	}
}

// StartContainer starts a container
func StartContainer(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.StartContainer(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Container started", "id": id})
	}
}

// StopContainer stops a container
func StopContainer(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.StopContainer(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Container stopped", "id": id})
	}
}

// RestartContainer restarts a container
func RestartContainer(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.RestartContainer(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Container restarted", "id": id})
	}
}

// RemoveContainer removes a container
func RemoveContainer(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		force := c.Query("force") == "true"
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.RemoveContainer(ctx, id, force); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Container removed", "id": id})
	}
}

// ContainerLogs returns container logs
func ContainerLogs(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		logs, err := dockerClient.GetContainerLogs(ctx, id, 500)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"logs": logs})
	}
}

// ContainerStats returns container stats
func ContainerStats(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		stats, err := dockerClient.GetContainerStats(ctx, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}

// ListImages returns all Docker images
func ListImages(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		images, err := dockerClient.ListImages(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, images)
	}
}

// RemoveImage removes a Docker image
func RemoveImage(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		force := c.Query("force") == "true"
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.RemoveImage(ctx, id, force); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Image removed", "id": id})
	}
}

// ListNetworks returns all Docker networks
func ListNetworks(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		projectID := c.Query("projectId")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		networks, err := dockerClient.ListNetworks(ctx, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, networks)
	}
}

// CreateNetwork creates a Docker network
func CreateNetwork(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		var req struct {
			ProjectID   string `json:"projectId" binding:"required"`
			ProjectName string `json:"projectName" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		networkID, err := dockerClient.CreateProjectNetwork(ctx, req.ProjectID, req.ProjectName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": networkID})
	}
}

// RemoveNetwork removes a Docker network
func RemoveNetwork(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		id := c.Param("id")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.RemoveNetwork(ctx, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Network removed", "id": id})
	}
}

// ListVolumes returns all Docker volumes
func ListVolumes(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		projectID := c.Query("projectId")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		volumes, err := dockerClient.ListVolumes(ctx, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, volumes)
	}
}

// CreateVolume creates a Docker volume
func CreateVolume(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		var req struct {
			Name      string            `json:"name" binding:"required"`
			ProjectID string            `json:"projectId"`
			Labels    map[string]string `json:"labels"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		volume, err := dockerClient.CreateVolume(ctx, req.Name, req.ProjectID, req.Labels)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, volume)
	}
}

// RemoveVolume removes a Docker volume
func RemoveVolume(dockerClient *docker.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dockerClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Docker not available"})
			return
		}

		name := c.Param("name")
		force := c.Query("force") == "true"
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := dockerClient.RemoveVolume(ctx, name, force); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Volume removed", "name": name})
	}
}
