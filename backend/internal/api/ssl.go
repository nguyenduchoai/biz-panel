package api

import (
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/bizino-services/biz-panel-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSLCertificate represents an SSL certificate
type SSLCertificate struct {
	ID          string    `json:"id"`
	Domain      string    `json:"domain"`
	Issuer      string    `json:"issuer"`
	Provider    string    `json:"provider"` // letsencrypt, custom, self-signed
	ExpiresAt   time.Time `json:"expiresAt"`
	IssuedAt    time.Time `json:"issuedAt"`
	AutoRenew   bool      `json:"autoRenew"`
	Status      string    `json:"status"` // valid, expired, pending, error
	CertPath    string    `json:"certPath"`
	KeyPath     string    `json:"keyPath"`
	LastChecked time.Time `json:"lastChecked"`
}

// Storage for certificates
var (
	sslCertificates = make(map[string]*SSLCertificate)
	sslMu           sync.RWMutex
)

// Certificate base path
const certBasePath = "/etc/biz-panel/certs"

// ListSSLCertificates returns all SSL certificates
func ListSSLCertificates(c *gin.Context) {
	sslMu.RLock()
	defer sslMu.RUnlock()

	certs := make([]*SSLCertificate, 0, len(sslCertificates))
	for _, cert := range sslCertificates {
		// Check expiry status
		if time.Now().After(cert.ExpiresAt) {
			cert.Status = "expired"
		} else if time.Now().Add(30 * 24 * time.Hour).After(cert.ExpiresAt) {
			cert.Status = "expiring"
		} else {
			cert.Status = "valid"
		}
		certs = append(certs, cert)
	}

	c.JSON(http.StatusOK, certs)
}

// GetSSLCertificate returns a single certificate
func GetSSLCertificate(c *gin.Context) {
	id := c.Param("id")

	sslMu.RLock()
	cert, exists := sslCertificates[id]
	sslMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "certificate not found"})
		return
	}

	c.JSON(http.StatusOK, cert)
}

// RequestLetsEncryptCertificate requests a new Let's Encrypt certificate
func RequestLetsEncryptCertificate(c *gin.Context) {
	var req struct {
		Domain    string   `json:"domain" binding:"required"`
		Email     string   `json:"email" binding:"required"`
		Aliases   []string `json:"aliases"`
		AutoRenew bool     `json:"autoRenew"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if certbot is available
	if _, err := exec.LookPath("certbot"); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "certbot not installed",
			"install": "apt install certbot python3-certbot-nginx",
		})
		return
	}

	// Build domain arguments
	domains := []string{req.Domain}
	domains = append(domains, req.Aliases...)

	domainArgs := make([]string, 0)
	for _, d := range domains {
		domainArgs = append(domainArgs, "-d", d)
	}

	// Create certificate ID
	certID := uuid.New().String()[:8]

	// Build certbot command
	args := []string{
		"certonly",
		"--nginx",
		"--non-interactive",
		"--agree-tos",
		"-m", req.Email,
	}
	args = append(args, domainArgs...)

	// Execute certbot
	cmd := exec.Command("certbot", args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "failed to obtain certificate",
			"output": string(output),
		})
		return
	}

	// Certificate paths (Let's Encrypt standard paths)
	certPath := fmt.Sprintf("/etc/letsencrypt/live/%s/fullchain.pem", req.Domain)
	keyPath := fmt.Sprintf("/etc/letsencrypt/live/%s/privkey.pem", req.Domain)

	// Parse certificate to get expiry
	expiresAt := time.Now().Add(90 * 24 * time.Hour) // Default 90 days
	if certData, err := os.ReadFile(certPath); err == nil {
		if parsed, err := parseCertificateExpiry(certData); err == nil {
			expiresAt = parsed
		}
	}

	// Store certificate
	cert := &SSLCertificate{
		ID:          certID,
		Domain:      req.Domain,
		Issuer:      "Let's Encrypt",
		Provider:    "letsencrypt",
		ExpiresAt:   expiresAt,
		IssuedAt:    time.Now(),
		AutoRenew:   req.AutoRenew,
		Status:      "valid",
		CertPath:    certPath,
		KeyPath:     keyPath,
		LastChecked: time.Now(),
	}

	sslMu.Lock()
	sslCertificates[certID] = cert
	sslMu.Unlock()

	// Log activity
	addActivity(&models.Activity{
		ID:          uuid.New().String()[:8],
		Type:        "ssl",
		Title:       "SSL Certificate Issued",
		Description: fmt.Sprintf("Let's Encrypt certificate issued for %s", req.Domain),
		Status:      "success",
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "Certificate obtained",
		"cert":    cert,
	})
}

// RenewSSLCertificate renews an existing certificate
func RenewSSLCertificate(c *gin.Context) {
	id := c.Param("id")

	sslMu.RLock()
	cert, exists := sslCertificates[id]
	sslMu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "certificate not found"})
		return
	}

	if cert.Provider != "letsencrypt" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only renew Let's Encrypt certificates"})
		return
	}

	// Run certbot renew
	cmd := exec.Command("certbot", "renew", "--cert-name", cert.Domain, "--force-renewal")
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "failed to renew certificate",
			"output": string(output),
		})
		return
	}

	// Update expiry
	cert.ExpiresAt = time.Now().Add(90 * 24 * time.Hour)
	cert.LastChecked = time.Now()
	cert.Status = "valid"

	sslMu.Lock()
	sslCertificates[id] = cert
	sslMu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"message":   "Certificate renewed",
		"expiresAt": cert.ExpiresAt,
	})
}

// UploadSSLCertificate uploads a custom SSL certificate
func UploadSSLCertificate(c *gin.Context) {
	var req struct {
		Domain      string `json:"domain" binding:"required"`
		Certificate string `json:"certificate" binding:"required"` // PEM format
		PrivateKey  string `json:"privateKey" binding:"required"`  // PEM format
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate certificate
	expiresAt, issuer, err := parseCertificateInfo([]byte(req.Certificate))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid certificate: " + err.Error()})
		return
	}

	// Create certificate directory
	certDir := filepath.Join(certBasePath, req.Domain)
	if err := os.MkdirAll(certDir, 0700); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Write certificate files
	certPath := filepath.Join(certDir, "cert.pem")
	keyPath := filepath.Join(certDir, "key.pem")

	if err := os.WriteFile(certPath, []byte(req.Certificate), 0600); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := os.WriteFile(keyPath, []byte(req.PrivateKey), 0600); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Store certificate
	certID := uuid.New().String()[:8]
	cert := &SSLCertificate{
		ID:          certID,
		Domain:      req.Domain,
		Issuer:      issuer,
		Provider:    "custom",
		ExpiresAt:   expiresAt,
		IssuedAt:    time.Now(),
		AutoRenew:   false,
		Status:      "valid",
		CertPath:    certPath,
		KeyPath:     keyPath,
		LastChecked: time.Now(),
	}

	sslMu.Lock()
	sslCertificates[certID] = cert
	sslMu.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Certificate uploaded",
		"cert":    cert,
	})
}

// DeleteSSLCertificate deletes a certificate
func DeleteSSLCertificate(c *gin.Context) {
	id := c.Param("id")

	sslMu.Lock()
	cert, exists := sslCertificates[id]
	if exists {
		delete(sslCertificates, id)
	}
	sslMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "certificate not found"})
		return
	}

	// For Let's Encrypt certs, use certbot to delete
	if cert.Provider == "letsencrypt" {
		exec.Command("certbot", "delete", "--cert-name", cert.Domain).Run()
	} else {
		// Remove custom cert files
		certDir := filepath.Dir(cert.CertPath)
		os.RemoveAll(certDir)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Certificate deleted"})
}

// CheckSSLExpiry checks all certificates for expiry
func CheckSSLExpiry(c *gin.Context) {
	sslMu.RLock()
	certs := make([]*SSLCertificate, 0)
	for _, cert := range sslCertificates {
		certs = append(certs, cert)
	}
	sslMu.RUnlock()

	expiring := make([]*SSLCertificate, 0)
	expired := make([]*SSLCertificate, 0)

	for _, cert := range certs {
		if time.Now().After(cert.ExpiresAt) {
			expired = append(expired, cert)
		} else if time.Now().Add(30 * 24 * time.Hour).After(cert.ExpiresAt) {
			expiring = append(expiring, cert)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":    len(certs),
		"valid":    len(certs) - len(expired) - len(expiring),
		"expiring": expiring,
		"expired":  expired,
	})
}

// GenerateSelfSignedCertificate generates a self-signed certificate
func GenerateSelfSignedCertificate(c *gin.Context) {
	var req struct {
		Domain string `json:"domain" binding:"required"`
		Days   int    `json:"days"` // validity period
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Days <= 0 {
		req.Days = 365
	}

	// Create directory
	certDir := filepath.Join(certBasePath, req.Domain)
	if err := os.MkdirAll(certDir, 0700); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	certPath := filepath.Join(certDir, "cert.pem")
	keyPath := filepath.Join(certDir, "key.pem")

	// Generate using openssl
	cmd := exec.Command("openssl", "req",
		"-x509",
		"-nodes",
		"-days", fmt.Sprintf("%d", req.Days),
		"-newkey", "rsa:2048",
		"-keyout", keyPath,
		"-out", certPath,
		"-subj", fmt.Sprintf("/CN=%s", req.Domain),
	)

	if output, err := cmd.CombinedOutput(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "failed to generate certificate",
			"output": string(output),
		})
		return
	}

	// Store certificate
	certID := uuid.New().String()[:8]
	cert := &SSLCertificate{
		ID:          certID,
		Domain:      req.Domain,
		Issuer:      "Self-Signed",
		Provider:    "self-signed",
		ExpiresAt:   time.Now().Add(time.Duration(req.Days) * 24 * time.Hour),
		IssuedAt:    time.Now(),
		AutoRenew:   false,
		Status:      "valid",
		CertPath:    certPath,
		KeyPath:     keyPath,
		LastChecked: time.Now(),
	}

	sslMu.Lock()
	sslCertificates[certID] = cert
	sslMu.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Self-signed certificate generated",
		"cert":    cert,
	})
}

// Helper functions

func parseCertificateExpiry(certData []byte) (time.Time, error) {
	block, _ := pem.Decode(certData)
	if block == nil {
		return time.Time{}, fmt.Errorf("failed to parse certificate PEM")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return time.Time{}, err
	}

	return cert.NotAfter, nil
}

func parseCertificateInfo(certData []byte) (expiresAt time.Time, issuer string, err error) {
	block, _ := pem.Decode(certData)
	if block == nil {
		return time.Time{}, "", fmt.Errorf("failed to parse certificate PEM")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return time.Time{}, "", err
	}

	issuer = cert.Issuer.CommonName
	if issuer == "" && len(cert.Issuer.Organization) > 0 {
		issuer = strings.Join(cert.Issuer.Organization, ", ")
	}

	return cert.NotAfter, issuer, nil
}
