package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

// Client wraps Docker client with project-aware operations
type Client struct {
	cli *client.Client
}

// NewClient creates a new Docker client
func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = cli.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("docker daemon not accessible: %w", err)
	}

	return &Client{cli: cli}, nil
}

// parseTime parses a time string to time.Time
func parseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return time.Time{}
	}
	return t
}

// ContainerInfo represents container information
type ContainerInfo struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Image      string            `json:"image"`
	Status     string            `json:"status"`
	State      string            `json:"state"`
	Created    time.Time         `json:"created"`
	Ports      []PortMapping     `json:"ports"`
	Labels     map[string]string `json:"labels"`
	ProjectID  string            `json:"projectId"`
	Networks   []string          `json:"networks"`
	Mounts     []MountPoint      `json:"mounts"`
	Stats      *ContainerStats   `json:"stats,omitempty"`
}

// PortMapping represents port mapping
type PortMapping struct {
	HostPort      uint16 `json:"hostPort"`
	ContainerPort uint16 `json:"containerPort"`
	Protocol      string `json:"protocol"`
	HostIP        string `json:"hostIP"`
}

// MountPoint represents volume mount
type MountPoint struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
	Type        string `json:"type"`
}

// ContainerStats represents container resource usage
type ContainerStats struct {
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryUsage   uint64  `json:"memoryUsage"`
	MemoryLimit   uint64  `json:"memoryLimit"`
	MemoryPercent float64 `json:"memoryPercent"`
	NetworkRx     uint64  `json:"networkRx"`
	NetworkTx     uint64  `json:"networkTx"`
	BlockRead     uint64  `json:"blockRead"`
	BlockWrite    uint64  `json:"blockWrite"`
}

// ImageInfo represents Docker image
type ImageInfo struct {
	ID         string   `json:"id"`
	Repository string   `json:"repository"`
	Tag        string   `json:"tag"`
	Size       int64    `json:"size"`
	Created    int64    `json:"created"`
	Containers int64    `json:"containers"`
}

// NetworkInfo represents Docker network
type NetworkInfo struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Scope      string            `json:"scope"`
	ProjectID  string            `json:"projectId"`
	Containers int               `json:"containers"`
	Labels     map[string]string `json:"labels"`
	IPAM       *IPAMConfig       `json:"ipam"`
}

// IPAMConfig represents IPAM configuration
type IPAMConfig struct {
	Subnet  string `json:"subnet"`
	Gateway string `json:"gateway"`
}

// VolumeInfo represents Docker volume
type VolumeInfo struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Mountpoint string            `json:"mountpoint"`
	Labels     map[string]string `json:"labels"`
	ProjectID  string            `json:"projectId"`
	CreatedAt  string            `json:"createdAt"`
}

// ListContainers lists all containers, optionally filtered by project
func (c *Client) ListContainers(ctx context.Context, projectID string) ([]ContainerInfo, error) {
	opts := container.ListOptions{All: true}

	// Filter by project label if specified
	if projectID != "" {
		opts.Filters = filters.NewArgs()
		opts.Filters.Add("label", fmt.Sprintf("biz-panel.project=%s", projectID))
	}

	containers, err := c.cli.ContainerList(ctx, opts)
	if err != nil {
		return nil, err
	}

	result := make([]ContainerInfo, 0, len(containers))
	for _, ctr := range containers {
		info := ContainerInfo{
			ID:        ctr.ID[:12],
			Name:      strings.TrimPrefix(ctr.Names[0], "/"),
			Image:     ctr.Image,
			Status:    ctr.Status,
			State:     ctr.State,
			Created:   time.Unix(ctr.Created, 0),
			Labels:    ctr.Labels,
			ProjectID: ctr.Labels["biz-panel.project"],
			Networks:  make([]string, 0),
			Ports:     make([]PortMapping, 0),
			Mounts:    make([]MountPoint, 0),
		}

		// Extract networks
		for name := range ctr.NetworkSettings.Networks {
			info.Networks = append(info.Networks, name)
		}

		// Extract ports
		for _, port := range ctr.Ports {
			info.Ports = append(info.Ports, PortMapping{
				HostPort:      port.PublicPort,
				ContainerPort: port.PrivatePort,
				Protocol:      port.Type,
				HostIP:        port.IP,
			})
		}

		// Extract mounts
		for _, mount := range ctr.Mounts {
			info.Mounts = append(info.Mounts, MountPoint{
				Source:      mount.Source,
				Destination: mount.Destination,
				Mode:        mount.Mode,
				Type:        string(mount.Type),
			})
		}

		result = append(result, info)
	}

	return result, nil
}

// GetContainer gets container details
func (c *Client) GetContainer(ctx context.Context, id string) (*ContainerInfo, error) {
	ctr, err := c.cli.ContainerInspect(ctx, id)
	if err != nil {
		return nil, err
	}

	info := &ContainerInfo{
		ID:        ctr.ID[:12],
		Name:      strings.TrimPrefix(ctr.Name, "/"),
		Image:     ctr.Config.Image,
		Status:    ctr.State.Status,
		State:     ctr.State.Status,
		Created:   parseTime(ctr.Created),
		Labels:    ctr.Config.Labels,
		ProjectID: ctr.Config.Labels["biz-panel.project"],
		Networks:  make([]string, 0),
		Ports:     make([]PortMapping, 0),
		Mounts:    make([]MountPoint, 0),
	}

	// Extract networks
	for name := range ctr.NetworkSettings.Networks {
		info.Networks = append(info.Networks, name)
	}

	// Extract mounts
	for _, mount := range ctr.Mounts {
		info.Mounts = append(info.Mounts, MountPoint{
			Source:      mount.Source,
			Destination: mount.Destination,
			Mode:        mount.Mode,
			Type:        string(mount.Type),
		})
	}

	return info, nil
}

// CreateContainerOptions contains options for creating a container
type CreateContainerOptions struct {
	Name        string
	Image       string
	Ports       []string          // e.g., "8080:80"
	Volumes     []string          // e.g., "vol-name:/data"
	Environment []string          // e.g., "KEY=value"
	Labels      map[string]string
	Network     string
	Cmd         []string
}

// CreateContainer creates a new container
func (c *Client) CreateContainer(ctx context.Context, opts CreateContainerOptions) (string, error) {
	// Pull image if not exists
	_, _, err := c.cli.ImageInspectWithRaw(ctx, opts.Image)
	if err != nil {
		// Image doesn't exist, pull it
		reader, err := c.cli.ImagePull(ctx, opts.Image, types.ImagePullOptions{})
		if err != nil {
			return "", fmt.Errorf("failed to pull image: %w", err)
		}
		defer reader.Close()
		// Wait for pull to complete
		io.Copy(io.Discard, reader)
	}

	// Parse port bindings
	exposedPorts := make(map[nat.Port]struct{})
	portBindings := make(nat.PortMap)

	for _, portMapping := range opts.Ports {
		parts := strings.Split(portMapping, ":")
		if len(parts) == 2 {
			hostPort := parts[0]
			containerPort := nat.Port(parts[1] + "/tcp")
			exposedPorts[containerPort] = struct{}{}
			portBindings[containerPort] = []nat.PortBinding{
				{HostIP: "0.0.0.0", HostPort: hostPort},
			}
		}
	}

	// Parse volume mounts
	mounts := make([]mount.Mount, 0)
	for _, vol := range opts.Volumes {
		parts := strings.Split(vol, ":")
		if len(parts) >= 2 {
			mountType := mount.TypeVolume
			if strings.HasPrefix(parts[0], "/") {
				mountType = mount.TypeBind
			}
			mounts = append(mounts, mount.Mount{
				Type:   mountType,
				Source: parts[0],
				Target: parts[1],
			})
		}
	}

	// Create container config
	config := &container.Config{
		Image:        opts.Image,
		Env:          opts.Environment,
		ExposedPorts: exposedPorts,
		Labels:       opts.Labels,
	}

	if len(opts.Cmd) > 0 {
		config.Cmd = opts.Cmd
	}

	hostConfig := &container.HostConfig{
		PortBindings: portBindings,
		Mounts:       mounts,
		RestartPolicy: container.RestartPolicy{
			Name: "unless-stopped",
		},
	}

	// Create the container
	resp, err := c.cli.ContainerCreate(ctx, config, hostConfig, nil, nil, opts.Name)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	// Connect to network if specified
	if opts.Network != "" {
		if err := c.cli.NetworkConnect(ctx, opts.Network, resp.ID, nil); err != nil {
			// Non-fatal, log warning
			fmt.Printf("Warning: failed to connect to network %s: %v\n", opts.Network, err)
		}
	}

	return resp.ID, nil
}

// StartContainer starts a container
func (c *Client) StartContainer(ctx context.Context, id string) error {
	return c.cli.ContainerStart(ctx, id, container.StartOptions{})
}

// StopContainer stops a container
func (c *Client) StopContainer(ctx context.Context, id string) error {
	timeout := 10
	return c.cli.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})
}

// RestartContainer restarts a container
func (c *Client) RestartContainer(ctx context.Context, id string) error {
	timeout := 10
	return c.cli.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
}

// RemoveContainer removes a container
func (c *Client) RemoveContainer(ctx context.Context, id string, force bool) error {
	return c.cli.ContainerRemove(ctx, id, container.RemoveOptions{Force: force})
}

// GetContainerLogs gets container logs
func (c *Client) GetContainerLogs(ctx context.Context, id string, tail int) (string, error) {
	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
		Timestamps: true,
	}

	reader, err := c.cli.ContainerLogs(ctx, id, opts)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	logs, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	return string(logs), nil
}

// GetContainerStats gets container stats
func (c *Client) GetContainerStats(ctx context.Context, id string) (*ContainerStats, error) {
	statsReader, err := c.cli.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, err
	}
	defer statsReader.Body.Close()

	var stats types.StatsJSON
	if err := json.NewDecoder(statsReader.Body).Decode(&stats); err != nil {
		return nil, err
	}

	// Calculate CPU percentage
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
	cpuPercent := 0.0
	if systemDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * float64(len(stats.CPUStats.CPUUsage.PercpuUsage)) * 100.0
	}

	// Calculate memory
	memoryUsage := stats.MemoryStats.Usage
	memoryLimit := stats.MemoryStats.Limit
	memoryPercent := 0.0
	if memoryLimit > 0 {
		memoryPercent = float64(memoryUsage) / float64(memoryLimit) * 100.0
	}

	// Calculate network
	var networkRx, networkTx uint64
	for _, net := range stats.Networks {
		networkRx += net.RxBytes
		networkTx += net.TxBytes
	}

	// Calculate block I/O
	var blockRead, blockWrite uint64
	for _, io := range stats.BlkioStats.IoServiceBytesRecursive {
		switch io.Op {
		case "Read":
			blockRead += io.Value
		case "Write":
			blockWrite += io.Value
		}
	}

	return &ContainerStats{
		CPUPercent:    cpuPercent,
		MemoryUsage:   memoryUsage,
		MemoryLimit:   memoryLimit,
		MemoryPercent: memoryPercent,
		NetworkRx:     networkRx,
		NetworkTx:     networkTx,
		BlockRead:     blockRead,
		BlockWrite:    blockWrite,
	}, nil
}

// ListImages lists all images
func (c *Client) ListImages(ctx context.Context) ([]ImageInfo, error) {
	images, err := c.cli.ImageList(ctx, types.ImageListOptions{All: false})
	if err != nil {
		return nil, err
	}

	result := make([]ImageInfo, 0, len(images))
	for _, img := range images {
		repo := "<none>"
		tag := "<none>"
		if len(img.RepoTags) > 0 {
			parts := strings.Split(img.RepoTags[0], ":")
			repo = parts[0]
			if len(parts) > 1 {
				tag = parts[1]
			}
		}

		result = append(result, ImageInfo{
			ID:         img.ID[7:19], // Remove sha256: prefix
			Repository: repo,
			Tag:        tag,
			Size:       img.Size,
			Created:    img.Created,
			Containers: img.Containers,
		})
	}

	return result, nil
}

// RemoveImage removes an image
func (c *Client) RemoveImage(ctx context.Context, id string, force bool) error {
	_, err := c.cli.ImageRemove(ctx, id, types.ImageRemoveOptions{Force: force})
	return err
}

// ListNetworks lists all networks, optionally filtered by project
func (c *Client) ListNetworks(ctx context.Context, projectID string) ([]NetworkInfo, error) {
	opts := types.NetworkListOptions{}

	// Filter by project label if specified
	if projectID != "" {
		opts.Filters = filters.NewArgs()
		opts.Filters.Add("label", fmt.Sprintf("biz-panel.project=%s", projectID))
	}

	networks, err := c.cli.NetworkList(ctx, opts)
	if err != nil {
		return nil, err
	}

	result := make([]NetworkInfo, 0, len(networks))
	for _, net := range networks {
		info := NetworkInfo{
			ID:         net.ID[:12],
			Name:       net.Name,
			Driver:     net.Driver,
			Scope:      net.Scope,
			Labels:     net.Labels,
			ProjectID:  net.Labels["biz-panel.project"],
			Containers: len(net.Containers),
		}

		if len(net.IPAM.Config) > 0 {
			info.IPAM = &IPAMConfig{
				Subnet:  net.IPAM.Config[0].Subnet,
				Gateway: net.IPAM.Config[0].Gateway,
			}
		}

		result = append(result, info)
	}

	return result, nil
}

// CreateProjectNetwork creates an isolated network for a project (Coolify-style)
func (c *Client) CreateProjectNetwork(ctx context.Context, projectID, projectName string) (string, error) {
	networkName := fmt.Sprintf("biz-panel-%s", projectID)

	opts := types.NetworkCreate{
		Driver: "bridge",
		Labels: map[string]string{
			"biz-panel.project":      projectID,
			"biz-panel.project.name": projectName,
			"biz-panel.managed":      "true",
		},
		Internal: false,
	}

	resp, err := c.cli.NetworkCreate(ctx, networkName, opts)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

// RemoveNetwork removes a network
func (c *Client) RemoveNetwork(ctx context.Context, id string) error {
	return c.cli.NetworkRemove(ctx, id)
}

// ConnectContainerToNetwork connects a container to a network
func (c *Client) ConnectContainerToNetwork(ctx context.Context, containerID, networkID string) error {
	return c.cli.NetworkConnect(ctx, networkID, containerID, nil)
}

// DisconnectContainerFromNetwork disconnects a container from a network
func (c *Client) DisconnectContainerFromNetwork(ctx context.Context, containerID, networkID string) error {
	return c.cli.NetworkDisconnect(ctx, networkID, containerID, false)
}

// ListVolumes lists all volumes
func (c *Client) ListVolumes(ctx context.Context, projectID string) ([]VolumeInfo, error) {
	opts := volume.ListOptions{}

	// Filter by project label if specified
	if projectID != "" {
		opts.Filters = filters.NewArgs()
		opts.Filters.Add("label", fmt.Sprintf("biz-panel.project=%s", projectID))
	}

	volumes, err := c.cli.VolumeList(ctx, opts)
	if err != nil {
		return nil, err
	}

	result := make([]VolumeInfo, 0, len(volumes.Volumes))
	for _, vol := range volumes.Volumes {
		result = append(result, VolumeInfo{
			Name:       vol.Name,
			Driver:     vol.Driver,
			Mountpoint: vol.Mountpoint,
			Labels:     vol.Labels,
			ProjectID:  vol.Labels["biz-panel.project"],
			CreatedAt:  vol.CreatedAt,
		})
	}

	return result, nil
}

// CreateVolume creates a new volume
func (c *Client) CreateVolume(ctx context.Context, name string, projectID string, labels map[string]string) (*VolumeInfo, error) {
	if labels == nil {
		labels = make(map[string]string)
	}

	// Add project label
	if projectID != "" {
		labels["biz-panel.project"] = projectID
	}
	labels["biz-panel.managed"] = "true"

	vol, err := c.cli.VolumeCreate(ctx, volume.CreateOptions{
		Name:   name,
		Labels: labels,
	})
	if err != nil {
		return nil, err
	}

	return &VolumeInfo{
		Name:       vol.Name,
		Driver:     vol.Driver,
		Mountpoint: vol.Mountpoint,
		Labels:     vol.Labels,
		ProjectID:  vol.Labels["biz-panel.project"],
		CreatedAt:  vol.CreatedAt,
	}, nil
}

// RemoveVolume removes a volume
func (c *Client) RemoveVolume(ctx context.Context, name string, force bool) error {
	return c.cli.VolumeRemove(ctx, name, force)
}

// Close closes the Docker client
func (c *Client) Close() error {
	return c.cli.Close()
}
