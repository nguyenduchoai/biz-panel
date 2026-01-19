package models

import (
	"time"
)

// Project represents a deployment project (like Coolify)
// Each project has its own isolated Docker network
type Project struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        ProjectType       `json:"type"` // git, docker, static
	Status      ProjectStatus     `json:"status"`
	Repository  *GitRepository    `json:"repository,omitempty"`
	Docker      *DockerConfig     `json:"docker,omitempty"`
	Environment map[string]string `json:"environment"`
	NetworkID   string            `json:"networkId"`  // Isolated network
	Domain      string            `json:"domain,omitempty"`
	SSL         bool              `json:"ssl"`
	Resources   ResourceLimits    `json:"resources"`
	Containers  []string          `json:"containers"` // Container IDs in this project
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
	LastDeploy  *DeployInfo       `json:"lastDeploy,omitempty"`
}

// ProjectType defines the type of project
type ProjectType string

const (
	ProjectTypeGit    ProjectType = "git"
	ProjectTypeDocker ProjectType = "docker"
	ProjectTypeStatic ProjectType = "static"
)

// ProjectStatus defines the status of a project
type ProjectStatus string

const (
	ProjectStatusIdle      ProjectStatus = "idle"
	ProjectStatusBuilding  ProjectStatus = "building"
	ProjectStatusDeploying ProjectStatus = "deploying"
	ProjectStatusRunning   ProjectStatus = "running"
	ProjectStatusStopped   ProjectStatus = "stopped"
	ProjectStatusFailed    ProjectStatus = "failed"
)

// GitRepository represents a Git repository configuration
type GitRepository struct {
	URL        string `json:"url"`
	Branch     string `json:"branch"`
	PrivateKey string `json:"privateKey,omitempty"`
	AutoDeploy bool   `json:"autoDeploy"`
}

// DockerConfig represents Docker-specific configuration
type DockerConfig struct {
	Image         string            `json:"image,omitempty"`
	Dockerfile    string            `json:"dockerfile,omitempty"`
	DockerCompose string            `json:"dockerCompose,omitempty"`
	BuildArgs     map[string]string `json:"buildArgs,omitempty"`
	Command       []string          `json:"command,omitempty"`
	Entrypoint    []string          `json:"entrypoint,omitempty"`
	Ports         []PortConfig      `json:"ports"`
	Volumes       []VolumeConfig    `json:"volumes"`
	Labels        map[string]string `json:"labels"`
}

// PortConfig represents port configuration
type PortConfig struct {
	Host      uint16 `json:"host"`
	Container uint16 `json:"container"`
	Protocol  string `json:"protocol"` // tcp, udp
}

// VolumeConfig represents volume configuration
type VolumeConfig struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"` // bind, volume
}

// ResourceLimits represents resource limits for containers
type ResourceLimits struct {
	CPULimit    float64 `json:"cpuLimit"`    // CPU cores
	MemoryLimit int64   `json:"memoryLimit"` // Bytes
	CPUUsage    float64 `json:"cpuUsage"`    // Current usage
	MemoryUsage int64   `json:"memoryUsage"` // Current usage
}

// DeployInfo represents deployment information
type DeployInfo struct {
	ID        string       `json:"id"`
	Status    DeployStatus `json:"status"`
	StartedAt time.Time    `json:"startedAt"`
	FinishedAt *time.Time  `json:"finishedAt,omitempty"`
	Duration  int64        `json:"duration"` // Seconds
	Logs      []string     `json:"logs"`
	CommitSHA string       `json:"commitSha,omitempty"`
	Author    string       `json:"author,omitempty"`
	Message   string       `json:"message,omitempty"`
}

// DeployStatus defines deployment status
type DeployStatus string

const (
	DeployStatusPending   DeployStatus = "pending"
	DeployStatusBuilding  DeployStatus = "building"
	DeployStatusDeploying DeployStatus = "deploying"
	DeployStatusSuccess   DeployStatus = "success"
	DeployStatusFailed    DeployStatus = "failed"
	DeployStatusCancelled DeployStatus = "cancelled"
)

// CreateProjectRequest represents request to create a project
type CreateProjectRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description"`
	Type        ProjectType       `json:"type" binding:"required"`
	Repository  *GitRepository    `json:"repository,omitempty"`
	Docker      *DockerConfig     `json:"docker,omitempty"`
	Environment map[string]string `json:"environment"`
	Domain      string            `json:"domain"`
	SSL         bool              `json:"ssl"`
	Resources   ResourceLimits    `json:"resources"`
}

// UpdateProjectRequest represents request to update a project
type UpdateProjectRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Repository  *GitRepository    `json:"repository,omitempty"`
	Docker      *DockerConfig     `json:"docker,omitempty"`
	Environment map[string]string `json:"environment"`
	Domain      string            `json:"domain"`
	SSL         bool              `json:"ssl"`
	Resources   ResourceLimits    `json:"resources"`
}
