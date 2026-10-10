package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"stock_library/backend/internal/auth"
	"stock_library/backend/internal/config"
	"stock_library/backend/internal/database"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/repository"
	"stock_library/backend/internal/service"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	userRepo := repository.NewUserRepository(db)
	catRepo := repository.NewCategoryRepository(db)
	supRepo := repository.NewSupplierRepository(db)
	fabricRepo := repository.NewFabricRepository(db)

	log.Println("1. Seeding default users...")
	seedUsers(userRepo)

	log.Println("2. Seeding fabrics, categories, and suppliers from CSV...")
	seedFabrics(catRepo, supRepo, fabricRepo)

	log.Println("Seeding completed successfully!")
}

func seedUsers(repo *repository.UserRepository) {
	usersToSeed := []struct {
		Email    string
		Password string
		FullName string
		Role     string
	}{
		{
			Email:    "admin@stocklibrary.com",
			Password: "password123",
			FullName: "Admin User",
			Role:     "admin",
		},
		{
			Email:    "merchandiser@stocklibrary.com",
			Password: "password123",
			FullName: "Jewel Merchandiser",
			Role:     "merchandiser",
		},
	}

	for _, u := range usersToSeed {
		existing, err := repo.FindByEmail(u.Email)
		if err == nil && existing != nil {
			log.Printf("User %s already exists, skipping.", u.Email)
			continue
		}

		hash, err := auth.HashPassword(u.Password)
		if err != nil {
			log.Fatalf("Failed to hash password for %s: %v", u.Email, err)
		}

		user := &models.User{
			ID:           uuid.New(),
			Email:        u.Email,
			PasswordHash: hash,
			FullName:     u.FullName,
			Role:         u.Role,
		}

		if err := repo.Create(user); err != nil {
			log.Printf("Error creating user %s: %v", u.Email, err)
		} else {
			log.Printf("Created user: %s (password: %s, role: %s)", u.Email, u.Password, u.Role)
		}
	}
}

func seedFabrics(catRepo *repository.CategoryRepository, supRepo *repository.SupplierRepository, fabricRepo *repository.FabricRepository) {
	csvPath := "data/fabrics_seed.csv"
	file, err := os.Open(csvPath)
	if err != nil {
		log.Fatalf("Could not open %s: %v", csvPath, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Read header
	_, err = reader.Read()
	if err != nil {
		log.Fatalf("Error reading CSV header: %v", err)
	}

	// Fabric swatch mockup samples for visual richness
	swatchImages := []string{
		"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80",
	}

	count := 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		if len(row) < 10 {
			continue
		}

		rawSupplier := strings.TrimSpace(row[1])
		rawCat := strings.TrimSpace(row[2])
		rawComposition := strings.TrimSpace(row[4])
		rawWeight := strings.TrimSpace(row[5])
		reference := strings.TrimSpace(row[6])
		physicalPresence := strings.TrimSpace(row[7])
		rawPrice := strings.TrimSpace(row[9])
		moq := strings.TrimSpace(row[10])
		mcq := strings.TrimSpace(row[11])

		var notePlaceholder *string
		if strings.EqualFold(rawPrice, "explore files") {
			note := "Explore Files"
			notePlaceholder = &note
		}

		// Check if price was placed in MOQ column (e.g. "$6.80/kg")
		if strings.Contains(moq, "$") {
			if rawPrice == "" || strings.EqualFold(rawPrice, "explore files") {
				rawPrice = moq
				moq = ""
			} else {
				moq = ""
			}
		} else if strings.EqualFold(moq, "explore files") {
			moq = ""
		}
		if strings.Contains(mcq, "$") || strings.EqualFold(mcq, "explore files") {
			mcq = ""
		}

		if reference == "" && rawComposition == "" && rawSupplier == "" {
			continue
		}
		if reference == "" || reference == "N/A" {
			reference = fmt.Sprintf("REF-%03d", count+1)
		}

		// Normalize Supplier & Contact
		supName, contact := parseSupplierAndContact(rawSupplier)
		sup, err := supRepo.FindOrCreate(supName, contact)
		if err != nil {
			log.Printf("Error creating supplier %s: %v", supName, err)
			continue
		}

		// Normalize Category & Gender
		catName, gender := parseCategory(rawCat)
		cat, err := catRepo.FindOrCreate(catName, gender)
		if err != nil {
			log.Printf("Error creating category %s: %v", catName, err)
			continue
		}

		// Infer Fabric Name
		fabricName := inferFabricName(catName, rawComposition, reference)

		// Parse GSM
		gsmMin, gsmMax := parseGSM(rawWeight)

		// Parse Price
		priceAmount, priceCurrency, priceUnit, priceStatus, priceNotes := parsePrice(rawPrice)
		if priceNotes == nil && notePlaceholder != nil {
			priceNotes = notePlaceholder
		}

		// Parse Fibers
		fibers := parseCompositionFibers(rawComposition)

		// Width & Stock tags
		width := "66/68\""
		if strings.Contains(strings.ToLower(catName), "woven") {
			width = "56/58\""
		}
		rackLoc := fmt.Sprintf("P-%d", (count%30)+1)
		tag := string('A' + rune(count%6))

		imgURL := swatchImages[count%len(swatchImages)]

		fabric := &models.Fabric{
			ID:                   uuid.New(),
			ArticleNo:           reference,
			FabricName:          fabricName,
			CategoryID:          &cat.ID,
			SupplierID:          &sup.ID,
			CompositionRaw:      rawComposition,
			CompositionBreakdown: fibers,
			WeightGsmMin:        gsmMin,
			WeightGsmMax:        gsmMax,
			WidthInches:         &width,
			SampleHolder:        &physicalPresence,
			RackLocation:        &rackLoc,
			PhysicalTag:         &tag,
			PriceStatus:         priceStatus,
			PriceAmount:         priceAmount,
			PriceCurrency:       priceCurrency,
			PriceUnit:           priceUnit,
			PriceNotes:          priceNotes,
			MOQ:                 &moq,
			MCQ:                 &mcq,
			PrimaryImageURL:     &imgURL,
		}

		existing, _ := fabricRepo.GetByArticleNo(reference)
		if existing != nil {
			fabric.ID = existing.ID
			if err := fabricRepo.Update(fabric); err != nil {
				log.Printf("Error updating fabric %s: %v", reference, err)
				continue
			}
		} else {
			if err := fabricRepo.Create(fabric); err != nil {
				log.Printf("Error creating fabric %s: %v", reference, err)
				continue
			}
		}

		// Create vector embedding
		emb, embErr := service.FetchAndExtractVisualEmbedding(imgURL)
		if embErr != nil {
			emb = service.GenerateDeterministicEmbedding(imgURL)
		}
		_ = fabricRepo.SaveEmbedding(fabric.ID, imgURL, emb)

		count++
	}

	log.Printf("Successfully seeded %d fabrics!", count)
}

func parseSupplierAndContact(raw string) (string, string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "Unknown Supplier", ""
	}

	// Check if hyphen denotes contact, e.g. "Bold Winds-Tanim", "BAOHONG-Cyrus", "Lime Light-Jewel"
	if strings.Contains(raw, "-") {
		parts := strings.SplitN(raw, "-", 2)
		return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	}
	if strings.Contains(raw, " -") {
		parts := strings.SplitN(raw, " -", 2)
		return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	}

	if raw == "Monalisa Textile" {
		return raw, "Lisa Fang"
	}

	return raw, ""
}

func parseCategory(raw string) (string, string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "General Apparel", "UNISEX"
	}

	upper := strings.ToUpper(raw)
	gender := "UNISEX"
	if strings.Contains(upper, "-MEN") || strings.Contains(upper, " MEN") {
		gender = "MEN"
	} else if strings.Contains(upper, "-WOMEN") || strings.Contains(upper, " WOMEN") {
		gender = "WOMEN"
	}

	// Clean up title
	clean := strings.ReplaceAll(raw, "-Men", " (Men)")
	clean = strings.ReplaceAll(clean, "-MEN", " (Men)")
	clean = strings.ReplaceAll(clean, "-Women", " (Women)")
	clean = strings.ReplaceAll(clean, "-WOMEN", " (Women)")
	if strings.EqualFold(clean, "SPORTS") {
		clean = "Sports"
	}
	if strings.EqualFold(clean, "SWIM") {
		clean = "Swim"
	}

	return clean, gender
}

func inferFabricName(catName, comp, ref string) string {
	compUpper := strings.ToUpper(comp)
	if strings.Contains(compUpper, "SCUBA") {
		return "Scuba"
	}
	if strings.Contains(compUpper, "SEERSUCKER") {
		return "Seersucker"
	}
	if strings.Contains(compUpper, "PONGEE") {
		return "Polyester Pongee"
	}
	if strings.Contains(compUpper, "TASLON") {
		return "Nylon Taslon"
	}
	if strings.Contains(compUpper, "LINEN") {
		return "Linen Woven"
	}
	if strings.Contains(compUpper, "FRENCH TERRY") {
		return "French Terry"
	}
	if strings.Contains(compUpper, "FLEECE") || strings.Contains(catName, "SWEAT") {
		return "Sweatshirt Fleece"
	}
	if strings.Contains(compUpper, "RIB") {
		return "Rib Knit"
	}
	if strings.Contains(catName, "Polo") {
		return "Pique Polo"
	}
	if strings.Contains(catName, "Tee") {
		return "Single Jersey"
	}
	if strings.Contains(catName, "Woven") {
		return "Woven Poplin"
	}
	if strings.Contains(catName, "Lounge") {
		return "Interlock Knit"
	}
	return "Standard Knit"
}

func parseGSM(raw string) (int, *int) {
	raw = strings.TrimSpace(raw)
	reRange := regexp.MustCompile(`(\d+)\s*-\s*(\d+)`)
	if match := reRange.FindStringSubmatch(raw); len(match) == 3 {
		min, _ := strconv.Atoi(match[1])
		max, _ := strconv.Atoi(match[2])
		return min, &max
	}

	reSingle := regexp.MustCompile(`(\d+)`)
	if match := reSingle.FindStringSubmatch(raw); len(match) == 2 {
		val, _ := strconv.Atoi(match[1])
		return val, nil
	}

	return 200, nil
}

func parsePrice(raw string) (*float64, string, string, string, *string) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.EqualFold(raw, "explore files") {
		status := "PENDING"
		return nil, "USD", "KG", status, nil
	}

	// Examples: "$7.85/KG", "$2.05/yds", "$1.75/Yds", "4.56/kg", "$3.11/M"
	rePrice := regexp.MustCompile(`\$?\s*([0-9]+\.?[0-9]*)\s*/\s*([a-zA-Z]+)`)
	if match := rePrice.FindStringSubmatch(raw); len(match) == 3 {
		val, err := strconv.ParseFloat(match[1], 64)
		if err == nil {
			unit := strings.ToUpper(match[2])
			if unit == "YDS" || unit == "YD" {
				unit = "YDS"
			} else if unit == "M" {
				unit = "METER"
			} else {
				unit = "KG"
			}
			return &val, "USD", unit, "CONFIRMED", nil
		}
	}

	// If notes like "Yet to get", "Will give after 7th Oct"
	status := "PENDING"
	if strings.Contains(strings.ToLower(raw), "garments") {
		status = "UPON_REQUEST"
	}
	return nil, "USD", "KG", status, &raw
}

func parseCompositionFibers(raw string) models.CompositionBreakdown {
	re := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s]+)`)
	matches := re.FindAllStringSubmatch(raw, -1)

	var fibers []models.FiberItem
	for _, m := range matches {
		pct, err := strconv.ParseFloat(m[1], 64)
		if err == nil {
			fiberName := strings.TrimSpace(m[2])
			fiberName = strings.TrimSuffix(fiberName, ",")
			fibers = append(fibers, models.FiberItem{
				Fiber:      fiberName,
				Percentage: pct,
			})
		}
	}

	if len(fibers) == 0 && strings.TrimSpace(raw) != "" {
		fibers = append(fibers, models.FiberItem{
			Fiber:      strings.TrimSpace(raw),
			Percentage: 100,
		})
	}
	return fibers
}
