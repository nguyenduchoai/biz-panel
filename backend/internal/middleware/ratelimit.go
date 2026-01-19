package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     int           // requests per window
	window   time.Duration // time window
}

type visitor struct {
	tokens    int
	lastReset time.Time
}

// NewRateLimiter creates a new rate limiter
// rate: max requests allowed in the window
// window: time window duration
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
	}

	// Cleanup old entries periodically
	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(rl.window * 2)
		rl.mu.Lock()
		now := time.Now()
		for ip, v := range rl.visitors {
			if now.Sub(v.lastReset) > rl.window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) getVisitor(ip string) *visitor {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{
			tokens:    rl.rate,
			lastReset: time.Now(),
		}
		rl.visitors[ip] = v
	}

	// Reset tokens if window has passed
	if time.Since(v.lastReset) > rl.window {
		v.tokens = rl.rate
		v.lastReset = time.Now()
	}

	return v
}

func (rl *RateLimiter) allow(ip string) bool {
	v := rl.getVisitor(ip)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// Middleware returns a Gin middleware function for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !rl.allow(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":      "Too many requests",
				"message":    "Rate limit exceeded. Please try again later.",
				"retryAfter": rl.window.Seconds(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LoginRateLimiter is a stricter rate limiter for login attempts
func LoginRateLimiter() gin.HandlerFunc {
	// 5 login attempts per minute per IP
	limiter := NewRateLimiter(5, time.Minute)
	return limiter.Middleware()
}

// APIRateLimiter is a general rate limiter for API endpoints
func APIRateLimiter() gin.HandlerFunc {
	// 100 requests per minute per IP
	limiter := NewRateLimiter(100, time.Minute)
	return limiter.Middleware()
}
