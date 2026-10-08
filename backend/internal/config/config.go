package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Env                string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	JWTSecret          string
	JWTExpirationHours int
	UploadDir          string
	StaticBaseURL      string

	// AWS S3 Storage
	AWSRegion      string
	AWSS3AccessKey string
	AWSS3KeySecret string
	AWSS3Bucket    string
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	port := getEnv("PORT", "8088")
	env := getEnv("ENV", "development")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5433")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "stock_library")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")
	jwtSecret := getEnv("JWT_SECRET", "fabric-stock-library-secret-key-2026")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	staticBaseURL := getEnv("STATIC_BASE_URL", "http://localhost:8088/static")

	awsRegion := getEnv("AWS_REGION", "ap-south-1")
	awsAccessKey := getEnv("AWS_S3_ACCESS_KEY", "")
	awsKeySecret := getEnv("AWS_S3_KEY_SECRET", "")
	if awsKeySecret == "" {
		awsKeySecret = getEnv("secretAccessKey", "")
	}
	awsBucket := getEnv("AWS_S3_BUCKET", "pantoneclos3bucket")

	jwtExpHours, err := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "72"))
	if err != nil {
		jwtExpHours = 72
	}

	return &Config{
		Port:               port,
		Env:                env,
		DBHost:             dbHost,
		DBPort:             dbPort,
		DBUser:             dbUser,
		DBPassword:         dbPassword,
		DBName:             dbName,
		DBSSLMode:          dbSSLMode,
		JWTSecret:          jwtSecret,
		JWTExpirationHours: jwtExpHours,
		UploadDir:          uploadDir,
		StaticBaseURL:      staticBaseURL,
		AWSRegion:          awsRegion,
		AWSS3AccessKey:     awsAccessKey,
		AWSS3KeySecret:     awsKeySecret,
		AWSS3Bucket:        awsBucket,
	}, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
