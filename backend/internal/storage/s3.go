package storage

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"stock_library/backend/internal/config"
)

type S3Service struct {
	cfg           *config.Config
	client        *s3.Client
	presignClient *s3.PresignClient
}

type PresignedPutResult struct {
	UploadURL        string `json:"upload_url"`
	FileURL          string `json:"file_url"`
	Key              string `json:"key"`
	ExpiresInSeconds int64  `json:"expires_in_seconds"`
}

func NewS3Service(cfg *config.Config) (*S3Service, error) {
	creds := credentials.NewStaticCredentialsProvider(cfg.AWSS3AccessKey, cfg.AWSS3KeySecret, "")
	awsCfg, err := awsconfig.LoadDefaultConfig(
		context.TODO(),
		awsconfig.WithRegion(cfg.AWSRegion),
		awsconfig.WithCredentialsProvider(creds),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)
	presignClient := s3.NewPresignClient(client)

	return &S3Service{
		cfg:           cfg,
		client:        client,
		presignClient: presignClient,
	}, nil
}

func (s *S3Service) GeneratePresignedPutURL(ctx context.Context, originalFilename, contentType, folder string) (*PresignedPutResult, error) {
	if folder == "" {
		folder = "fabrics"
	}
	folder = strings.Trim(folder, "/")

	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" {
		ext = ".jpg"
	}

	// Create a structured, collision-free key
	datePrefix := time.Now().Format("2006/01")
	key := fmt.Sprintf("%s/%s/%s%s", folder, datePrefix, uuid.New().String(), ext)

	if contentType == "" {
		contentType = "image/jpeg"
	}

	lifetime := 15 * time.Minute
	presignedReq, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.cfg.AWSS3Bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(lifetime))
	if err != nil {
		return nil, fmt.Errorf("failed to sign S3 PUT URL: %w", err)
	}

	// Standard public / direct S3 URL
	fileURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.cfg.AWSS3Bucket, s.cfg.AWSRegion, key)

	return &PresignedPutResult{
		UploadURL:        presignedReq.URL,
		FileURL:          fileURL,
		Key:              key,
		ExpiresInSeconds: int64(lifetime.Seconds()),
	}, nil
}
