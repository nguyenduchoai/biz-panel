package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Config holds authentication configuration
type Config struct {
	JWTSecret     string
	TokenDuration time.Duration
	AdminUser     string
	AdminPassHash string
}

// User represents a user
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// Claims represents JWT claims
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// LoginRequest represents login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expiresAt"`
	User      User   `json:"user"`
}

var config Config

// Initialize sets up the auth configuration
func Initialize(cfg Config) {
	config = cfg
	if config.JWTSecret == "" {
		config.JWTSecret = os.Getenv("JWT_SECRET")
		if config.JWTSecret == "" {
			// Generate random secret if not provided
			secret := make([]byte, 32)
			rand.Read(secret)
			config.JWTSecret = base64.StdEncoding.EncodeToString(secret)
		}
	}
	if config.TokenDuration == 0 {
		config.TokenDuration = 24 * time.Hour
	}
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares a password with its hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken creates a new JWT token
func GenerateToken(user User) (string, time.Time, error) {
	expiresAt := time.Now().Add(config.TokenDuration)

	claims := Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "biz-panel",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.JWTSecret))
	return tokenString, expiresAt, err
}

// ValidateToken validates a JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(config.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GenerateRandomPassword generates a random password
func GenerateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	bytes := make([]byte, length)
	rand.Read(bytes)
	for i := range bytes {
		bytes[i] = charset[int(bytes[i])%len(charset)]
	}
	return string(bytes)
}

// GenerateRandomUsername generates a random username
func GenerateRandomUsername() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return fmt.Sprintf("admin_%x", bytes)
}

// SecureCompare performs constant-time comparison
func SecureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// AuthMiddleware is the JWT authentication middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for login endpoint
		if c.Request.URL.Path == "/api/auth/login" {
			c.Next()
			return
		}

		// Skip auth for health check
		if c.Request.URL.Path == "/api/health" {
			c.Next()
			return
		}

		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Parse Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Validate token
		claims, err := ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// LoginHandler handles user login
func LoginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check credentials against config
	if !SecureCompare(req.Username, config.AdminUser) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !CheckPassword(req.Password, config.AdminPassHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Create user
	user := User{
		ID:       "admin",
		Username: req.Username,
		Role:     "admin",
	}

	// Generate token
	token, expiresAt, err := GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt.Unix(),
		User:      user,
	})
}

// GetCurrentUser returns the current authenticated user
func GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	role, _ := c.Get("role")

	c.JSON(http.StatusOK, User{
		ID:       userID.(string),
		Username: username.(string),
		Role:     role.(string),
	})
}

// ChangePasswordRequest represents password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=8"`
}

// ChangePasswordHandler handles password change
func ChangePasswordHandler(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify current password
	if !CheckPassword(req.CurrentPassword, config.AdminPassHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	newHash, err := HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update config (in memory)
	config.AdminPassHash = newHash

	// Persist to config file
	configPath := os.Getenv("CONFIG_FILE")
	if configPath == "" {
		configPath = "/etc/biz-panel/config.yaml"
	}
	
	// Update ADMIN_PASS_HASH environment for child processes
	os.Setenv("ADMIN_PASS_HASH", newHash)

	// Try to update config file if it exists
	if _, err := os.Stat(configPath); err == nil {
		// Read current config
		data, err := os.ReadFile(configPath)
		if err == nil {
			content := string(data)
			// Simple replacement for password_hash line
			lines := strings.Split(content, "\n")
			for i, line := range lines {
				if strings.Contains(line, "password_hash:") {
					lines[i] = "  password_hash: " + newHash
					break
				}
			}
			newContent := strings.Join(lines, "\n")
			os.WriteFile(configPath, []byte(newContent), 0600)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// RegisterRoutes registers auth routes
func RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/login", LoginHandler)
	r.GET("/me", GetCurrentUser)
	r.POST("/change-password", ChangePasswordHandler)
}
