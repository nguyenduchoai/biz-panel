package api

import (
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// SystemMetrics represents system resource metrics
type SystemMetrics struct {
	CPU        CPUMetrics     `json:"cpu"`
	Memory     MemoryMetrics  `json:"memory"`
	Disk       DiskMetrics    `json:"disk"`
	Network    NetworkMetrics `json:"network"`
	Uptime     int64          `json:"uptime"`
	Hostname   string         `json:"hostname"`
	OS         string         `json:"os"`
	Platform   string         `json:"platform"`
	LoadAvg    []float64      `json:"loadAvg"`
	Timestamp  int64          `json:"timestamp"`
}

// CPUMetrics represents CPU metrics
type CPUMetrics struct {
	Usage   float64 `json:"usage"`
	Cores   int     `json:"cores"`
	Model   string  `json:"model"`
}

// MemoryMetrics represents memory metrics
type MemoryMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
	Buffers     uint64  `json:"buffers"`
	Cached      uint64  `json:"cached"`
}

// DiskMetrics represents disk metrics
type DiskMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
}

// NetworkMetrics represents network metrics
type NetworkMetrics struct {
	BytesSent   uint64 `json:"bytesSent"`
	BytesRecv   uint64 `json:"bytesRecv"`
	PacketsSent uint64 `json:"packetsSent"`
	PacketsRecv uint64 `json:"packetsRecv"`
}

// HealthCheck returns API health status
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
	})
}

// GetSystemMetrics returns current system metrics
func GetSystemMetrics(c *gin.Context) {
	metrics, err := collectSystemMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// collectSystemMetrics collects all system metrics
func collectSystemMetrics() (*SystemMetrics, error) {
	// CPU
	cpuPercent, _ := cpu.Percent(time.Second, false)
	cpuInfo, _ := cpu.Info()

	cpuUsage := 0.0
	if len(cpuPercent) > 0 {
		cpuUsage = cpuPercent[0]
	}

	cpuModel := "Unknown"
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
	}

	// Memory
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	// Disk
	diskInfo, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	// Network
	netInfo, err := net.IOCounters(false)
	if err != nil {
		return nil, err
	}

	var netMetrics NetworkMetrics
	if len(netInfo) > 0 {
		netMetrics = NetworkMetrics{
			BytesSent:   netInfo[0].BytesSent,
			BytesRecv:   netInfo[0].BytesRecv,
			PacketsSent: netInfo[0].PacketsSent,
			PacketsRecv: netInfo[0].PacketsRecv,
		}
	}

	// Host info
	hostInfo, _ := host.Info()

	return &SystemMetrics{
		CPU: CPUMetrics{
			Usage: cpuUsage,
			Cores: runtime.NumCPU(),
			Model: cpuModel,
		},
		Memory: MemoryMetrics{
			Total:       memInfo.Total,
			Used:        memInfo.Used,
			Free:        memInfo.Free,
			UsedPercent: memInfo.UsedPercent,
			Buffers:     memInfo.Buffers,
			Cached:      memInfo.Cached,
		},
		Disk: DiskMetrics{
			Total:       diskInfo.Total,
			Used:        diskInfo.Used,
			Free:        diskInfo.Free,
			UsedPercent: diskInfo.UsedPercent,
		},
		Network: netMetrics,
		Uptime:     int64(hostInfo.Uptime),
		Hostname:   hostInfo.Hostname,
		OS:         hostInfo.OS,
		Platform:   hostInfo.Platform,
		Timestamp:  time.Now().Unix(),
	}, nil
}

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// MetricsWebSocket handles WebSocket connection for real-time metrics
func MetricsWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// Send metrics every second
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		metrics, err := collectSystemMetrics()
		if err != nil {
			continue
		}

		if err := conn.WriteJSON(metrics); err != nil {
			break
		}
	}
}
