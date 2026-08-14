
CREATE DATABASE IF NOT EXISTS minee_beauty_db;
USE minee_beauty_db;

DROP TABLE IF EXISTS khqr_payment_attempts;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    description TEXT,
    ingredients TEXT
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

USE minee_beauty_db;
-- 1. Add discount and stock columns to your existing products table
ALTER TABLE products
ADD COLUMN discount_price DECIMAL(10, 2) DEFAULT NULL AFTER price,
ADD COLUMN stock INT DEFAULT 0 AFTER discount_price;
-- 2. Add an order tracking status column to your existing orders table
ALTER TABLE orders
ADD COLUMN status VARCHAR(50) DEFAULT 'Pending' AFTER payment_method;

-- MARY & MAY COLLECTION (IDs 1 - 15)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('1', 'Mary&May Vegan Primer Glow Sun Cream SPF50+ PA++++ 50ml', 'Mary&May', 'Sunscreen', 8.50, './image/mary&maysunscreen/sun2.webp', 'A gorgeous glowing vegan sun primer that shields skin from UV damage while offering a radiant makeup-ready canvas base.', 'Water, Dibutyl Adipate, Titanium Dioxide, Propanediol, Ethylhexyl Triazone, Terephthalylidene Dicamphor Sulfonic Acid, Niacinamide, Glycerin, Centella Asiatica Extract, Zinc Oxide, Adenosine, Tocopherol, 1,2-Hexanediol, Polyhydroxystearic Acid, Coco-Caprylate/Caprate'),
('2', 'Mary&May Centella Asiatica Serum', 'Mary&May', 'Serum', 8.30, './image/mary&mayserum/serum2 copy.jpeg', 'Infused with pure Centella Asiatica extract to quickly settle active redness and irritation while reinforcing skin moisture barriers.', 'Centella Asiatica Extract (95%), Glycerin, 1,2-Hexanediol, Arginine, Arbutin, Xanthan Gum, Ethylhexylglycerin, Water'),
('3', 'Mary&May Sensitive Shooting Gel Cream', 'Mary&May', 'Cream', 9.50, './image/mary&maycream/shooting.webp', 'A deeply calming gel-cream formula featuring Houttuynia Cordata and Tea Tree extracts to instantly refresh reactive pores.', 'Houttuynia Cordata Extract (71.8%), Melaleuca Alternifolia (Tea Tree) Extract (9.7%), Panthenol, Arginine, 1,2-Hexanediol, Sodium Hyaluronate, Carbomer, Glycerin, Butylene Glycol, Caprylyl Glycol'),
('4', 'Mary&May Marine Collagen Serum', 'Mary&May', 'Serum', 8.30, './image/mary&mayserum/serum5 copy.jpeg', 'Low-molecular marine collagen extract configuration helps plump fine expression lines and dry patches efficiently.', 'Hydrolyzed Collagen (95%), Adenosine, Glycerin, 1,2-Hexanediol, Water, Ethylhexylglycerin, Xanthan Gum, Disodium EDTA'),
('5', 'Mary&May Idenenone+BlackBerry Complex Serum', 'Mary&May', 'Serum', 12.00, './image/mary&mayserum/limited/black copy.jpeg', 'A gold-standard premium anti-aging cocktail containing rich Idebenone and dark blackberry extract concentrates.', 'Rubus Fruticosus (Blackberry) Fruit Extract (20%), Euterpe Oleracea Fruit Extract, Vaccinium Angustifolium (Blueberry) Fruit Extract, Glycerin, Hydrogenated Lecithin, Hydroxydecyl Ubiquinone (Idebenone), Niacinamide, 1,2-Hexanediol, Sodium Hyaluronate'),
('6', 'Mary&May Retinol 0.1% Bakuchiol Cica Serum', 'Mary&May', 'Serum', 12.00, './image/mary&mayserum/limited/blue copy.jpeg', 'Gentle overnight renewal compound optimizing stable Retinol fluid alongside calming Cica layers.', 'Water, Butylene Glycol, Glycerin, Bakuchiol (1%), Centella Asiatica Extract, Retinol (0.1%), Adenosine, Allantoin, Hydrogenated Lecithin, Caprylic/Capric Triglyceride, Ceramide NP, 1,2-Hexanediol, Ethylhexylglycerin'),
('7', 'Mary&May Rice Niacin 10% Triple Vitamin Serum', 'Mary&May', 'Serum', 12.00, './image/mary&mayserum/limited/white copy.jpeg', 'High potency Niacinamide layout designed to target dark spot concentrations and restore natural glass-skin tone.', 'Oryza Sativa (Rice) Bran Extract, Niacinamide (10%), Panthenol, Ascorbic Acid, Biotin, Tocopherol, Glycerin, 1,2-Hexanediol, Butylene Glycol, Water, Ethylhexylglycerin, Xanthan Gum'),
('8', 'Mary&May Idebbenone Blackberry Intense Cream', 'Mary&May', 'Cream', 8.30, './image/mary&maycream/bcream.webp', 'An intensive cream packed with rich Idebenone properties to restore hydration levels over a 24-hour cycle.', 'Rubus Fruticosus (Blackberry) Fruit Extract (63%), Idebenone (500ppm), Ceramide NP, Niacinamide, Glycerin, Phytosphingosine, Phytosterols, Hydrolyzed Jojoba Esters, Adenosine, 1,2-Hexanediol, Cetearyl Olivate, Sorbitan Olivate'),
('9', 'Mary&May Cica Houttuynia Tea Tree Calming Mask', 'Mary&May', 'Sheet Mask', 8.30, './image/mary&may mask/cica.webp', 'Convenient pull-out daily multi-mask sheets soaked thoroughly in natural soothing plant-based essences.', 'Water, Glycerin, Dipropylene Glycol, Centella Asiatica Extract, Houttuynia Cordata Extract, Melaleuca Alternifolia (Tea Tree) Extract, Sodium Hyaluronate, Allantoin, Xanthan Gum, Carbomer, Arginine, 1,2-Hexanediol, Caprylyl Glycol'),
('10', 'Mary&May Collagen Peptide Vital Mask', 'Mary&May', 'Sheet Mask', 8.30, './image/mary&may mask/colloagen.jpeg', 'Fast-absorbing peptide structures woven into gentle sheet materials to firm up fatigued facial skin contours.', 'Water, Glycerin, Dipropylene Glycol, Hydrolyzed Collagen, Copper Tripeptide-1, Acetyl Hexapeptide-8, Palmitoyl Pentapeptide-4, Adenosine, Allantoin, Xanthan Gum, Carbomer, Arginine, 1,2-Hexanediol'),
('11', 'Mary&May Cica Tea Tree Shooting Wash off mask pack', 'Mary&May', 'Wash Off Mask', 8.30, './image/mary&may mask/gray.jpeg', 'Premium soothing clay blend constructed to deep clean pores smoothly without stripping away natural oil barriers.', 'Water, Kaolin, Bentonite, Glycerin, Centella Asiatica Extract, Melaleuca Alternifolia (Tea Tree) Extract, Houttuynia Cordata Extract, Magnesium Aluminum Silicate, Illicit Clay, Chromium Oxide Greens, 1,2-Hexanediol, Xanthan Gum'),
('12', 'Mary&May Long-lasting moisture Wash off mask pack', 'Mary&May', 'Wash Off Mask', 8.30, './image/mary&may mask/pink.jpeg', 'Infused with elegant rose extracts and ceramides to immediately treat dry, dehydrated patches.', 'Water, Kaolin, Glycerin, Bentonite, Rosa Damascena Flower Extract, Ceramide NP, Ficus Carica (Fig) Fruit Extract, Sodium Hyaluronate Crosspolymer, Centella Asiatica Extract, 1,2-Hexanediol, Xanthan Gum, Iron Oxides (CI 77491)'),
('13', 'Mary&May Vegan Peptidebakuchiol Sun Stick', 'Mary&May', 'Sun Stick', 8.30, './image/mary&maysunscreen/sun3.png', 'A completely mess-free, portable glide-on sun stick that provides premium UV shield protection on-the-go.', 'Silica, Synthetic Wax, Dibutyl Adipate, Coco-Caprylate/Caprate, Butyloctyl Salicylate, Vinyl Dimethicone, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Ethylhexyl Triazone, Bakuchiol (1%), Tocopherol, Copper Tripeptide-1, Acetyl Hexapeptide-8'),
('14', 'Mary&May - Tranexamic Acid + Glutathione Eye Cream', 'Mary&May', 'Eye Cream', 8.30, './image/mary&maycream/eyecream.webp', 'A highly specialized under-eye whitening formula designed to target dark circles and puffiness.', 'Water, Hydrogenated Poly(C6-14 Olefin), Glycerin, CetEARYL Alcohol, Tranexamic Acid (1%), Glutathione (1%), Niacinamide, Ascorbic Acid, Adenosine, Sodium Hyaluronate, 1,2-Hexanediol, Glyceryl Stearate'),
('15', 'Mary&May Vegan CICA Soothing Sun Screen', 'Mary&May', 'Sunscreen', 8.30, './image/mary&maysunscreen/sun1.webp', 'A wonderfully light fluid sunscreen structure delivering transparent hydration without any greasy residue.', 'Water, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Niacinamide, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Centella Asiatica Extract, Sodium Hyaluronate');

-- ------------------------------------------
-- SKIN1004 COLLECTION (IDs 16 - 31)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('16', 'Skin1004 Poremizing Quick Clay Stick Mask', 'Skin1004', 'Clay Mask', 7.30, './image/pink1004/claymask.jpeg', 'A convenient, deep-cleansing quick-stick clay mask designed to tighten pores and absorb excess sebum mess-free.', 'Water, Kaolin, Glycerin, Propylene Glycol, Sodium Stearate, Bentonite, Centella Asiatica Extract, Phaseolus Angularis (Adzuki) Seed Powder, Silica, Titanium Dioxide, 1,2-Hexanediol, Gellan Gum, Chromium Oxide Greens'),
('17', 'Skin1004 Poremizing Fresh Ampoule', 'Skin1004', 'Ampoule', 7.30, './image/pink1004/fresh_ampoule.jpeg', 'High-purity extract ampoule featuring fine pink salt crystals to clarify pores and control oil imbalances smoothly.', 'Centella Asiatica Extract (50%), Water, Butylene Glycol, Sodium Chloride (Himalayan Pink Salt), Glycerin, 1,2-Hexanediol, Ethylhexylglycerin, Hydroxyacetophenone, Xanthan Gum, Disodium EDTA, Adenosine'),
('18', 'Skin1004 Poremizing Light Gel Cream', 'Skin1004', 'Cream', 8.50, './image/pink1004/gelcream.jpeg', 'An ultra-lightweight water gel cream that replenishes extreme hydration without leaving behind any heavy, sticky layers.', 'Centella Asiatica Extract, Water, Propanediol, Glycerin, Sodium Chloride (Himalayan Pink Salt), Sea Water, Niacinamide, Adenosine, Carbomer, Triethanolamine, 1,2-Hexanediol, Hydroxyacetophenone, Ethylhexylglycerin'),
('19', 'Skin1004 Poremizing Fresh Ampoule Foam', 'Skin1004', 'Foam Cleanser', 7.30, './image/pink1004/foam.webp', 'Deep cleansing foaming wash formulated to extract stubborn blackheads while keeping skin surface layers soft.', 'Centella Asiatica Extract, Sodium Chloride (Himalayan Pink Salt), Glycerin, Water, Myristic Acid, Stearic Acid, Potassium Hydroxide, Lauric Acid, Kaolin, Papain, Glyceryl Stearate, Polyquaternium-7, 1,2-Hexanediol'),
('20', 'Skin1004 Madagascar Centella Probio-Cica Enrich Cream', 'Skin1004', 'Cream', 8.30, './image/green/b5_cream.jpeg', 'An intensive barrier recovery cream enriched with specialized plant ferments to heal dry or deeply damaged skin profiles.', 'Lactobacillus/Centella Asiatica Extract Ferment Filtrate, Water, Macadamia Integrifolia Seed Oil, Glycerin, Squalane, Cetearyl Alcohol, Ceramide NP, Phytosphingosine, Cholesterol, Stearic Acid, Hydrogenated Lecithin, 1,2-Hexanediol'),
('21', 'Skin1004 Tea-Trica BHA Foam', 'Skin1004', 'Foam Cleanser', 7.50, './image/green/foam.jpeg', 'Gentle acne-clearing face wash using natural Tea Tree waters and mild Salicylic Acid to target active whiteheads.', 'Melaleuca Alternifolia (Tea Tree) Leaf Water, Centella Asiatica Extract, Glycerin, Water, Salicylic Acid (BHA), Myristic Acid, Stearic Acid, Potassium Hydroxide, Lauric Acid, Glyceryl Stearate, 1,2-Hexanediol'),
('22', 'Skin1004 Tea-Trica Relief Ampoule', 'Skin1004', 'Ampoule', 7.90, './image/green/serum.jpeg', 'An instant sos soothing relief drop complex built specifically to handle acne inflammation and balance irritated sebum.', 'Centella Asiatica Extract (55%), Melaleuca Alternifolia (Tea Tree) Leaf Water, Pinus Palustris Leaf Extract (Pine Tree Complex), Butylene Glycol, Glycerin, Water, 1,2-Hexanediol, Caprylyl Glycol, Ethylhexylglycerin, Xanthan Gum'),
('23', 'Skin1004 Tea-Trica Purifying Toner', 'Skin1004', 'Toner', 7.90, './image/green/toner.jpeg', 'A refreshing exfoliating clear fluid toner that clears oil deposits out of raw pore linings without over-stripping moisture.', 'Melaleuca Alternifolia (Tea Tree) Leaf Water, Centella Asiatica Extract, Butylene Glycol, Water, Glycerin, 1,2-Hexanediol, Gluconolactone (PHA), Salicylic Acid (BHA), Sodium Citrate, Citric Acid, Ethylhexylglycerin'),
('24', 'Skin1004 Hyalu-Cica Blue Serum', 'Skin1004', 'Serum', 7.90, './image/blue/blue_serum.webp', 'A dynamic moisture serum combining natural calming centella extracts with a rich triple hyaluronic acid layout.', 'Centella Asiatica Extract, Water, Butylene Glycol, Niacinamide, Glycerin, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Hyaluronic Acid, Hedera Helix (Ivy) Leaf/Stem Extract, Adenosine, 1,2-Hexanediol, Ethylhexylglycerin'),
('25', 'Skin1004 Madagascar Centella Hyalu-Cica Sleeping Pack 100ml', 'Skin1004', 'Sleeping Pack', 7.90, './image/blue/bfoam.webp', 'An overnight recovery gel treatment infused with pure melatonin to plump skin texture completely while you sleep.', 'Centella Asiatica Extract, Water, Glycerin, Butylene Glycol, Caprylic/Capric Triglyceride, Melatonin, Hibiscus Esculentus (Okra) Fruit Extract, Ceramide NP, Sodium Hyaluronate, Hyaluronic Acid, 1,2-Hexanediol, Carbomer, Arginine'),
('26', 'Skin1004 Madagascar Centella Hyalu-Cica First Ampoule', 'Skin1004', 'Ampoule', 8.90, './image/blue/firstampoule.jpeg', 'A highly concentrated starter fluid step that floods dehydrated tissue barriers immediately following your face wash routine.', 'Centella Asiatica Extract (92%), Water, Butylene Glycol, Niacinamide, 1,2-Hexanediol, Sodium Hyaluronate, Hyaluronic Acid, Hydrolyzed Hyaluronic Acid, Betula Alba Juice, Aloe Barbadensis Leaf Extract, Ethylhexylglycerin'),
('27', 'Skin1004 Madagascar Centella Hyalu-Cica Water Fit Sun Serum', 'Skin1004', 'Sunscreen', 8.90, './image/blue/skin_1004_hyalu_cica_moisture_cream_1.jpg.webp', 'The ultimate ultra-light fluid sun serum layer offering glass-skin protection without any heavy white cast issues.', 'Water, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, PolymethyLsilSesquioxane, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Niacinamide, Centella Asiatica Extract, Sodium Hyaluronate, Adenosine'),
('28', 'Skin1004 Probio-Cica Intensive Ampoule', 'Skin1004', 'Ampoule', 8.90, './image/brown/Product-page-sizes_11dfd86d-b8a4-4ebc-9a97-a9466f8755cd_grande.jpg.webp', 'A rich, milky, fermented barrier serum engineered to target damaged tissues and minimize signs of fine texture lines.', 'Lactobacillus/Centella Asiatica Extract Ferment Filtrate, Centella Asiatica Extract, Butylene Glycol, Glycerin, Squalane, Macadamia Integrifolia Seed Oil, Water, Ceramide NP, Phytosterols, Cholesterol, Hydrogenated Lecithin, 1,2-Hexanediol'),
('29', 'Skin1004 Probio-Cica Glow Sun Ampoule', 'Skin1004', 'Sun Ampoule', 8.90, '/image/brown/skin1004-madagascar-centella-probio-cica-bakuchiol-eye-cream-20mleye-cream_1024x1024.jpg.webp', 'Nutrient-rich glowing protective fluid combining the elasticity repair properties of Bakuchiol with deep UV filter compounds.', 'Lactobacillus/Centella Asiatica Extract Ferment Filtrate, Dibutyl Adipate, Propanediol, Ethylhexyl Triazone, Bakuchiol, Macadamia Integrifolia Seed Oil, Ceramide NP, Squalane, Glycerin, Niacinamide, Diethylamino Hydroxybenzoyl Hexyl Benzoate, 1,2-Hexanediol'),
('30', 'Skin1004 Probio-Cica Essence Toner', 'Skin1004', 'Toner', 8.60, './image/brown/SKIN1004-Madagascar-Centella-Probio-Cica-Essence-Toner.webp', 'A dense, essence-like fluid toner that smooths rough flaking areas and prepares skin to hold deeper creams.', 'Lactobacillus/Centella Asiatica Extract Ferment Filtrate, Centella Asiatica Extract, Water, Butylene Glycol, Glycerin, Trehalose, Panthenol, Sodium Hyaluronate, Ceramide NP, Hydrogenated Lecithin, 1,2-Hexanediol, Ethylhexylglycerin'),
('31', 'Skin1004 Madagascar Centella Probio-Enrich Cream', 'Skin1004', 'Cream', 8.30, './image/brown/545416816923_1.jpg', 'Deeply structural recovery moisturizer packed with skin-identical ceramides to form a lock-in hydration seal.', 'Lactobacillus/Centella Asiatica Extract Ferment Filtrate, Macadamia Integrifolia Seed Oil, Glycerin, Squalane, Water, Ceramide NP, Ceramide NS, Ceramide EOP, Phytosphingosine, Cholesterol, Stearic Acid, Hydrogenated Lecithin, 1,2-Hexanediol, Adenosine');

-- ------------------------------------------
-- ETUDE LIP MAKEUP COLLECTION (IDs 32 - 39)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('32', 'Etude Fixing Tint Mated-02', 'Etude', 'Lip Makeup', 12.00, './image/makeup/02.webp', 'A comfortable, transfer-proof liquid lip tint with a weightless matte finish that stays securely fixed without drying your lips.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Tricalcium Phosphate, Diisostearyl Malate, Sorbitan Isostearate, Tocopherol (Vitamin E), Titanium Dioxide (CI 77891), Red 7 Lake (CI 15850), Iron Oxides, Ethylhexylglycerin'),
('33', 'Etude Fixing Tint Mated-03', 'Etude', 'Lip Makeup', 12.00, './image/makeup/03.jpeg', 'A high-fixation velvet matte tint engineered to resist masking, smudging, and moisture breakdown throughout the day.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Tricalcium Phosphate, Sorbitan Isostearate, Tocopherol, Iron Oxides (CI 77491), Red 28 Lake (CI 45410), Yellow 6 Lake (CI 15985), Phenoxyethanol'),
('34', 'Etude Fixing Tint Mated-04', 'Etude', 'Lip Makeup', 12.00, './image/makeup/04.jpeg', 'Provides a hydro-matte texture that feels lightweight on the lip surface layers while delivering vibrant, opaque coverage.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Diisostearyl Malate, Sorbitan Isostearate, Tocopherol, Titanium Dioxide (CI 77891), Red 33 Lake (CI 17200), Blue 1 Lake (CI 42090), Ethylhexylglycerin'),
('35', 'Etude Fixing Tint Mated-05', 'Etude', 'Lip Makeup', 12.00, './image/makeup/05.jpeg', 'A beautifully smooth, long-wearing lip stain that creates a soft-focus blurred effect without highlighting dry lines.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Tricalcium Phosphate, Sorbitan Isostearate, Tocopherol, Iron Oxides (CI 77499), Red 7 Lake (CI 15850), Yellow 5 Lake (CI 19140), Phenoxyethanol'),
('36', 'Etude Fixing Tint Mated-12', 'Etude', 'Lip Makeup', 12.00, './image/makeup/12.jpeg', 'A durable, smudge-resistant matte tint formula designed to coat your lip profile with intense, feather-light pigment layers.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Sorbitan Isostearate, Tocopherol, Titanium Dioxide (CI 77891), Iron Oxides (CI 77491), Red 28 Lake (CI 45410), Ethylhexylglycerin, Phenoxyethanol'),
('37', 'Etude Fixing Tint Mated-20', 'Etude', 'Lip Makeup', 12.00, './image/makeup/20.jpeg', 'An ultra-adhering liquid matte pigment layer that locks in smoothly and remains highly vibrant over extended hours.', 'Water, Isododecane, Dimethicone, Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer, Butylene Glycol, Disteardimonium Hectorite, Sorbitan Isostearate, Tocopherol, Iron Oxides (CI 77491), Red 7 Lake (CI 15850), Yellow 6 Lake (CI 15985), Blue 1 Lake (CI 42090)'),
('38', 'Etude Glowing Tint - 000', 'Etude', 'Lip Makeup', 12.00, './image/makeup/glow-tint/coral.jpeg', 'A luminous, high-shine glossy tint that supplies lips with intense plumping hydration and a glassy, dewy finish.', 'Water, Diisostearyl Malate, Bis-Diglyceryl Polyacyladipate-2, Hydrogenated Polyisobutene, Octyldodecanol, Glycerin, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Pyrus Malus (Apple) Seed Oil, Squalan, Titanium Dioxide (CI 77891), Yellow 6 (CI 15985), Red 33 (CI 17200)'),
('39', 'Etude Glowing Tint - 222', 'Etude', 'Etude', 12.00, './image/makeup/glow-tint/sweden.webp', 'Combines botanical oil moisture shields with glassy lip pigments to deliver a gorgeous, reflective dew-glow dimension.', 'Water, Diisostearyl Malate, Bis-Diglyceryl Polyacyladipate-2, Hydrogenated Polyisobutene, Octyldodecanol, Glycerin, Simmondsia Chinensis (Jojoba) Seed Oil, Rosa Canina Fruit Oil, Tocopheryl Acetate, Titanium Dioxide (CI 77891), Red 28 (CI 45410), Blue 1 (CI 42090)');

-- ------------------------------------------
-- ROM&AND LIP MAKEUP COLLECTION (IDs 40 - 44)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('40', 'Rom&and Sheer Tint Stick-03', 'Rom&and', 'Lip Makeup', 6.50, './image/makeup/sheertint/03.png', 'A light, glassy sheer tint stick that glides effortlessly to offer your lips a natural, buildable flush of color and moisture.', 'Bis-Diglyceryl Polyacyladipate-2, Diisostearyl Malate, Hydrogenated Polyisobutene, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Polyethylene, Butyrospermum Parkii (Shea) Butter, Simmondsia Chinensis (Jojoba) Seed Oil, Tocopherol, Titanium Dioxide (CI 77891), Iron Oxides, Red 7 Lake (CI 15850)'),
('41', 'Rom&and Sheer Tint Stick-04', 'Rom&and', 'Lip Makeup', 6.50, './image/makeup/sheertint/04.jpeg', 'Formulated with ultra-hydrating plant layers to provide a comfortable, long-lasting high shine glossy lip look.', 'Bis-Diglyceryl Polyacyladipate-2, Diisostearyl Malate, Hydrogenated Polyisobutene, Polyethylene, Phytosteryl Isostearyl Dimer Dilinoleate, Butyrospermum Parkii (Shea) Butter, Tocopheryl Acetate, Yellow 6 Lake (CI 15985), Red 28 Lake (CI 45410), Iron Oxides (CI 77499)'),
('42', 'Rom&and Sheer Tint Stick-05', 'Rom&and', 'Lip Makeup', 6.50, './image/makeup/sheertint/08.webp', 'Delivers vibrant yet transparent pigment layers that keep dry chapped skin flakes smoothed and thoroughly conditioned.', 'Bis-Diglyceryl Polyacyladipate-2, Diisostearyl Malate, Hydrogenated Polyisobutene, Polyethylene, Caprylic/Capric Triglyceride, Butyrospermum Parkii (Shea) Butter, Argania Spinosa Kernel Oil, Tocopherol, Iron Oxides (CI 77491), Red 6 (CI 15850), Blue 1 Lake (CI 42090)'),
('43', 'Rom&and Sheer Tint Stick-06', 'Rom&and', 'Lip Makeup', 6.50, './image/makeup/sheertint/06.jpeg', 'A melt-on-your-lips hydrating balm texture that blends properties of raw conditioning seed oils with a glassy lip stain.', 'Bis-Diglyceryl Polyacyladipate-2, Diisostearyl Malate, Hydrogenated Polyisobutene, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Polyethylene, Butyrospermum Parkii (Shea) Butter, Simmondsia Chinensis (Jojoba) Seed Oil, Red 7 Lake (CI 15850), Yellow 5 Lake (CI 19140), Iron Oxides (CI 77499)'),
('44', 'Rom&and Sheer Tint Stick-07', 'Rom&and', 'Lip Makeup', 6.50, './image/makeup/sheertint/07.webp', 'Offers an instantly plumping, high-moisture shield element perfect for daily comfortable wear and touch-ups on the go.', 'Bis-Diglyceryl Polyacyladipate-2, Diisostearyl Malate, Hydrogenated Polyisobutene, Polyethylene, Butyrospermum Parkii (Shea) Butter, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Tocopherol, Titanium Dioxide (CI 77891), Red 33 Lake (CI 17200), Yellow 6 Lake (CI 15985)');
UPDATE products SET image_url = './image/makeup/sheertint/03.png' WHERE id = '40';
UPDATE products SET image_url = './image/makeup/sheertint/04.jpeg' WHERE id = '41';
UPDATE products SET image_url = './image/makeup/sheertint/08.webp' WHERE id = '42';
UPDATE products SET image_url = './image/makeup/sheertint/06.jpeg' WHERE id = '43';
UPDATE products SET image_url = './image/makeup/sheertint/07.webp' WHERE id = '44';
-- Add as many lines as you need for the rest of your 66 products!
-- ------------------------------------------
-- DASIQUE SHADOW PALETTE COLLECTION (IDs 45 - 52)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('45', 'Dasique Shadow Palette - Candy Berry', 'Dasique', 'Eye Makeup', 13.00, './image/makeup/oneye/dasique.webp', 'A sweet, berry-inspired 9-shade eyeshadow palette featuring soft mattes, silky shimmers, and high-shine glitters.', 'Talc, Mica, Silica, Methyl Methacrylate Crosspolymer, Dimethicone, Magnesium Myristate, Macadamia Ternifolia Seed Oil, Tocopherol, Titanium Dioxide (CI 77891), Iron Oxides (CI 77491, CI 77492), Red 30 (CI 73360), Manganese Violet (CI 77742)'),
('46', 'Dasique Shadow Palette - Violet Knit | Vegan', 'Dasique', 'Eye Makeup', 12.30, './image/makeup/oneye/dasiquee.webp', 'A cozy, knit-patterned violet and mauve palette certified vegan, offering smooth blendability and gentle formulation.', 'Mica, Talc, Silica, Boron Nitride, Magnesium Stearate, Diisostearyl Malate, Dimethicone, Caprylic/Capric Triglyceride, Manganese Violet (CI 77742), Ultramarines (CI 77007), Titanium Dioxide (CI 77891), Iron Oxides (CI 77499), Phenoxyethanol'),
('47', 'Dasique Shadow Palette - Peach Blending', 'Dasique', 'Eye Makeup', 11.30, './image/makeup/oneye/dasique/d9.webp', 'A warm, refreshing peach-toned shadow grid designed for creating soft, daily pastel watercolor eye looks.', 'Talc, Mica, Silica, Boron Nitride, Magnesium Myristate, Octyldodecyl Stearoyl Stearate, Diisostearyl Malate, Macadamia Ternifolia Seed Oil, Titanium Dioxide (CI 77891), Iron Oxides (CI 77491, CI 77492), Yellow 5 Lake (CI 19140), Red 30 (CI 73360)'),
('48', 'Dasique Shadow Palette - Muted Nuts', 'Dasique', 'Eye Makeup', 12.50, './image/makeup/oneye/dasique/d4.webp', 'A deeply comforting autumn collection of rich, earthy nut shades with sophisticated matte and metallic finishes.', 'Talc, Mica, Nylon-12, Silica, Magnesium Myristate, Dimethicone, Macadamia Ternifolia Seed Oil, Triethoxycaprylylsilane, Iron Oxides (CI 77491, CI 77492, CI 77499), Titanium Dioxide (CI 77891), Manganese Violet (CI 77742)'),
('49', 'Dasique Shadow Palette - Blueberry Sorbet', 'Dasique', 'Eye Makeup', 10.70, './image/makeup/oneye/dasique/d5.webp', 'Cool-toned milky berry shades that apply smoothly without chalkiness, perfect for bright summer-cool skin tones.', 'Talc, Mica, Silica, Methyl Methacrylate Crosspolymer, Zinc Stearate, Diisostearyl Malate, Macadamia Ternifolia Seed Oil, Manganese Violet (CI 77742), Titanium Dioxide (CI 77891), Ultramarines (CI 77007), Iron Oxides (CI 77499)'),
('50', 'Dasique Shadow Palette - Rose Petal', 'Dasique', 'Eye Makeup', 13.00, './image/makeup/oneye/dasique/d6.webp', 'An elegant, romantic compilation of soft velvet roses and sparkling diamond-dust glitters for timeless dimension.', 'Mica, Talc, Calcium Aluminum Borosilicate, Silica, Synthetic Fluorphlogopite, Zinc Stearate, Diisostearyl Malate, Titanium Dioxide (CI 77891), Iron Oxides (CI 77491), Red 7 Lake (CI 15850), Carmine (CI 75470), Tin Oxide'),
('51', 'Dasique Shadow Palette - Berry Smoothie', 'Dasique', 'Eye Makeup', 10.50, './image/makeup/oneye/dasique/d8.webp', 'A vibrant mix of cool berry blends, offering multi-dimensional glitter options and smooth building transitions.', 'Talc, Mica, Calcium Titanium Borosilicate, Silica, Titanium Dioxide (CI 77891), Diisostearyl Malate, Magnesium Myristate, Macadamia Ternifolia Seed Oil, Red 30 (CI 73360), Ultramarines (CI 77007), Iron Oxides (CI 77491), Tin Oxide'),
('52', 'Dasique Shadow Palette - Cherry Blossom', 'Dasique', 'Eye Makeup', 13.00, './image/makeup/oneye/dasique/d7.jpeg', 'Captures the ethereal beauty of spring blooms with delicate pink hues and high-reflectance wet-look shimmer topcoats.', 'Talc, Mica, Silica, Synthetic Fluorphlogopite, Calcium Sodium Borosilicate, Zinc Stearate, Dimethicone, Macadamia Ternifolia Seed Oil, Titanium Dioxide (CI 77891), Iron Oxides (CI 77491), Manganese Violet (CI 77742), Tin Oxide');

-- ------------------------------------------
-- MASCARA COLLECTION (IDs 53 - 58)
-- ------------------------------------------
INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('53', 'Maybelline Lash Sensational Mascara', 'Maybelline', 'Eye Makeup', 7.20, './image/makeup/oneye/mascara/m1.jpeg', 'Features a unique fanning brush with ten layers of bristles to reveal layers of longer, denser lashes for a full-fan effect.', 'Isododecane, Cera Alba (Beeswax), Copernicia Cerifera Cera (Carnauba Wax), Disteardimonium Hectorite, Aqua (Water), Alcohol Denat., Allyl Stearate/VA Copolymer, Oryza Sativa Cera (Rice Bran Wax), Paraffin, Polyvinyl Laurate, Iron Oxides (CI 77499)'),
('54', 'Maybelline New York Lash Sensational Sky High Mascara', 'Maybelline', 'Eye Makeup', 7.50, './image/makeup/oneye/mascara/m2.jpeg', 'Delivers full volume and limitless length extension from every angle. Long-wear formula that does not weigh lashes down.', 'Isododecane, Cera Alba (Beeswax), Copernicia Cerifera Cera (Carnauba Wax), Disteardimonium Hectorite, Aqua, Alcohol Denat., Allyl Stearate/VA Copolymer, Oryza Sativa Cera, Rayon, Bambusa Vulgaris Extract, Iron Oxides (CI 77499)'),
('55', 'SUAKE Waterproof Quick-drying Eyelash Mascara', 'SUAKE', 'Eye Makeup', 7.99, './image/makeup/oneye/mascara/m3.jpeg', 'A budget-friendly, smudge-proof formulation that dries almost instantly upon application to lock your look in all day long.', 'Water, Acylates Copolymer, Stearic Acid, Propylene Glycol, Copernicia Cerifera (Carnauba) Wax, Ozokerite, Glyceryl Stearate, Peg-100 Stearate, Microcrystalline Wax, Triethanolamine, Phenoxyethanol, CI 77499 (Carbon Black)'),
('56', 'Etude Curl Fix Mascara', 'Etude', 'Eye Makeup', 5.90, './image/makeup/oneye/mascara/m4.jpeg', 'A powerful curl-locking mascara that holds fine lashes upright with clear separation, highly resistant to sweat and sebum.', 'Isododecane, Trimethylsiloxysilicate, Cyclopentasiloxane, Polyethylene, Silica, Dextrin Palmitate/Ethylhexanoate, Disteardimonium Hectorite, Nylon-611, Cera Alba, Polypropylsilsesquioxane, Propylene Carbonate, Iron Oxides (CI 77499)'),
('57', 'Rom&and All Han Fix Mascara - V01 Volume Black', 'Rom&and', 'Eye Makeup', 7.60, './image/makeup/oneye/mascara/m5.jpeg', 'An all-proof fixed lash coat that provides structural volume and neat definition without any clumping or drooping.', 'Isododecane, Trimethylsiloxysilicate, Talc, Ceresin, Dextrin Palmitate/Ethylhexanoate, Disteardimonium Hectorite, Microcrystalline Wax, Polypropylsilsesquioxane, Propylene Carbonate, Glycine Soja (Soybean) Seed Extract, Iron Oxides (CI 77499)'),
('58', 'Rom&and All Han Fix Mascara - V03 Volume Black', 'Rom&and', 'Eye Makeup', 7.60, './image/makeup/oneye/mascara/m6.jpeg', 'A multi-proof volumizing black mascara engineered to seal your lash line from moisture while holding an active curl profile.', 'Isododecane, Trimethylsiloxysilicate, Talc, Ceresin, Dextrin Palmitate, Disteardimonium Hectorite, Microcrystalline Wax, Polypropylsilsesquioxane, Propylene Carbonate, Silica, Biotin, Black Soybean Extract, Iron Oxides (CI 77499)');

INSERT INTO products (id, title, brand, category, price, image_url, description, ingredients) VALUES
('59', 'Romand Glasting Melting Balm 03 - Sorbet Balm', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-03-sorbet-balm-3-5g.jpg.avif',
'Provides a lively coral-sorbet shine with an intensive moisture-locking matrix.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Argania Spinosa Kernel Oil, Shea Butter, Caprylic/Capric Triglyceride, Red 104 (CI 45410), Yellow 6 (CI 15985), Fragrance'),

('60', 'Romand Glasting Melting Balm 01 - Coco Nude', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-01-coco-nude-3-5g.jpg.webp',
'A gorgeous translucent nude tone for a natural and sophisticated plump look.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Olive Oil, Argania Spinosa Kernel Oil, Shea Butter, Caprylic/Capric Triglyceride, Mango Fruit Extract, Iron Oxides (CI 77491), Red 104 (CI 45410), Fragrance'),

('61', 'Romand Glasting Melting Balm 02', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/02.jpeg',
'Deeply hydrates lips leaving a healthy glassy finish without tackiness.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Olive Oil, Argania Spinosa Kernel Oil, Shea Butter, Caprylic/Capric Triglyceride, Red 104 (CI 45410), Red 33 (CI 17200), Fragrance'),

('62', 'Romand Glasting Melting Balm 04', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand_GlastingMeltingBalm_04_01_600x600_crop_center_756c84a7-e6e9-4d57-8b05-ba8d59a31ea5_600x.webp',
'Rich botanical blend that melts smoothly upon application to seal cracks.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Evening Primrose Oil, Argania Spinosa Kernel Oil, Shea Butter, Caprylic/Capric Triglyceride, Red 104 (CI 45410), Red 33 (CI 17200), Blue 1 (CI 42090), Fragrance'),

('63', 'Romand Glasting Melting Balm 05 - Nougat Sand', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-05-nougat-sand-3-5g.jpg.avif',
'A warm brown-tinted balm providing nutrient-dense protection for dry lips.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Argania Spinosa Kernel Oil, Shea Butter, Iron Oxides (CI 77491), Iron Oxides (CI 77492), Iron Oxides (CI 77499), Fragrance'),

('64', 'Romand Glasting Melting Balm 06 - Kaya Fig', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-06-kaya-fig-3-5g.jpg.webp',
'The ultimate everyday fig rose color with high-gloss brilliance.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Argania Spinosa Kernel Oil, Shea Butter, Iron Oxides (CI 77491), Iron Oxides (CI 77499), Red 104 (CI 45410), Fragrance'),

('65', 'Romand Glasting Melting Balm 07', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-07-mauve-whip-3-5g.jpg.avif',
'Muted soft mauve hue that serves as a protective high-shine gloss coat.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil,Argania Spinosa Kernel Oil, Shea Butter, Red 104 (CI 45410), Red 33 (CI 17200), Iron Oxides (CI 77499), Fragrance'),

('66', 'Romand Glasting Melting Balm 12 - Veiled Rose', 'Rom&and', 'Lip Makeup', 8.30, './image/makeup/lipbalm/romand-glasting-melting-balm-12-veiled-rose-3-5g.jpg.webp',
'Elegant and calming rosy tint engineered with selected botanical oils.',
'Diisostearyl Malate, Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate, Polyglyceryl-2 Triisostearate, Bis-Diglyceryl Polyacyladipate-2, Paraffin, Triethylhexanoin, Pentaerythrityl Tetraisostearate, Microcrystalline Wax, Sorbitan Isostearate, 1,2-Hexanediol, Disteardimonium Hectorite, Synthetic Wax, Titanium Dioxide (CI 77891), Jojoba Seed Oil, Sweet Almond Oil, Apricot Kernel Oil, Evening Primrose Oil, Argania Spinosa Kernel Oil, Shea Butter, Caprylic/Capric Triglyceride, Red 104 (CI 45410), Iron Oxides (CI 77491), Fragrance');

SELECT * FROM products ORDER BY CAST(id AS UNSIGNED) ASC;
use minee_beauty_db;
SHOW TABLES;
describe products;
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM products;
SELECT
    o.id AS order_id,
    o.customer_name,
    o.created_at,
    pd.title AS product_name,
    oi.quantity,
    oi.price
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products pd ON oi.product_id = pd.id
LIMIT 0, 1000;
-- to manage on the discount funtion
ALTER TABLE products
ADD COLUMN discount_start DATETIME NULL,
ADD COLUMN discount_end DATETIME NULL,
ADD COLUMN limit_per_user INT DEFAULT 0; -- 0 means unlimited purchase power

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

USE minee_beauty_db;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO categories (name) VALUES
('Sunscreen'),
('Serum'),
('Cream'),
('Sheet Mask'),
('Wash Off Mask'),
('Sun Stick'),
('Eye Cream'),
('Clay Mask'),
('Ampoule'),
('Foam Cleanser'),
('Sleeping Pack'),
('Toner'),
('Lip Makeup'),
('Eye Makeup');
-- Link products to categories (if updating schema)
ALTER TABLE products
ADD COLUMN category_id INT,
ADD CONSTRAINT fk_product_category
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
SELECT * FROM categories;

-- 1. Add the sku column to products table
ALTER TABLE products ADD COLUMN sku VARCHAR(50) DEFAULT NULL AFTER id;

-- 2. (Optional) Auto-fill existing rows with default SKU numbers
SET SQL_SAFE_UPDATES = 0;
UPDATE products
SET sku = CONCAT('MB-', id)
WHERE sku IS NULL OR sku = '';
SET SQL_SAFE_UPDATES = 1;
SELECT id, sku, title, price, stock FROM products;

-- Step 1: Drop the existing foreign key constraint from order_items
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2;

-- Step 2: Now modify the id column on products to AUTO_INCREMENT
ALTER TABLE products MODIFY COLUMN id INT AUTO_INCREMENT;

ALTER TABLE order_items
  MODIFY COLUMN product_id INT NOT NULL;
  ALTER TABLE order_items
  ADD CONSTRAINT order_items_ibfk_2
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
-- Check current stock levels for your products
SELECT id, title, stock FROM products;
describe products;
use minee_beauty_db;
UPDATE products
SET image_url = 'image/logo copy.png'
WHERE id IN ('59', '60');
SELECT id, title, image_url, stock FROM products WHERE id IN ('59', '60');
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Inventory',
    amount DECIMAL(10, 2) NOT NULL,
    expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

UPDATE products
SET sku = CONCAT('MB-', id)
WHERE id > 0 AND (sku IS NULL OR sku = '' OR sku = 'N/A');

-- KHQR PAYMENT ATTEMPTS
-- Stores generated payment requests and customer-triggered Bakong verification results.
CREATE TABLE IF NOT EXISTS khqr_payment_attempts (
    id CHAR(36) NOT NULL,
    order_id INT DEFAULT NULL,
    khqr_md5 CHAR(32) NOT NULL,
    qr_payload TEXT NOT NULL,
    expected_amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    receiver_account VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    cart_snapshot LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Generated',
    verification_attempts INT NOT NULL DEFAULT 0,
    last_verification_at DATETIME DEFAULT NULL,
    bakong_transaction_hash VARCHAR(128) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_khqr_md5 (khqr_md5),
    UNIQUE KEY uq_bakong_hash (bakong_transaction_hash),
    KEY idx_khqr_status_expiry (status, expires_at),
    KEY idx_khqr_order (order_id)
);
